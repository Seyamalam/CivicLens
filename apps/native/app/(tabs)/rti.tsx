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
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { useDatabase, useLocalDatabase } from '@/contexts/database-context';
import { TABLES } from '@/lib/database';
import { SyncStatus } from '@/components/sync-status';

interface RTIRequest {
  id: string;
  title_en: string;
  title_bn: string;
  agency_name_en: string;
  agency_name_bn: string;
  submitted_date: string;
  deadline_date: string;
  status: 'submitted' | 'under_review' | 'responded' | 'appealed' | 'completed' | 'overdue';
  created_at: string;
}

const RTI_QUICK_TOPICS = [
  {
    id: 'budget',
    title_en: 'Budget Information',
    title_bn: 'বাজেট তথ্য',
    icon: 'bar-chart',
    color: '#3b82f6',
    description_en: 'Request budget allocations and expenditure details',
    description_bn: 'বাজেট বরাদ্দ এবং ব্যয়ের বিবরণের জন্য অনুরোধ'
  },
  {
    id: 'tender',
    title_en: 'Tender Information',
    title_bn: 'টেন্ডার তথ্য',
    icon: 'document-text',
    color: '#10b981',
    description_en: 'Get details about procurement and tender processes',
    description_bn: 'ক্রয় এবং টেন্ডার প্রক্রিয়া সম্পর্কে বিস্তারিত পান'
  },
  {
    id: 'project',
    title_en: 'Development Projects',
    title_bn: 'উন্নয়ন প্রকল্প',
    icon: 'construct',
    color: '#f59e0b',
    description_en: 'Information about local development projects',
    description_bn: 'স্থানীয় উন্নয়ন প্রকল্প সম্পর্কে তথ্য'
  },
  {
    id: 'service',
    title_en: 'Service Information',
    title_bn: 'সেবার তথ্য',
    icon: 'people',
    color: '#8b5cf6',
    description_en: 'Details about government services and procedures',
    description_bn: 'সরকারি সেবা এবং পদ্ধতি সম্পর্কে বিস্তারিত'
  },
  {
    id: 'policy',
    title_en: 'Policy Documents',
    title_bn: 'নীতি দলিল',
    icon: 'document',
    color: '#ef4444',
    description_en: 'Access to government policies and decisions',
    description_bn: 'সরকারি নীতি এবং সিদ্ধান্তের অ্যাক্সেস'
  },
  {
    id: 'complaint',
    title_en: 'Complaint Status',
    title_bn: 'অভিযোগের অবস্থা',
    icon: 'warning',
    color: '#06b6d4',
    description_en: 'Track status of filed complaints and grievances',
    description_bn: 'দায়ের করা অভিযোগ এবং অনুযোগের স্থিতি ট্র্যাক করুন'
  }
];

export default function RTIScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { isInitialized } = useDatabase();
  
  const [requests, setRequests] = useState<RTIRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalRequests: 0,
    pendingRequests: 0,
    completedRequests: 0,
    overdueRequests: 0
  });

  const isEnglish = i18n.language === 'en';

  useEffect(() => {
    if (isInitialized) {
      loadRTIRequests();
    }
  }, [isInitialized]);

  const loadRTIRequests = async () => {
    try {
      setIsLoading(true);
      
      if (!isInitialized) {
        console.log('Database not initialized yet');
        return;
      }
      
      const db = useLocalDatabase();
      
      const result = await db.getAllAsync<RTIRequest>(
        `SELECT * FROM ${TABLES.RTI_REQUESTS} ORDER BY created_at DESC LIMIT 50`
      );
      
      console.log(`Loaded ${result.length} RTI requests from database`);
      setRequests(result);
      
      // Calculate statistics
      const totalRequests = result.length;
      const pendingRequests = result.filter(r => 
        ['submitted', 'under_review'].includes(r.status)
      ).length;
      const completedRequests = result.filter(r => 
        r.status === 'completed'
      ).length;
      
      // Check for overdue requests (deadline passed)
      const now = new Date();
      const overdueRequests = result.filter(r => {
        const deadline = new Date(r.deadline_date);
        return deadline < now && !['completed', 'responded'].includes(r.status);
      }).length;
      
      setStats({
        totalRequests,
        pendingRequests,
        completedRequests,
        overdueRequests
      });
      
    } catch (error) {
      console.error('Failed to load RTI requests:', error);
      Alert.alert(
        t('common.error'),
        'Failed to load RTI requests from local database'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRTIRequests();
    setRefreshing(false);
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'submitted': return '#3b82f6';
      case 'under_review': return '#f59e0b';
      case 'responded': return '#10b981';
      case 'completed': return '#059669';
      case 'appealed': return '#8b5cf6';
      case 'overdue': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
      submitted: isEnglish ? 'Submitted' : 'জমা দেওয়া',
      under_review: isEnglish ? 'Under Review' : 'পর্যালোচনাধীন',
      responded: isEnglish ? 'Responded' : 'উত্তর দেওয়া',
      completed: isEnglish ? 'Completed' : 'সম্পন্ন',
      appealed: isEnglish ? 'Appealed' : 'আপিল করা',
      overdue: isEnglish ? 'Overdue' : 'সময়সীমা শেষ'
    };
    return labels[status] || status;
  };

  const calculateDaysLeft = (deadlineDate: string): number => {
    const deadline = new Date(deadlineDate);
    const now = new Date();
    const diffTime = deadline.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const handleQuickTopic = (topic: typeof RTI_QUICK_TOPICS[0]) => {
    router.push(`/rti-wizard?topic=${topic.id}`);
  };

  const renderQuickTopicCard = (topic: typeof RTI_QUICK_TOPICS[0], index: number) => (
    <MotiView
      key={topic.id}
      from={{ opacity: 0, translateY: 20 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 600, delay: index * 100 }}
    >
      <TouchableOpacity
        onPress={() => handleQuickTopic(topic)}
        className="bg-white dark:bg-gray-800 rounded-xl p-4 mr-3 w-44 border border-gray-100 dark:border-gray-700"
        activeOpacity={0.7}
      >
        <View 
          className="w-12 h-12 rounded-full items-center justify-center mb-3"
          style={{ backgroundColor: topic.color + '20' }}
        >
          <Ionicons name={topic.icon as any} size={24} color={topic.color} />
        </View>
        
        <Text className="font-bold text-gray-900 dark:text-white mb-2">
          {isEnglish ? topic.title_en : topic.title_bn}
        </Text>
        
        <Text className="text-sm text-gray-600 dark:text-gray-400" numberOfLines={3}>
          {isEnglish ? topic.description_en : topic.description_bn}
        </Text>
      </TouchableOpacity>
    </MotiView>
  );

  const renderRequestCard = ({ item, index }: { item: RTIRequest; index: number }) => {
    const daysLeft = calculateDaysLeft(item.deadline_date);
    const isOverdue = daysLeft < 0;
    
    return (
      <MotiView
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 600, delay: index * 100 }}
        className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-3 shadow-sm border border-gray-100 dark:border-gray-700"
      >
        <TouchableOpacity
          onPress={() => router.push(`/rti-detail?id=${item.id}`)}
          activeOpacity={0.7}
        >
          {/* Header */}
          <View className="flex-row justify-between items-start mb-3">
            <View className="flex-1 mr-3">
              <Text className="text-lg font-bold text-gray-900 dark:text-white">
                {isEnglish ? item.title_en : item.title_bn}
              </Text>
              <Text className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {isEnglish ? item.agency_name_en : item.agency_name_bn}
              </Text>
            </View>
            
            <View 
              className="px-3 py-1 rounded-full"
              style={{ backgroundColor: getStatusColor(item.status) + '20' }}
            >
              <Text 
                className="text-xs font-bold"
                style={{ color: getStatusColor(item.status) }}
              >
                {getStatusLabel(item.status)}
              </Text>
            </View>
          </View>

          {/* Timeline */}
          <View className="flex-row justify-between items-center">
            <View className="flex-row items-center">
              <Ionicons name="calendar" size={16} color="#6b7280" />
              <Text className="text-sm text-gray-600 dark:text-gray-400 ml-1">
                Submitted: {new Date(item.submitted_date).toLocaleDateString()}
              </Text>
            </View>
            
            <View className="flex-row items-center">
              <Ionicons 
                name="time" 
                size={16} 
                color={isOverdue ? '#ef4444' : '#6b7280'} 
              />
              <Text 
                className={`text-sm ml-1 font-medium ${
                  isOverdue 
                    ? 'text-red-600 dark:text-red-400' 
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                {isOverdue 
                  ? `${Math.abs(daysLeft)} days overdue`
                  : `${daysLeft} days left`
                }
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      </MotiView>
    );
  };

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
      
      <ScrollView 
        className="flex-1" 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header with Stats */}
        <View className="bg-white dark:bg-gray-800 px-4 py-6 border-b border-gray-200 dark:border-gray-700">
          <View className="flex-row justify-between items-center mb-4">
            <View>
              <Text className="text-xl font-bold text-gray-900 dark:text-white">
                RTI Copilot
              </Text>
              <Text className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Right to Information Assistant
              </Text>
            </View>
            
          <View className="flex-row space-x-2">
            <TouchableOpacity
              onPress={() => router.push('/rti-outcomes')}
              className="bg-green-100 dark:bg-green-900/30 px-3 py-2 rounded-lg flex-row items-center"
            >
              <Ionicons name="library" size={16} color="#059669" />
              <Text className="text-green-700 dark:text-green-300 text-sm ml-1 font-medium">
                Outcomes
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={() => router.push('/rti-deadline-tracker')}
              className="bg-orange-100 dark:bg-orange-900/30 px-3 py-2 rounded-lg flex-row items-center"
            >
              <Ionicons name="timer" size={16} color="#ea580c" />
              <Text className="text-orange-700 dark:text-orange-300 text-sm ml-1 font-medium">
                Deadlines
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={() => router.push('/rti-wizard')}
              className="bg-blue-500 px-4 py-2 rounded-lg flex-row items-center"
            >
              <Ionicons name="add" size={20} color="white" />
              <Text className="text-white font-medium ml-2">
                New Request
              </Text>
            </TouchableOpacity>
          </View>
          </View>
          
          {/* Quick Stats */}
          <View className="flex-row justify-between">
            <View className="items-center">
              <Text className="text-lg font-bold text-gray-900 dark:text-white">
                {stats.totalRequests}
              </Text>
              <Text className="text-xs text-gray-600 dark:text-gray-400">
                Total
              </Text>
            </View>
            
            <View className="items-center">
              <Text className="text-lg font-bold text-blue-600">
                {stats.pendingRequests}
              </Text>
              <Text className="text-xs text-gray-600 dark:text-gray-400">
                Pending
              </Text>
            </View>
            
            <View className="items-center">
              <Text className="text-lg font-bold text-green-600">
                {stats.completedRequests}
              </Text>
              <Text className="text-xs text-gray-600 dark:text-gray-400">
                Completed
              </Text>
            </View>
            
            <View className="items-center">
              <Text className="text-lg font-bold text-red-600">
                {stats.overdueRequests}
              </Text>
              <Text className="text-xs text-gray-600 dark:text-gray-400">
                Overdue
              </Text>
            </View>
          </View>
        </View>

        {/* Quick Topics */}
        <View className="px-4 py-6">
          <Text className="text-lg font-bold text-gray-900 dark:text-white mb-4">
            Quick Request Topics
          </Text>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row">
              {RTI_QUICK_TOPICS.map((topic, index) => 
                renderQuickTopicCard(topic, index)
              )}
            </View>
          </ScrollView>
        </View>

        {/* My Requests */}
        <View className="px-4 pb-6">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-lg font-bold text-gray-900 dark:text-white">
              My Requests ({requests.length})
            </Text>
            
            {requests.length > 0 && (
              <TouchableOpacity
                onPress={() => router.push('/rti-requests')}
                className="flex-row items-center"
              >
                <Text className="text-blue-600 dark:text-blue-400 text-sm font-medium">
                  View All
                </Text>
                <Ionicons name="chevron-forward" size={16} color="#3b82f6" />
              </TouchableOpacity>
            )}
          </View>
          
          {requests.length === 0 ? (
            <View className="items-center justify-center py-12 bg-white dark:bg-gray-800 rounded-xl">
              <Ionicons name="document-text-outline" size={64} color="#9ca3af" />
              <Text className="text-gray-500 dark:text-gray-400 text-center mt-4 mb-6">
                No RTI requests yet
              </Text>
              <TouchableOpacity
                onPress={() => router.push('/rti-wizard')}
                className="bg-blue-500 px-6 py-3 rounded-lg"
              >
                <Text className="text-white font-medium">
                  Submit Your First Request
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              {requests.slice(0, 3).map((request, index) => (
                <View key={request.id}>
                  {renderRequestCard({ item: request, index })}
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}