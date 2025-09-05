import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { useDatabase, useLocalDatabase } from '@/contexts/database-context';
import { TABLES } from '@/lib/database';

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

interface DeadlineStats {
  daysLeft: number;
  isOverdue: boolean;
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
  progressPercentage: number;
}

export default function RTIDeadlineTrackerScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { isInitialized } = useDatabase();
  
  const [requests, setRequests] = useState<RTIRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalActive: 0,
    overdue: 0,
    dueThisWeek: 0,
    averageProgress: 0
  });

  const isEnglish = i18n.language === 'en';

  useEffect(() => {
    if (isInitialized) {
      loadRTIRequests();
    }
  }, [isInitialized]);

  useEffect(() => {
    // Set up notification scheduling
    scheduleNotifications();
    
    // Set up interval to update countdown timers
    const interval = setInterval(() => {
      setRequests(prev => [...prev]); // Force re-render to update countdown
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [requests]);

  const loadRTIRequests = async () => {
    try {
      setIsLoading(true);
      
      if (!isInitialized) {
        console.log('Database not initialized yet');
        return;
      }
      
      const db = useLocalDatabase();
      
      // Load active RTI requests (not completed)
      const result = await db.getAllAsync<RTIRequest>(
        `SELECT * FROM ${TABLES.RTI_REQUESTS} 
         WHERE status NOT IN ('completed') 
         ORDER BY deadline_date ASC`
      );
      
      console.log(`Loaded ${result.length} active RTI requests`);
      setRequests(result);
      
      // Calculate statistics
      const now = new Date();
      const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      
      let overdue = 0;
      let dueThisWeek = 0;
      let totalProgress = 0;
      
      result.forEach(request => {
        const deadline = new Date(request.deadline_date);
        const submitted = new Date(request.submitted_date);
        
        if (deadline < now && !['completed', 'responded'].includes(request.status)) {
          overdue++;
        }
        
        if (deadline <= weekFromNow && deadline >= now) {
          dueThisWeek++;
        }
        
        // Calculate progress (0-100%)
        const totalTime = deadline.getTime() - submitted.getTime();
        const elapsed = now.getTime() - submitted.getTime();
        const progress = Math.min(Math.max((elapsed / totalTime) * 100, 0), 100);
        totalProgress += progress;
      });
      
      setStats({
        totalActive: result.length,
        overdue,
        dueThisWeek,
        averageProgress: result.length > 0 ? totalProgress / result.length : 0
      });
      
    } catch (error) {
      console.error('Failed to load RTI requests:', error);
      Alert.alert('Error', 'Failed to load RTI requests');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRTIRequests();
    setRefreshing(false);
  };

  const calculateDeadlineStats = (request: RTIRequest): DeadlineStats => {
    const now = new Date();
    const deadline = new Date(request.deadline_date);
    const submitted = new Date(request.submitted_date);
    
    const timeLeft = deadline.getTime() - now.getTime();
    const daysLeft = Math.ceil(timeLeft / (1000 * 60 * 60 * 24));
    const isOverdue = daysLeft < 0;
    
    // Calculate progress
    const totalTime = deadline.getTime() - submitted.getTime();
    const elapsed = now.getTime() - submitted.getTime();
    const progressPercentage = Math.min(Math.max((elapsed / totalTime) * 100, 0), 100);
    
    // Determine urgency level
    let urgencyLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (isOverdue) {
      urgencyLevel = 'critical';
    } else if (daysLeft <= 3) {
      urgencyLevel = 'high';
    } else if (daysLeft <= 7) {
      urgencyLevel = 'medium';
    }
    
    return {
      daysLeft: Math.abs(daysLeft),
      isOverdue,
      urgencyLevel,
      progressPercentage
    };
  };

  const getUrgencyColor = (urgencyLevel: string): string => {
    switch (urgencyLevel) {
      case 'critical': return '#ef4444';
      case 'high': return '#f59e0b';
      case 'medium': return '#3b82f6';
      case 'low': return '#10b981';
      default: return '#6b7280';
    }
  };

  const getUrgencyLabel = (urgencyLevel: string, isOverdue: boolean): string => {
    if (isOverdue) return isEnglish ? 'Overdue' : 'সময়সীমা শেষ';
    
    const labels: Record<string, string> = {
      critical: isEnglish ? 'Critical' : 'গুরুত্বপূর্ণ',
      high: isEnglish ? 'Urgent' : 'জরুরি',
      medium: isEnglish ? 'Soon' : 'শীঘ্রই',
      low: isEnglish ? 'On Track' : 'ঠিক আছে'
    };
    return labels[urgencyLevel] || urgencyLevel;
  };

  const formatTimeLeft = (daysLeft: number, isOverdue: boolean): string => {
    if (isOverdue) {
      return isEnglish 
        ? `${daysLeft} days overdue` 
        : `${daysLeft} দিন দেরি`;
    }
    
    if (daysLeft === 0) {
      return isEnglish ? 'Due today' : 'আজ শেষ';
    }
    
    return isEnglish 
      ? `${daysLeft} days left` 
      : `${daysLeft} দিন বাকি`;
  };

  const scheduleNotifications = async () => {
    // This would integrate with expo-notifications
    // For now, we'll just log the scheduling
    const upcomingDeadlines = requests.filter(request => {
      const stats = calculateDeadlineStats(request);
      return !stats.isOverdue && stats.daysLeft <= 7;
    });
    
    console.log(`Scheduling notifications for ${upcomingDeadlines.length} upcoming deadlines`);
  };

  const handleRequestPress = (request: RTIRequest) => {
    router.push(`/rti-detail?id=${request.id}`);
  };

  const handleSendReminder = (request: RTIRequest) => {
    Alert.alert(
      'Send Reminder',
      `Send a follow-up reminder for this RTI request to ${isEnglish ? request.agency_name_en : request.agency_name_bn}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Send', 
          onPress: () => {
            // This would implement actual reminder sending
            Alert.alert('Reminder Sent', 'Follow-up reminder has been sent to the agency.');
          }
        }
      ]
    );
  };

  const renderCountdownTimer = (stats: DeadlineStats) => {
    const { daysLeft, isOverdue, urgencyLevel } = stats;
    const color = getUrgencyColor(urgencyLevel);
    
    return (
      <View className="items-center">
        <View 
          className="w-16 h-16 rounded-full items-center justify-center"
          style={{ backgroundColor: color + '20' }}
        >
          <Text 
            className="text-lg font-bold"
            style={{ color }}
          >
            {daysLeft}
          </Text>
        </View>
        <Text 
          className="text-xs font-medium mt-1"
          style={{ color }}
        >
          {isOverdue ? (isEnglish ? 'OVERDUE' : 'দেরি') : (isEnglish ? 'DAYS' : 'দিন')}
        </Text>
      </View>
    );
  };

  const renderProgressBar = (progressPercentage: number, urgencyLevel: string) => {
    const color = getUrgencyColor(urgencyLevel);
    
    return (
      <View className="flex-1 mx-4">
        <View className="flex-row justify-between items-center mb-2">
          <Text className="text-xs text-gray-600 dark:text-gray-400">
            Progress
          </Text>
          <Text className="text-xs font-medium text-gray-700 dark:text-gray-300">
            {Math.round(progressPercentage)}%
          </Text>
        </View>
        
        <View className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <MotiView
            animate={{ width: `${progressPercentage}%` }}
            transition={{ type: 'timing', duration: 1000 }}
            className="h-full rounded-full"
            style={{ backgroundColor: color }}
          />
        </View>
      </View>
    );
  };

  const renderRequestCard = ({ item, index }: { item: RTIRequest; index: number }) => {
    const stats = calculateDeadlineStats(item);
    
    return (
      <MotiView
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 600, delay: index * 100 }}
        className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-3 shadow-sm border border-gray-100 dark:border-gray-700"
      >
        <TouchableOpacity
          onPress={() => handleRequestPress(item)}
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
              style={{ backgroundColor: getUrgencyColor(stats.urgencyLevel) + '20' }}
            >
              <Text 
                className="text-xs font-bold"
                style={{ color: getUrgencyColor(stats.urgencyLevel) }}
              >
                {getUrgencyLabel(stats.urgencyLevel, stats.isOverdue)}
              </Text>
            </View>
          </View>

          {/* Countdown and Progress */}
          <View className="flex-row items-center mb-4">
            {renderCountdownTimer(stats)}
            {renderProgressBar(stats.progressPercentage, stats.urgencyLevel)}
          </View>

          {/* Timeline Info */}
          <View className="flex-row justify-between items-center mb-3">
            <View className="flex-row items-center">
              <Ionicons name="calendar" size={16} color="#6b7280" />
              <Text className="text-sm text-gray-600 dark:text-gray-400 ml-1">
                Submitted: {new Date(item.submitted_date).toLocaleDateString()}
              </Text>
            </View>
            
            <View className="flex-row items-center">
              <Ionicons name="flag" size={16} color="#6b7280" />
              <Text className="text-sm text-gray-600 dark:text-gray-400 ml-1">
                Due: {new Date(item.deadline_date).toLocaleDateString()}
              </Text>
            </View>
          </View>

          {/* Status and Actions */}
          <View className="flex-row justify-between items-center">
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {formatTimeLeft(stats.daysLeft, stats.isOverdue)}
            </Text>
            
            {(stats.urgencyLevel === 'high' || stats.urgencyLevel === 'critical') && (
              <TouchableOpacity
                onPress={() => handleSendReminder(item)}
                className="flex-row items-center bg-blue-100 dark:bg-blue-900/30 px-3 py-1 rounded-full"
              >
                <Ionicons name="mail" size={14} color="#3b82f6" />
                <Text className="text-blue-600 dark:text-blue-400 text-xs font-medium ml-1">
                  Remind
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </MotiView>
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
              RTI Deadline Tracker
            </Text>
            <Text className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Monitor your request deadlines
            </Text>
          </View>
          
          <TouchableOpacity
            onPress={() => router.push('/rti-wizard')}
            className="bg-blue-500 px-3 py-2 rounded-lg"
          >
            <Ionicons name="add" size={20} color="white" />
          </TouchableOpacity>
        </View>
        
        {/* Quick Stats */}
        <View className="flex-row justify-between">
          <View className="items-center">
            <Text className="text-lg font-bold text-gray-900 dark:text-white">
              {stats.totalActive}
            </Text>
            <Text className="text-xs text-gray-600 dark:text-gray-400">
              Active
            </Text>
          </View>
          
          <View className="items-center">
            <Text className="text-lg font-bold text-red-600">
              {stats.overdue}
            </Text>
            <Text className="text-xs text-gray-600 dark:text-gray-400">
              Overdue
            </Text>
          </View>
          
          <View className="items-center">
            <Text className="text-lg font-bold text-orange-600">
              {stats.dueThisWeek}
            </Text>
            <Text className="text-xs text-gray-600 dark:text-gray-400">
              This Week
            </Text>
          </View>
          
          <View className="items-center">
            <Text className="text-lg font-bold text-blue-600">
              {Math.round(stats.averageProgress)}%
            </Text>
            <Text className="text-xs text-gray-600 dark:text-gray-400">
              Avg Progress
            </Text>
          </View>
        </View>
      </View>

      <ScrollView 
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View className="p-4">
          {requests.length === 0 ? (
            <View className="items-center justify-center py-12 bg-white dark:bg-gray-800 rounded-xl">
              <Ionicons name="timer-outline" size={64} color="#9ca3af" />
              <Text className="text-gray-500 dark:text-gray-400 text-center mt-4 mb-6">
                No active RTI requests to track
              </Text>
              <TouchableOpacity
                onPress={() => router.push('/rti-wizard')}
                className="bg-blue-500 px-6 py-3 rounded-lg"
              >
                <Text className="text-white font-medium">
                  Submit New Request
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              {/* Urgent Requests Section */}
              {requests.filter(r => {
                const stats = calculateDeadlineStats(r);
                return stats.urgencyLevel === 'critical' || stats.urgencyLevel === 'high';
              }).length > 0 && (
                <View className="mb-6">
                  <Text className="text-lg font-bold text-red-600 mb-3">
                    🚨 Urgent Attention Required
                  </Text>
                  {requests
                    .filter(r => {
                      const stats = calculateDeadlineStats(r);
                      return stats.urgencyLevel === 'critical' || stats.urgencyLevel === 'high';
                    })
                    .map((request, index) => (
                      <View key={request.id}>
                        {renderRequestCard({ item: request, index })}
                      </View>
                    ))
                  }
                </View>
              )}

              {/* All Requests Section */}
              <Text className="text-lg font-bold text-gray-900 dark:text-white mb-3">
                All Active Requests ({requests.length})
              </Text>
              
              {requests.map((request, index) => (
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