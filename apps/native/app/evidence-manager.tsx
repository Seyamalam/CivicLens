import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  FlatList
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useDatabase, useLocalDatabase } from '@/contexts/database-context';
import { TABLES } from '@/lib/database';

interface StoredEvidence {
  id: string;
  type: 'export' | 'audio';
  filename: string;
  filepath: string;
  size: number;
  created: string;
  modified: string;
}

interface EvidenceStats {
  totalFiles: number;
  totalSize: number;
  audioFiles: number;
  exportFiles: number;
  lastActivity: string;
}

export default function EvidenceManagerScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { isInitialized } = useDatabase();
  
  const [evidenceFiles, setEvidenceFiles] = useState<StoredEvidence[]>([]);
  const [stats, setStats] = useState<EvidenceStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  const isEnglish = i18n.language === 'en';

  useEffect(() => {
    if (isInitialized) {
      loadEvidenceFiles();
    }
  }, [isInitialized]);

  const loadEvidenceFiles = async () => {
    try {
      setIsLoading(true);
      const files: StoredEvidence[] = [];
      let totalSize = 0;
      let audioCount = 0;
      let exportCount = 0;
      let lastActivity = '';

      // Load audio evidence files
      const evidenceDir = `${FileSystem.documentDirectory}evidence/`;
      try {
        const evidenceDirInfo = await FileSystem.getInfoAsync(evidenceDir);
        if (evidenceDirInfo.exists) {
          const audioFiles = await FileSystem.readDirectoryAsync(evidenceDir);
          
          for (const filename of audioFiles) {
            if (filename.endsWith('.m4a') || filename.endsWith('.mp3') || filename.endsWith('.wav')) {
              const filepath = evidenceDir + filename;
              const fileInfo = await FileSystem.getInfoAsync(filepath);
              
              if (fileInfo.exists) {
                files.push({
                  id: `audio_${filename}`,
                  type: 'audio',
                  filename,
                  filepath,
                  size: fileInfo.size || 0,
                  created: new Date(fileInfo.modificationTime || 0).toISOString(),
                  modified: new Date(fileInfo.modificationTime || 0).toISOString()
                });
                
                totalSize += fileInfo.size || 0;
                audioCount++;
                
                const fileDate = new Date(fileInfo.modificationTime || 0).toISOString();
                if (!lastActivity || fileDate > lastActivity) {
                  lastActivity = fileDate;
                }
              }
            }
          }
        }
      } catch (error) {
        console.warn('Failed to load audio evidence files:', error);
      }

      // Load export files
      const exportsDir = `${FileSystem.documentDirectory}exports/`;
      try {
        const exportsDirInfo = await FileSystem.getInfoAsync(exportsDir);
        if (exportsDirInfo.exists) {
          const exportFiles = await FileSystem.readDirectoryAsync(exportsDir);
          
          for (const filename of exportFiles) {
            if (filename.endsWith('.csv') || filename.endsWith('.pdf')) {
              const filepath = exportsDir + filename;
              const fileInfo = await FileSystem.getInfoAsync(filepath);
              
              if (fileInfo.exists) {
                files.push({
                  id: `export_${filename}`,
                  type: 'export',
                  filename,
                  filepath,
                  size: fileInfo.size || 0,
                  created: new Date(fileInfo.modificationTime || 0).toISOString(),
                  modified: new Date(fileInfo.modificationTime || 0).toISOString()
                });
                
                totalSize += fileInfo.size || 0;
                exportCount++;
                
                const fileDate = new Date(fileInfo.modificationTime || 0).toISOString();
                if (!lastActivity || fileDate > lastActivity) {
                  lastActivity = fileDate;
                }
              }
            }
          }
        }
      } catch (error) {
        console.warn('Failed to load export files:', error);
      }

      // Sort files by modification date (newest first)
      files.sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime());

      setEvidenceFiles(files);
      setStats({
        totalFiles: files.length,
        totalSize,
        audioFiles: audioCount,
        exportFiles: exportCount,
        lastActivity
      });
    } catch (error) {
      console.error('Failed to load evidence files:', error);
      Alert.alert('Error', 'Failed to load evidence files');
    } finally {
      setIsLoading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (type: string, filename: string): string => {
    if (type === 'audio') return 'musical-notes';
    if (filename.endsWith('.pdf')) return 'document-text';
    if (filename.endsWith('.csv')) return 'grid';
    return 'document';
  };

  const getFileColor = (type: string, filename: string): string => {
    if (type === 'audio') return '#ef4444';
    if (filename.endsWith('.pdf')) return '#dc2626';
    if (filename.endsWith('.csv')) return '#16a34a';
    return '#6b7280';
  };

  const toggleFileSelection = (fileId: string) => {
    const newSelected = new Set(selectedFiles);
    if (newSelected.has(fileId)) {
      newSelected.delete(fileId);
    } else {
      newSelected.add(fileId);
    }
    setSelectedFiles(newSelected);
  };

  const selectAllFiles = () => {
    if (selectedFiles.size === evidenceFiles.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(evidenceFiles.map(f => f.id)));
    }
  };

  const shareFile = async (file: StoredEvidence) => {
    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('Error', 'Sharing is not available on this device');
        return;
      }

      await Sharing.shareAsync(file.filepath, {
        mimeType: file.type === 'audio' ? 'audio/m4a' : 
                  file.filename.endsWith('.pdf') ? 'application/pdf' : 'text/csv',
        dialogTitle: `Share ${file.filename}`
      });
    } catch (error) {
      console.error('Share error:', error);
      Alert.alert('Error', 'Failed to share file');
    }
  };

  const deleteSelectedFiles = async () => {
    if (selectedFiles.size === 0) return;

    Alert.alert(
      'Delete Files',
      `Are you sure you want to delete ${selectedFiles.size} selected file(s)? This action cannot be undone.`,
      [
        { text: 'Cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsDeleting(true);
              
              for (const fileId of selectedFiles) {
                const file = evidenceFiles.find(f => f.id === fileId);
                if (file) {
                  await FileSystem.deleteAsync(file.filepath, { idempotent: true });
                }
              }
              
              setSelectedFiles(new Set());
              await loadEvidenceFiles();
              
              Alert.alert('Success', `${selectedFiles.size} file(s) deleted successfully`);
            } catch (error) {
              console.error('Delete error:', error);
              Alert.alert('Error', 'Failed to delete some files');
            } finally {
              setIsDeleting(false);
            }
          }
        }
      ]
    );
  };

  const renderStatsCard = () => (
    <MotiView
      from={{ opacity: 0, translateY: 20 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 500 }}
      className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-4"
    >
      <Text className="font-bold text-gray-900 dark:text-white mb-3">
        📊 Evidence Storage Overview
      </Text>
      
      {stats ? (
        <View className="space-y-3">
          <View className="flex-row justify-between">
            <Text className="text-gray-600 dark:text-gray-400">Total Files:</Text>
            <Text className="font-medium text-gray-900 dark:text-white">
              {stats.totalFiles}
            </Text>
          </View>
          
          <View className="flex-row justify-between">
            <Text className="text-gray-600 dark:text-gray-400">Storage Used:</Text>
            <Text className="font-medium text-gray-900 dark:text-white">
              {formatFileSize(stats.totalSize)}
            </Text>
          </View>
          
          <View className="flex-row justify-between">
            <Text className="text-gray-600 dark:text-gray-400">Audio Files:</Text>
            <Text className="font-medium text-red-600 dark:text-red-400">
              {stats.audioFiles}
            </Text>
          </View>
          
          <View className="flex-row justify-between">
            <Text className="text-gray-600 dark:text-gray-400">Export Files:</Text>
            <Text className="font-medium text-blue-600 dark:text-blue-400">
              {stats.exportFiles}
            </Text>
          </View>
          
          <View className="flex-row justify-between">
            <Text className="text-gray-600 dark:text-gray-400">Last Activity:</Text>
            <Text className="font-medium text-gray-900 dark:text-white">
              {stats.lastActivity ? new Date(stats.lastActivity).toLocaleDateString() : 'None'}
            </Text>
          </View>
        </View>
      ) : (
        <ActivityIndicator size="small" color="#0891b2" />
      )}
    </MotiView>
  );

  const renderFileItem = ({ item, index }: { item: StoredEvidence; index: number }) => (
    <MotiView
      from={{ opacity: 0, translateX: -20 }}
      animate={{ opacity: 1, translateX: 0 }}
      transition={{ type: 'timing', duration: 500, delay: index * 50 }}
      className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-3 shadow-sm border border-gray-100 dark:border-gray-700"
    >
      <View className="flex-row items-center">
        <TouchableOpacity
          onPress={() => toggleFileSelection(item.id)}
          className="mr-3"
        >
          <View className={`w-6 h-6 rounded border-2 items-center justify-center ${
            selectedFiles.has(item.id)
              ? 'bg-blue-500 border-blue-500'
              : 'border-gray-300 dark:border-gray-600'
          }`}>
            {selectedFiles.has(item.id) && (
              <Ionicons name="checkmark" size={16} color="white" />
            )}
          </View>
        </TouchableOpacity>
        
        <View 
          className="w-10 h-10 rounded-full items-center justify-center mr-3"
          style={{ backgroundColor: getFileColor(item.type, item.filename) + '20' }}
        >
          <Ionicons 
            name={getFileIcon(item.type, item.filename) as any} 
            size={20} 
            color={getFileColor(item.type, item.filename)} 
          />
        </View>
        
        <View className="flex-1">
          <Text className="font-medium text-gray-900 dark:text-white" numberOfLines={1}>
            {item.filename}
          </Text>
          <Text className="text-sm text-gray-600 dark:text-gray-400">
            {formatFileSize(item.size)} • {new Date(item.modified).toLocaleDateString()}
          </Text>
          <Text className="text-xs text-gray-500 dark:text-gray-500 mt-1">
            {item.type === 'audio' ? '🎤 Audio Evidence' : '📄 Export Bundle'}
          </Text>
        </View>
        
        <TouchableOpacity
          onPress={() => shareFile(item)}
          className="ml-2 p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg"
        >
          <Ionicons name="share" size={16} color="#3b82f6" />
        </TouchableOpacity>
      </View>
    </MotiView>
  );

  if (!isInitialized) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50 dark:bg-gray-900">
        <ActivityIndicator size="large" color="#0891b2" />
        <Text className="text-gray-600 dark:text-gray-400 mt-2">
          {t('common.loading')}
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <View className="bg-gradient-to-r from-purple-600 to-blue-600 px-4 py-6">
        <View className="flex-row items-center">
          <TouchableOpacity 
            onPress={() => router.back()}
            className="mr-4"
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-white text-xl font-bold">
              Evidence Manager
            </Text>
            <Text className="text-white/80 text-sm mt-1">
              Manage stored evidence and export files
            </Text>
          </View>
          
          {evidenceFiles.length > 0 && (
            <TouchableOpacity
              onPress={selectAllFiles}
              className="bg-white/20 px-3 py-1 rounded-lg"
            >
              <Text className="text-white text-sm font-medium">
                {selectedFiles.size === evidenceFiles.length ? 'Deselect All' : 'Select All'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView className="flex-1 p-4">
        {renderStatsCard()}
        
        {/* Action Buttons */}
        {selectedFiles.size > 0 && (
          <MotiView
            from={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'timing', duration: 300 }}
            className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 mb-4"
          >
            <View className="flex-row items-center justify-between">
              <Text className="font-medium text-red-800 dark:text-red-200">
                {selectedFiles.size} file(s) selected
              </Text>
              
              <TouchableOpacity
                onPress={deleteSelectedFiles}
                className="bg-red-500 px-4 py-2 rounded-lg"
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <View className="flex-row items-center">
                    <Ionicons name="trash" size={16} color="white" />
                    <Text className="text-white font-medium ml-1">Delete</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </MotiView>
        )}
        
        {/* Files List */}
        {isLoading ? (
          <View className="items-center py-12">
            <ActivityIndicator size="large" color="#0891b2" />
            <Text className="text-gray-600 dark:text-gray-400 mt-2">
              Loading evidence files...
            </Text>
          </View>
        ) : evidenceFiles.length > 0 ? (
          <FlatList
            data={evidenceFiles}
            renderItem={renderFileItem}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            nestedScrollEnabled={true}
          />
        ) : (
          <View className="items-center py-12">
            <Ionicons name="folder-open-outline" size={64} color="#9ca3af" />
            <Text className="text-gray-500 dark:text-gray-400 text-center mt-4">
              No evidence files found
            </Text>
            <Text className="text-gray-400 dark:text-gray-500 text-center text-sm mt-2">
              Create bribe logs and exports to see files here
            </Text>
            
            <TouchableOpacity
              onPress={() => router.push('/fairline-logger')}
              className="mt-4 bg-red-500 px-4 py-2 rounded-lg"
            >
              <Text className="text-white font-medium">Create Bribe Log</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}