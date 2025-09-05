import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { useDatabase, useLocalDatabase } from '@/contexts/database-context';
import { TABLES } from '@/lib/database';

interface Service {
  id: string;
  name_en: string;
  name_bn: string;
  category: string;
  office_name_en: string;
  office_name_bn: string;
  official_fee: number;
  official_timeline_days: number;
  description_en: string;
  description_bn: string;
  requirements_en: string;
  requirements_bn: string;
}

interface OverchargeStats {
  reportCount: number;
  avgOvercharge: number;
  totalOvercharge: number;
}

export default function ServiceDetailScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { isInitialized } = useDatabase();
  
  const [service, setService] = useState<Service | null>(null);
  const [overchargeStats, setOverchargeStats] = useState<OverchargeStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'requirements' | 'reports'>('overview');

  const isEnglish = i18n.language === 'en';

  useEffect(() => {
    if (isInitialized && id) {
      loadServiceData();
    }
  }, [isInitialized, id]);

  const loadServiceData = async () => {
    try {
      setIsLoading(true);
      const db = useLocalDatabase();
      
      // Load service details
      const serviceResult = await db.getFirstAsync<Service>(
        `SELECT * FROM ${TABLES.SERVICES} WHERE id = ?`,
        [id as string]
      );
      
      if (!serviceResult) {
        Alert.alert('Error', 'Service not found');
        router.back();
        return;
      }
      
      setService(serviceResult);
      
      // Load overcharge statistics
      const statsResult = await db.getFirstAsync<OverchargeStats>(
        `SELECT 
          COUNT(*) as reportCount,
          COALESCE(AVG(overcharge_amount), 0) as avgOvercharge,
          COALESCE(SUM(overcharge_amount), 0) as totalOvercharge
         FROM ${TABLES.OVERCHARGE_REPORTS} 
         WHERE service_id = ?`,
        [id as string]
      );
      
      setOverchargeStats(statsResult || { reportCount: 0, avgOvercharge: 0, totalOvercharge: 0 });
      
    } catch (error) {
      console.error('Failed to load service data:', error);
      Alert.alert('Error', 'Failed to load service information');
    } finally {
      setIsLoading(false);
    }
  };

  const formatFee = (fee: number) => {
    if (fee === 0) return isEnglish ? 'Free' : 'বিনামূল্যে';
    return `৳${fee.toLocaleString()}`;
  };

  const formatTimeline = (days: number) => {
    if (days === 0) return isEnglish ? 'Instant' : 'তাৎক্ষণিক';
    if (days === 1) return isEnglish ? '1 day' : '১ দিন';
    return isEnglish ? `${days} days` : `${days} দিন`;
  };

  const getTimelineColor = (days: number) => {
    if (days <= 1) return '#10b981'; // Green - Fast
    if (days <= 7) return '#f59e0b'; // Orange - Medium
    return '#ef4444'; // Red - Slow
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'identity': return 'card';
      case 'civil': return 'document-text';
      case 'land': return 'home';
      case 'business': return 'briefcase';
      case 'transport': return 'car';
      default: return 'grid';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'identity': return '#3b82f6';
      case 'civil': return '#10b981';
      case 'land': return '#f59e0b';
      case 'business': return '#8b5cf6';
      case 'transport': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const parseRequirements = (requirements: string): string[] => {
    if (!requirements) return [];
    return requirements.split('\n').filter(req => req.trim().length > 0);
  };

  const handleReportOvercharge = () => {
    if (service) {
      router.push(`/report-overcharge?serviceId=${service.id}`);
    }
  };

  const handleCallOffice = () => {
    // This would typically open a phone dialer
    Alert.alert(
      'Contact Office',
      'Contact information would be available here. This is a demo implementation.',
      [{ text: 'OK' }]
    );
  };

  const handleShareService = () => {
    Alert.alert(
      'Share Service',
      'Share service information functionality would be implemented here.',
      [{ text: 'OK' }]
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

  if (!service) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50 dark:bg-gray-900">
        <Text className="text-gray-600 dark:text-gray-400">
          Service not found
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
              {isEnglish ? service.name_en : service.name_bn}
            </Text>
            <Text className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {isEnglish ? service.office_name_en : service.office_name_bn}
            </Text>
          </View>
          
          <TouchableOpacity 
            onPress={handleShareService}
            className="ml-2"
          >
            <Ionicons name="share-outline" size={24} color="#6b7280" />
          </TouchableOpacity>
        </View>
        
        {/* Quick Info Cards */}
        <View className="flex-row space-x-3">
          <View className="flex-1 bg-green-100 dark:bg-green-900/30 rounded-lg p-3">
            <Text className="text-green-800 dark:text-green-200 font-bold text-lg">
              {formatFee(service.official_fee)}
            </Text>
            <Text className="text-green-600 dark:text-green-400 text-xs">
              Official Fee
            </Text>
          </View>
          
          <View 
            className="flex-1 rounded-lg p-3"
            style={{ backgroundColor: getCategoryColor(service.category) + '20' }}
          >
            <Text 
              className="font-bold text-lg"
              style={{ color: getCategoryColor(service.category) }}
            >
              {formatTimeline(service.official_timeline_days)}
            </Text>
            <Text 
              className="text-xs"
              style={{ color: getCategoryColor(service.category) }}
            >
              Processing Time
            </Text>
          </View>
        </View>
      </View>

      {/* Tab Navigation */}
      <View className="bg-white dark:bg-gray-800 px-4 py-2 border-b border-gray-200 dark:border-gray-700">
        <View className="flex-row">
          {[
            { key: 'overview', label: 'Overview', icon: 'information-circle' },
            { key: 'requirements', label: 'Requirements', icon: 'list' },
            { key: 'reports', label: 'Reports', icon: 'warning' }
          ].map((tab) => (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setActiveTab(tab.key as any)}
              className={`flex-1 flex-row items-center justify-center py-3 ${
                activeTab === tab.key ? 'border-b-2 border-primary-500' : ''
              }`}
            >
              <Ionicons 
                name={tab.icon as any} 
                size={16} 
                color={activeTab === tab.key ? '#0891b2' : '#6b7280'} 
              />
              <Text className={`ml-2 text-sm font-medium ${
                activeTab === tab.key 
                  ? 'text-primary-600 dark:text-primary-400' 
                  : 'text-gray-600 dark:text-gray-400'
              }`}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView className="flex-1">
        {activeTab === 'overview' && (
          <View className="p-4">
            {/* Service Description */}
            <MotiView
              from={{ opacity: 0, translateY: 20 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'timing', duration: 500 }}
              className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-4"
            >
              <View className="flex-row items-center mb-3">
                <View 
                  className="w-10 h-10 rounded-full items-center justify-center"
                  style={{ backgroundColor: getCategoryColor(service.category) + '20' }}
                >
                  <Ionicons 
                    name={getCategoryIcon(service.category) as any} 
                    size={20} 
                    color={getCategoryColor(service.category)} 
                  />
                </View>
                <Text className="ml-3 font-bold text-gray-900 dark:text-white">
                  Service Description
                </Text>
              </View>
              
              <Text className="text-gray-700 dark:text-gray-300 leading-6">
                {isEnglish ? service.description_en : service.description_bn}
              </Text>
            </MotiView>

            {/* Service Category */}
            <View className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-4">
              <Text className="font-bold text-gray-900 dark:text-white mb-3">
                Service Category
              </Text>
              <View className="flex-row items-center">
                <View 
                  className="px-3 py-2 rounded-full"
                  style={{ backgroundColor: getCategoryColor(service.category) + '20' }}
                >
                  <Text 
                    className="text-sm font-medium"
                    style={{ color: getCategoryColor(service.category) }}
                  >
                    {service.category.charAt(0).toUpperCase() + service.category.slice(1)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Contact Information */}
            <View className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-4">
              <Text className="font-bold text-gray-900 dark:text-white mb-3">
                Contact Office
              </Text>
              <TouchableOpacity 
                onPress={handleCallOffice}
                className="flex-row items-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg"
              >
                <Ionicons name="call" size={20} color="#3b82f6" />
                <Text className="ml-3 text-blue-600 dark:text-blue-400 font-medium">
                  Contact {isEnglish ? service.office_name_en : service.office_name_bn}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {activeTab === 'requirements' && (
          <View className="p-4">
            <MotiView
              from={{ opacity: 0, translateY: 20 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'timing', duration: 500 }}
              className="bg-white dark:bg-gray-800 rounded-xl p-4"
            >
              <Text className="font-bold text-gray-900 dark:text-white mb-4">
                Required Documents & Information
              </Text>
              
              {parseRequirements(isEnglish ? service.requirements_en : service.requirements_bn).map((requirement, index) => (
                <View key={index} className="flex-row items-start mb-3">
                  <View className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30 items-center justify-center mr-3 mt-0.5">
                    <Text className="text-green-600 dark:text-green-400 text-xs font-bold">
                      {index + 1}
                    </Text>
                  </View>
                  <Text className="flex-1 text-gray-700 dark:text-gray-300 leading-6">
                    {requirement}
                  </Text>
                </View>
              ))}
              
              {parseRequirements(isEnglish ? service.requirements_en : service.requirements_bn).length === 0 && (
                <Text className="text-gray-500 dark:text-gray-400 text-center py-4">
                  Requirements information not available
                </Text>
              )}
            </MotiView>
          </View>
        )}

        {activeTab === 'reports' && (
          <View className="p-4">
            {/* Overcharge Statistics */}
            <MotiView
              from={{ opacity: 0, translateY: 20 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'timing', duration: 500 }}
              className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-4"
            >
              <Text className="font-bold text-gray-900 dark:text-white mb-4">
                Overcharge Reports
              </Text>
              
              {overchargeStats && overchargeStats.reportCount > 0 ? (
                <View className="space-y-3">
                  <View className="flex-row justify-between items-center">
                    <Text className="text-gray-600 dark:text-gray-400">
                      Total Reports
                    </Text>
                    <Text className="font-bold text-red-600">
                      {overchargeStats.reportCount}
                    </Text>
                  </View>
                  
                  <View className="flex-row justify-between items-center">
                    <Text className="text-gray-600 dark:text-gray-400">
                      Average Overcharge
                    </Text>
                    <Text className="font-bold text-orange-600">
                      ৳{overchargeStats.avgOvercharge.toFixed(0)}
                    </Text>
                  </View>
                  
                  <View className="flex-row justify-between items-center">
                    <Text className="text-gray-600 dark:text-gray-400">
                      Total Overcharge
                    </Text>
                    <Text className="font-bold text-red-600">
                      ৳{overchargeStats.totalOvercharge.toFixed(0)}
                    </Text>
                  </View>
                  
                  <View className="mt-4 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                    <Text className="text-orange-800 dark:text-orange-200 text-sm">
                      ⚠️ This service has received multiple overcharge reports. Be cautious and verify official fees.
                    </Text>
                  </View>
                </View>
              ) : (
                <View className="items-center py-6">
                  <Ionicons name="shield-checkmark" size={48} color="#10b981" />
                  <Text className="text-green-600 dark:text-green-400 font-medium mt-2">
                    No overcharge reports
                  </Text>
                  <Text className="text-gray-500 dark:text-gray-400 text-sm text-center mt-1">
                    This service appears to be operating within official fee guidelines
                  </Text>
                </View>
              )}
            </MotiView>

            {/* Report Button */}
            <TouchableOpacity
              onPress={handleReportOvercharge}
              className="bg-gradient-to-r from-orange-500 to-red-500 rounded-xl p-4 items-center"
            >
              <View className="flex-row items-center">
                <Ionicons name="warning" size={20} color="white" />
                <Text className="text-white font-bold text-lg ml-2">
                  Report Overcharge
                </Text>
              </View>
              <Text className="text-white/80 text-sm mt-1">
                Help others by reporting excessive fees
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}