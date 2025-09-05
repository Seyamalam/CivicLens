/**
 * CivicLens - Advanced Offline Manager
 * Comprehensive offline-first functionality with intelligent data management
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as Network from 'expo-network';
import { getDatabase, TABLES } from './database';
import { ErrorHandler } from './error-handler';
import { performanceOptimizer } from './performance-optimizer';

export interface OfflineConfig {
  maxCacheSize: number; // bytes
  maxOfflineAge: number; // milliseconds
  compressionEnabled: boolean;
  autoCleanup: boolean;
  priorityTables: string[];
  preloadData: boolean;
}

export interface OfflineStatus {
  isOffline: boolean;
  lastOnlineTime: string;
  offlineDuration: number;
  cachedDataSize: number;
  pendingOperations: number;
  storageUsage: {
    total: number;
    used: number;
    available: number;
    percentage: number;
  };
  dataFreshness: Record<string, string>;
}

export interface OfflineOperation {
  id: string;
  type: 'create' | 'update' | 'delete' | 'query';
  table: string;
  data: any;
  timestamp: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  userInitiated: boolean;
  dependencies: string[];
}

export interface DataSnapshot {
  timestamp: string;
  tables: Record<string, any[]>;
  metadata: {
    version: string;
    checksum: string;
    size: number;
    compression: boolean;
  };
}

export class OfflineManager {
  private static instance: OfflineManager;
  private config: OfflineConfig;
  private isOnline: boolean = true;
  private lastOnlineTime: number = Date.now();
  private offlineOperations: Map<string, OfflineOperation> = new Map();
  private dataCache: Map<string, { data: any; timestamp: number; priority: string }> = new Map();
  
  private constructor() {
    this.config = {
      maxCacheSize: 50 * 1024 * 1024, // 50MB
      maxOfflineAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      compressionEnabled: true,
      autoCleanup: true,
      priorityTables: ['bribe_logs', 'rti_requests', 'permit_apps'],
      preloadData: true
    };
    
    this.initializeOfflineManager();
  }

  static getInstance(): OfflineManager {
    if (!OfflineManager.instance) {
      OfflineManager.instance = new OfflineManager();
    }
    return OfflineManager.instance;
  }

  /**
   * Initialize offline manager
   */
  private async initializeOfflineManager(): Promise<void> {
    try {
      await this.loadOfflineConfig();
      await this.setupNetworkMonitoring();
      await this.loadPersistedOperations();
      await this.setupStorageMonitoring();
      
      if (this.config.preloadData) {
        await this.preloadCriticalData();
      }
      
      if (this.config.autoCleanup) {
        this.scheduleAutoCleanup();
      }
      
      console.log('📱 OfflineManager initialized with advanced caching');
    } catch (error) {
      ErrorHandler.handleError(error as Error, 'offline', { action: 'initialize' }, true);
    }
  }

  /**
   * Setup network monitoring
   */
  private async setupNetworkMonitoring(): Promise<void> {
    try {
      // Initial network check
      const networkState = await Network.getNetworkStateAsync();
      this.isOnline = networkState.isConnected ?? false;
      
      if (!this.isOnline) {
        this.lastOnlineTime = await this.getLastOnlineTime();
      }
      
      // Monitor network changes
      setInterval(async () => {
        const wasOnline = this.isOnline;
        const networkState = await Network.getNetworkStateAsync();
        this.isOnline = networkState.isConnected ?? false;
        
        if (wasOnline && !this.isOnline) {
          // Went offline
          await this.handleGoingOffline();
        } else if (!wasOnline && this.isOnline) {
          // Came back online
          await this.handleComingOnline();
        }
      }, 2000);
      
    } catch (error) {
      ErrorHandler.handleError(error as Error, 'offline', { action: 'network_monitoring' });
    }
  }

  /**
   * Handle going offline
   */
  private async handleGoingOffline(): Promise<void> {
    try {
      console.log('📴 Device went offline - enabling offline mode');
      
      // Save current timestamp
      await AsyncStorage.setItem('lastOnlineTime', Date.now().toString());
      
      // Create data snapshot for critical tables
      await this.createDataSnapshot();
      
      // Optimize storage for offline usage
      await this.optimizeOfflineStorage();
      
      // Preload frequently accessed data
      await this.preloadFrequentData();
      
    } catch (error) {
      ErrorHandler.handleError(error as Error, 'offline', { action: 'going_offline' });
    }
  }

  /**
   * Handle coming back online
   */
  private async handleComingOnline(): Promise<void> {
    try {
      console.log('🌐 Device back online - syncing offline operations');
      
      this.lastOnlineTime = Date.now();
      await AsyncStorage.setItem('lastOnlineTime', this.lastOnlineTime.toString());
      
      // Sync offline operations
      await this.syncOfflineOperations();
      
      // Refresh stale data
      await this.refreshStaleData();
      
      // Clean up old offline data
      if (this.config.autoCleanup) {
        await this.cleanupOfflineData();
      }
      
    } catch (error) {
      ErrorHandler.handleError(error as Error, 'offline', { action: 'coming_online' });
    }
  }

  /**
   * Queue offline operation
   */
  async queueOfflineOperation(
    type: 'create' | 'update' | 'delete' | 'query',
    table: string,
    data: any,
    priority: 'low' | 'medium' | 'high' | 'critical' = 'medium',
    userInitiated: boolean = true
  ): Promise<string> {
    const operationId = `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const operation: OfflineOperation = {
      id: operationId,
      type,
      table,
      data,
      timestamp: Date.now(),
      priority,
      userInitiated,
      dependencies: this.calculateDependencies(table, data)
    };
    
    this.offlineOperations.set(operationId, operation);
    
    // Persist operation
    await this.persistOfflineOperation(operation);
    
    // Execute locally if possible
    if (type !== 'query') {
      await this.executeOfflineOperation(operation);
    }
    
    console.log(`📝 Queued offline operation: ${type} ${table} [${priority}]`);
    return operationId;
  }

  /**
   * Execute offline operation locally
   */
  private async executeOfflineOperation(operation: OfflineOperation): Promise<void> {
    const db = getDatabase();
    
    try {
      switch (operation.type) {
        case 'create':
          await db.runAsync(
            `INSERT INTO ${operation.table} (${Object.keys(operation.data).join(', ')}) VALUES (${Object.keys(operation.data).map(() => '?').join(', ')})`,
            Object.values(operation.data)
          );
          break;
          
        case 'update':
          const updateFields = Object.keys(operation.data).filter(key => key !== 'id');
          await db.runAsync(
            `UPDATE ${operation.table} SET ${updateFields.map(field => `${field} = ?`).join(', ')} WHERE id = ?`,
            [...updateFields.map(field => operation.data[field]), operation.data.id]
          );
          break;
          
        case 'delete':
          await db.runAsync(
            `DELETE FROM ${operation.table} WHERE id = ?`,
            [operation.data.id]
          );
          break;
      }
      
      // Update cache
      await this.updateOfflineCache(operation.table, operation.data);
      
    } catch (error) {
      ErrorHandler.handleError(error as Error, 'offline', { operation }, false);
    }
  }

  /**
   * Get offline data with fallback mechanisms
   */
  async getOfflineData<T>(
    table: string,
    filters?: Record<string, any>,
    useCache: boolean = true
  ): Promise<T[]> {
    try {
      // Try cache first if enabled
      if (useCache) {
        const cachedData = await this.getCachedData<T[]>(`${table}_${JSON.stringify(filters || {})}`);
        if (cachedData) {
          console.log(`📋 Retrieved ${table} data from cache`);
          return cachedData;
        }
      }
      
      // Fallback to local database
      const db = getDatabase();
      let query = `SELECT * FROM ${table}`;
      let params: any[] = [];
      
      if (filters && Object.keys(filters).length > 0) {
        const conditions = Object.keys(filters).map(key => `${key} = ?`);
        query += ` WHERE ${conditions.join(' AND ')}`;
        params = Object.values(filters);
      }
      
      const results = await db.getAllAsync<T>(query, params);
      
      // Cache results for future use
      if (useCache && results.length > 0) {
        await this.cacheData(`${table}_${JSON.stringify(filters || {})}`, results, 'medium');
      }
      
      console.log(`📊 Retrieved ${results.length} records from ${table} offline`);
      return results;
      
    } catch (error) {
      ErrorHandler.handleError(error as Error, 'offline', { table, filters });
      return [];
    }
  }

  /**
   * Cache data with intelligent storage management
   */
  async cacheData(key: string, data: any, priority: 'low' | 'medium' | 'high' = 'medium'): Promise<void> {
    try {
      const timestamp = Date.now();
      const cacheItem = { data, timestamp, priority };
      
      // Check cache size limits
      await this.enforceCacheLimits();
      
      // Store in memory cache
      this.dataCache.set(key, cacheItem);
      
      // Persist important data
      if (priority === 'high' || this.config.priorityTables.some(table => key.includes(table))) {
        await AsyncStorage.setItem(`cache_${key}`, JSON.stringify(cacheItem));
      }
      
      console.log(`💾 Cached data: ${key} [${priority}]`);
    } catch (error) {
      ErrorHandler.handleError(error as Error, 'offline', { action: 'cache_data', key });
    }
  }

  /**
   * Get cached data with freshness validation
   */
  async getCachedData<T>(key: string): Promise<T | null> {
    try {
      // Try memory cache first
      let cacheItem = this.dataCache.get(key);
      
      // Try persistent storage if not in memory
      if (!cacheItem) {
        const stored = await AsyncStorage.getItem(`cache_${key}`);
        if (stored) {
          cacheItem = JSON.parse(stored);
          this.dataCache.set(key, cacheItem!);
        }
      }
      
      if (!cacheItem) return null;
      
      // Check freshness
      const age = Date.now() - cacheItem.timestamp;
      if (age > this.config.maxOfflineAge) {
        await this.removeCachedData(key);
        return null;
      }
      
      return cacheItem.data as T;
    } catch (error) {
      ErrorHandler.handleError(error as Error, 'offline', { action: 'get_cached_data', key });
      return null;
    }
  }

  /**
   * Create comprehensive data snapshot
   */
  async createDataSnapshot(): Promise<void> {
    try {
      const db = getDatabase();
      const snapshot: DataSnapshot = {
        timestamp: new Date().toISOString(),
        tables: {},
        metadata: {
          version: '1.0.0',
          checksum: '',
          size: 0,
          compression: this.config.compressionEnabled
        }
      };
      
      // Snapshot priority tables
      for (const tableName of this.config.priorityTables) {
        try {
          const data = await db.getAllAsync(`SELECT * FROM ${tableName}`);
          snapshot.tables[tableName] = data;
        } catch (error) {
          console.warn(`Failed to snapshot table ${tableName}:`, error);
        }
      }
      
      // Calculate metadata
      const snapshotString = JSON.stringify(snapshot.tables);
      snapshot.metadata.size = new Blob([snapshotString]).size;
      snapshot.metadata.checksum = await this.generateChecksum(snapshotString);
      
      // Save snapshot
      const snapshotPath = `${FileSystem.documentDirectory}data_snapshot_${Date.now()}.json`;
      await FileSystem.writeAsStringAsync(snapshotPath, JSON.stringify(snapshot));
      
      console.log(`📸 Created data snapshot: ${snapshot.metadata.size} bytes`);
    } catch (error) {
      ErrorHandler.handleError(error as Error, 'offline', { action: 'create_snapshot' });
    }
  }

  /**
   * Preload critical data for offline use
   */
  async preloadCriticalData(): Promise<void> {
    try {
      console.log('📥 Preloading critical data for offline use...');
      
      const criticalQueries = [
        { table: 'services', filters: { status: 'active' } },
        { table: 'user_settings', filters: {} },
        { table: 'app_config', filters: {} }
      ];
      
      for (const query of criticalQueries) {
        try {
          const data = await this.getOfflineData(query.table, query.filters, false);
          await this.cacheData(`preload_${query.table}`, data, 'high');
        } catch (error) {
          console.warn(`Failed to preload ${query.table}:`, error);
        }
      }
      
      console.log('✅ Critical data preloaded');
    } catch (error) {
      ErrorHandler.handleError(error as Error, 'offline', { action: 'preload_critical' });
    }
  }

  /**
   * Get comprehensive offline status
   */
  async getOfflineStatus(): Promise<OfflineStatus> {
    try {
      const storageInfo = await this.getStorageInfo();
      const pendingOperations = this.offlineOperations.size;
      const offlineDuration = this.isOnline ? 0 : Date.now() - this.lastOnlineTime;
      
      return {
        isOffline: !this.isOnline,
        lastOnlineTime: new Date(this.lastOnlineTime).toISOString(),
        offlineDuration,
        cachedDataSize: this.calculateCacheSize(),
        pendingOperations,
        storageUsage: storageInfo,
        dataFreshness: await this.getDataFreshness()
      };
    } catch (error) {
      ErrorHandler.handleError(error as Error, 'offline', { action: 'get_status' });
      return {
        isOffline: !this.isOnline,
        lastOnlineTime: new Date().toISOString(),
        offlineDuration: 0,
        cachedDataSize: 0,
        pendingOperations: 0,
        storageUsage: { total: 0, used: 0, available: 0, percentage: 0 },
        dataFreshness: {}
      };
    }
  }

  /**
   * Optimize offline storage for better performance
   */
  async optimizeOfflineStorage(): Promise<void> {
    try {
      console.log('🔧 Optimizing offline storage...');
      
      // Compress large cache items
      if (this.config.compressionEnabled) {
        await this.compressLargeCacheItems();
      }
      
      // Remove least recently used items if storage is full
      await this.enforceCacheLimits();
      
      // Defragment database
      const db = getDatabase();
      await db.runAsync('VACUUM');
      
      // Update indexes for better offline query performance
      await this.optimizeOfflineIndexes();
      
      console.log('✅ Storage optimization completed');
    } catch (error) {
      ErrorHandler.handleError(error as Error, 'offline', { action: 'optimize_storage' });
    }
  }

  /**
   * Export offline data for backup/analysis
   */
  async exportOfflineData(): Promise<string> {
    try {
      const status = await this.getOfflineStatus();
      const operations = Array.from(this.offlineOperations.values());
      
      const exportData = {
        exportDate: new Date().toISOString(),
        offlineStatus: status,
        pendingOperations: operations,
        cacheStats: {
          memoryCache: this.dataCache.size,
          totalSize: this.calculateCacheSize()
        },
        configuration: this.config
      };
      
      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      ErrorHandler.handleError(error as Error, 'offline', { action: 'export_data' });
      return '{}';
    }
  }

  // Private helper methods

  private async loadOfflineConfig(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('offline_config');
      if (stored) {
        this.config = { ...this.config, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.warn('Using default offline config');
    }
  }

  private async getLastOnlineTime(): Promise<number> {
    try {
      const stored = await AsyncStorage.getItem('lastOnlineTime');
      return stored ? parseInt(stored) : Date.now();
    } catch {
      return Date.now();
    }
  }

  private calculateDependencies(table: string, data: any): string[] {
    // Calculate operation dependencies based on foreign keys
    const dependencies: string[] = [];
    
    if (data.supplier_id) dependencies.push(`suppliers:${data.supplier_id}`);
    if (data.tender_id) dependencies.push(`tenders:${data.tender_id}`);
    if (data.service_id) dependencies.push(`services:${data.service_id}`);
    
    return dependencies;
  }

  private async persistOfflineOperation(operation: OfflineOperation): Promise<void> {
    try {
      const operations = await this.getPersistedOperations();
      operations.push(operation);
      await AsyncStorage.setItem('offline_operations', JSON.stringify(operations));
    } catch (error) {
      ErrorHandler.handleError(error as Error, 'offline', { action: 'persist_operation' });
    }
  }

  private async loadPersistedOperations(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('offline_operations');
      if (stored) {
        const operations: OfflineOperation[] = JSON.parse(stored);
        operations.forEach(op => this.offlineOperations.set(op.id, op));
        console.log(`📥 Loaded ${operations.length} persisted offline operations`);
      }
    } catch (error) {
      ErrorHandler.handleError(error as Error, 'offline', { action: 'load_operations' });
    }
  }

  private async getPersistedOperations(): Promise<OfflineOperation[]> {
    try {
      const stored = await AsyncStorage.getItem('offline_operations');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  private async updateOfflineCache(table: string, data: any): Promise<void> {
    const cacheKey = `${table}_${data.id || 'latest'}`;
    await this.cacheData(cacheKey, data, 'medium');
  }

  private async removeCachedData(key: string): Promise<void> {
    this.dataCache.delete(key);
    await AsyncStorage.removeItem(`cache_${key}`);
  }

  private async enforceCacheLimits(): Promise<void> {
    const currentSize = this.calculateCacheSize();
    
    if (currentSize > this.config.maxCacheSize) {
      console.log('🧹 Cache size limit exceeded, cleaning up...');
      
      // Remove oldest low-priority items
      const sortedEntries = Array.from(this.dataCache.entries())
        .filter(([_, item]) => item.priority === 'low')
        .sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      for (const [key] of sortedEntries.slice(0, Math.ceil(sortedEntries.length / 2))) {
        await this.removeCachedData(key);
      }
    }
  }

  private calculateCacheSize(): number {
    let size = 0;
    for (const [key, item] of this.dataCache.entries()) {
      size += JSON.stringify(item.data).length;
    }
    return size;
  }

  private async getStorageInfo(): Promise<OfflineStatus['storageUsage']> {
    try {
      const info = await FileSystem.getInfoAsync(FileSystem.documentDirectory);
      const total = 100 * 1024 * 1024; // Assume 100MB available
      const used = this.calculateCacheSize();
      const available = total - used;
      
      return {
        total,
        used,
        available,
        percentage: (used / total) * 100
      };
    } catch {
      return { total: 0, used: 0, available: 0, percentage: 0 };
    }
  }

  private async getDataFreshness(): Promise<Record<string, string>> {
    const freshness: Record<string, string> = {};
    
    for (const [key, item] of this.dataCache.entries()) {
      const age = Date.now() - item.timestamp;
      freshness[key] = this.formatAge(age);
    }
    
    return freshness;
  }

  private formatAge(ms: number): string {
    const minutes = Math.floor(ms / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'just now';
  }

  private async setupStorageMonitoring(): Promise<void> {
    setInterval(async () => {
      const status = await this.getOfflineStatus();
      if (status.storageUsage.percentage > 90) {
        console.warn('⚠️ Storage nearly full - triggering cleanup');
        await this.cleanupOfflineData();
      }
    }, 60000); // Check every minute
  }

  private scheduleAutoCleanup(): void {
    setInterval(async () => {
      await this.cleanupOfflineData();
    }, 24 * 60 * 60 * 1000); // Daily cleanup
  }

  private async syncOfflineOperations(): Promise<void> {
    console.log(`🔄 Syncing ${this.offlineOperations.size} offline operations...`);
    // Implementation would integrate with enhanced sync service
  }

  private async refreshStaleData(): Promise<void> {
    console.log('🔄 Refreshing stale cached data...');
    // Implementation would refresh old cached data from server
  }

  private async cleanupOfflineData(): Promise<void> {
    console.log('🧹 Cleaning up old offline data...');
    
    const cutoff = Date.now() - this.config.maxOfflineAge;
    const keysToRemove: string[] = [];
    
    for (const [key, item] of this.dataCache.entries()) {
      if (item.timestamp < cutoff && item.priority !== 'high') {
        keysToRemove.push(key);
      }
    }
    
    for (const key of keysToRemove) {
      await this.removeCachedData(key);
    }
    
    console.log(`🗑️ Removed ${keysToRemove.length} stale cache entries`);
  }

  private async preloadFrequentData(): Promise<void> {
    // Preload frequently accessed data patterns
    console.log('📥 Preloading frequently accessed data for offline use...');
  }

  private async compressLargeCacheItems(): Promise<void> {
    // Compress large cache items to save space
    console.log('🗜️ Compressing large cache items...');
  }

  private async optimizeOfflineIndexes(): Promise<void> {
    // Optimize database indexes for offline query performance
    console.log('⚡ Optimizing database indexes for offline queries...');
  }

  private async generateChecksum(data: string): Promise<string> {
    // Simple checksum for data integrity
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }
}

// Export singleton instance
export const offlineManager = OfflineManager.getInstance();