import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { useDatabase, useLocalDatabase } from '@/contexts/database-context';
import { TABLES } from '@/lib/database';

interface RTIAgency {
  id: string;
  name_en: string;
  name_bn: string;
  type: string;
}

interface RTITemplate {
  id: string;
  topic: string;
  title_en: string;
  title_bn: string;
  request_text_en: string;
  request_text_bn: string;
}

const RTI_AGENCIES: RTIAgency[] = [
  { id: 'ministry_finance', name_en: 'Ministry of Finance', name_bn: 'অর্থ মন্ত্রণালয়', type: 'ministry' },
  { id: 'ministry_health', name_en: 'Ministry of Health', name_bn: 'স্বাস্থ্য মন্ত্রণালয়', type: 'ministry' },
  { id: 'ministry_education', name_en: 'Ministry of Education', name_bn: 'শিক্ষা মন্ত্রণালয়', type: 'ministry' },
  { id: 'dhaka_city', name_en: 'Dhaka City Corporation', name_bn: 'ঢাকা সিটি কর্পোরেশন', type: 'local' },
  { id: 'anti_corruption', name_en: 'Anti-Corruption Commission', name_bn: 'দুর্নীতি দমন কমিশন', type: 'authority' }
];

const RTI_TEMPLATES: RTITemplate[] = [
  {
    id: 'budget',
    topic: 'budget',
    title_en: 'Budget Information Request',
    title_bn: 'বাজেট তথ্যের জন্য অনুরোধ',
    request_text_en: 'I request budget allocation and expenditure information for transparency.',
    request_text_bn: 'স্বচ্ছতার জন্য আমি বাজেট বরাদ্দ এবং ব্যয়ের তথ্য চাই।'
  },
  {
    id: 'tender',
    topic: 'tender',
    title_en: 'Tender Information Request',
    title_bn: 'টেন্ডার তথ্যের জন্য অনুরোধ',
    request_text_en: 'I request details about recent tenders and procurement processes.',
    request_text_bn: 'আমি সাম্প্রতিক টেন্ডার এবং ক্রয় প্রক্রিয়ার বিবরণ চাই।'
  },
  {
    id: 'project',
    topic: 'project',
    title_en: 'Development Project Information',
    title_bn: 'উন্নয়ন প্রকল্পের তথ্য',
    request_text_en: 'I request information about ongoing development projects in my area.',
    request_text_bn: 'আমি আমার এলাকার চলমান উন্নয়ন প্রকল্পের তথ্য চাই।'
  }
];

export default function RTIWizardScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { topic: initialTopic } = useLocalSearchParams();
  const { isInitialized } = useDatabase();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedAgency, setSelectedAgency] = useState<RTIAgency | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<RTITemplate | null>(null);
  const [showAgencyModal, setShowAgencyModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const [form, setForm] = useState({
    titleEn: '',
    titleBn: '',
    requestTextEn: '',
    requestTextBn: ''
  });

  const isEnglish = i18n.language === 'en';

  useEffect(() => {
    if (initialTopic) {
      const template = RTI_TEMPLATES.find(t => t.topic === initialTopic);
      if (template) {
        setSelectedTemplate(template);
        setForm({
          titleEn: template.title_en,
          titleBn: template.title_bn,
          requestTextEn: template.request_text_en,
          requestTextBn: template.request_text_bn
        });
        setCurrentStep(2);
      }
    }
  }, [initialTopic]);

  const handleTemplateSelect = (template: RTITemplate) => {
    setSelectedTemplate(template);
    setForm({
      titleEn: template.title_en,
      titleBn: template.title_bn,
      requestTextEn: template.request_text_en,
      requestTextBn: template.request_text_bn
    });
  };

  const submitRequest = async () => {
    if (!selectedAgency || !form.titleEn || !form.requestTextEn) {
      Alert.alert('Error', 'Please complete all required fields');
      return;
    }

    try {
      setIsLoading(true);
      const db = useLocalDatabase();
      
      const requestId = `rti_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const submittedDate = new Date().toISOString();
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + 20);
      
      await db.runAsync(
        `INSERT INTO ${TABLES.RTI_REQUESTS} (
          id, title_en, title_bn, request_text_en, request_text_bn,
          agency_name_en, agency_name_bn, submitted_date, deadline_date,
          status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          requestId, form.titleEn, form.titleBn, form.requestTextEn, form.requestTextBn,
          selectedAgency.name_en, selectedAgency.name_bn, submittedDate, deadline.toISOString(),
          'submitted', submittedDate
        ]
      );
      
      Alert.alert('Success', 'RTI request submitted successfully!', [
        { text: 'OK', onPress: () => router.replace('/rti') }
      ]);
      
    } catch (error) {
      console.error('Error submitting RTI request:', error);
      Alert.alert('Error', 'Failed to submit request. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderStepIndicator = () => (
    <View className="flex-row items-center justify-between px-4 py-4 bg-white dark:bg-gray-800">
      {[1, 2, 3].map((step) => (
        <View key={step} className="flex-row items-center flex-1">
          <View className={`w-8 h-8 rounded-full items-center justify-center ${
            step <= currentStep ? 'bg-blue-500' : 'bg-gray-300'
          }`}>
            <Text className="text-white text-xs font-bold">{step}</Text>
          </View>
          {step < 3 && <View className="flex-1 h-0.5 mx-2 bg-gray-300" />}
        </View>
      ))}
    </View>
  );

  const renderTemplateSelection = () => (
    <ScrollView className="p-4">
      <Text className="text-xl font-bold text-gray-900 dark:text-white mb-4">
        Choose Request Template
      </Text>
      
      {RTI_TEMPLATES.map((template, index) => (
        <MotiView
          key={template.id}
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ delay: index * 100 }}
        >
          <TouchableOpacity
            onPress={() => handleTemplateSelect(template)}
            className={`p-4 mb-3 rounded-xl border-2 ${
              selectedTemplate?.id === template.id
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
            }`}
          >
            <Text className="font-bold text-gray-900 dark:text-white mb-2">
              {isEnglish ? template.title_en : template.title_bn}
            </Text>
            <Text className="text-sm text-gray-600 dark:text-gray-400">
              {isEnglish ? template.request_text_en : template.request_text_bn}
            </Text>
          </TouchableOpacity>
        </MotiView>
      ))}
    </ScrollView>
  );

  const renderAgencySelection = () => (
    <View className="p-4">
      <Text className="text-xl font-bold text-gray-900 dark:text-white mb-4">
        Select Agency
      </Text>
      
      <TouchableOpacity
        onPress={() => setShowAgencyModal(true)}
        className="flex-row items-center justify-between p-4 bg-gray-100 dark:bg-gray-700 rounded-xl"
      >
        <Text className={selectedAgency ? 'text-gray-900 dark:text-white' : 'text-gray-500'}>
          {selectedAgency 
            ? (isEnglish ? selectedAgency.name_en : selectedAgency.name_bn)
            : 'Tap to select agency'
          }
        </Text>
        <Ionicons name="chevron-down" size={20} color="#6b7280" />
      </TouchableOpacity>
    </View>
  );

  const renderRequestForm = () => (
    <KeyboardAvoidingView className="flex-1 p-4" behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <Text className="text-xl font-bold text-gray-900 dark:text-white mb-4">
        Request Details
      </Text>
      
      <View className="space-y-4">
        <View>
          <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Title (English) *
          </Text>
          <TextInput
            value={form.titleEn}
            onChangeText={(text) => setForm(prev => ({ ...prev, titleEn: text }))}
            placeholder="Enter request title"
            className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-900 dark:text-white"
          />
        </View>
        
        <View>
          <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Title (Bangla) *
          </Text>
          <TextInput
            value={form.titleBn}
            onChangeText={(text) => setForm(prev => ({ ...prev, titleBn: text }))}
            placeholder="বাংলায় শিরোনাম"
            className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-900 dark:text-white"
          />
        </View>
        
        <View>
          <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Request Details (English) *
          </Text>
          <TextInput
            value={form.requestTextEn}
            onChangeText={(text) => setForm(prev => ({ ...prev, requestTextEn: text }))}
            placeholder="Enter detailed request"
            className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-900 dark:text-white"
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />
        </View>
        
        <View>
          <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Request Details (Bangla) *
          </Text>
          <TextInput
            value={form.requestTextBn}
            onChangeText={(text) => setForm(prev => ({ ...prev, requestTextBn: text }))}
            placeholder="বিস্তারিত অনুরোধ"
            className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-900 dark:text-white"
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />
        </View>
      </View>
    </KeyboardAvoidingView>
  );

  const renderAgencyModal = () => (
    <Modal visible={showAgencyModal} transparent animationType="slide">
      <View className="flex-1 justify-end bg-black/50">
        <View className="bg-white dark:bg-gray-800 rounded-t-xl max-h-96">
          <View className="flex-row justify-between items-center p-4 border-b border-gray-200">
            <Text className="text-lg font-bold text-gray-900 dark:text-white">Select Agency</Text>
            <TouchableOpacity onPress={() => setShowAgencyModal(false)}>
              <Ionicons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>
          <ScrollView>
            {RTI_AGENCIES.map((agency) => (
              <TouchableOpacity
                key={agency.id}
                onPress={() => {
                  setSelectedAgency(agency);
                  setShowAgencyModal(false);
                }}
                className="p-4 border-b border-gray-100"
              >
                <Text className="font-medium text-gray-900 dark:text-white">
                  {isEnglish ? agency.name_en : agency.name_bn}
                </Text>
                <Text className="text-sm text-gray-600 dark:text-gray-400">{agency.type}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  if (!isInitialized) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50 dark:bg-gray-900">
        <Text className="text-gray-600 dark:text-gray-400">{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <View className="bg-white dark:bg-gray-800 px-4 py-6 border-b border-gray-200">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-4">
            <Ionicons name="arrow-back" size={24} color="#6b7280" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-gray-900 dark:text-white">
            RTI Request Wizard
          </Text>
        </View>
      </View>

      {renderStepIndicator()}

      <View className="flex-1">
        {currentStep === 1 && renderTemplateSelection()}
        {currentStep === 2 && renderAgencySelection()}
        {currentStep === 3 && renderRequestForm()}
      </View>

      {/* Navigation */}
      <View className="bg-white dark:bg-gray-800 px-4 py-4 border-t border-gray-200">
        <View className="flex-row justify-between">
          <TouchableOpacity
            onPress={() => setCurrentStep(Math.max(1, currentStep - 1))}
            className={`flex-1 mr-2 py-3 rounded-lg items-center ${
              currentStep === 1 ? 'bg-gray-200' : 'bg-gray-300'
            }`}
            disabled={currentStep === 1}
          >
            <Text className={currentStep === 1 ? 'text-gray-400' : 'text-gray-700'}>
              Previous
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={currentStep === 3 ? submitRequest : () => setCurrentStep(currentStep + 1)}
            className="flex-1 ml-2 bg-blue-500 py-3 rounded-lg items-center"
            disabled={isLoading}
          >
            <Text className="text-white font-medium">
              {isLoading ? 'Submitting...' : currentStep === 3 ? 'Submit' : 'Next'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {renderAgencyModal()}
    </View>
  );
}