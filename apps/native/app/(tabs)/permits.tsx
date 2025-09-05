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
import { useDatabase } from '@/lib/database';

interface PermitApplication {
  id: string;
  permit_type: string;
  application_number: string;
  office_name: string;
  submitted_date: string;
  expected_completion: string;
  actual_completion?: string;
  current_stage: string;
  status: 'pending' | 'processing' | 'completed' | 'delayed' | 'rejected';
  expected_days: number;
  actual_days?: number;
  delay_reason?: string;
  contact_person?: string;
  phone_number?: string;
  documents_required: string[];
  fees_paid: number;
  created_at: string;
}

const PERMIT_TYPES = [
  {
    id: 'trade_license',
    name_en: 'Trade License',
    name_bn: 'ব্যবসায়িক লাইসেন্স',
    icon: 'business',
    color: '#3b82f6',
    expected_days: 30
  },
  {
    id: 'building_permit',
    name_en: 'Building Permit',
    name_bn: 'নির্মাণ অনুমতি',
    icon: 'home',
    color: '#10b981',
    expected_days: 45
  },
  {
    id: 'noc_fire',
    name_en: 'Fire Safety NOC',
    name_bn: 'অগ্নি নিরাপত্তা এনওসি',
    icon: 'flame',
    color: '#ef4444',
    expected_days: 21
  },
  {
    id: 'environment_clearance',
    name_en: 'Environment Clearance',
    name_bn: 'পরিবেশ ছাড়পত্র',
    icon: 'leaf',
    color: '#22c55e',
    expected_days: 60
  },
  {
    id: 'factory_license',
    name_en: 'Factory License',
    name_bn: 'কারখানা লাইসেন্স',
    icon: 'cog',
    color: '#8b5cf6',
    expected_days: 35
  },
  {
    id: 'import_permit',
    name_en: 'Import Permit',
    name_bn: 'আমদানি অনুমতি',
    icon: 'airplane',
    color: '#f59e0b',
    expected_days: 15
  }
];

export default function PermitsScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { isInitialized } = useDatabase();
  
  const [applications, setApplications] = useState<PermitApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'pending' | 'delayed' | 'completed'>('all');

  const isEnglish = i18n.language === 'en';

  useEffect(() => {
    if (isInitialized) {
      loadApplications();
    }
  }, [isInitialized]);

  const loadApplications = async () => {
    try {
      setLoading(true);
      
      // Mock data - in production this would come from SQLite database
      const mockApplications: PermitApplication[] = [
        {
          id: 'app_001',
          permit_type: 'trade_license',
          application_number: 'TL/2024/0012',
          office_name: 'Dhaka South City Corporation',
          submitted_date: '2024-01-15',
          expected_completion: '2024-02-14',
          current_stage: 'Document Verification',
          status: 'processing',
          expected_days: 30,
          actual_days: 25,
          contact_person: 'Md. Rahman',
          phone_number: '+8801712345678',
          documents_required: ['Business Plan', 'NOC from Landlord', 'Tax Certificate'],
          fees_paid: 5000,
          created_at: '2024-01-15T10:00:00Z'
        },
        {
          id: 'app_002',
          permit_type: 'building_permit',
          application_number: 'BP/2024/0089',
          office_name: 'Rajdhani Unnayan Kartripakkha (RAJUK)',
          submitted_date: '2023-12-01',
          expected_completion: '2024-01-15',
          actual_completion: '2024-02-05',
          current_stage: 'Completed',
          status: 'completed',
          expected_days: 45,
          actual_days: 66,
          delay_reason: 'Site inspection delays due to weather',
          contact_person: 'Eng. Karim',
          documents_required: ['Architectural Plan', 'Soil Test Report', 'NOC from Utility'],
          fees_paid: 25000,
          created_at: '2023-12-01T09:30:00Z'
        },
        {
          id: 'app_003',
          permit_type: 'noc_fire',
          application_number: 'FS/2024/0156',
          office_name: 'Fire Service and Civil Defence',
          submitted_date: '2024-01-20',
          expected_completion: '2024-02-10',
          current_stage: 'Awaiting Site Inspection',
          status: 'delayed',
          expected_days: 21,
          actual_days: 28,
          delay_reason: 'Inspector shortage',
          contact_person: 'Lt. Colonel Hasan',
          documents_required: ['Building Layout', 'Fire Safety Equipment List'],
          fees_paid: 3000,
          created_at: '2024-01-20T14:15:00Z'
        }
      ];
      
      setApplications(mockApplications);
    } catch (error) {
      console.error('Error loading applications:', error);
      Alert.alert('Error', 'Failed to load permit applications');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadApplications();
    setRefreshing(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#10b981';
      case 'processing': return '#3b82f6';
      case 'delayed': return '#ef4444';
      case 'rejected': return '#dc2626';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return 'checkmark-circle';
      case 'processing': return 'time';
      case 'delayed': return 'warning';
      case 'rejected': return 'close-circle';
      default: return 'hourglass';
    }
  };

  const calculateProgress = (app: PermitApplication) => {
    const now = new Date();
    const submitted = new Date(app.submitted_date);
    const expected = new Date(app.expected_completion);
    
    const totalDays = Math.ceil((expected.getTime() - submitted.getTime()) / (1000 * 60 * 60 * 24));
    const elapsedDays = Math.ceil((now.getTime() - submitted.getTime()) / (1000 * 60 * 60 * 24));
    
    return Math.min(Math.max((elapsedDays / totalDays) * 100, 0), 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(isEnglish ? 'en-BD' : 'bn-BD');
  };

  const getPermitTypeInfo = (typeId: string) => {
    return PERMIT_TYPES.find(type => type.id === typeId) || PERMIT_TYPES[0];
  };

  const filteredApplications = applications.filter(app => {
    if (selectedFilter === 'all') return true;
    return app.status === selectedFilter;
  });

  const renderFilterTabs = () => (
    <View className="flex-row bg-white dark:bg-gray-800 mx-4 mb-4 rounded-xl p-1">
      {[
        { key: 'all', label: 'All', count: applications.length },
        { key: 'pending', label: 'Pending', count: applications.filter(a => a.status === 'pending').length },
        { key: 'delayed', label: 'Delayed', count: applications.filter(a => a.status === 'delayed').length },
        { key: 'completed', label: 'Completed', count: applications.filter(a => a.status === 'completed').length }
      ].map((tab) => (
        <TouchableOpacity
          key={tab.key}
          onPress={() => setSelectedFilter(tab.key as any)}
          className={`flex-1 py-2 px-3 rounded-lg ${
            selectedFilter === tab.key 
              ? 'bg-blue-500' 
              : 'bg-transparent'
          }`}
        >
          <Text className={`text-center text-sm font-medium ${
            selectedFilter === tab.key 
              ? 'text-white' 
              : 'text-gray-600 dark:text-gray-400'
          }`}>
            {tab.label}
          </Text>
          <Text className={`text-center text-xs ${
            selectedFilter === tab.key 
              ? 'text-white/80' 
              : 'text-gray-500 dark:text-gray-500'
          }`}>
            {tab.count}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderApplicationCard = (app: PermitApplication, index: number) => {
    const permitInfo = getPermitTypeInfo(app.permit_type);
    const progress = calculateProgress(app);
    const isDelayed = app.actual_days && app.actual_days > app.expected_days;
    
    return (
      <MotiView
        key={app.id}
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 500, delay: index * 100 }}
        className="bg-white dark:bg-gray-800 rounded-xl mx-4 mb-4 shadow-sm"
      >
        <TouchableOpacity
          onPress={() => router.push(`/permit-detail?id=${app.id}`)}
          className="p-4"
        >
          {/* Header */}
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center flex-1">
              <View 
                className="w-10 h-10 rounded-full items-center justify-center mr-3"
                style={{ backgroundColor: permitInfo.color + '20' }}
              >
                <Ionicons name={permitInfo.icon as any} size={20} color={permitInfo.color} />
              </View>
              <View className="flex-1">
                <Text className="font-bold text-gray-900 dark:text-white">
                  {isEnglish ? permitInfo.name_en : permitInfo.name_bn}
                </Text>
                <Text className="text-gray-600 dark:text-gray-400 text-sm">
                  {app.application_number}
                </Text>
              </View>
            </View>
            
            <View className="items-end">
              <View className="flex-row items-center">
                <Ionicons 
                  name={getStatusIcon(app.status) as any} 
                  size={16} 
                  color={getStatusColor(app.status)} 
                />
                <Text 
                  className="ml-1 text-sm font-medium capitalize"
                  style={{ color: getStatusColor(app.status) }}
                >
                  {app.status}
                </Text>
              </View>
              {isDelayed && (
                <Text className="text-red-500 text-xs mt-1">
                  +{app.actual_days! - app.expected_days} days late
                </Text>
              )}
            </View>
          </View>

          {/* Office Info */}
          <View className="flex-row items-center mb-3">
            <Ionicons name="business" size={16} color="#6b7280" />
            <Text className="ml-2 text-gray-700 dark:text-gray-300 text-sm flex-1">
              {app.office_name}
            </Text>
          </View>

          {/* Timeline */}
          <View className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 mb-3">
            <View className="flex-row justify-between items-center mb-2">
              <Text className="text-gray-600 dark:text-gray-400 text-sm">
                Current Stage
              </Text>
              <Text className="text-gray-900 dark:text-white font-medium text-sm">
                {app.current_stage}
              </Text>
            </View>
            
            {/* Progress Bar */}
            <View className="mb-2">
              <View className="flex-row justify-between mb-1">
                <Text className="text-xs text-gray-500">
                  Submitted: {formatDate(app.submitted_date)}
                </Text>
                <Text className="text-xs text-gray-500">
                  Expected: {formatDate(app.expected_completion)}
                </Text>
              </View>
              
              <View className="h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                <View 
                  className={`h-full rounded-full ${
                    progress > 100 ? 'bg-red-500' : 
                    app.status === 'completed' ? 'bg-green-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </View>
            </View>
            
            <View className="flex-row justify-between">
              <Text className="text-xs text-gray-600 dark:text-gray-400">
                Day {app.actual_days || Math.ceil((new Date().getTime() - new Date(app.submitted_date).getTime()) / (1000 * 60 * 60 * 24))} of {app.expected_days}
              </Text>
              <Text className={`text-xs font-medium ${
                progress > 100 ? 'text-red-600' : 
                app.status === 'completed' ? 'text-green-600' : 'text-blue-600'
              }`}>
                {Math.round(progress)}%
              </Text>
            </View>
          </View>

          {/* Contact Info */}
          {app.contact_person && (
            <View className="flex-row items-center">
              <Ionicons name="person" size={16} color="#6b7280" />
              <Text className="ml-2 text-gray-600 dark:text-gray-400 text-sm">
                Contact: {app.contact_person}
              </Text>
              {app.phone_number && (
                <TouchableOpacity className="ml-auto">
                  <Ionicons name="call" size={16} color="#3b82f6" />
                </TouchableOpacity>
              )}
            </View>
          )}
        </TouchableOpacity>
      </MotiView>
    );
  };

  const renderEmptyState = () => (
    <MotiView
      from={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'timing', duration: 500 }}
      className="items-center justify-center py-16"
    >
      <View className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full items-center justify-center mb-4">
        <Ionicons name="document-text" size={40} color="#6b7280" />
      </View>
      <Text className="text-gray-900 dark:text-white font-bold text-lg mb-2">
        No Applications Found
      </Text>
      <Text className="text-gray-600 dark:text-gray-400 text-center mb-6 px-8">
        You haven't submitted any permit applications yet. Start tracking your government permits today.
      </Text>
      <TouchableOpacity
        onPress={() => router.push('/add-permit')}
        className="bg-blue-500 px-6 py-3 rounded-xl"
      >
        <Text className="text-white font-bold">
          Add New Application
        </Text>
      </TouchableOpacity>
    </MotiView>
  );

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <View className="bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-6">
        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <Text className="text-white text-2xl font-bold">
              PermitPath
            </Text>
            <Text className="text-white/80 text-sm mt-1">
              Track your government permit applications
            </Text>
          </View>
          <View className="flex-row space-x-3">
            <TouchableOpacity
              onPress={() => router.push('/delay-analysis')}
              className="bg-white/20 p-3 rounded-xl"
            >
              <Ionicons name="analytics" size={24} color="white" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push('/add-permit')}
              className="bg-white/20 p-3 rounded-xl"
            >
              <Ionicons name="add" size={24} color="white" />
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Quick Stats */}
        <View className="flex-row mt-4 space-x-3">
          <View className="flex-1 bg-white/20 rounded-lg p-3">
            <Text className="text-white/80 text-xs">Active</Text>
            <Text className="text-white text-lg font-bold">
              {applications.filter(a => ['pending', 'processing'].includes(a.status)).length}
            </Text>
          </View>
          <View className="flex-1 bg-white/20 rounded-lg p-3">
            <Text className="text-white/80 text-xs">Delayed</Text>
            <Text className="text-white text-lg font-bold">
              {applications.filter(a => a.status === 'delayed').length}
            </Text>
          </View>
          <View className="flex-1 bg-white/20 rounded-lg p-3">
            <Text className="text-white/80 text-xs">Completed</Text>
            <Text className="text-white text-lg font-bold">
              {applications.filter(a => a.status === 'completed').length}
            </Text>
          </View>
        </View>
      </View>

      {/* Filter Tabs */}
      {renderFilterTabs()}

      {/* Applications List */}
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View className="items-center justify-center py-16">
            <Text className="text-gray-600 dark:text-gray-400">Loading applications...</Text>
          </View>
        ) : filteredApplications.length === 0 ? (
          renderEmptyState()
        ) : (
          <View className="pb-6">
            {filteredApplications.map((app, index) => renderApplicationCard(app, index))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}