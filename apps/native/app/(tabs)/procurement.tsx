import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  TextInput,
  FlatList,
  RefreshControl,
  Alert
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { useDatabase, useLocalDatabase } from '@/contexts/database-context';
import { usePDFExport } from '@/hooks/use-pdf-export';
import { TABLES } from '@/lib/database';
import { SyncStatus } from '@/components/sync-status';

interface Tender {
  id: string;
  title_en: string;
  title_bn: string;
  organization_en: string;
  organization_bn: string;
  amount: number;
  deadline: string;
  risk_score: number;
  risk_flags: string;
  submission_start: string;
  submission_end: string;
  tender_type: string;
  procurement_method: string;
  created_at: string;
}

interface FilterState {
  riskLevel: 'all' | 'low' | 'medium' | 'high';
  tenderType: 'all' | 'goods' | 'services' | 'works';
  amountRange: 'all' | 'small' | 'medium' | 'large';
  sortBy: 'date' | 'amount' | 'risk' | 'deadline';
  sortOrder: 'asc' | 'desc';
}

export default function ProcurementScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { isInitialized } = useDatabase();
  const { exportTenderList, isExporting } = usePDFExport();
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [filteredTenders, setFilteredTenders] = useState<Tender[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    riskLevel: 'all',
    tenderType: 'all',
    amountRange: 'all',
    sortBy: 'date',
    sortOrder: 'desc'
  });

  const isEnglish = i18n.language === 'en';

  useEffect(() => {
    if (isInitialized) {
      loadTenders();
    }
  }, [isInitialized]);

  useEffect(() => {
    applyFiltersAndSearch();
  }, [tenders, searchQuery, filters]);

  const loadTenders = async () => {
    try {
      setIsLoading(true);
      
      if (!isInitialized) {
        console.log('Database not initialized yet');
        return;
      }
      
      const db = useLocalDatabase();
      
      const result = await db.getAllAsync<Tender>(
        `SELECT * FROM ${TABLES.TENDERS} ORDER BY created_at DESC LIMIT 100`
      );
      
      console.log(`Loaded ${result.length} tenders from database`);
      setTenders(result);
    } catch (error) {
      console.error('Failed to load tenders:', error);
      Alert.alert(
        t('common.error'),
        'Failed to load tenders from local database'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTenders();
    setRefreshing(false);
  };

  const applyFiltersAndSearch = () => {
    let filtered = [...tenders];

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(tender => 
        tender.title_en.toLowerCase().includes(query) ||
        tender.title_bn.toLowerCase().includes(query) ||
        tender.organization_en.toLowerCase().includes(query) ||
        tender.organization_bn.toLowerCase().includes(query)
      );
    }

    // Apply risk level filter
    if (filters.riskLevel !== 'all') {
      filtered = filtered.filter(tender => {
        const risk = tender.risk_score;
        switch (filters.riskLevel) {
          case 'low': return risk < 30;
          case 'medium': return risk >= 30 && risk < 70;
          case 'high': return risk >= 70;
          default: return true;
        }
      });
    }

    // Apply tender type filter
    if (filters.tenderType !== 'all') {
      filtered = filtered.filter(tender => 
        tender.tender_type.toLowerCase() === filters.tenderType
      );
    }

    // Apply amount range filter
    if (filters.amountRange !== 'all') {
      filtered = filtered.filter(tender => {
        const amount = tender.amount;
        switch (filters.amountRange) {
          case 'small': return amount < 1000000; // < 10 lakh
          case 'medium': return amount >= 1000000 && amount < 10000000; // 10 lakh - 1 crore
          case 'large': return amount >= 10000000; // > 1 crore
          default: return true;
        }
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (filters.sortBy) {
        case 'date':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case 'amount':
          comparison = a.amount - b.amount;
          break;
        case 'risk':
          comparison = a.risk_score - b.risk_score;
          break;
        case 'deadline':
          comparison = new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
          break;
      }
      
      return filters.sortOrder === 'desc' ? -comparison : comparison;
    });

    setFilteredTenders(filtered);
  };

  const getRiskColor = (riskScore: number) => {
    if (riskScore >= 70) return '#dc2626'; // High risk - red
    if (riskScore >= 30) return '#ea580c'; // Medium risk - orange
    return '#84cc16'; // Low risk - green
  };

  const getRiskLabel = (riskScore: number) => {
    if (riskScore >= 70) return 'High Risk';
    if (riskScore >= 30) return 'Medium Risk';
    return 'Low Risk';
  };

  const formatAmount = (amount: number) => {
    if (amount >= 10000000) {
      return `${(amount / 10000000).toFixed(1)}${isEnglish ? ' Cr' : ' কোটি'}`;
    } else if (amount >= 100000) {
      return `${(amount / 100000).toFixed(1)}${isEnglish ? ' Lakh' : ' লক্ষ'}`;
    }
    return amount.toLocaleString();
  };

  const renderTenderCard = ({ item, index }: { item: Tender; index: number }) => (
    <MotiView
      from={{ opacity: 0, translateY: 20 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 600, delay: index * 100 }}
      className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-3 shadow-sm border border-gray-100 dark:border-gray-700"
    >
      <TouchableOpacity
        onPress={() => {
          router.push(`/tender-detail?id=${item.id}`);
        }}
        activeOpacity={0.7}
      >
        {/* Header with risk score */}
        <View className="flex-row justify-between items-start mb-3">
          <View className="flex-1 mr-3">
            <Text className="text-lg font-bold text-gray-900 dark:text-white">
              {isEnglish ? item.title_en : item.title_bn}
            </Text>
            <Text className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {isEnglish ? item.organization_en : item.organization_bn}
            </Text>
          </View>
          
          <View 
            className="px-3 py-1 rounded-full"
            style={{ backgroundColor: getRiskColor(item.risk_score) + '20' }}
          >
            <Text 
              className="text-xs font-bold"
              style={{ color: getRiskColor(item.risk_score) }}
            >
              {item.risk_score}%
            </Text>
          </View>
        </View>

        {/* Details */}
        <View className="space-y-2">
          <View className="flex-row justify-between items-center">
            <View className="flex-row items-center">
              <Ionicons name="cash" size={16} color="#6b7280" />
              <Text className="text-sm text-gray-600 dark:text-gray-400 ml-1">
                {formatAmount(item.amount)}
              </Text>
            </View>
            
            <View className="flex-row items-center">
              <Ionicons name="time" size={16} color="#6b7280" />
              <Text className="text-sm text-gray-600 dark:text-gray-400 ml-1">
                {new Date(item.deadline).toLocaleDateString()}
              </Text>
            </View>
          </View>

          <View className="flex-row justify-between items-center">
            <Text 
              className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
            >
              {item.tender_type}
            </Text>
            
            <Text 
              className="text-xs font-medium"
              style={{ color: getRiskColor(item.risk_score) }}
            >
              {getRiskLabel(item.risk_score)}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </MotiView>
  );

  const renderFilterChip = (
    label: string, 
    active: boolean, 
    onPress: () => void
  ) => (
    <TouchableOpacity
      onPress={onPress}
      className={`px-3 py-2 rounded-full mr-2 ${
        active 
          ? 'bg-primary-500' 
          : 'bg-gray-100 dark:bg-gray-700'
      }`}
    >
      <Text className={`text-xs font-medium ${
        active 
          ? 'text-white' 
          : 'text-gray-700 dark:text-gray-300'
      }`}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const getStats = () => {
    const total = tenders.length;
    const highRisk = tenders.filter(t => t.risk_score >= 70).length;
    const mediumRisk = tenders.filter(t => t.risk_score >= 30 && t.risk_score < 70).length;
    const lowRisk = tenders.filter(t => t.risk_score < 30).length;
    
    return { total, highRisk, mediumRisk, lowRisk };
  };

  const stats = getStats();

  if (!isInitialized) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50 dark:bg-gray-900">
        <Text className="text-gray-600 dark:text-gray-400">
          {t('common.loading')}
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      {/* Sync Status Banner */}
      <SyncStatus variant="banner" />
      
      {/* Header with Stats */}
      <View className="bg-white dark:bg-gray-800 px-4 py-4 border-b border-gray-200 dark:border-gray-700">
        <View className="flex-row justify-between items-center mb-3">
          <Text className="text-xl font-bold text-gray-900 dark:text-white">
            {t('modules.procureLens.name')}
          </Text>
          
          <View className="flex-row space-x-2">
            <TouchableOpacity
              onPress={handleExportList}
              className="flex-row items-center bg-green-100 dark:bg-green-800 px-3 py-2 rounded-full"
              disabled={isExporting || filteredTenders.length === 0}
            >
              {isExporting ? (
                <MotiView
                  animate={{ rotate: '360deg' }}
                  transition={{ type: 'timing', duration: 1000, loop: true }}
                >
                  <Ionicons name="sync" size={16} color="#059669" />
                </MotiView>
              ) : (
                <Ionicons name="download" size={16} color="#059669" />
              )}
              <Text className="text-sm text-green-700 dark:text-green-300 ml-1">
                {isExporting ? 'Exporting...' : 'Export'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={() => setShowFilters(!showFilters)}
              className="flex-row items-center bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded-full"
            >
              <Ionicons name="options" size={16} color="#6b7280" />
              <Text className="text-sm text-gray-600 dark:text-gray-400 ml-1">
                {t('common.filter')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Quick Stats */}
        <View className="flex-row justify-between">
          <View className="items-center">
            <Text className="text-lg font-bold text-gray-900 dark:text-white">
              {stats.total}
            </Text>
            <Text className="text-xs text-gray-600 dark:text-gray-400">
              Total
            </Text>
          </View>
          
          <View className="items-center">
            <Text className="text-lg font-bold text-red-600">
              {stats.highRisk}
            </Text>
            <Text className="text-xs text-gray-600 dark:text-gray-400">
              High Risk
            </Text>
          </View>
          
          <View className="items-center">
            <Text className="text-lg font-bold text-orange-600">
              {stats.mediumRisk}
            </Text>
            <Text className="text-xs text-gray-600 dark:text-gray-400">
              Medium
            </Text>
          </View>
          
          <View className="items-center">
            <Text className="text-lg font-bold text-green-600">
              {stats.lowRisk}
            </Text>
            <Text className="text-xs text-gray-600 dark:text-gray-400">
              Low Risk
            </Text>
          </View>
        </View>
      </View>

      {/* Search Bar */}
      <View className="bg-white dark:bg-gray-800 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <View className="flex-row items-center bg-gray-100 dark:bg-gray-700 rounded-xl px-3 py-2">
          <Ionicons name="search" size={20} color="#6b7280" />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={t('modules.procureLens.searchPlaceholder')}
            placeholderTextColor="#9ca3af"
            className="flex-1 ml-2 text-gray-900 dark:text-white"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#6b7280" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter Bar */}
      {showFilters && (
        <View className="bg-white dark:bg-gray-800 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row">
              {renderFilterChip(
                'All Risk',
                filters.riskLevel === 'all',
                () => setFilters(prev => ({ ...prev, riskLevel: 'all' }))
              )}
              {renderFilterChip(
                'High Risk',
                filters.riskLevel === 'high',
                () => setFilters(prev => ({ ...prev, riskLevel: 'high' }))
              )}
              {renderFilterChip(
                'Medium Risk',
                filters.riskLevel === 'medium',
                () => setFilters(prev => ({ ...prev, riskLevel: 'medium' }))
              )}
              {renderFilterChip(
                'Low Risk',
                filters.riskLevel === 'low',
                () => setFilters(prev => ({ ...prev, riskLevel: 'low' }))
              )}
            </View>
          </ScrollView>
        </View>
      )}

      {/* Tender List */}
      <FlatList
        data={filteredTenders}
        renderItem={renderTenderCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View className="items-center justify-center py-12">
            <Ionicons name="document-text-outline" size={64} color="#9ca3af" />
            <Text className="text-gray-500 dark:text-gray-400 text-center mt-4">
              {isLoading 
                ? t('common.loading') 
                : t('modules.procureLens.noTenders')
              }
            </Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}