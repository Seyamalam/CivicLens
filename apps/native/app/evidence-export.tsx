import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Switch
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { useDatabase } from '@/contexts/database-context';
import { EvidenceExportService, EvidenceBundle } from '@/lib/evidence-export';

interface ExportOptions {
  format: 'CSV' | 'PDF';
  includeAudio: boolean;
  verifyChain: boolean;
  dateFrom: string | null;
  dateTo: string | null;
}

interface ExportStats {
  totalReports: number;
  totalExports: number;
  lastExportDate: string | null;
  exportFormats: { CSV: number; PDF: number };
}

export default function EvidenceExportScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { isInitialized } = useDatabase();
  
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'PDF',
    includeAudio: true,
    verifyChain: true,
    dateFrom: null,
    dateTo: null
  });
  
  const [isExporting, setIsExporting] = useState(false);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [exportStats, setExportStats] = useState<ExportStats | null>(null);
  const [lastBundle, setLastBundle] = useState<EvidenceBundle | null>(null);

  const isEnglish = i18n.language === 'en';

  useEffect(() => {
    if (isInitialized) {
      loadExportStats();
    }
  }, [isInitialized]);

  const loadExportStats = async () => {
    try {
      setIsLoadingStats(true);
      const exportService = EvidenceExportService.getInstance();
      const stats = await exportService.getExportStatistics();
      setExportStats(stats);
    } catch (error) {
      console.error('Failed to load export stats:', error);
    } finally {
      setIsLoadingStats(false);
    }
  };

  const generatePreview = async () => {
    try {
      setIsExporting(true);
      const exportService = EvidenceExportService.getInstance();
      
      const bundle = await exportService.generateEvidenceBundle({
        dateFrom: exportOptions.dateFrom || undefined,
        dateTo: exportOptions.dateTo || undefined,
        includeAudio: exportOptions.includeAudio,
        verifyChain: exportOptions.verifyChain
      });
      
      setLastBundle(bundle);
      
      if (bundle.reports.length === 0) {
        Alert.alert(
          'No Reports Found',
          'There are no bribe logs available for export with the current filters.',
          [{ text: 'OK' }]
        );
        return;
      }
      
      Alert.alert(
        'Preview Ready',
        `Found ${bundle.reports.length} reports ready for export.\n\nChain Integrity: ${bundle.metadata.chain_integrity}\nVerified Blocks: ${bundle.chain_verification.verified_blocks}/${bundle.chain_verification.total_blocks}`,
        [
          { text: 'Cancel' },
          { text: 'Export', onPress: () => performExport(bundle) }
        ]
      );
    } catch (error) {
      console.error('Export preview error:', error);
      Alert.alert('Error', 'Failed to generate export preview. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const performExport = async (bundle: EvidenceBundle) => {
    try {
      setIsExporting(true);
      const exportService = EvidenceExportService.getInstance();
      
      await exportService.shareEvidenceBundle(bundle, exportOptions.format);
      
      // Refresh stats after successful export
      await loadExportStats();
      
      Alert.alert(
        'Export Successful',
        `Evidence bundle exported as ${exportOptions.format}. The file has been saved and shared.`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Export Failed', 'Failed to export evidence bundle. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const cleanupOldExports = async () => {
    try {
      Alert.alert(
        'Cleanup Old Exports',
        'This will delete export files older than 30 days. Continue?',
        [
          { text: 'Cancel' },
          {
            text: 'Cleanup',
            onPress: async () => {
              const exportService = EvidenceExportService.getInstance();
              const deletedCount = await exportService.cleanupOldExports(30);
              
              await loadExportStats();
              
              Alert.alert(
                'Cleanup Complete',
                `${deletedCount} old export files were deleted.`,
                [{ text: 'OK' }]
              );
            }
          }
        ]
      );
    } catch (error) {
      console.error('Cleanup error:', error);
      Alert.alert('Error', 'Failed to cleanup old exports.');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const renderStatsCard = () => (
    <MotiView
      from={{ opacity: 0, translateY: 20 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 500 }}
      className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-4"
    >
      <Text className="font-bold text-gray-900 dark:text-white mb-3">
        📊 Export Statistics
      </Text>
      
      {isLoadingStats ? (
        <View className="items-center py-4">
          <ActivityIndicator size="small" color="#0891b2" />
          <Text className="text-gray-500 dark:text-gray-400 mt-2">Loading statistics...</Text>
        </View>
      ) : exportStats ? (
        <View className="space-y-3">
          <View className="flex-row justify-between">
            <Text className="text-gray-600 dark:text-gray-400">Total Reports:</Text>
            <Text className="font-medium text-gray-900 dark:text-white">
              {exportStats.totalReports}
            </Text>
          </View>
          
          <View className="flex-row justify-between">
            <Text className="text-gray-600 dark:text-gray-400">Total Exports:</Text>
            <Text className="font-medium text-gray-900 dark:text-white">
              {exportStats.totalExports}
            </Text>
          </View>
          
          <View className="flex-row justify-between">
            <Text className="text-gray-600 dark:text-gray-400">CSV Exports:</Text>
            <Text className="font-medium text-gray-900 dark:text-white">
              {exportStats.exportFormats.CSV}
            </Text>
          </View>
          
          <View className="flex-row justify-between">
            <Text className="text-gray-600 dark:text-gray-400">PDF Exports:</Text>
            <Text className="font-medium text-gray-900 dark:text-white">
              {exportStats.exportFormats.PDF}
            </Text>
          </View>
          
          <View className="flex-row justify-between">
            <Text className="text-gray-600 dark:text-gray-400">Last Export:</Text>
            <Text className="font-medium text-gray-900 dark:text-white">
              {exportStats.lastExportDate 
                ? new Date(exportStats.lastExportDate).toLocaleDateString()
                : 'Never'
              }
            </Text>
          </View>
          
          {exportStats.totalExports > 0 && (
            <TouchableOpacity
              onPress={cleanupOldExports}
              className="flex-row items-center justify-center p-2 bg-red-100 dark:bg-red-900/30 rounded-lg mt-2"
            >
              <Ionicons name="trash" size={16} color="#ef4444" />
              <Text className="text-red-600 dark:text-red-400 ml-2 text-sm font-medium">
                Cleanup Old Exports
              </Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <Text className="text-gray-500 dark:text-gray-400 text-center py-4">
          Failed to load statistics
        </Text>
      )}
    </MotiView>
  );

  const renderFormatSelector = () => (
    <MotiView
      from={{ opacity: 0, translateY: 20 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 500, delay: 200 }}
      className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-4"
    >
      <Text className="font-bold text-gray-900 dark:text-white mb-3">
        📄 Export Format
      </Text>
      
      <View className="flex-row space-x-3">
        <TouchableOpacity
          onPress={() => setExportOptions(prev => ({ ...prev, format: 'PDF' }))}
          className={`flex-1 p-3 rounded-lg border-2 ${
            exportOptions.format === 'PDF' 
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30' 
              : 'border-gray-200 dark:border-gray-600'
          }`}
        >
          <View className="items-center">
            <Ionicons 
              name="document-text" 
              size={24} 
              color={exportOptions.format === 'PDF' ? '#3b82f6' : '#6b7280'} 
            />
            <Text className={`mt-2 font-medium ${
              exportOptions.format === 'PDF' 
                ? 'text-blue-600 dark:text-blue-400' 
                : 'text-gray-600 dark:text-gray-400'
            }`}>
              PDF Report
            </Text>
            <Text className="text-xs text-gray-500 dark:text-gray-400 text-center mt-1">
              Professional formatted document for legal use
            </Text>
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity
          onPress={() => setExportOptions(prev => ({ ...prev, format: 'CSV' }))}
          className={`flex-1 p-3 rounded-lg border-2 ${
            exportOptions.format === 'CSV' 
              ? 'border-green-500 bg-green-50 dark:bg-green-900/30' 
              : 'border-gray-200 dark:border-gray-600'
          }`}
        >
          <View className="items-center">
            <Ionicons 
              name="grid" 
              size={24} 
              color={exportOptions.format === 'CSV' ? '#10b981' : '#6b7280'} 
            />
            <Text className={`mt-2 font-medium ${
              exportOptions.format === 'CSV' 
                ? 'text-green-600 dark:text-green-400' 
                : 'text-gray-600 dark:text-gray-400'
            }`}>
              CSV Data
            </Text>
            <Text className="text-xs text-gray-500 dark:text-gray-400 text-center mt-1">
              Spreadsheet format for data analysis
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    </MotiView>
  );

  const renderExportOptions = () => (
    <MotiView
      from={{ opacity: 0, translateY: 20 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 500, delay: 400 }}
      className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-4"
    >
      <Text className="font-bold text-gray-900 dark:text-white mb-3">
        ⚙️ Export Options
      </Text>
      
      <View className="space-y-4">
        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <Text className="font-medium text-gray-900 dark:text-white">
              Include Audio Evidence Metadata
            </Text>
            <Text className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Mark reports that have voice recordings attached
            </Text>
          </View>
          <Switch
            value={exportOptions.includeAudio}
            onValueChange={(value) => setExportOptions(prev => ({ ...prev, includeAudio: value }))}
            trackColor={{ false: '#e5e7eb', true: '#10b981' }}
            thumbColor={exportOptions.includeAudio ? '#ffffff' : '#f9fafb'}
          />
        </View>
        
        <View className="h-px bg-gray-200 dark:bg-gray-600" />
        
        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <Text className="font-medium text-gray-900 dark:text-white">
              Verify Hash Chain Integrity
            </Text>
            <Text className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Perform cryptographic verification before export
            </Text>
          </View>
          <Switch
            value={exportOptions.verifyChain}
            onValueChange={(value) => setExportOptions(prev => ({ ...prev, verifyChain: value }))}
            trackColor={{ false: '#e5e7eb', true: '#3b82f6' }}
            thumbColor={exportOptions.verifyChain ? '#ffffff' : '#f9fafb'}
          />
        </View>
      </View>
    </MotiView>
  );

  const renderPreviewInfo = () => {
    if (!lastBundle) return null;
    
    return (
      <MotiView
        from={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'timing', duration: 500 }}
        className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 mb-4"
      >
        <Text className="font-bold text-blue-800 dark:text-blue-200 mb-3">
          📋 Last Preview
        </Text>
        
        <View className="space-y-2">
          <View className="flex-row justify-between">
            <Text className="text-blue-700 dark:text-blue-300">Reports Found:</Text>
            <Text className="text-blue-600 dark:text-blue-400 font-medium">
              {lastBundle.metadata.total_reports}
            </Text>
          </View>
          
          <View className="flex-row justify-between">
            <Text className="text-blue-700 dark:text-blue-300">Chain Integrity:</Text>
            <Text className={`font-medium ${
              lastBundle.metadata.chain_integrity === 'VERIFIED' 
                ? 'text-green-600 dark:text-green-400'
                : lastBundle.metadata.chain_integrity === 'CORRUPTED'
                ? 'text-red-600 dark:text-red-400'
                : 'text-orange-600 dark:text-orange-400'
            }`}>
              {lastBundle.metadata.chain_integrity}
            </Text>
          </View>
          
          <View className="flex-row justify-between">
            <Text className="text-blue-700 dark:text-blue-300">Date Range:</Text>
            <Text className="text-blue-600 dark:text-blue-400 font-medium text-xs">
              {lastBundle.metadata.date_range.from 
                ? `${new Date(lastBundle.metadata.date_range.from).toLocaleDateString()} - ${new Date(lastBundle.metadata.date_range.to).toLocaleDateString()}`
                : 'No data'
              }
            </Text>
          </View>
        </View>
      </MotiView>
    );
  };

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
      <View className="bg-gradient-to-r from-orange-500 to-red-500 px-4 py-6">
        <View className="flex-row items-center">
          <TouchableOpacity 
            onPress={() => router.back()}
            className="mr-4"
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-white text-xl font-bold">
              Evidence Export
            </Text>
            <Text className="text-white/80 text-sm mt-1">
              Export tamper-proof evidence bundles
            </Text>
          </View>
        </View>
      </View>

      <ScrollView className="flex-1 p-4">
        {renderStatsCard()}
        {renderFormatSelector()}
        {renderExportOptions()}
        {renderPreviewInfo()}
        
        {/* Legal Notice */}
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 500, delay: 600 }}
          className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-4 mb-4"
        >
          <View className="flex-row items-center mb-3">
            <Ionicons name="warning" size={20} color="#f59e0b" />
            <Text className="font-bold text-yellow-800 dark:text-yellow-200 ml-2">
              Legal Notice
            </Text>
          </View>
          
          <Text className="text-yellow-700 dark:text-yellow-300 text-sm leading-6">
            Evidence bundles contain sensitive information and should be handled securely. 
            Only share with authorized parties such as law enforcement, legal representatives, 
            or anti-corruption agencies. Misuse of this information may have legal consequences.
          </Text>
        </MotiView>

        {/* Export Actions */}
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 500, delay: 800 }}
          className="space-y-3"
        >
          <TouchableOpacity
            onPress={generatePreview}
            className="bg-blue-500 rounded-xl p-4 items-center"
            disabled={isExporting}
          >
            {isExporting ? (
              <View className="flex-row items-center">
                <ActivityIndicator size="small" color="white" />
                <Text className="text-white font-bold text-lg ml-2">
                  Generating Preview...
                </Text>
              </View>
            ) : (
              <View className="flex-row items-center">
                <Ionicons name="eye" size={20} color="white" />
                <Text className="text-white font-bold text-lg ml-2">
                  Preview & Export
                </Text>
              </View>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={() => router.push('/hash-chain-verification')}
            className="bg-gray-600 dark:bg-gray-700 rounded-xl p-3 items-center"
          >
            <View className="flex-row items-center">
              <Ionicons name="shield-checkmark" size={18} color="white" />
              <Text className="text-white font-medium ml-2">
                Verify Hash Chain Integrity
              </Text>
            </View>
          </TouchableOpacity>
        </MotiView>
      </ScrollView>
    </View>
  );
}