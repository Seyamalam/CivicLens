import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';

interface PermitForm {
  permit_type: string;
  application_number: string;
  office_name: string;
  submitted_date: string;
  expected_completion_date: string;
  contact_person: string;
  phone_number: string;
  email: string;
  office_address: string;
  fees_paid: number;
  total_fees: number;
  notes: string;
}

const PERMIT_TYPES = [
  {
    id: 'trade_license',
    name_en: 'Trade License',
    name_bn: 'ব্যবসায়িক লাইসেন্স',
    icon: 'business',
    color: '#3b82f6',
    expected_days: 30,
    typical_fee: 8000,
    office: 'City Corporation'
  },
  {
    id: 'building_permit',
    name_en: 'Building Permit',
    name_bn: 'নির্মাণ অনুমতি',
    icon: 'home',
    color: '#10b981',
    expected_days: 45,
    typical_fee: 25000,
    office: 'RAJUK/Local Authority'
  },
  {
    id: 'noc_fire',
    name_en: 'Fire Safety NOC',
    name_bn: 'অগ্নি নিরাপত্তা এনওসি',
    icon: 'flame',
    color: '#ef4444',
    expected_days: 21,
    typical_fee: 3000,
    office: 'Fire Service & Civil Defence'
  },
  {
    id: 'environment_clearance',
    name_en: 'Environment Clearance',
    name_bn: 'পরিবেশ ছাড়পত্র',
    icon: 'leaf',
    color: '#22c55e',
    expected_days: 60,
    typical_fee: 15000,
    office: 'Department of Environment'
  },
  {
    id: 'factory_license',
    name_en: 'Factory License',
    name_bn: 'কারখানা লাইসেন্স',
    icon: 'cog',
    color: '#8b5cf6',
    expected_days: 35,
    typical_fee: 12000,
    office: 'Department of Inspection'
  },
  {
    id: 'import_permit',
    name_en: 'Import Permit',
    name_bn: 'আমদানি অনুমতি',
    icon: 'airplane',
    color: '#f59e0b',
    expected_days: 15,
    typical_fee: 5000,
    office: 'Customs/Import Authority'
  }
];

export default function AddPermitScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedPermitType, setSelectedPermitType] = useState<typeof PERMIT_TYPES[0] | null>(null);
  const [form, setForm] = useState<PermitForm>({
    permit_type: '',
    application_number: '',
    office_name: '',
    submitted_date: new Date().toISOString().split('T')[0],
    expected_completion_date: '',
    contact_person: '',
    phone_number: '',
    email: '',
    office_address: '',
    fees_paid: 0,
    total_fees: 0,
    notes: ''
  });
  const [isLoading, setIsLoading] = useState(false);

  const isEnglish = i18n.language === 'en';

  useEffect(() => {
    if (selectedPermitType) {
      const submittedDate = new Date(form.submitted_date);
      const expectedDate = new Date(submittedDate);
      expectedDate.setDate(submittedDate.getDate() + selectedPermitType.expected_days);
      
      setForm(prev => ({
        ...prev,
        permit_type: selectedPermitType.id,
        office_name: selectedPermitType.office,
        expected_completion_date: expectedDate.toISOString().split('T')[0],
        total_fees: selectedPermitType.typical_fee
      }));
    }
  }, [selectedPermitType, form.submitted_date]);

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!selectedPermitType;
      case 2:
        return !!(form.application_number && form.office_name && form.submitted_date);
      case 3:
        return !!(form.contact_person || form.phone_number);
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 4));
    } else {
      Alert.alert('Incomplete Information', 'Please fill in all required fields');
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const submitApplication = async () => {
    if (!form.permit_type || !form.application_number) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      setIsLoading(true);
      
      // In production, this would save to SQLite database
      console.log('Saving permit application:', form);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      Alert.alert(
        'Application Added Successfully',
        'Your permit application is now being tracked. You will receive updates as the status changes.',
        [
          {
            text: 'OK',
            onPress: () => router.back()
          }
        ]
      );
      
    } catch (error) {
      console.error('Error saving application:', error);
      Alert.alert('Error', 'Failed to save application. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderStepIndicator = () => (
    <View className="flex-row items-center justify-center mb-6">
      {[1, 2, 3, 4].map((step) => (
        <View key={step} className="flex-row items-center">
          <View 
            className={`w-8 h-8 rounded-full items-center justify-center ${
              step <= currentStep 
                ? 'bg-blue-500' 
                : 'bg-gray-300 dark:bg-gray-600'
            }`}
          >
            <Text className={`text-sm font-bold ${
              step <= currentStep ? 'text-white' : 'text-gray-500'
            }`}>
              {step}
            </Text>
          </View>
          {step < 4 && (
            <View 
              className={`w-8 h-0.5 ${
                step < currentStep 
                  ? 'bg-blue-500' 
                  : 'bg-gray-300 dark:bg-gray-600'
              }`} 
            />
          )}
        </View>
      ))}
    </View>
  );

  const renderPermitTypeSelection = () => (
    <MotiView
      from={{ opacity: 0, translateY: 20 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 500 }}
      className="p-4"
    >
      <Text className="text-xl font-bold text-gray-900 dark:text-white mb-2">
        Select Permit Type
      </Text>
      <Text className="text-gray-600 dark:text-gray-400 mb-6">
        Choose the type of permit you want to track
      </Text>
      
      <View className="space-y-3">
        {PERMIT_TYPES.map((permit, index) => (
          <TouchableOpacity
            key={permit.id}
            onPress={() => setSelectedPermitType(permit)}
            className={`p-4 rounded-xl border-2 ${
              selectedPermitType?.id === permit.id
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
            }`}
          >
            <View className="flex-row items-center">
              <View 
                className="w-12 h-12 rounded-full items-center justify-center mr-4"
                style={{ backgroundColor: permit.color + '20' }}
              >
                <Ionicons name={permit.icon as any} size={24} color={permit.color} />
              </View>
              
              <View className="flex-1">
                <Text className="font-bold text-gray-900 dark:text-white">
                  {isEnglish ? permit.name_en : permit.name_bn}
                </Text>
                <Text className="text-gray-600 dark:text-gray-400 text-sm">
                  {permit.office} • {permit.expected_days} days • ৳{permit.typical_fee.toLocaleString()}
                </Text>
              </View>
              
              {selectedPermitType?.id === permit.id && (
                <Ionicons name="checkmark-circle" size={24} color="#3b82f6" />
              )}
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </MotiView>
  );

  const renderApplicationDetails = () => (
    <MotiView
      from={{ opacity: 0, translateY: 20 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 500 }}
      className="p-4"
    >
      <Text className="text-xl font-bold text-gray-900 dark:text-white mb-2">
        Application Details
      </Text>
      <Text className="text-gray-600 dark:text-gray-400 mb-6">
        Enter your application information
      </Text>
      
      <View className="space-y-4">
        <View>
          <Text className="text-gray-700 dark:text-gray-300 font-medium mb-2">
            Application Number *
          </Text>
          <TextInput
            value={form.application_number}
            onChangeText={(text) => setForm(prev => ({ ...prev, application_number: text }))}
            placeholder="e.g., TL/2024/0012"
            className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 text-gray-900 dark:text-white"
            placeholderTextColor="#9ca3af"
          />
        </View>
        
        <View>
          <Text className="text-gray-700 dark:text-gray-300 font-medium mb-2">
            Office Name *
          </Text>
          <TextInput
            value={form.office_name}
            onChangeText={(text) => setForm(prev => ({ ...prev, office_name: text }))}
            placeholder="Government office name"
            className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 text-gray-900 dark:text-white"
            placeholderTextColor="#9ca3af"
          />
        </View>
        
        <View>
          <Text className="text-gray-700 dark:text-gray-300 font-medium mb-2">
            Submission Date *
          </Text>
          <TextInput
            value={form.submitted_date}
            onChangeText={(text) => setForm(prev => ({ ...prev, submitted_date: text }))}
            placeholder="YYYY-MM-DD"
            className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 text-gray-900 dark:text-white"
            placeholderTextColor="#9ca3af"
          />
        </View>
        
        <View>
          <Text className="text-gray-700 dark:text-gray-300 font-medium mb-2">
            Expected Completion
          </Text>
          <TextInput
            value={form.expected_completion_date}
            onChangeText={(text) => setForm(prev => ({ ...prev, expected_completion_date: text }))}
            placeholder="YYYY-MM-DD"
            className="bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 text-gray-900 dark:text-white"
            placeholderTextColor="#9ca3af"
            editable={false}
          />
          <Text className="text-gray-500 text-sm mt-1">
            Auto-calculated based on permit type
          </Text>
        </View>
      </View>
    </MotiView>
  );

  const renderContactInfo = () => (
    <MotiView
      from={{ opacity: 0, translateY: 20 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 500 }}
      className="p-4"
    >
      <Text className="text-xl font-bold text-gray-900 dark:text-white mb-2">
        Contact Information
      </Text>
      <Text className="text-gray-600 dark:text-gray-400 mb-6">
        Add contact details for follow-up
      </Text>
      
      <View className="space-y-4">
        <View>
          <Text className="text-gray-700 dark:text-gray-300 font-medium mb-2">
            Contact Person
          </Text>
          <TextInput
            value={form.contact_person}
            onChangeText={(text) => setForm(prev => ({ ...prev, contact_person: text }))}
            placeholder="Officer name"
            className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 text-gray-900 dark:text-white"
            placeholderTextColor="#9ca3af"
          />
        </View>
        
        <View>
          <Text className="text-gray-700 dark:text-gray-300 font-medium mb-2">
            Phone Number
          </Text>
          <TextInput
            value={form.phone_number}
            onChangeText={(text) => setForm(prev => ({ ...prev, phone_number: text }))}
            placeholder="+8801XXXXXXXXX"
            keyboardType="phone-pad"
            className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 text-gray-900 dark:text-white"
            placeholderTextColor="#9ca3af"
          />
        </View>
        
        <View>
          <Text className="text-gray-700 dark:text-gray-300 font-medium mb-2">
            Email Address
          </Text>
          <TextInput
            value={form.email}
            onChangeText={(text) => setForm(prev => ({ ...prev, email: text }))}
            placeholder="officer@example.gov.bd"
            keyboardType="email-address"
            autoCapitalize="none"
            className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 text-gray-900 dark:text-white"
            placeholderTextColor="#9ca3af"
          />
        </View>
        
        <View>
          <Text className="text-gray-700 dark:text-gray-300 font-medium mb-2">
            Office Address
          </Text>
          <TextInput
            value={form.office_address}
            onChangeText={(text) => setForm(prev => ({ ...prev, office_address: text }))}
            placeholder="Complete office address"
            multiline
            numberOfLines={3}
            className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 text-gray-900 dark:text-white"
            placeholderTextColor="#9ca3af"
            textAlignVertical="top"
          />
        </View>
      </View>
    </MotiView>
  );

  const renderFinalReview = () => (
    <MotiView
      from={{ opacity: 0, translateY: 20 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 500 }}
      className="p-4"
    >
      <Text className="text-xl font-bold text-gray-900 dark:text-white mb-2">
        Review & Submit
      </Text>
      <Text className="text-gray-600 dark:text-gray-400 mb-6">
        Review your information before submitting
      </Text>
      
      <View className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-4">
        <Text className="font-bold text-gray-900 dark:text-white mb-3">
          Application Summary
        </Text>
        
        <View className="space-y-2">
          <View className="flex-row justify-between">
            <Text className="text-gray-600 dark:text-gray-400">Permit Type:</Text>
            <Text className="text-gray-900 dark:text-white font-medium">
              {selectedPermitType && (isEnglish ? selectedPermitType.name_en : selectedPermitType.name_bn)}
            </Text>
          </View>
          
          <View className="flex-row justify-between">
            <Text className="text-gray-600 dark:text-gray-400">Application Number:</Text>
            <Text className="text-gray-900 dark:text-white">{form.application_number}</Text>
          </View>
          
          <View className="flex-row justify-between">
            <Text className="text-gray-600 dark:text-gray-400">Office:</Text>
            <Text className="text-gray-900 dark:text-white">{form.office_name}</Text>
          </View>
          
          <View className="flex-row justify-between">
            <Text className="text-gray-600 dark:text-gray-400">Expected Duration:</Text>
            <Text className="text-gray-900 dark:text-white">{selectedPermitType?.expected_days} days</Text>
          </View>
        </View>
      </View>
      
      <View className="space-y-4">
        <View>
          <Text className="text-gray-700 dark:text-gray-300 font-medium mb-2">
            Fees Paid (৳)
          </Text>
          <TextInput
            value={form.fees_paid.toString()}
            onChangeText={(text) => setForm(prev => ({ ...prev, fees_paid: parseInt(text) || 0 }))}
            placeholder="0"
            keyboardType="numeric"
            className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 text-gray-900 dark:text-white"
            placeholderTextColor="#9ca3af"
          />
        </View>
        
        <View>
          <Text className="text-gray-700 dark:text-gray-300 font-medium mb-2">
            Total Fees (৳)
          </Text>
          <TextInput
            value={form.total_fees.toString()}
            onChangeText={(text) => setForm(prev => ({ ...prev, total_fees: parseInt(text) || 0 }))}
            placeholder="0"
            keyboardType="numeric"
            className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 text-gray-900 dark:text-white"
            placeholderTextColor="#9ca3af"
          />
        </View>
        
        <View>
          <Text className="text-gray-700 dark:text-gray-300 font-medium mb-2">
            Additional Notes
          </Text>
          <TextInput
            value={form.notes}
            onChangeText={(text) => setForm(prev => ({ ...prev, notes: text }))}
            placeholder="Any additional information..."
            multiline
            numberOfLines={3}
            className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 text-gray-900 dark:text-white"
            placeholderTextColor="#9ca3af"
            textAlignVertical="top"
          />
        </View>
      </View>
    </MotiView>
  );

  return (
    <KeyboardAvoidingView 
      className="flex-1 bg-gray-50 dark:bg-gray-900"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View className="bg-white dark:bg-gray-800 px-4 py-6 shadow-sm">
        <View className="flex-row items-center">
          <TouchableOpacity 
            onPress={() => router.back()}
            className="mr-4"
          >
            <Ionicons name="arrow-back" size={24} color="#6b7280" />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-gray-900 dark:text-white text-lg font-bold">
              Add Permit Application
            </Text>
            <Text className="text-gray-600 dark:text-gray-400 text-sm">
              Step {currentStep} of 4
            </Text>
          </View>
        </View>
      </View>

      {renderStepIndicator()}

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {currentStep === 1 && renderPermitTypeSelection()}
        {currentStep === 2 && renderApplicationDetails()}
        {currentStep === 3 && renderContactInfo()}
        {currentStep === 4 && renderFinalReview()}
      </ScrollView>

      {/* Navigation Buttons */}
      <View className="bg-white dark:bg-gray-800 px-4 py-6 flex-row justify-between">
        {currentStep > 1 && (
          <TouchableOpacity
            onPress={prevStep}
            className="flex-1 bg-gray-200 dark:bg-gray-700 py-3 rounded-xl mr-2"
          >
            <Text className="text-gray-700 dark:text-gray-300 text-center font-bold">
              Previous
            </Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity
          onPress={currentStep === 4 ? submitApplication : nextStep}
          disabled={isLoading || !validateStep(currentStep)}
          className={`flex-1 py-3 rounded-xl ${currentStep === 1 ? 'ml-0' : 'ml-2'} ${
            isLoading || !validateStep(currentStep)
              ? 'bg-gray-300 dark:bg-gray-600'
              : 'bg-blue-500'
          }`}
        >
          <Text className="text-white text-center font-bold">
            {isLoading ? 'Saving...' : currentStep === 4 ? 'Submit' : 'Next'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}