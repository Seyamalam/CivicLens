import React, { createContext, useContext, useEffect, useState } from 'react';
import { initializeDatabase, getDatabase, getDatabaseStats } from './database';
import { syncService, SyncResult } from './sync-service';
import { useConvex } from 'convex/react';
import { Alert } from 'react-native';

interface DatabaseContextType {
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  stats: Record<string, number> | null;
  syncStatus: {
    isOnline: boolean;
    syncInProgress: boolean;
    pendingItems: number;
    failedItems: number;
    lastSyncTimestamp: string | null;
  } | null;
  // Database operations
  refreshStats: () => Promise<void>;
  refreshSyncStatus: () => Promise<void>;
  forcSync: () => Promise<SyncResult>;
  clearFailedSync: () => Promise<void>;
  retryFailedSync: () => Promise<void>;
}

const DatabaseContext = createContext<DatabaseContextType | null>(null);

interface DatabaseProviderProps {
  children: React.ReactNode;
}

export const DatabaseProvider: React.FC<DatabaseProviderProps> = ({ children }) => {
  const convex = useConvex();
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<Record<string, number> | null>(null);
  const [syncStatus, setSyncStatus] = useState<DatabaseContextType['syncStatus']>(null);

  useEffect(() => {
    initializeApp();
  }, [convex]);

  const initializeApp = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Initialize SQLite database
      console.log('🗄️ Initializing SQLite database...');
      await initializeDatabase();

      // Initialize sync service with Convex client
      console.log('🔄 Initializing sync service...');
      await syncService.initialize(convex);

      // Load initial data
      await refreshStats();
      await refreshSyncStatus();

      setIsInitialized(true);
      console.log('✅ Database and sync service initialized successfully');

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown initialization error';
      console.error('❌ Database initialization failed:', errorMessage);
      setError(errorMessage);
      
      Alert.alert(
        'Database Error',
        'Failed to initialize the local database. Some features may not work properly.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const refreshStats = async (): Promise<void> => {
    try {
      if (isInitialized) {
        const dbStats = await getDatabaseStats();
        setStats(dbStats);
      }
    } catch (err) {
      console.error('❌ Failed to refresh database stats:', err);
    }
  };

  const refreshSyncStatus = async (): Promise<void> => {
    try {
      const status = await syncService.getSyncStatus();
      setSyncStatus(status);
    } catch (err) {
      console.error('❌ Failed to refresh sync status:', err);
    }
  };

  const forcSync = async (): Promise<SyncResult> => {
    try {
      const result = await syncService.syncAll();
      await refreshSyncStatus();
      return result;
    } catch (err) {
      console.error('❌ Force sync failed:', err);
      throw err;
    }
  };

  const clearFailedSync = async (): Promise<void> => {
    try {
      await syncService.clearFailedSyncItems();
      await refreshSyncStatus();
    } catch (err) {
      console.error('❌ Clear failed sync items failed:', err);
      throw err;
    }
  };

  const retryFailedSync = async (): Promise<void> => {
    try {
      await syncService.retryFailedItems();
      await refreshSyncStatus();
    } catch (err) {
      console.error('❌ Retry failed sync items failed:', err);
      throw err;
    }
  };

  // Periodic sync status refresh
  useEffect(() => {
    if (!isInitialized) return;

    const interval = setInterval(() => {
      refreshSyncStatus();
    }, 10000); // Refresh every 10 seconds

    return () => clearInterval(interval);
  }, [isInitialized]);

  const value: DatabaseContextType = {
    isInitialized,
    isLoading,
    error,
    stats,
    syncStatus,
    refreshStats,
    refreshSyncStatus,
    forcSync,
    clearFailedSync,
    retryFailedSync,
  };

  return (
    <DatabaseContext.Provider value={value}>
      {children}
    </DatabaseContext.Provider>
  );
};

export const useDatabase = (): DatabaseContextType => {
  const context = useContext(DatabaseContext);
  if (!context) {
    throw new Error('useDatabase must be used within a DatabaseProvider');
  }
  return context;
};

// Hook for easy database access
export const useLocalDatabase = () => {
  const { isInitialized } = useDatabase();
  
  if (!isInitialized) {
    throw new Error('Database not initialized');
  }
  
  return getDatabase();
};

// Hook for sync operations
export const useSync = () => {
  const { syncStatus, forcSync, clearFailedSync, retryFailedSync, refreshSyncStatus } = useDatabase();
  
  return {
    syncStatus,
    sync: forcSync,
    clearFailed: clearFailedSync,
    retryFailed: retryFailedSync,
    refresh: refreshSyncStatus,
  };
};