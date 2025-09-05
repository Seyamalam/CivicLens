import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { DelayDetectionService, DelayStatistics, DelayPattern } from '@/lib/delay-detection';

interface DelayAlert {
  applicationId: string;
  permitType: string;
  daysOverdue: number;
  riskLevel: 'low' | 'medium' | 'high';
  recommendedAction: string;
}

export default function DelayAnalysisScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  
  const [statistics, setStatistics] = useState<DelayStatistics | null>(null);
  const [delayPatterns, setDelayPatterns] = useState<DelayPattern[]>([]);
  const [delayAlerts, setDelayAlerts] = useState<DelayAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'patterns' | 'alerts'>('overview');

  const isEnglish = i18n.language === 'en';

  useEffect(() => {
    loadDelayData();
  }, []);

  const loadDelayData = async () => {
    try {
      setLoading(true);
      const delayService = DelayDetectionService.getInstance();
      
      // Load all delay analysis data
      const [stats, patterns, alerts] = await Promise.all([
        delayService.getDelayStatistics(),
        delayService.getDelayPatterns(),
        delayService.generateDelayAlerts()
      ]);
      
      setStatistics(stats);
      setDelayPatterns(patterns);
      setDelayAlerts(alerts);
    } catch (error) {
      console.error('Error loading delay data:', error);
      Alert.alert('Error', 'Failed to load delay analysis data');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDelayData();
    setRefreshing(false);
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#10b981';
      default: return '#6b7280';
    }
  };

  const formatPercentage = (value: number) => {
    return `${Math.round(value)}%`;
  };

  const getDelayTrendIcon = (pattern: DelayPattern) => {
    if (pattern.delayFrequency > 70) return { icon: 'trending-up', color: '#ef4444' };
    if (pattern.delayFrequency > 40) return { icon: 'remove', color: '#f59e0b' };
    return { icon: 'trending-down', color: '#10b981' };
  };

  const renderOverviewTab = () => (
    <ScrollView className="flex-1 p-4">
      {/* Key Metrics */}
      <View className="mb-6">
        <Text className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          📊 Delay Statistics
        </Text>
        
        <View className="flex-row flex-wrap gap-3">
          <MotiView
            from={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'timing', duration: 500 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-4 flex-1 min-w-[150px]"
          >
            <Text className="text-gray-600 dark:text-gray-400 text-sm">Total Applications</Text>
            <Text className="text-2xl font-bold text-gray-900 dark:text-white">
              {statistics?.totalApplications || 0}
            </Text>
          </MotiView>
          
          <MotiView
            from={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'timing', duration: 500, delay: 100 }}
            className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 flex-1 min-w-[150px]"
          >
            <Text className="text-red-600 dark:text-red-400 text-sm">Delayed</Text>
            <Text className="text-2xl font-bold text-red-700 dark:text-red-300">
              {statistics?.delayedApplications || 0}
            </Text>
            <Text className="text-red-500 text-xs">
              {statistics && formatPercentage(statistics.delayRate)}
            </Text>
          </MotiView>
          
          <MotiView
            from={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'timing', duration: 500, delay: 200 }}
            className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 flex-1 min-w-[150px]"
          >
            <Text className="text-green-600 dark:text-green-400 text-sm">On Time</Text>
            <Text className="text-2xl font-bold text-green-700 dark:text-green-300">
              {statistics?.onTimeApplications || 0}
            </Text>
            <Text className="text-green-500 text-xs">
              {statistics && formatPercentage(100 - statistics.delayRate)}
            </Text>
          </MotiView>
        </View>
      </View>

      {/* Average Processing Time */}
      <MotiView
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 500, delay: 300 }}
        className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-6"
      >
        <Text className="font-bold text-gray-900 dark:text-white mb-3">
          ⏱️ Processing Time Analysis
        </Text>
        
        <View className="space-y-3">
          <View className="flex-row justify-between items-center">
            <Text className="text-gray-600 dark:text-gray-400">Average Completion Time:</Text>
            <Text className="text-gray-900 dark:text-white font-bold">
              {Math.round(statistics?.averageCompletionTime || 0)} days
            </Text>
          </View>
          
          <View className="flex-row justify-between items-center">
            <Text className="text-gray-600 dark:text-gray-400">Average Delay (when delayed):</Text>
            <Text className="text-orange-600 font-bold">
              +{Math.round(statistics?.averageDelayDays || 0)} days
            </Text>
          </View>
          
          <View className="flex-row justify-between items-center">
            <Text className="text-gray-600 dark:text-gray-400">Most Delayed Permit Type:</Text>
            <Text className="text-red-600 font-bold">
              {statistics?.mostDelayedPermitType || 'N/A'}
            </Text>
          </View>
        </View>
      </MotiView>

      {/* Office Performance Benchmarks */}
      <MotiView
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 500, delay: 400 }}
        className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-6"
      >
        <Text className="font-bold text-gray-900 dark:text-white mb-3">
          🏢 Office Performance Benchmarks
        </Text>
        
        {statistics?.officeBenchmarks && Object.entries(statistics.officeBenchmarks).map(([office, data], index) => (
          <View key={office} className="mb-3 last:mb-0">
            <View className="flex-row justify-between items-start mb-1">
              <Text className="text-gray-900 dark:text-white font-medium flex-1 mr-2">
                {office}
              </Text>
              <View className="items-end">
                <Text className="text-gray-600 dark:text-gray-400 text-sm">
                  {Math.round(data.averageDays)} days avg
                </Text>
                <Text className={`text-sm ${
                  data.delayRate > 50 ? 'text-red-600' : 
                  data.delayRate > 25 ? 'text-orange-600' : 'text-green-600'
                }`}>
                  {formatPercentage(data.delayRate)} delay rate
                </Text>
              </View>
            </View>
            
            <View className="flex-row items-center">
              <View className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <View 
                  className={`h-full ${
                    data.delayRate > 50 ? 'bg-red-500' : 
                    data.delayRate > 25 ? 'bg-orange-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(data.delayRate, 100)}%` }}
                />
              </View>
              <Text className="text-gray-500 text-xs ml-2">
                {data.totalApplications} apps
              </Text>
            </View>
          </View>
        ))}
      </MotiView>
    </ScrollView>
  );

  const renderPatternsTab = () => (
    <ScrollView className="flex-1 p-4">
      <Text className="text-xl font-bold text-gray-900 dark:text-white mb-4">
        📈 Delay Patterns Analysis
      </Text>
      
      {delayPatterns.map((pattern, index) => {
        const trendIcon = getDelayTrendIcon(pattern);
        
        return (
          <MotiView
            key={`${pattern.permitType}-${pattern.office}`}
            from={{ opacity: 0, translateX: 20 }}
            animate={{ opacity: 1, translateX: 0 }}
            transition={{ type: 'timing', duration: 500, delay: index * 100 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-4"
          >
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-1">
                <Text className="font-bold text-gray-900 dark:text-white">
                  {pattern.permitType}
                </Text>
                <Text className="text-gray-600 dark:text-gray-400 text-sm">
                  {pattern.office}
                </Text>
              </View>
              
              <View className="items-center">
                <Ionicons name={trendIcon.icon as any} size={24} color={trendIcon.color} />
                <Text className="text-xs" style={{ color: trendIcon.color }}>
                  {formatPercentage(pattern.delayFrequency)}
                </Text>
              </View>
            </View>
            
            <View className="space-y-2">
              <View className="flex-row justify-between">
                <Text className="text-gray-600 dark:text-gray-400 text-sm">Average Delay:</Text>
                <Text className="text-gray-900 dark:text-white font-medium">
                  +{Math.round(pattern.averageDelay)} days
                </Text>
              </View>
              
              <View className="flex-row justify-between">
                <Text className="text-gray-600 dark:text-gray-400 text-sm">Max Delay:</Text>
                <Text className="text-red-600 font-medium">
                  +{pattern.maxDelay} days
                </Text>
              </View>
              
              {pattern.commonReasons.length > 0 && (
                <View>
                  <Text className="text-gray-600 dark:text-gray-400 text-sm mb-1">
                    Common Reasons:
                  </Text>
                  {pattern.commonReasons.slice(0, 2).map((reason, reasonIndex) => (
                    <Text key={reasonIndex} className="text-gray-700 dark:text-gray-300 text-xs">
                      • {reason}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          </MotiView>
        );
      })}
      
      {delayPatterns.length === 0 && (
        <View className="items-center justify-center py-16">
          <Ionicons name="analytics" size={48} color="#9ca3af" />
          <Text className="text-gray-500 dark:text-gray-400 text-center mt-4">
            No delay patterns found.{'\n'}More data needed for analysis.
          </Text>
        </View>
      )}
    </ScrollView>
  );

  const renderAlertsTab = () => (
    <ScrollView className="flex-1 p-4">
      <Text className="text-xl font-bold text-gray-900 dark:text-white mb-4">
        🚨 Delay Alerts & Recommendations
      </Text>
      
      {delayAlerts.map((alert, index) => (
        <MotiView
          key={alert.applicationId}
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 500, delay: index * 100 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-4 border-l-4"
          style={{ borderLeftColor: getRiskColor(alert.riskLevel) }}
        >
          <View className="flex-row items-center justify-between mb-2">
            <Text className="font-bold text-gray-900 dark:text-white flex-1">
              {alert.permitType}
            </Text>
            <View 
              className="px-2 py-1 rounded-lg"
              style={{ backgroundColor: getRiskColor(alert.riskLevel) + '20' }}
            >
              <Text 
                className="text-xs font-bold uppercase"
                style={{ color: getRiskColor(alert.riskLevel) }}
              >
                {alert.riskLevel} Risk
              </Text>
            </View>
          </View>
          
          <Text className="text-gray-600 dark:text-gray-400 text-sm mb-2">
            Application ID: {alert.applicationId}
          </Text>
          
          <View className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 mb-3">
            <Text className="text-red-600 dark:text-red-400 font-bold text-sm">
              {alert.daysOverdue} days overdue
            </Text>
          </View>
          
          <View className="flex-row items-start">
            <Ionicons name="bulb" size={16} color="#f59e0b" />
            <Text className="ml-2 text-gray-700 dark:text-gray-300 text-sm flex-1">
              {alert.recommendedAction}
            </Text>
          </View>
          
          <TouchableOpacity
            onPress={() => router.push(`/permit-detail?id=${alert.applicationId}`)}
            className="mt-3 bg-blue-500 py-2 rounded-lg"
          >
            <Text className="text-white text-center font-medium text-sm">
              View Application Details
            </Text>
          </TouchableOpacity>
        </MotiView>
      ))}
      
      {delayAlerts.length === 0 && (
        <View className="items-center justify-center py-16">
          <Ionicons name="checkmark-circle" size={48} color="#10b981" />
          <Text className="text-green-600 dark:text-green-400 text-center mt-4 font-bold">
            No Delay Alerts
          </Text>
          <Text className="text-gray-500 dark:text-gray-400 text-center mt-2">
            All applications are processing within expected timeframes.
          </Text>
        </View>
      )}
    </ScrollView>
  );

  const renderTabSelector = () => (
    <View className="bg-white dark:bg-gray-800 px-4">
      <View className="flex-row">
        {[
          { key: 'overview', label: 'Overview', icon: 'analytics' },
          { key: 'patterns', label: 'Patterns', icon: 'trending-up' },
          { key: 'alerts', label: 'Alerts', icon: 'warning', badge: delayAlerts.length }
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            onPress={() => setSelectedTab(tab.key as any)}
            className={`flex-1 py-3 items-center border-b-2 ${
              selectedTab === tab.key 
                ? 'border-blue-500' 
                : 'border-transparent'
            }`}
          >
            <View className="relative">
              <Ionicons 
                name={tab.icon as any} 
                size={20} 
                color={selectedTab === tab.key ? '#3b82f6' : '#6b7280'} 
              />
              {tab.badge && tab.badge > 0 && (
                <View className="absolute -top-1 -right-1 bg-red-500 rounded-full w-4 h-4 items-center justify-center">
                  <Text className="text-white text-xs font-bold">
                    {tab.badge > 9 ? '9+' : tab.badge}
                  </Text>
                </View>
              )}
            </View>
            <Text className={`text-xs mt-1 ${
              selectedTab === tab.key 
                ? 'text-blue-600 font-medium' 
                : 'text-gray-500'
            }`}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <View className="bg-gradient-to-r from-orange-600 to-red-600 px-4 py-6">
        <View className="flex-row items-center">
          <TouchableOpacity 
            onPress={() => router.back()}
            className="mr-4"
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-white text-xl font-bold">
              Delay Analysis
            </Text>
            <Text className="text-white/80 text-sm mt-1">
              Statistical analysis of permit processing delays
            </Text>
          </View>
          <TouchableOpacity
            onPress={onRefresh}
            disabled={refreshing}
          >
            <Ionicons 
              name={refreshing ? "sync" : "refresh"} 
              size={24} 
              color="white" 
            />
          </TouchableOpacity>
        </View>
      </View>

      {renderTabSelector()}

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-gray-600 dark:text-gray-400">
            Analyzing delay patterns...
          </Text>
        </View>
      ) : (
        <>
          {selectedTab === 'overview' && renderOverviewTab()}
          {selectedTab === 'patterns' && renderPatternsTab()}
          {selectedTab === 'alerts' && renderAlertsTab()}
        </>
      )}
    </View>
  );
}