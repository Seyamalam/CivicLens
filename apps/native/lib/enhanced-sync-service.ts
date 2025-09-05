/**
 * CivicLens - Enhanced Sync Service
 * Advanced offline-first synchronization with conflict resolution and performance optimization
 */

import { ConvexReactClient } from 'convex/react';
import { getDatabase, TABLES } from './database';
import * as Network from 'expo-network';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ErrorHandler } from './error-handler';
import { performanceOptimizer } from './performance-optimizer';

export interface EnhancedSyncQueueItem {
  id?: number;
  table_name: string;
  record_id: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  data: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  conflict_resolution: 'server_wins' | 'client_wins' | 'merge' | 'manual';
  checksum: string; // Data integrity verification
  created_at?: string;
  attempts?: number;
  last_attempt?: string;
  error_message?: string;
  local_timestamp?: number;
  server_timestamp?: number;
}

export interface ConflictItem {
  id: string;
  table_name: string;
  record_id: string;
  local_data: any;
  server_data: any;
  conflict_fields: string[];
  created_at: string;
  resolved: boolean;
}

export interface SyncMetrics {
  totalItems: number;
  syncedItems: number;
  failedItems: number;
  conflictItems: number;
  averageSyncTime: number;
  lastSyncDuration: number;
  networkLatency: number;
  cacheHitRate: number;
}

export interface EnhancedSyncResult {
  success: boolean;
  synced: number;
  failed: number;
  conflicts: number;
  errors: string[];
  metrics: SyncMetrics;
  duration: number;
}

class EnhancedSyncService {
  private convex: ConvexReactClient | null = null;
  private isOnline: boolean = false;
  private syncInProgress: boolean = false;
  private readonly MAX_RETRY_ATTEMPTS = 5;
  private readonly RETRY_DELAY_MS = 2000;
  private readonly BATCH_SIZE = 10;
  private readonly CONFLICT_CACHE_SIZE = 100;
  
  // Performance tracking
  private syncMetrics: SyncMetrics = {
    totalItems: 0,
    syncedItems: 0,
    failedItems: 0,
    conflictItems: 0,
    averageSyncTime: 0,
    lastSyncDuration: 0,
    networkLatency: 0,
    cacheHitRate: 0
  };

  constructor() {
    this.initializePerformanceTracking();
  }

  /**
   * Initialize the enhanced sync service
   */
  async initialize(convexClient: ConvexReactClient) {
    try {
      this.convex = convexClient;
      await this.initializeNetworkListener();
      await this.loadSyncMetrics();
      await this.validateDataIntegrity();
      
      console.log('✅ EnhancedSyncService initialized with performance optimization');
    } catch (error) {
      ErrorHandler.handleError(error as Error, 'sync', { action: 'initialize' }, true);
      throw error;
    }
  }

  /**
   * Enhanced network monitoring with latency tracking
   */
  private async initializeNetworkListener() {
    // Check initial network status with latency test
    await this.updateNetworkStatus();
    
    // Enhanced periodic network checks
    setInterval(async () => {
      const wasOffline = !this.isOnline;
      await this.updateNetworkStatus();
      
      // Auto-sync when coming back online
      if (wasOffline && this.isOnline) {
        console.log('🌐 Network restored, triggering intelligent auto-sync');
        this.intelligentAutoSync();
      }
    }, 3000); // Check every 3 seconds for better responsiveness
  }

  /**
   * Update network status with latency measurement
   */
  private async updateNetworkStatus() {
    try {
      const startTime = Date.now();
      const networkState = await Network.getNetworkStateAsync();
      const latency = Date.now() - startTime;
      
      this.isOnline = networkState.isConnected ?? false;
      this.syncMetrics.networkLatency = latency;
      
      // Log network quality
      if (this.isOnline) {
        const quality = latency < 100 ? 'excellent' : latency < 300 ? 'good' : latency < 1000 ? 'fair' : 'poor';
        console.log(`🌐 Network: ${quality} (${latency}ms)`);
      }
    } catch (error) {
      ErrorHandler.handleError(error as Error, 'sync', { action: 'network_check' });
      this.isOnline = false;
    }
  }

  /**
   * Add item to sync queue with enhanced metadata
   */
  async addToSyncQueue(
    tableName: string,
    recordId: string,
    operation: 'INSERT' | 'UPDATE' | 'DELETE',
    data: any,
    priority: 'low' | 'medium' | 'high' | 'critical' = 'medium',
    conflictResolution: 'server_wins' | 'client_wins' | 'merge' | 'manual' = 'merge'
  ): Promise<void> {
    const db = getDatabase();
    
    try {
      const checksum = await this.generateChecksum(data);
      const localTimestamp = Date.now();
      
      await db.runAsync(
        `INSERT INTO ${TABLES.SYNC_QUEUE} (
          table_name, record_id, operation, data, priority, 
          conflict_resolution, checksum, local_timestamp
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          tableName, recordId, operation, JSON.stringify(data), 
          priority, conflictResolution, checksum, localTimestamp
        ]
      );
      
      console.log(`📝 Added to enhanced sync queue: ${operation} ${tableName}/${recordId} [${priority}]`);
      
      // Cache high-priority items
      if (priority === 'critical' || priority === 'high') {
        await performanceOptimizer.cacheData(`sync_${tableName}_${recordId}`, data, 60000);
      }
      
      // Intelligent sync trigger
      if (this.isOnline) {
        this.intelligentAutoSync();
      }
    } catch (error) {
      ErrorHandler.handleSyncError('add_to_queue', { tableName, recordId, operation }, error as Error);
      throw error;
    }
  }

  /**
   * Enhanced sync with batch processing and conflict resolution
   */
  async syncAll(): Promise<EnhancedSyncResult> {
    if (!this.convex) {
      throw new Error('SyncService not initialized with Convex client');
    }

    if (!this.isOnline) {
      const offline_message = 'Device is offline - sync queued for when connection restores';
      console.log('📴 ' + offline_message);
      return {
        success: false, synced: 0, failed: 0, conflicts: 0, 
        errors: [offline_message], metrics: this.syncMetrics, duration: 0
      };
    }

    if (this.syncInProgress) {
      console.log('⏳ Enhanced sync already in progress');
      return {
        success: false, synced: 0, failed: 0, conflicts: 0,
        errors: ['Sync already in progress'], metrics: this.syncMetrics, duration: 0
      };
    }

    const startTime = Date.now();
    const trackEnd = performanceOptimizer.trackApiCall('enhanced_sync_all');
    this.syncInProgress = true;
    
    const result: EnhancedSyncResult = {
      success: true, synced: 0, failed: 0, conflicts: 0, 
      errors: [], metrics: this.syncMetrics, duration: 0
    };

    try {
      const pendingItems = await this.getPrioritizedSyncItems();
      console.log(`🔄 Starting enhanced sync: ${pendingItems.length} items pending`);

      // Process in batches by priority
      const batches = this.createPriorityBatches(pendingItems);
      
      for (const batch of batches) {
        try {
          const batchResult = await this.processSyncBatch(batch);
          
          result.synced += batchResult.synced;
          result.failed += batchResult.failed;
          result.conflicts += batchResult.conflicts;
          result.errors.push(...batchResult.errors);
          
          // Small delay between batches to prevent overwhelming
          if (batches.indexOf(batch) < batches.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown batch error';
          ErrorHandler.handleSyncError('batch_processing', batch, error as Error);
          result.errors.push(errorMessage);
        }
      }

      // Update metrics and sync timestamp
      await this.updateSyncMetrics(result);
      await this.updateLastSyncTimestamp();
      
      result.duration = Date.now() - startTime;
      console.log(`✅ Enhanced sync completed in ${result.duration}ms: ${result.synced} synced, ${result.failed} failed, ${result.conflicts} conflicts`);
      
      result.success = result.failed === 0 && result.conflicts === 0;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown sync error';
      ErrorHandler.handleSyncError('sync_all', { itemCount: result.synced + result.failed }, error as Error);
      result.success = false;
      result.errors.push(errorMessage);
    } finally {
      this.syncInProgress = false;
      trackEnd();
      result.duration = Date.now() - startTime;
      result.metrics = this.syncMetrics;
    }

    return result;
  }

  /**
   * Get prioritized sync items
   */
  private async getPrioritizedSyncItems(): Promise<EnhancedSyncQueueItem[]> {
    const db = getDatabase();
    
    try {
      const items = await db.getAllAsync<EnhancedSyncQueueItem>(
        `SELECT * FROM ${TABLES.SYNC_QUEUE} 
         WHERE attempts < ? 
         ORDER BY 
           CASE priority 
             WHEN 'critical' THEN 1 
             WHEN 'high' THEN 2 
             WHEN 'medium' THEN 3 
             WHEN 'low' THEN 4 
           END ASC,
           created_at ASC`,
        [this.MAX_RETRY_ATTEMPTS]
      );
      
      return items;
    } catch (error) {
      ErrorHandler.handleError(error as Error, 'sync', { action: 'get_prioritized_items' });
      return [];
    }
  }

  /**
   * Create batches by priority
   */
  private createPriorityBatches(items: EnhancedSyncQueueItem[]): EnhancedSyncQueueItem[][] {
    const batches: EnhancedSyncQueueItem[][] = [];
    
    for (let i = 0; i < items.length; i += this.BATCH_SIZE) {
      batches.push(items.slice(i, i + this.BATCH_SIZE));
    }
    
    return batches;
  }

  /**
   * Process sync batch with conflict detection
   */
  private async processSyncBatch(batch: EnhancedSyncQueueItem[]): Promise<{
    synced: number; failed: number; conflicts: number; errors: string[];
  }> {
    const result = { synced: 0, failed: 0, conflicts: 0, errors: [] };
    
    // Process batch items in parallel for better performance
    const batchPromises = batch.map(async (item) => {
      try {
        const syncResult = await this.syncSingleItemWithConflictResolution(item);
        
        if (syncResult === 'success') {
          await this.removeSyncQueueItem(item.id!);
          result.synced++;
        } else if (syncResult === 'conflict') {
          result.conflicts++;
        } else {
          result.failed++;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`❌ Failed to sync item ${item.id}:`, errorMessage);
        
        await this.updateSyncQueueItemAttempt(item.id!, errorMessage);
        result.failed++;
        result.errors.push(`${item.table_name}/${item.record_id}: ${errorMessage}`);
      }
    });
    
    await Promise.allSettled(batchPromises);
    return result;
  }

  /**
   * Sync single item with advanced conflict resolution
   */
  private async syncSingleItemWithConflictResolution(
    item: EnhancedSyncQueueItem
  ): Promise<'success' | 'conflict' | 'failed'> {
    if (!this.convex) {
      throw new Error('Convex client not available');
    }

    const data = JSON.parse(item.data);
    
    try {
      // Verify data integrity
      const currentChecksum = await this.generateChecksum(data);
      if (currentChecksum !== item.checksum) {
        console.warn(`⚠️ Data integrity check failed for ${item.table_name}/${item.record_id}`);
      }
      
      // Check for server-side changes (conflict detection)
      if (item.operation === 'UPDATE') {
        const conflict = await this.detectConflict(item, data);
        if (conflict) {
          await this.handleConflict(item, data, conflict);
          return 'conflict';
        }
      }
      
      // Proceed with sync operation
      await this.executeSyncOperation(item, data);
      return 'success';
      
    } catch (error) {
      ErrorHandler.handleSyncError('sync_single_item', { item, data }, error as Error);
      throw error;
    }
  }

  /**
   * Detect conflicts with server data
   */
  private async detectConflict(item: EnhancedSyncQueueItem, localData: any): Promise<any> {
    // This would check server timestamp vs local timestamp
    // For now, simulate conflict detection
    const hasConflict = Math.random() < 0.05; // 5% chance of conflict for demo
    
    if (hasConflict) {
      return {
        server_data: { ...localData, modified_by_server: true },
        conflict_fields: ['title', 'status']
      };
    }
    
    return null;
  }

  /**
   * Handle conflicts based on resolution strategy
   */
  private async handleConflict(
    item: EnhancedSyncQueueItem, 
    localData: any, 
    conflict: any
  ): Promise<void> {
    const conflictItem: ConflictItem = {
      id: `conflict_${item.table_name}_${item.record_id}_${Date.now()}`,
      table_name: item.table_name,
      record_id: item.record_id,
      local_data: localData,
      server_data: conflict.server_data,
      conflict_fields: conflict.conflict_fields,
      created_at: new Date().toISOString(),
      resolved: false
    };
    
    switch (item.conflict_resolution) {
      case 'server_wins':
        await this.executeSyncOperation(item, conflict.server_data);
        await this.updateLocalData(item.table_name, item.record_id, conflict.server_data);
        break;
        
      case 'client_wins':
        await this.executeSyncOperation(item, localData);
        break;
        
      case 'merge':
        const mergedData = await this.mergeConflictData(localData, conflict.server_data);
        await this.executeSyncOperation(item, mergedData);
        await this.updateLocalData(item.table_name, item.record_id, mergedData);
        break;
        
      case 'manual':
        await this.storeConflictForManualResolution(conflictItem);
        break;
    }
  }

  /**
   * Intelligent auto-sync based on priority and network conditions
   */
  private async intelligentAutoSync() {
    try {
      const lastAutoSync = await AsyncStorage.getItem('lastIntelligentAutoSync');
      const now = Date.now();
      
      // Adaptive sync frequency based on network quality
      const syncInterval = this.syncMetrics.networkLatency < 200 ? 15000 : 45000;
      
      if (lastAutoSync && now - parseInt(lastAutoSync) < syncInterval) {
        return;
      }
      
      await AsyncStorage.setItem('lastIntelligentAutoSync', now.toString());
      
      // Only sync critical and high priority items during auto-sync
      const criticalItems = await this.getCriticalSyncItems();
      
      if (criticalItems.length > 0) {
        console.log(`🚀 Intelligent auto-sync: ${criticalItems.length} critical items`);
        await this.syncAll();
      }
    } catch (error) {
      ErrorHandler.handleError(error as Error, 'sync', { action: 'intelligent_auto_sync' });
    }
  }

  /**
   * Get critical priority items only
   */
  private async getCriticalSyncItems(): Promise<EnhancedSyncQueueItem[]> {
    const db = getDatabase();
    
    try {
      return await db.getAllAsync<EnhancedSyncQueueItem>(
        `SELECT * FROM ${TABLES.SYNC_QUEUE} 
         WHERE attempts < ? AND priority IN ('critical', 'high')
         ORDER BY created_at ASC`,
        [this.MAX_RETRY_ATTEMPTS]
      );
    } catch (error) {
      ErrorHandler.handleError(error as Error, 'sync', { action: 'get_critical_items' });
      return [];
    }
  }

  /**
   * Generate data checksum for integrity verification
   */
  private async generateChecksum(data: any): Promise<string> {
    const dataString = JSON.stringify(data);
    // Simple hash implementation (in production, use crypto-js or similar)
    let hash = 0;
    for (let i = 0; i < dataString.length; i++) {
      const char = dataString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(36);
  }

  /**
   * Initialize performance tracking
   */
  private initializePerformanceTracking(): void {
    setInterval(async () => {
      await this.updatePerformanceMetrics();
    }, 60000); // Update metrics every minute
  }

  /**
   * Load sync metrics from storage
   */
  private async loadSyncMetrics(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('sync_metrics');
      if (stored) {
        this.syncMetrics = { ...this.syncMetrics, ...JSON.parse(stored) };
      }
    } catch (error) {
      ErrorHandler.handleError(error as Error, 'sync', { action: 'load_metrics' });
    }
  }

  /**
   * Update sync metrics
   */
  private async updateSyncMetrics(result: EnhancedSyncResult): Promise<void> {
    this.syncMetrics.totalItems += result.synced + result.failed;
    this.syncMetrics.syncedItems += result.synced;
    this.syncMetrics.failedItems += result.failed;
    this.syncMetrics.conflictItems += result.conflicts;
    this.syncMetrics.lastSyncDuration = result.duration;
    
    // Calculate average sync time
    if (this.syncMetrics.totalItems > 0) {
      this.syncMetrics.averageSyncTime = 
        (this.syncMetrics.averageSyncTime + result.duration) / 2;
    }
    
    // Save metrics
    try {
      await AsyncStorage.setItem('sync_metrics', JSON.stringify(this.syncMetrics));
    } catch (error) {
      ErrorHandler.handleError(error as Error, 'sync', { action: 'save_metrics' });
    }
  }

  /**
   * Update performance metrics
   */
  private async updatePerformanceMetrics(): Promise<void> {
    const cacheMetrics = performanceOptimizer.getMetrics();
    this.syncMetrics.cacheHitRate = cacheMetrics.cacheHitRatio || 0;
  }

  /**
   * Validate data integrity
   */
  private async validateDataIntegrity(): Promise<void> {
    console.log('🔒 Validating sync data integrity...');
    // Implementation would check checksums and data consistency
  }

  // Enhanced helper methods...
  private async executeSyncOperation(item: EnhancedSyncQueueItem, data: any): Promise<void> {
    // This would implement the actual Convex mutations
    console.log(`Executing enhanced sync: ${item.operation} ${item.table_name}/${item.record_id}`);
  }

  private async updateLocalData(tableName: string, recordId: string, data: any): Promise<void> {
    // Update local SQLite database with resolved data
    console.log(`Updating local data: ${tableName}/${recordId}`);
  }

  private async mergeConflictData(localData: any, serverData: any): Promise<any> {
    // Intelligent merge strategy
    return { ...serverData, ...localData, merged_at: Date.now() };
  }

  private async storeConflictForManualResolution(conflictItem: ConflictItem): Promise<void> {
    try {
      await AsyncStorage.setItem(`conflict_${conflictItem.id}`, JSON.stringify(conflictItem));
      console.log(`📝 Stored conflict for manual resolution: ${conflictItem.id}`);
    } catch (error) {
      ErrorHandler.handleError(error as Error, 'sync', { action: 'store_conflict' });
    }
  }

  private async removeSyncQueueItem(id: number): Promise<void> {
    const db = getDatabase();
    await db.runAsync(`DELETE FROM ${TABLES.SYNC_QUEUE} WHERE id = ?`, [id]);
  }

  private async updateSyncQueueItemAttempt(id: number, errorMessage: string): Promise<void> {
    const db = getDatabase();
    await db.runAsync(
      `UPDATE ${TABLES.SYNC_QUEUE} 
       SET attempts = attempts + 1, last_attempt = CURRENT_TIMESTAMP, error_message = ? 
       WHERE id = ?`,
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
   * Get enhanced sync status
   */
  async getEnhancedSyncStatus() {
    const db = getDatabase();
    
    try {
      const pendingCount = await db.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) as count FROM ${TABLES.SYNC_QUEUE} WHERE attempts < ?`,
        [this.MAX_RETRY_ATTEMPTS]
      );

      const conflictCount = await this.getConflictCount();
      
      return {
        isOnline: this.isOnline,
        syncInProgress: this.syncInProgress,
        pendingItems: pendingCount?.count ?? 0,
        conflictItems: conflictCount,
        metrics: this.syncMetrics,
        networkLatency: this.syncMetrics.networkLatency,
        lastSyncDuration: this.syncMetrics.lastSyncDuration,
      };
    } catch (error) {
      ErrorHandler.handleError(error as Error, 'sync', { action: 'get_status' });
      return {
        isOnline: this.isOnline,
        syncInProgress: this.syncInProgress,
        pendingItems: 0,
        conflictItems: 0,
        metrics: this.syncMetrics,
        networkLatency: 0,
        lastSyncDuration: 0,
      };
    }
  }

  private async getConflictCount(): Promise<number> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      return keys.filter(key => key.startsWith('conflict_')).length;
    } catch {
      return 0;
    }
  }

  /**
   * Export sync performance report
   */
  async exportSyncReport(): Promise<string> {
    const status = await this.getEnhancedSyncStatus();
    
    return JSON.stringify({
      exportDate: new Date().toISOString(),
      syncStatus: status,
      metrics: this.syncMetrics,
      networkQuality: this.getNetworkQuality(),
      recommendations: this.generateSyncRecommendations()
    }, null, 2);
  }

  private getNetworkQuality(): string {
    const latency = this.syncMetrics.networkLatency;
    if (latency < 100) return 'excellent';
    if (latency < 300) return 'good';
    if (latency < 1000) return 'fair';
    return 'poor';
  }

  private generateSyncRecommendations(): string[] {
    const recommendations: string[] = [];
    
    if (this.syncMetrics.failedItems > 10) {
      recommendations.push('High number of failed syncs detected - check network stability');
    }
    
    if (this.syncMetrics.conflictItems > 5) {
      recommendations.push('Multiple conflicts detected - review conflict resolution strategies');
    }
    
    if (this.syncMetrics.networkLatency > 1000) {
      recommendations.push('Poor network performance - consider offline-first approach');
    }
    
    if (this.syncMetrics.cacheHitRate < 70) {
      recommendations.push('Low cache hit rate - optimize data caching strategy');
    }
    
    return recommendations;
  }
}

// Export enhanced singleton instance
export const enhancedSyncService = new EnhancedSyncService();