import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  Platform
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';

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
  email?: string;
  documents_required: string[];
  documents_submitted: string[];
  fees_paid: number;
  total_fees: number;
  created_at: string;
  office_address?: string;
  stages: Array<{
    name: string;
    status: 'completed' | 'current' | 'pending';
    date?: string;
    notes?: string;
  }>;
  notes?: string;
}

const PERMIT_TYPES = [
  {
    id: 'trade_license',
    name_en: 'Trade License',
    name_bn: 'ব্যবসায়িক লাইসেন্স',
    icon: 'business',
    color: '#3b82f6'
  },
  {
    id: 'building_permit',
    name_en: 'Building Permit',
    name_bn: 'নির্মাণ অনুমতি',
    icon: 'home',
    color: '#10b981'
  },
  {
    id: 'noc_fire',
    name_en: 'Fire Safety NOC',
    name_bn: 'অগ্নি নিরাপত্তা এনওসি',
    icon: 'flame',
    color: '#ef4444'
  },
  {
    id: 'environment_clearance',
    name_en: 'Environment Clearance',
    name_bn: 'পরিবেশ ছাড়পত্র',
    icon: 'leaf',
    color: '#22c55e'
  }
];

export default function PermitDetailScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const [application, setApplication] = useState<PermitApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'timeline' | 'documents' | 'contact'>('overview');

  const isEnglish = i18n.language === 'en';

  useEffect(() => {
    loadApplicationDetail();
  }, [params.id]);

  const loadApplicationDetail = async () => {
    try {
      // Mock detailed data - in production this would come from SQLite database
      const mockApplication: PermitApplication = {
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
        contact_person: 'Md. Rahman Khan',
        phone_number: '+8801712345678',
        email: 'rahman.dscc@gov.bd',
        documents_required: [
          'Business Plan',
          'NOC from Landlord',
          'Tax Certificate',
          'Bank Statement',
          'ID Copy'
        ],
        documents_submitted: [
          'Business Plan',
          'NOC from Landlord',
          'Tax Certificate'
        ],
        fees_paid: 5000,
        total_fees: 8000,
        office_address: 'Nagar Bhaban, Fulbaria, Dhaka-1000',
        created_at: '2024-01-15T10:00:00Z',
        stages: [
          {
            name: 'Application Submitted',
            status: 'completed',
            date: '2024-01-15',
            notes: 'Application received and acknowledged'
          },
          {
            name: 'Initial Review',
            status: 'completed',
            date: '2024-01-18',
            notes: 'Preliminary documents verified'
          },
          {
            name: 'Document Verification',
            status: 'current',
            notes: 'Pending: Bank Statement, ID Copy'
          },
          {
            name: 'Site Inspection',
            status: 'pending'
          },
          {
            name: 'Final Approval',
            status: 'pending'
          },
          {
            name: 'License Issuance',
            status: 'pending'
          }
        ],
        notes: 'Please submit remaining documents by February 5th to avoid delays.'
      };
      
      setApplication(mockApplication);
    } catch (error) {
      console.error('Error loading application detail:', error);
      Alert.alert('Error', 'Failed to load application details');
    } finally {
      setLoading(false);
    }
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

  const getPermitTypeInfo = (typeId: string) => {
    return PERMIT_TYPES.find(type => type.id === typeId) || PERMIT_TYPES[0];
  };

  const handleCall = () => {
    if (application?.phone_number) {
      Linking.openURL(`tel:${application.phone_number}`);
    }
  };

  const handleEmail = () => {
    if (application?.email) {
      Linking.openURL(`mailto:${application.email}`);
    }
  };

  const calculateProgress = () => {
    if (!application) return 0;
    const completedStages = application.stages.filter(stage => stage.status === 'completed').length;
    return (completedStages / application.stages.length) * 100;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(isEnglish ? 'en-BD' : 'bn-BD');
  };

  const renderOverviewTab = () => (
    <View className="p-4">
      {/* Application Info */}
      <View className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-4">
        <Text className="font-bold text-gray-900 dark:text-white mb-3">
          Application Information
        </Text>
        
        <View className="space-y-3">
          <View className="flex-row justify-between">
            <Text className="text-gray-600 dark:text-gray-400">Application Number:</Text>
            <Text className="text-gray-900 dark:text-white font-medium">
              {application?.application_number}
            </Text>
          </View>
          
          <View className="flex-row justify-between">
            <Text className="text-gray-600 dark:text-gray-400">Submitted:</Text>
            <Text className="text-gray-900 dark:text-white">
              {application && formatDate(application.submitted_date)}
            </Text>
          </View>
          
          <View className="flex-row justify-between">
            <Text className="text-gray-600 dark:text-gray-400">Expected Completion:</Text>
            <Text className="text-gray-900 dark:text-white">
              {application && formatDate(application.expected_completion)}
            </Text>
          </View>
          
          <View className="flex-row justify-between">
            <Text className="text-gray-600 dark:text-gray-400">Status:</Text>
            <View className="flex-row items-center">
              <View 
                className="w-2 h-2 rounded-full mr-2"
                style={{ backgroundColor: getStatusColor(application?.status || '') }}
              />
              <Text 
                className="font-medium capitalize"
                style={{ color: getStatusColor(application?.status || '') }}
              >
                {application?.status}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Progress */}
      <View className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-4">
        <Text className="font-bold text-gray-900 dark:text-white mb-3">
          Processing Progress
        </Text>
        
        <View className="mb-3">
          <Text className="text-gray-600 dark:text-gray-400 text-sm mb-2">
            Current Stage: {application?.current_stage}
          </Text>
          <View className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <View 
              className="h-full bg-blue-500 rounded-full"
              style={{ width: `${calculateProgress()}%` }}
            />
          </View>
          <Text className="text-blue-600 text-sm mt-1">
            {Math.round(calculateProgress())}% Complete
          </Text>
        </View>
        
        <Text className="text-gray-600 dark:text-gray-400 text-sm">
          Day {application?.actual_days || 25} of {application?.expected_days} expected days
        </Text>
      </View>

      {/* Fees */}
      <View className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-4">
        <Text className="font-bold text-gray-900 dark:text-white mb-3">
          Fee Information
        </Text>
        
        <View className="space-y-2">
          <View className="flex-row justify-between">
            <Text className="text-gray-600 dark:text-gray-400">Total Fees:</Text>
            <Text className="text-gray-900 dark:text-white font-medium">
              ৳{application?.total_fees?.toLocaleString()}
            </Text>
          </View>
          
          <View className="flex-row justify-between">
            <Text className="text-gray-600 dark:text-gray-400">Paid:</Text>
            <Text className="text-green-600 font-medium">
              ৳{application?.fees_paid?.toLocaleString()}
            </Text>
          </View>
          
          <View className="flex-row justify-between">
            <Text className="text-gray-600 dark:text-gray-400">Remaining:</Text>
            <Text className="text-orange-600 font-medium">
              ৳{((application?.total_fees || 0) - (application?.fees_paid || 0)).toLocaleString()}
            </Text>
          </View>
        </View>
      </View>

      {/* Notes */}
      {application?.notes && (
        <View className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-4 border border-yellow-200 dark:border-yellow-800">
          <View className="flex-row items-start">
            <Ionicons name="information-circle" size={20} color="#f59e0b" />
            <Text className="ml-2 text-yellow-800 dark:text-yellow-200 flex-1">
              {application.notes}
            </Text>
          </View>
        </View>
      )}
    </View>
  );

  const renderTimelineTab = () => (
    <View className="p-4">
      {application?.stages.map((stage, index) => (
        <View key={index} className="flex-row items-start mb-4">
          <View className="items-center mr-4">
            <View 
              className={`w-4 h-4 rounded-full border-2 ${
                stage.status === 'completed' 
                  ? 'bg-green-500 border-green-500' 
                  : stage.status === 'current'
                  ? 'bg-blue-500 border-blue-500'
                  : 'bg-gray-200 border-gray-300'
              }`}
            />
            {index < application.stages.length - 1 && (
              <View className="w-0.5 h-8 bg-gray-200 dark:bg-gray-700 mt-2" />
            )}
          </View>
          
          <View className="flex-1">
            <Text className={`font-medium ${
              stage.status === 'completed' 
                ? 'text-green-700 dark:text-green-300' 
                : stage.status === 'current'
                ? 'text-blue-700 dark:text-blue-300'
                : 'text-gray-500 dark:text-gray-400'
            }`}>
              {stage.name}
            </Text>
            
            {stage.date && (
              <Text className="text-gray-500 text-sm mt-1">
                {formatDate(stage.date)}
              </Text>
            )}
            
            {stage.notes && (
              <Text className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                {stage.notes}
              </Text>
            )}
          </View>
        </View>
      ))}
    </View>
  );

  const renderDocumentsTab = () => (
    <View className="p-4">
      <Text className="font-bold text-gray-900 dark:text-white mb-4">
        Required Documents
      </Text>
      
      {application?.documents_required.map((doc, index) => {
        const isSubmitted = application.documents_submitted.includes(doc);
        return (
          <View key={index} className="flex-row items-center py-3 border-b border-gray-100 dark:border-gray-700">
            <Ionicons 
              name={isSubmitted ? "checkmark-circle" : "ellipse-outline"} 
              size={20} 
              color={isSubmitted ? "#10b981" : "#6b7280"} 
            />
            <Text className={`ml-3 flex-1 ${
              isSubmitted 
                ? 'text-gray-900 dark:text-white' 
                : 'text-gray-600 dark:text-gray-400'
            }`}>
              {doc}
            </Text>
            {isSubmitted && (
              <Text className="text-green-600 text-sm">Submitted</Text>
            )}
          </View>
        );
      })}
    </View>
  );

  const renderContactTab = () => (
    <View className="p-4">
      <View className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-4">
        <Text className="font-bold text-gray-900 dark:text-white mb-3">
          Contact Information
        </Text>
        
        <View className="space-y-4">
          {application?.contact_person && (
            <View className="flex-row items-center">
              <Ionicons name="person" size={20} color="#6b7280" />
              <Text className="ml-3 text-gray-900 dark:text-white">
                {application.contact_person}
              </Text>
            </View>
          )}
          
          {application?.phone_number && (
            <TouchableOpacity 
              onPress={handleCall}
              className="flex-row items-center justify-between"
            >
              <View className="flex-row items-center">
                <Ionicons name="call" size={20} color="#3b82f6" />
                <Text className="ml-3 text-gray-900 dark:text-white">
                  {application.phone_number}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#6b7280" />
            </TouchableOpacity>
          )}
          
          {application?.email && (
            <TouchableOpacity 
              onPress={handleEmail}
              className="flex-row items-center justify-between"
            >
              <View className="flex-row items-center">
                <Ionicons name="mail" size={20} color="#3b82f6" />
                <Text className="ml-3 text-gray-900 dark:text-white">
                  {application.email}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#6b7280" />
            </TouchableOpacity>
          )}
        </View>
      </View>
      
      {application?.office_address && (
        <View className="bg-white dark:bg-gray-800 rounded-xl p-4">
          <Text className="font-bold text-gray-900 dark:text-white mb-3">
            Office Address
          </Text>
          <View className="flex-row items-start">
            <Ionicons name="location" size={20} color="#6b7280" />
            <Text className="ml-3 text-gray-700 dark:text-gray-300 flex-1">
              {application.office_address}
            </Text>
          </View>
        </View>
      )}
    </View>
  );

  if (loading) {
    return (
      <View className="flex-1 bg-gray-50 dark:bg-gray-900 items-center justify-center">
        <Text className="text-gray-600 dark:text-gray-400">Loading application details...</Text>
      </View>
    );
  }

  if (!application) {
    return (
      <View className="flex-1 bg-gray-50 dark:bg-gray-900 items-center justify-center">
        <Text className="text-gray-600 dark:text-gray-400">Application not found</Text>
      </View>
    );
  }

  const permitInfo = getPermitTypeInfo(application.permit_type);

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <View className="bg-white dark:bg-gray-800 px-4 py-6 shadow-sm">
        <View className="flex-row items-center">
          <TouchableOpacity 
            onPress={() => router.back()}
            className="mr-4"
          >
            <Ionicons name="arrow-back" size={24} color="#6b7280" />
          </TouchableOpacity>
          
          <View 
            className="w-12 h-12 rounded-full items-center justify-center mr-3"
            style={{ backgroundColor: permitInfo.color + '20' }}
          >
            <Ionicons name={permitInfo.icon as any} size={24} color={permitInfo.color} />
          </View>
          
          <View className="flex-1">
            <Text className="text-gray-900 dark:text-white text-lg font-bold">
              {isEnglish ? permitInfo.name_en : permitInfo.name_bn}
            </Text>
            <Text className="text-gray-600 dark:text-gray-400 text-sm">
              {application.application_number}
            </Text>
          </View>
        </View>
      </View>

      {/* Tabs */}
      <View className="bg-white dark:bg-gray-800 px-4">
        <View className="flex-row">
          {[
            { key: 'overview', label: 'Overview', icon: 'information-circle' },
            { key: 'timeline', label: 'Timeline', icon: 'time' },
            { key: 'documents', label: 'Documents', icon: 'document-text' },
            { key: 'contact', label: 'Contact', icon: 'person' }
          ].map((tab) => (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setActiveTab(tab.key as any)}
              className={`flex-1 py-3 items-center border-b-2 ${
                activeTab === tab.key 
                  ? 'border-blue-500' 
                  : 'border-transparent'
              }`}
            >
              <Ionicons 
                name={tab.icon as any} 
                size={20} 
                color={activeTab === tab.key ? '#3b82f6' : '#6b7280'} 
              />
              <Text className={`text-xs mt-1 ${
                activeTab === tab.key 
                  ? 'text-blue-600 font-medium' 
                  : 'text-gray-500'
              }`}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Tab Content */}
      <ScrollView className="flex-1">
        {activeTab === 'overview' && renderOverviewTab()}
        {activeTab === 'timeline' && renderTimelineTab()}
        {activeTab === 'documents' && renderDocumentsTab()}
        {activeTab === 'contact' && renderContactTab()}
      </ScrollView>
    </View>
  );
}