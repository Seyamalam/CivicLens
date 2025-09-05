import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { useSync } from '@/contexts/database-context';

interface SyncStatusProps {
  variant?: 'banner' | 'compact' | 'modal';
  onPress?: () => void;
}

export const SyncStatus: React.FC<SyncStatusProps> = ({ 
  variant = 'compact',
  onPress 
}) => {
  const { t } = useTranslation();
  const { syncStatus, sync, clearFailed, retryFailed } = useSync();

  if (!syncStatus) {
    return null;
  }

  const { isOnline, syncInProgress, pendingItems, failedItems, lastSyncTimestamp } = syncStatus;

  const handleSyncPress = async () => {
    if (onPress) {
      onPress();
      return;
    }

    try {
      await sync();
    } catch (error) {
      console.error('Manual sync failed:', error);
    }
  };

  const getStatusIcon = () => {
    if (syncInProgress) {
      return 'sync';
    }
    if (!isOnline) {
      return 'cloud-offline';
    }
    if (failedItems > 0) {
      return 'warning';
    }
    if (pendingItems > 0) {
      return 'cloud-upload';
    }
    return 'cloud-done';
  };

  const getStatusColor = () => {
    if (syncInProgress) {
      return '#0891b2'; // Primary blue
    }
    if (!isOnline) {
      return '#6b7280'; // Gray
    }
    if (failedItems > 0) {
      return '#ea580c'; // Orange warning
    }
    if (pendingItems > 0) {
      return '#7c3aed'; // Purple
    }
    return '#84cc16'; // Green success
  };

  const getStatusText = () => {
    if (syncInProgress) {
      return t('offline.syncing');
    }
    if (!isOnline) {
      return t('offline.title');
    }
    if (failedItems > 0) {
      return t('offline.syncFailed', { count: failedItems });
    }
    if (pendingItems > 0) {
      return t('offline.syncPending', { count: pendingItems });
    }
    return t('offline.synced');
  };

  if (variant === 'banner' && (!isOnline || pendingItems > 0 || failedItems > 0)) {
    return (
      <MotiView
        from={{ opacity: 0, translateY: -50 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 300 }}
        className="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 px-4 py-3"
      >
        <TouchableOpacity
          onPress={handleSyncPress}
          className="flex-row items-center justify-between"
          activeOpacity={0.7}
        >
          <View className="flex-row items-center flex-1">
            <MotiView
              animate={{
                rotate: syncInProgress ? '360deg' : '0deg',
              }}
              transition={{
                type: 'timing',
                duration: 1000,
                loop: syncInProgress,
              }}
            >
              <Ionicons 
                name={getStatusIcon()} 
                size={20} 
                color={getStatusColor()}
              />
            </MotiView>
            <View className="ml-3 flex-1">
              <Text className="text-sm font-medium text-gray-900 dark:text-white">
                {getStatusText()}
              </Text>
              {!isOnline && (
                <Text className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  {t('offline.description')}
                </Text>
              )}
            </View>
          </View>
          
          {!syncInProgress && (
            <View className="flex-row items-center space-x-2">
              {pendingItems > 0 && (
                <View className="bg-purple-100 dark:bg-purple-900 px-2 py-1 rounded-full">
                  <Text className="text-xs font-medium text-purple-700 dark:text-purple-300">
                    {pendingItems}
                  </Text>
                </View>
              )}
              <Ionicons name="chevron-forward" size={16} color="#6b7280" />
            </View>
          )}
        </TouchableOpacity>
      </MotiView>
    );
  }

  if (variant === 'compact') {
    return (
      <TouchableOpacity
        onPress={handleSyncPress}
        className="flex-row items-center bg-gray-100 dark:bg-gray-800 rounded-full px-3 py-2"
        activeOpacity={0.7}
      >
        <MotiView
          animate={{
            rotate: syncInProgress ? '360deg' : '0deg',
          }}
          transition={{
            type: 'timing',
            duration: 1000,
            loop: syncInProgress,
          }}
        >
          <Ionicons 
            name={getStatusIcon()} 
            size={16} 
            color={getStatusColor()}
          />
        </MotiView>
        
        {(pendingItems > 0 || failedItems > 0) && (
          <View className="ml-2 bg-red-500 rounded-full w-5 h-5 items-center justify-center">
            <Text className="text-xs font-bold text-white">
              {pendingItems + failedItems}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  }

  if (variant === 'modal') {
    return (
      <View className="bg-white dark:bg-gray-800 rounded-xl p-6">
        <View className="items-center mb-6">
          <MotiView
            animate={{
              rotate: syncInProgress ? '360deg' : '0deg',
            }}
            transition={{
              type: 'timing',
              duration: 1000,
              loop: syncInProgress,
            }}
            className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full items-center justify-center mb-4"
          >
            <Ionicons 
              name={getStatusIcon()} 
              size={32} 
              color={getStatusColor()}
            />
          </MotiView>
          
          <Text className="text-lg font-bold text-gray-900 dark:text-white mb-2">
            {getStatusText()}
          </Text>
          
          {!isOnline && (
            <Text className="text-sm text-gray-600 dark:text-gray-400 text-center">
              {t('offline.description')}
            </Text>
          )}
        </View>

        <View className="space-y-3">
          <View className="flex-row justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('offline.networkStatus')}
            </Text>
            <Text className={`text-sm font-bold ${isOnline ? 'text-green-600' : 'text-red-600'}`}>
              {isOnline ? t('offline.online') : t('offline.offline')}
            </Text>
          </View>

          {pendingItems > 0 && (
            <View className="flex-row justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('offline.pendingSync')}
              </Text>
              <Text className="text-sm font-bold text-purple-600">
                {pendingItems}
              </Text>
            </View>
          )}

          {failedItems > 0 && (
            <View className="flex-row justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('offline.failedSync')}
              </Text>
              <Text className="text-sm font-bold text-red-600">
                {failedItems}
              </Text>
            </View>
          )}

          {lastSyncTimestamp && (
            <View className="flex-row justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('offline.lastSync')}
              </Text>
              <Text className="text-sm text-gray-600 dark:text-gray-400">
                {new Date(lastSyncTimestamp).toLocaleString()}
              </Text>
            </View>
          )}
        </View>

        <View className="mt-6 space-y-3">
          {!syncInProgress && pendingItems > 0 && (
            <TouchableOpacity
              onPress={handleSyncPress}
              className="bg-primary-500 rounded-lg p-3 items-center"
            >
              <Text className="text-white font-medium">
                {t('offline.syncNow')}
              </Text>
            </TouchableOpacity>
          )}

          {failedItems > 0 && (
            <View className="flex-row space-x-3">
              <TouchableOpacity
                onPress={retryFailed}
                className="flex-1 bg-orange-500 rounded-lg p-3 items-center"
              >
                <Text className="text-white font-medium">
                  {t('offline.retryFailed')}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={clearFailed}
                className="flex-1 bg-gray-500 rounded-lg p-3 items-center"
              >
                <Text className="text-white font-medium">
                  {t('offline.clearFailed')}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  }

  return null;
};