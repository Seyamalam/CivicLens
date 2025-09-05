import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  Alert
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { useDatabase, useLocalDatabase } from '@/contexts/database-context';
import { OverchargeReport, OverchargeReportService } from '@/lib/overcharge-service';
import { TABLES } from '@/lib/database';

interface DistrictReport extends OverchargeReport {
  service_name_en: string;
  service_name_bn: string;
}

export default function DistrictReportsScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { district } = useLocalSearchParams();
  const { isInitialized } = useDatabase();
  
  const [reports, setReports] = useState<DistrictReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalReports: 0,
    totalOvercharge: 0,
    averageOvercharge: 0,
    topService: '',
    recentDate: ''
  });

  const isEnglish = i18n.language === 'en';
  const districtName = district as string;

  useEffect(() => {
    if (isInitialized && districtName) {
      loadDistrictReports();
    }
  }, [isInitialized, districtName]);

  const loadDistrictReports = async () => {
    try {
      setIsLoading(true);
      const db = useLocalDatabase();
      
      // Get district reports with service information
      const districtReports = await db.getAllAsync<DistrictReport>(`
        SELECT 
          r.*,
          s.name_en as service_name_en,
          s.name_bn as service_name_bn
        FROM ${TABLES.OVERCHARGE_REPORTS} r
        JOIN ${TABLES.SERVICES} s ON r.service_id = s.id
        WHERE r.district = ?
        ORDER BY r.reported_at DESC
      `, [districtName]);

      setReports(districtReports);

      // Calculate statistics
      if (districtReports.length > 0) {
        const totalReports = districtReports.length;
        const totalOvercharge = districtReports.reduce((sum, r) => sum + r.overcharge_amount, 0);
        const averageOvercharge = totalOvercharge / totalReports;
        
        // Find most reported service
        const serviceCounts: Record<string, number> = {};
        districtReports.forEach(r => {
          const serviceName = isEnglish ? r.service_name_en : r.service_name_bn;
          serviceCounts[serviceName] = (serviceCounts[serviceName] || 0) + 1;
        });
        
        const topService = Object.entries(serviceCounts)
          .sort(([,a], [,b]) => b - a)[0]?.[0] || '';
        
        const recentDate = new Date(districtReports[0].reported_at).toLocaleDateString();
        
        setStats({
          totalReports,
          totalOvercharge,
          averageOvercharge,
          topService,
          recentDate
        });
      }
      
    } catch (error) {
      console.error('Failed to load district reports:', error);
      Alert.alert('Error', 'Failed to load district reports');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDistrictReports();
    setRefreshing(false);
  };

  const formatAmount = (amount: number): string => {
    if (amount >= 100000) {
      return `৳${(amount / 100000).toFixed(1)}L`;
    } else if (amount >= 1000) {
      return `৳${(amount / 1000).toFixed(1)}K`;
    }
    return `৳${amount}`;
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString();
  };

  const renderReportCard = ({ item, index }: { item: DistrictReport; index: number }) => (
    <MotiView
      from={{ opacity: 0, translateY: 20 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 600, delay: index * 100 }}
      className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-3 shadow-sm border border-gray-100 dark:border-gray-700"
    >
      {/* Header */}
      <View className="flex-row justify-between items-start mb-3">
        <View className="flex-1 mr-3">
          <Text className="text-lg font-bold text-gray-900 dark:text-white">
            {isEnglish ? item.service_name_en : item.service_name_bn}
          </Text>
          <Text className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {isEnglish ? item.office_name_en : item.office_name_bn}
          </Text>
        </View>
        
        <View className="items-end">
          <Text className="text-lg font-bold text-red-600">
            +{formatAmount(item.overcharge_amount)}
          </Text>
          <Text className="text-xs text-gray-500 dark:text-gray-400">
            overcharge
          </Text>
        </View>
      </View>

      {/* Fee Breakdown */}
      <View className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 mb-3">
        <View className="flex-row justify-between mb-2">
          <Text className="text-sm text-gray-600 dark:text-gray-400">
            Official Fee
          </Text>
          <Text className="text-sm font-medium text-gray-900 dark:text-white">
            ৳{item.official_fee}
          </Text>
        </View>
        
        <View className="flex-row justify-between mb-2">
          <Text className="text-sm text-gray-600 dark:text-gray-400">
            Amount Paid
          </Text>
          <Text className="text-sm font-medium text-orange-600">
            ৳{item.paid_fee}
          </Text>
        </View>
        
        <View className="h-px bg-gray-200 dark:bg-gray-600 my-2" />
        
        <View className="flex-row justify-between">
          <Text className="text-sm font-bold text-gray-900 dark:text-white">
            Overcharge
          </Text>
          <Text className="text-sm font-bold text-red-600">
            ৳{item.overcharge_amount}
          </Text>
        </View>
      </View>

      {/* Description */}
      {(item.description_en || item.description_bn) && (
        <View className="mb-3">
          <Text className="text-sm text-gray-700 dark:text-gray-300" numberOfLines={3}>
            {isEnglish ? item.description_en : item.description_bn}
          </Text>
        </View>
      )}

      {/* Footer */}
      <View className="flex-row justify-between items-center">
        <View className="flex-row items-center">
          <Ionicons name="calendar" size={14} color="#6b7280" />
          <Text className="text-xs text-gray-500 dark:text-gray-400 ml-1">
            {formatDate(item.reported_at)}
          </Text>
        </View>
        
        <View className="flex-row items-center">
          <Ionicons name="location" size={14} color="#6b7280" />
          <Text className="text-xs text-gray-500 dark:text-gray-400 ml-1">
            {item.upazila ? `${item.upazila}, ${item.district}` : item.district}
          </Text>
        </View>
        
        {item.is_anonymous && (
          <View className="flex-row items-center">
            <Ionicons name="shield-checkmark" size={14} color="#10b981" />
            <Text className="text-xs text-green-600 dark:text-green-400 ml-1">
              Anonymous
            </Text>
          </View>
        )}
      </View>
    </MotiView>
  );

  const renderServiceBreakdown = () => {
    const serviceStats: Record<string, { count: number; totalOvercharge: number }> = {};
    
    reports.forEach(report => {
      const serviceName = isEnglish ? report.service_name_en : report.service_name_bn;
      if (!serviceStats[serviceName]) {
        serviceStats[serviceName] = { count: 0, totalOvercharge: 0 };
      }
      serviceStats[serviceName].count += 1;
      serviceStats[serviceName].totalOvercharge += report.overcharge_amount;
    });

    const sortedServices = Object.entries(serviceStats)
      .sort(([,a], [,b]) => b.totalOvercharge - a.totalOvercharge)
      .slice(0, 5);

    return (
      <View className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-4">
        <Text className="font-bold text-gray-900 dark:text-white mb-3">
          Top Overcharged Services
        </Text>
        
        {sortedServices.map(([serviceName, data], index) => (
          <View key={serviceName} className="flex-row items-center justify-between p-3 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
            <View className="flex-1">
              <Text className="font-medium text-gray-900 dark:text-white" numberOfLines={1}>
                {serviceName}
              </Text>
              <Text className="text-sm text-gray-600 dark:text-gray-400">
                {data.count} report{data.count > 1 ? 's' : ''}
              </Text>
            </View>
            
            <Text className="font-bold text-red-600">
              {formatAmount(data.totalOvercharge)}
            </Text>
          </View>
        ))}
      </View>
    );
  };

  if (!isInitialized || isLoading) {
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
      {/* Header */}
      <View className="bg-white dark:bg-gray-800 px-4 py-6 border-b border-gray-200 dark:border-gray-700">
        <View className="flex-row items-center mb-4">
          <TouchableOpacity 
            onPress={() => router.back()}
            className="mr-4"
          >
            <Ionicons name="arrow-back" size={24} color="#6b7280" />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-xl font-bold text-gray-900 dark:text-white">
              {districtName} District
            </Text>
            <Text className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Overcharge reports and analysis
            </Text>
          </View>
        </View>
        
        {/* Statistics */}
        <View className="flex-row justify-between">
          <View className="items-center">
            <Text className="text-lg font-bold text-gray-900 dark:text-white">
              {stats.totalReports}
            </Text>
            <Text className="text-xs text-gray-600 dark:text-gray-400">
              Reports
            </Text>
          </View>
          
          <View className="items-center">
            <Text className="text-lg font-bold text-red-600">
              {formatAmount(stats.totalOvercharge)}
            </Text>
            <Text className="text-xs text-gray-600 dark:text-gray-400">
              Total Loss
            </Text>
          </View>
          
          <View className="items-center">
            <Text className="text-lg font-bold text-orange-600">
              {formatAmount(stats.averageOvercharge)}
            </Text>
            <Text className="text-xs text-gray-600 dark:text-gray-400">
              Average
            </Text>
          </View>
          
          <View className="items-center">
            <Text className="text-lg font-bold text-blue-600">
              {stats.recentDate}
            </Text>
            <Text className="text-xs text-gray-600 dark:text-gray-400">
              Latest
            </Text>
          </View>
        </View>
      </View>

      <ScrollView className="flex-1">
        <View className="p-4">
          {/* Most Affected Service */}
          {stats.topService && (
            <View className="bg-orange-100 dark:bg-orange-900/30 rounded-xl p-4 mb-4">
              <View className="flex-row items-center">
                <Ionicons name="warning" size={24} color="#ea580c" />
                <View className="flex-1 ml-3">
                  <Text className="font-bold text-orange-800 dark:text-orange-200">
                    Most Affected Service
                  </Text>
                  <Text className="text-orange-700 dark:text-orange-300 text-sm mt-1">
                    {stats.topService}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Service Breakdown */}
          {reports.length > 0 && renderServiceBreakdown()}

          {/* Reports List */}
          <View className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-4">
            <Text className="font-bold text-gray-900 dark:text-white mb-3">
              Recent Reports ({reports.length})
            </Text>
          </View>

          <FlatList
            data={reports}
            renderItem={renderReportCard}
            keyExtractor={(item) => item.id}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            ListEmptyComponent={
              <View className="items-center justify-center py-12">
                <Ionicons name="document-text-outline" size={64} color="#9ca3af" />
                <Text className="text-gray-500 dark:text-gray-400 text-center mt-4">
                  No overcharge reports found for {districtName}
                </Text>
                <TouchableOpacity
                  onPress={() => router.push('/report-overcharge')}
                  className="mt-4 bg-orange-500 px-4 py-2 rounded-lg"
                >
                  <Text className="text-white font-medium">Report an Overcharge</Text>
                </TouchableOpacity>
              </View>
            }
            scrollEnabled={false}
            nestedScrollEnabled={true}
          />
        </View>
      </ScrollView>
    </View>
  );
}