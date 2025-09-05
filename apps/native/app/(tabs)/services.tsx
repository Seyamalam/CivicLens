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
import { TABLES } from '@/lib/database';
import { SyncStatus } from '@/components/sync-status';

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

interface ServiceCategory {
  key: string;
  name_en: string;
  name_bn: string;
  icon: string;
  color: string;
}

const SERVICE_CATEGORIES: ServiceCategory[] = [
  {
    key: 'identity',
    name_en: 'Identity Documents',
    name_bn: 'পরিচয়পত্র',
    icon: 'card',
    color: '#3b82f6'
  },
  {
    key: 'civil',
    name_en: 'Civil Registration',
    name_bn: 'নাগরিক নিবন্ধন',
    icon: 'document-text',
    color: '#10b981'
  },
  {
    key: 'land',
    name_en: 'Land & Property',
    name_bn: 'ভূমি ও সম্পত্তি',
    icon: 'home',
    color: '#f59e0b'
  },
  {
    key: 'business',
    name_en: 'Business & Trade',
    name_bn: 'ব্যবসা ও বাণিজ্য',
    icon: 'briefcase',
    color: '#8b5cf6'
  },
  {
    key: 'transport',
    name_en: 'Transport & Vehicles',
    name_bn: 'পরিবহন ও যানবাহন',
    icon: 'car',
    color: '#ef4444'
  },
  {
    key: 'other',
    name_en: 'Other Services',
    name_bn: 'অন্যান্য সেবা',
    icon: 'grid',
    color: '#6b7280'
  }
];

export default function ServicesScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { isInitialized } = useDatabase();
  const [services, setServices] = useState<Service[]>([]);
  const [filteredServices, setFilteredServices] = useState<Service[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const isEnglish = i18n.language === 'en';

  useEffect(() => {
    if (isInitialized) {
      loadServices();
    }
  }, [isInitialized]);

  useEffect(() => {
    applyFilters();
  }, [services, searchQuery, selectedCategory]);

  const loadServices = async () => {
    try {
      setIsLoading(true);
      const db = useLocalDatabase();
      
      const result = await db.getAllAsync<Service>(
        `SELECT * FROM ${TABLES.SERVICES} ORDER BY category, name_en ASC`
      );
      
      console.log(`Loaded ${result.length} services from database`);
      setServices(result);
    } catch (error) {
      console.error('Failed to load services:', error);
      Alert.alert(t('common.error'), 'Failed to load services from local database');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadServices();
    setRefreshing(false);
  };

  const applyFilters = () => {
    let filtered = [...services];

    // Apply category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(service => service.category === selectedCategory);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(service =>
        service.name_en.toLowerCase().includes(query) ||
        service.name_bn.toLowerCase().includes(query) ||
        service.office_name_en.toLowerCase().includes(query) ||
        service.office_name_bn.toLowerCase().includes(query) ||
        service.description_en.toLowerCase().includes(query) ||
        service.description_bn.toLowerCase().includes(query)
      );
    }

    setFilteredServices(filtered);
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

  const handleReportOvercharge = (service: Service) => {
    router.push(`/report-overcharge?serviceId=${service.id}`);
  };

  const renderCategoryChip = (category: ServiceCategory) => (
    <TouchableOpacity
      key={category.key}
      onPress={() => setSelectedCategory(category.key)}
      className={`flex-row items-center px-4 py-2 rounded-full mr-3 mb-2 ${
        selectedCategory === category.key
          ? 'bg-primary-500'
          : 'bg-gray-100 dark:bg-gray-700'
      }`}
    >
      <Ionicons
        name={category.icon as any}
        size={16}
        color={selectedCategory === category.key ? 'white' : category.color}
      />
      <Text className={`ml-2 text-sm font-medium ${
        selectedCategory === category.key
          ? 'text-white'
          : 'text-gray-700 dark:text-gray-300'
      }`}>
        {isEnglish ? category.name_en : category.name_bn}
      </Text>
    </TouchableOpacity>
  );

  const renderServiceCard = ({ item, index }: { item: Service; index: number }) => (
    <MotiView
      from={{ opacity: 0, translateY: 20 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 600, delay: index * 100 }}
      className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-3 shadow-sm border border-gray-100 dark:border-gray-700"
    >
      <TouchableOpacity
        onPress={() => router.push(`/service-detail?id=${item.id}`)}
        activeOpacity={0.7}
      >
        {/* Header */}
        <View className="flex-row justify-between items-start mb-3">
          <View className="flex-1 mr-3">
            <Text className="text-lg font-bold text-gray-900 dark:text-white">
              {isEnglish ? item.name_en : item.name_bn}
            </Text>
            <Text className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {isEnglish ? item.office_name_en : item.office_name_bn}
            </Text>
          </View>
          
          <View className="items-end">
            <Text className="text-lg font-bold text-green-600">
              {formatFee(item.official_fee)}
            </Text>
            <View 
              className="px-2 py-1 rounded-full mt-1"
              style={{ backgroundColor: getTimelineColor(item.official_timeline_days) + '20' }}
            >
              <Text 
                className="text-xs font-medium"
                style={{ color: getTimelineColor(item.official_timeline_days) }}
              >
                {formatTimeline(item.official_timeline_days)}
              </Text>
            </View>
          </View>
        </View>

        {/* Description */}
        <Text className="text-sm text-gray-600 dark:text-gray-400 mb-3" numberOfLines={2}>
          {isEnglish ? item.description_en : item.description_bn}
        </Text>

        {/* Action Buttons */}
        <View className="flex-row justify-between items-center">
          <View className="flex-row items-center">
            <Ionicons name="information-circle" size={16} color="#6b7280" />
            <Text className="text-xs text-gray-500 dark:text-gray-400 ml-1">
              {item.category.charAt(0).toUpperCase() + item.category.slice(1)}
            </Text>
          </View>
          
          <TouchableOpacity
            onPress={() => handleReportOvercharge(item)}
            className="bg-orange-100 dark:bg-orange-900/30 px-3 py-1 rounded-full"
          >
            <Text className="text-orange-700 dark:text-orange-300 text-xs font-medium">
              Report Overcharge
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </MotiView>
  );

  const getStats = () => {
    const totalServices = services.length;
    const freeServices = services.filter(s => s.official_fee === 0).length;
    const fastServices = services.filter(s => s.official_timeline_days <= 1).length;
    const avgFee = services.reduce((sum, s) => sum + s.official_fee, 0) / totalServices;
    
    return { totalServices, freeServices, fastServices, avgFee: avgFee || 0 };
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
            {t('modules.feeCheck.name')}
          </Text>
          
          <TouchableOpacity
            onPress={() => router.push('/overcharge-heatmap')}
            className="flex-row items-center bg-red-100 dark:bg-red-900/30 px-3 py-2 rounded-full"
          >
            <Ionicons name="map" size={16} color="#ef4444" />
            <Text className="text-red-700 dark:text-red-300 text-sm ml-1 font-medium">
              Heatmap
            </Text>
          </TouchableOpacity>
        </View>
        
        {/* Quick Stats */}
        <View className="flex-row justify-between">
          <View className="items-center">
            <Text className="text-lg font-bold text-gray-900 dark:text-white">
              {stats.totalServices}
            </Text>
            <Text className="text-xs text-gray-600 dark:text-gray-400">
              Total Services
            </Text>
          </View>
          
          <View className="items-center">
            <Text className="text-lg font-bold text-green-600">
              {stats.freeServices}
            </Text>
            <Text className="text-xs text-gray-600 dark:text-gray-400">
              Free Services
            </Text>
          </View>
          
          <View className="items-center">
            <Text className="text-lg font-bold text-blue-600">
              {stats.fastServices}
            </Text>
            <Text className="text-xs text-gray-600 dark:text-gray-400">
              Same Day
            </Text>
          </View>
          
          <View className="items-center">
            <Text className="text-lg font-bold text-purple-600">
              ৳{Math.round(stats.avgFee)}
            </Text>
            <Text className="text-xs text-gray-600 dark:text-gray-400">
              Avg Fee
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
            placeholder={t('modules.feeCheck.searchServices')}
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

      {/* Category Filter */}
      <View className="bg-white dark:bg-gray-800 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="flex-row">
            <TouchableOpacity
              onPress={() => setSelectedCategory('all')}
              className={`flex-row items-center px-4 py-2 rounded-full mr-3 mb-2 ${
                selectedCategory === 'all'
                  ? 'bg-primary-500'
                  : 'bg-gray-100 dark:bg-gray-700'
              }`}
            >
              <Ionicons
                name="apps"
                size={16}
                color={selectedCategory === 'all' ? 'white' : '#6b7280'}
              />
              <Text className={`ml-2 text-sm font-medium ${
                selectedCategory === 'all'
                  ? 'text-white'
                  : 'text-gray-700 dark:text-gray-300'
              }`}>
                All Categories
              </Text>
            </TouchableOpacity>
            
            {SERVICE_CATEGORIES.map(renderCategoryChip)}
          </View>
        </ScrollView>
      </View>

      {/* Services List */}
      <FlatList
        data={filteredServices}
        renderItem={renderServiceCard}
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
                : selectedCategory === 'all'
                ? 'No services found'
                : `No services found in ${SERVICE_CATEGORIES.find(c => c.key === selectedCategory)?.name_en} category`
              }
            </Text>
            
            {!isLoading && filteredServices.length === 0 && searchQuery.trim() && (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                className="mt-4 bg-primary-500 px-4 py-2 rounded-lg"
              >
                <Text className="text-white font-medium">Clear Search</Text>
              </TouchableOpacity>
            )}
          </View>
        }
        showsVerticalScrollIndicator={false}
      />

      {/* Floating Action Button */}
      <TouchableOpacity
        onPress={() => router.push('/report-overcharge')}
        className="absolute bottom-6 right-6 bg-orange-500 w-14 h-14 rounded-full items-center justify-center shadow-lg"
        style={{
          shadowColor: '#ea580c',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 8,
        }}
      >
        <Ionicons name="warning" size={24} color="white" />
      </TouchableOpacity>
    </View>
  );
}