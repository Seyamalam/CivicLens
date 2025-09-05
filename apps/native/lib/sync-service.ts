import { ConvexReactClient } from 'convex/react';
import { getDatabase, TABLES } from './database';
import * as Network from 'expo-network';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SyncQueueItem {
  id?: number;
  table_name: string;
  record_id: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  data: string;
  created_at?: string;
  attempts?: number;
  last_attempt?: string;
  error_message?: string;
}

export interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  errors: string[];
}

class SyncService {
  private convex: ConvexReactClient | null = null;
  private isOnline: boolean = false;
  private syncInProgress: boolean = false;
  private readonly MAX_RETRY_ATTEMPTS = 3;
  private readonly RETRY_DELAY_MS = 5000;

  constructor() {
    // Network listener will be initialized when initialize() is called
  }

  /**
   * Initialize the sync service with Convex client
   */
  async initialize(convexClient: ConvexReactClient) {
    this.convex = convexClient;
    await this.initializeNetworkListener();
    console.log('✅ SyncService initialized');
  }

  /**
   * Listen for network status changes
   */
  private async initializeNetworkListener() {
    // Check initial network status
    try {
      const networkState = await Network.getNetworkStateAsync();
      this.isOnline = networkState.isConnected ?? false;
      console.log(`🌐 Initial network status: ${this.isOnline ? 'Online' : 'Offline'}`);
    } catch (error) {
      console.warn('Failed to get initial network status:', error);
      this.isOnline = false;
    }
    
    // Set up periodic network checks since Expo doesn't have real-time network listeners
    setInterval(async () => {
      try {
        const networkState = await Network.getNetworkStateAsync();
        const wasOffline = !this.isOnline;
        this.isOnline = networkState.isConnected ?? false;
        
        // Auto-sync when coming back online
        if (wasOffline && this.isOnline) {
          console.log('🌐 Network restored, triggering auto-sync');
          this.autoSync();
        }
      } catch (error) {
        console.warn('Failed to check network status:', error);
      }
    }, 5000); // Check every 5 seconds
  }

  /**
   * Add an operation to the sync queue
   */
  async addToSyncQueue(
    tableName: string,
    recordId: string,
    operation: 'INSERT' | 'UPDATE' | 'DELETE',
    data: any
  ): Promise<void> {
    const db = getDatabase();
    
    try {
      await db.runAsync(
        `INSERT INTO ${TABLES.SYNC_QUEUE} (table_name, record_id, operation, data) VALUES (?, ?, ?, ?)`,
        [tableName, recordId, operation, JSON.stringify(data)]
      );
      
      console.log(`📝 Added to sync queue: ${operation} ${tableName}/${recordId}`);
      
      // Try immediate sync if online
      if (this.isOnline) {
        this.autoSync();
      }
    } catch (error) {
      console.error('❌ Failed to add to sync queue:', error);
      throw error;
    }
  }

  /**
   * Get pending sync queue items
   */
  async getPendingSyncItems(): Promise<SyncQueueItem[]> {
    const db = getDatabase();
    
    try {
      const items = await db.getAllAsync<SyncQueueItem>(
        `SELECT * FROM ${TABLES.SYNC_QUEUE} WHERE attempts < ? ORDER BY created_at ASC`,
        [this.MAX_RETRY_ATTEMPTS]
      );
      
      return items;
    } catch (error) {
      console.error('❌ Failed to get pending sync items:', error);
      return [];
    }
  }

  /**
   * Sync all pending items
   */
  async syncAll(): Promise<SyncResult> {
    if (!this.convex) {
      throw new Error('SyncService not initialized with Convex client');
    }

    if (!this.isOnline) {
      console.log('📴 Cannot sync: Device is offline');
      return { success: false, synced: 0, failed: 0, errors: ['Device is offline'] };
    }

    if (this.syncInProgress) {
      console.log('⏳ Sync already in progress');
      return { success: false, synced: 0, failed: 0, errors: ['Sync already in progress'] };
    }

    this.syncInProgress = true;
    const result: SyncResult = { success: true, synced: 0, failed: 0, errors: [] };

    try {
      const pendingItems = await this.getPendingSyncItems();
      console.log(`🔄 Starting sync: ${pendingItems.length} items pending`);

      for (const item of pendingItems) {
        try {
          await this.syncSingleItem(item);
          await this.removeSyncQueueItem(item.id!);
          result.synced++;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.error(`❌ Failed to sync item ${item.id}:`, errorMessage);
          
          await this.updateSyncQueueItemAttempt(item.id!, errorMessage);
          result.failed++;
          result.errors.push(`${item.table_name}/${item.record_id}: ${errorMessage}`);
        }
      }

      // Update last sync timestamp
      await this.updateLastSyncTimestamp();
      
      console.log(`✅ Sync completed: ${result.synced} synced, ${result.failed} failed`);
      result.success = result.failed === 0;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown sync error';
      console.error('❌ Sync failed:', errorMessage);
      result.success = false;
      result.errors.push(errorMessage);
    } finally {
      this.syncInProgress = false;
    }

    return result;
  }

  /**
   * Auto-sync with throttling
   */
  private async autoSync() {
    const lastAutoSync = await AsyncStorage.getItem('lastAutoSync');
    const now = Date.now();
    
    // Throttle auto-sync to once every 30 seconds
    if (lastAutoSync && now - parseInt(lastAutoSync) < 30000) {
      return;
    }
    
    await AsyncStorage.setItem('lastAutoSync', now.toString());
    
    try {
      await this.syncAll();
    } catch (error) {
      console.error('❌ Auto-sync failed:', error);
    }
  }

  /**
   * Sync a single item
   */
  private async syncSingleItem(item: SyncQueueItem): Promise<void> {
    if (!this.convex) {
      throw new Error('Convex client not available');
    }

    const data = JSON.parse(item.data);
    
    try {
      switch (item.table_name) {
        case TABLES.TENDERS:
          await this.syncTender(item.operation, data);
          break;
        case TABLES.SUPPLIERS:
          await this.syncSupplier(item.operation, data);
          break;
        case TABLES.SERVICES:
          await this.syncService(item.operation, data);
          break;
        case TABLES.OVERCHARGE_REPORTS:
          await this.syncOverchargeReport(item.operation, data);
          break;
        case TABLES.RTI_REQUESTS:
          await this.syncRTIRequest(item.operation, data);
          break;
        case TABLES.BRIBE_LOGS:
          await this.syncBribeLog(item.operation, data);
          break;
        case TABLES.PERMIT_APPS:
          await this.syncPermitApp(item.operation, data);
          break;
        case TABLES.PROJECTS:
          await this.syncProject(item.operation, data);
          break;
        default:
          throw new Error(`Unknown table: ${item.table_name}`);
      }
    } catch (error) {
      console.error(`❌ Failed to sync ${item.table_name} item:`, error);
      throw error;
    }
  }

  /**
   * Sync methods for each table type
   */
  private async syncTender(operation: string, data: any): Promise<void> {
    // Implementation would call appropriate Convex mutations
    console.log(`Syncing tender ${operation}:`, data.id);
    // Example: await this.convex.mutation(api.procurement.createTender, data);
  }

  private async syncSupplier(operation: string, data: any): Promise<void> {
    console.log(`Syncing supplier ${operation}:`, data.id);
    // Example: await this.convex.mutation(api.procurement.createSupplier, data);
  }

  private async syncService(operation: string, data: any): Promise<void> {
    console.log(`Syncing service ${operation}:`, data.id);
    // Example: await this.convex.mutation(api.services.createService, data);
  }

  private async syncOverchargeReport(operation: string, data: any): Promise<void> {
    console.log(`Syncing overcharge report ${operation}:`, data.id);
    // Example: await this.convex.mutation(api.services.reportOvercharge, data);
  }

  private async syncRTIRequest(operation: string, data: any): Promise<void> {
    console.log(`Syncing RTI request ${operation}:`, data.id);
    // Example: await this.convex.mutation(api.rti.createRequest, data);
  }

  private async syncBribeLog(operation: string, data: any): Promise<void> {
    console.log(`Syncing bribe log ${operation}:`, data.id);
    // Example: await this.convex.mutation(api.bribeLogs.logBribe, data);
  }

  private async syncPermitApp(operation: string, data: any): Promise<void> {
    console.log(`Syncing permit app ${operation}:`, data.id);
    // Example: await this.convex.mutation(api.permits.createApplication, data);
  }

  private async syncProject(operation: string, data: any): Promise<void> {
    console.log(`Syncing project ${operation}:`, data.id);
    // Example: await this.convex.mutation(api.projects.createProject, data);
  }

  /**
   * Helper methods for sync queue management
   */
  private async removeSyncQueueItem(id: number): Promise<void> {
    const db = getDatabase();
    await db.runAsync(`DELETE FROM ${TABLES.SYNC_QUEUE} WHERE id = ?`, [id]);
  }

  private async updateSyncQueueItemAttempt(id: number, errorMessage: string): Promise<void> {
    const db = getDatabase();
    await db.runAsync(
      `UPDATE ${TABLES.SYNC_QUEUE} SET attempts = attempts + 1, last_attempt = CURRENT_TIMESTAMP, error_message = ? WHERE id = ?`,
      [errorMessage, id]
    );
  }

  private async updateLastSyncTimestamp(): Promise<void> {
    const db = getDatabase();
    await db.runAsync(
      `UPDATE ${TABLES.USER_SETTINGS} SET last_sync_timestamp = CURRENT_TIMESTAMP WHERE id = 1`
    );
  }

  /**
   * Get sync status
   */
  async getSyncStatus() {
    const db = getDatabase();
    
    try {
      const pendingCount = await db.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) as count FROM ${TABLES.SYNC_QUEUE} WHERE attempts < ?`,
        [this.MAX_RETRY_ATTEMPTS]
      );

      const failedCount = await db.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) as count FROM ${TABLES.SYNC_QUEUE} WHERE attempts >= ?`,
        [this.MAX_RETRY_ATTEMPTS]
      );

      const lastSync = await db.getFirstAsync<{ last_sync_timestamp: string }>(
        `SELECT last_sync_timestamp FROM ${TABLES.USER_SETTINGS} WHERE id = 1`
      );

      return {
        isOnline: this.isOnline,
        syncInProgress: this.syncInProgress,
        pendingItems: pendingCount?.count ?? 0,
        failedItems: failedCount?.count ?? 0,
        lastSyncTimestamp: lastSync?.last_sync_timestamp,
      };
    } catch (error) {
      console.error('❌ Failed to get sync status:', error);
      return {
        isOnline: this.isOnline,
        syncInProgress: this.syncInProgress,
        pendingItems: 0,
        failedItems: 0,
        lastSyncTimestamp: null,
      };
    }
  }

  /**
   * Clear failed sync items
   */
  async clearFailedSyncItems(): Promise<void> {
    const db = getDatabase();
    await db.runAsync(
      `DELETE FROM ${TABLES.SYNC_QUEUE} WHERE attempts >= ?`,
      [this.MAX_RETRY_ATTEMPTS]
    );
    console.log('✅ Cleared failed sync items');
  }

  /**
   * Force retry all failed items
   */
  async retryFailedItems(): Promise<void> {
    const db = getDatabase();
    await db.runAsync(
      `UPDATE ${TABLES.SYNC_QUEUE} SET attempts = 0, error_message = NULL WHERE attempts >= ?`,
      [this.MAX_RETRY_ATTEMPTS]
    );
    console.log('✅ Reset failed sync items for retry');
    
    if (this.isOnline) {
      this.autoSync();
    }
  }
}

// Export singleton instance
export const syncService = new SyncService();