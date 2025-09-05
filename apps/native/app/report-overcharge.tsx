import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
// Custom picker implementation using modals
import * as Location from 'expo-location';
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
}

interface OverchargeReportForm {
  serviceId: string;
  officialFee: number;
  paidFee: number;
  overchargeAmount: number;
  officeNameEn: string;
  officeNameBn: string;
  district: string;
  upazila: string;
  descriptionEn: string;
  descriptionBn: string;
  geoLocation: string | null;
  isAnonymous: boolean;
}

const BANGLADESH_DISTRICTS = [
  'Dhaka', 'Chittagong', 'Rajshahi', 'Khulna', 'Barisal', 'Sylhet', 'Rangpur', 'Mymensingh',
  'Comilla', 'Feni', 'Brahmanbaria', 'Rangamati', 'Noakhali', 'Chandpur', 'Lakshmipur',
  'Cox\'s Bazar', 'Bandarban', 'Khagrachhari', 'Bogura', 'Pabna', 'Sirajganj', 'Joypurhat',
  'Natore', 'Chapainawabganj', 'Naogaon', 'Jessore', 'Satkhira', 'Meherpur', 'Narail',
  'Chuadanga', 'Kushtia', 'Magura', 'Jhenaidah', 'Patuakhali', 'Pirojpur', 'Jhalokathi',
  'Barguna', 'Bhola', 'Sunamganj', 'Habiganj', 'Moulvibazar', 'Dinajpur', 'Lalmonirhat',
  'Nilphamari', 'Gaibandha', 'Thakurgaon', 'Rangpur', 'Panchagarh', 'Kurigram', 'Sherpur',
  'Mymensingh', 'Jamalpur', 'Netrakona', 'Tangail', 'Kishoreganj', 'Manikganj', 'Munshiganj',
  'Narayanganj', 'Gazipur', 'Shariatpur', 'Rajbari', 'Madaripur', 'Gopalganj', 'Faridpur'
];

export default function ReportOverchargeScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { serviceId } = useLocalSearchParams();
  const { isInitialized } = useDatabase();
  
  const [services, setServices] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showDistrictPicker, setShowDistrictPicker] = useState(false);
  const [showServicePicker, setShowServicePicker] = useState(false);
  const [locationPermission, setLocationPermission] = useState<boolean>(false);
  
  const [form, setForm] = useState<OverchargeReportForm>({
    serviceId: (serviceId as string) || '',
    officialFee: 0,
    paidFee: 0,
    overchargeAmount: 0,
    officeNameEn: '',
    officeNameBn: '',
    district: '',
    upazila: '',
    descriptionEn: '',
    descriptionBn: '',
    geoLocation: null,
    isAnonymous: true
  });

  const isEnglish = i18n.language === 'en';

  useEffect(() => {
    if (isInitialized) {
      loadServices();
      requestLocationPermission();
    }
  }, [isInitialized]);

  useEffect(() => {
    if (serviceId && services.length > 0) {
      const service = services.find(s => s.id === serviceId);
      if (service) {
        selectService(service);
      }
    }
  }, [serviceId, services]);

  useEffect(() => {
    calculateOvercharge();
  }, [form.officialFee, form.paidFee]);

  const loadServices = async () => {
    try {
      const db = useLocalDatabase();
      const result = await db.getAllAsync<Service>(
        `SELECT * FROM ${TABLES.SERVICES} ORDER BY name_en ASC`
      );
      setServices(result);
    } catch (error) {
      console.error('Failed to load services:', error);
    }
  };

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status === 'granted');
    } catch (error) {
      console.error('Error requesting location permission:', error);
    }
  };

  const getCurrentLocation = async () => {
    if (!locationPermission) {
      Alert.alert(
        'Location Permission',
        'Please enable location permission to add location data to your report.',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      setIsLoading(true);
      const location = await Location.getCurrentPositionAsync({});
      const geoLocation = JSON.stringify({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy
      });
      
      setForm(prev => ({ ...prev, geoLocation }));
      
      Alert.alert(
        'Location Added',
        'GPS coordinates have been added to your report for verification purposes.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Error', 'Failed to get current location');
    } finally {
      setIsLoading(false);
    }
  };

  const selectService = (service: Service) => {
    setSelectedService(service);
    setForm(prev => ({
      ...prev,
      serviceId: service.id,
      officialFee: service.official_fee,
      officeNameEn: service.office_name_en,
      officeNameBn: service.office_name_bn
    }));
    setShowServicePicker(false);
  };

  const calculateOvercharge = () => {
    const overcharge = Math.max(0, form.paidFee - form.officialFee);
    setForm(prev => ({ ...prev, overchargeAmount: overcharge }));
  };

  const validateForm = (): boolean => {
    if (!form.serviceId) {
      Alert.alert('Error', 'Please select a service');
      return false;
    }
    
    if (form.paidFee <= 0) {
      Alert.alert('Error', 'Please enter the amount you paid');
      return false;
    }
    
    if (form.overchargeAmount <= 0) {
      Alert.alert('Error', 'No overcharge detected. Paid amount must be higher than official fee.');
      return false;
    }
    
    if (!form.district) {
      Alert.alert('Error', 'Please select your district');
      return false;
    }
    
    if (!form.descriptionEn.trim() && !form.descriptionBn.trim()) {
      Alert.alert('Error', 'Please provide a description of the incident');
      return false;
    }
    
    return true;
  };

  const submitReport = async () => {
    if (!validateForm()) return;
    
    try {
      setIsLoading(true);
      const db = useLocalDatabase();
      
      const reportId = `overcharge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      await db.runAsync(
        `INSERT INTO ${TABLES.OVERCHARGE_REPORTS} (
          id, service_id, official_fee, paid_fee, overcharge_amount,
          office_name_en, office_name_bn, district, upazila,
          description_en, description_bn, geo_location, is_anonymous,
          reported_at, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          reportId,
          form.serviceId,
          form.officialFee,
          form.paidFee,
          form.overchargeAmount,
          form.officeNameEn,
          form.officeNameBn,
          form.district,
          form.upazila || null,
          form.descriptionEn || null,
          form.descriptionBn || null,
          form.geoLocation,
          form.isAnonymous ? 1 : 0,
          new Date().toISOString(),
          new Date().toISOString()
        ]
      );
      
      Alert.alert(
        'Report Submitted',
        `Your overcharge report has been submitted ${form.isAnonymous ? 'anonymously' : ''}. Thank you for helping fight corruption!`,
        [
          {
            text: 'OK',
            onPress: () => router.back()
          }
        ]
      );
      
    } catch (error) {
      console.error('Error submitting report:', error);
      Alert.alert('Error', 'Failed to submit report. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderServicePicker = () => (
    <Modal
      visible={showServicePicker}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowServicePicker(false)}
    >
      <View className="flex-1 justify-end bg-black/50">
        <View className="bg-white dark:bg-gray-800 rounded-t-xl max-h-96">
          <View className="flex-row justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
            <Text className="text-lg font-bold text-gray-900 dark:text-white">
              Select Service
            </Text>
            <TouchableOpacity onPress={() => setShowServicePicker(false)}>
              <Ionicons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>
          
          <ScrollView className="max-h-80">
            {services.map((service) => (
              <TouchableOpacity
                key={service.id}
                onPress={() => selectService(service)}
                className="p-4 border-b border-gray-100 dark:border-gray-700"
              >
                <Text className="font-medium text-gray-900 dark:text-white">
                  {isEnglish ? service.name_en : service.name_bn}
                </Text>
                <Text className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {isEnglish ? service.office_name_en : service.office_name_bn}
                </Text>
                <Text className="text-sm text-green-600 mt-1">
                  Official Fee: ৳{service.official_fee}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  const renderDistrictPicker = () => (
    <Modal
      visible={showDistrictPicker}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowDistrictPicker(false)}
    >
      <View className="flex-1 justify-end bg-black/50">
        <View className="bg-white dark:bg-gray-800 rounded-t-xl max-h-96">
          <View className="flex-row justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
            <Text className="text-lg font-bold text-gray-900 dark:text-white">
              Select District
            </Text>
            <TouchableOpacity onPress={() => setShowDistrictPicker(false)}>
              <Ionicons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>
          
          <ScrollView className="max-h-80">
            {BANGLADESH_DISTRICTS.map((district) => (
              <TouchableOpacity
                key={district}
                onPress={() => {
                  setForm(prev => ({ ...prev, district }));
                  setShowDistrictPicker(false);
                }}
                className="p-4 border-b border-gray-100 dark:border-gray-700"
              >
                <Text className="text-gray-900 dark:text-white">{district}</Text>
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
        <Text className="text-gray-600 dark:text-gray-400">
          {t('common.loading')}
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      className="flex-1 bg-gray-50 dark:bg-gray-900"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="bg-gradient-to-r from-orange-500 to-red-500 px-4 py-6">
          <View className="flex-row items-center">
            <TouchableOpacity 
              onPress={() => router.back()}
              className="mr-4"
            >
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <View className="flex-1">
              <Text className="text-white text-xl font-bold">
                Report Overcharge
              </Text>
              <Text className="text-white/80 text-sm mt-1">
                Help fight corruption by reporting overcharged fees
              </Text>
            </View>
          </View>
        </View>

        <View className="p-4">
          {/* Anonymous Notice */}
          <MotiView
            from={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'timing', duration: 500 }}
            className="bg-blue-100 dark:bg-blue-900/30 rounded-xl p-4 mb-6"
          >
            <View className="flex-row items-center">
              <Ionicons name="shield-checkmark" size={24} color="#3b82f6" />
              <View className="flex-1 ml-3">
                <Text className="font-bold text-blue-800 dark:text-blue-200">
                  Anonymous & Secure
                </Text>
                <Text className="text-blue-700 dark:text-blue-300 text-sm mt-1">
                  Your report is submitted anonymously and securely. No personal information is collected unless you choose to provide it.
                </Text>
              </View>
            </View>
          </MotiView>

          {/* Service Selection */}
          <View className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-4">
            <Text className="font-bold text-gray-900 dark:text-white mb-3">
              Select Service
            </Text>
            
            <TouchableOpacity
              onPress={() => setShowServicePicker(true)}
              className="flex-row items-center justify-between p-3 bg-gray-100 dark:bg-gray-700 rounded-lg"
            >
              <Text className={`flex-1 ${selectedService ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                {selectedService 
                  ? (isEnglish ? selectedService.name_en : selectedService.name_bn)
                  : 'Tap to select service'
                }
              </Text>
              <Ionicons name="chevron-down" size={20} color="#6b7280" />
            </TouchableOpacity>
            
            {selectedService && (
              <View className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <Text className="text-sm text-green-800 dark:text-green-200">
                  Official Fee: ৳{selectedService.official_fee}
                  {selectedService.official_fee === 0 && ' (Free Service)'}
                </Text>
                <Text className="text-sm text-green-600 dark:text-green-400 mt-1">
                  Office: {isEnglish ? selectedService.office_name_en : selectedService.office_name_bn}
                </Text>
              </View>
            )}
          </View>

          {/* Fee Information */}
          <View className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-4">
            <Text className="font-bold text-gray-900 dark:text-white mb-3">
              Fee Information
            </Text>
            
            <View className="space-y-4">
              <View>
                <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Official Fee (৳)
                </Text>
                <TextInput
                  value={form.officialFee.toString()}
                  onChangeText={(text) => setForm(prev => ({ ...prev, officialFee: parseFloat(text) || 0 }))}
                  placeholder="Official fee amount"
                  placeholderTextColor="#9ca3af"
                  keyboardType="numeric"
                  className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-900 dark:text-white"
                  editable={!selectedService}
                />
              </View>
              
              <View>
                <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Amount You Paid (৳) *
                </Text>
                <TextInput
                  value={form.paidFee.toString()}
                  onChangeText={(text) => setForm(prev => ({ ...prev, paidFee: parseFloat(text) || 0 }))}
                  placeholder="Amount you actually paid"
                  placeholderTextColor="#9ca3af"
                  keyboardType="numeric"
                  className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-900 dark:text-white"
                />
              </View>
              
              {form.overchargeAmount > 0 && (
                <View className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <Text className="font-bold text-red-800 dark:text-red-200">
                    Overcharge Detected: ৳{form.overchargeAmount.toFixed(2)}
                  </Text>
                  <Text className="text-sm text-red-600 dark:text-red-400 mt-1">
                    You were charged ৳{form.overchargeAmount.toFixed(2)} more than the official fee
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Location Information */}
          <View className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-4">
            <Text className="font-bold text-gray-900 dark:text-white mb-3">
              Location Information
            </Text>
            
            <View className="space-y-4">
              <View>
                <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  District *
                </Text>
                <TouchableOpacity
                  onPress={() => setShowDistrictPicker(true)}
                  className="flex-row items-center justify-between p-3 bg-gray-100 dark:bg-gray-700 rounded-lg"
                >
                  <Text className={`flex-1 ${form.district ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                    {form.district || 'Select district'}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color="#6b7280" />
                </TouchableOpacity>
              </View>
              
              <View>
                <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Upazila/Thana (Optional)
                </Text>
                <TextInput
                  value={form.upazila}
                  onChangeText={(text) => setForm(prev => ({ ...prev, upazila: text }))}
                  placeholder="Enter upazila or thana name"
                  placeholderTextColor="#9ca3af"
                  className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-900 dark:text-white"
                />
              </View>
              
              <TouchableOpacity
                onPress={getCurrentLocation}
                className="flex-row items-center justify-center p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg"
                disabled={isLoading}
              >
                {isLoading ? (
                  <MotiView
                    animate={{ rotate: '360deg' }}
                    transition={{ type: 'timing', duration: 1000, loop: true }}
                  >
                    <Ionicons name="sync" size={20} color="#3b82f6" />
                  </MotiView>
                ) : (
                  <Ionicons name="location" size={20} color="#3b82f6" />
                )}
                <Text className="text-blue-600 dark:text-blue-400 ml-2 font-medium">
                  {form.geoLocation ? 'Location Added ✓' : 'Add GPS Location (Optional)'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Description */}
          <View className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-4">
            <Text className="font-bold text-gray-900 dark:text-white mb-3">
              Incident Description *
            </Text>
            
            <View className="space-y-4">
              <View>
                <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  English
                </Text>
                <TextInput
                  value={form.descriptionEn}
                  onChangeText={(text) => setForm(prev => ({ ...prev, descriptionEn: text }))}
                  placeholder="Describe what happened (English)"
                  placeholderTextColor="#9ca3af"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-900 dark:text-white"
                />
              </View>
              
              <View>
                <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  বাংলা
                </Text>
                <TextInput
                  value={form.descriptionBn}
                  onChangeText={(text) => setForm(prev => ({ ...prev, descriptionBn: text }))}
                  placeholder="ঘটনার বিবরণ দিন (বাংলা)"
                  placeholderTextColor="#9ca3af"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-900 dark:text-white"
                />
              </View>
            </View>
          </View>

          {/* Privacy Settings */}
          <View className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-6">
            <Text className="font-bold text-gray-900 dark:text-white mb-3">
              Privacy Settings
            </Text>
            
            <TouchableOpacity
              onPress={() => setForm(prev => ({ ...prev, isAnonymous: !prev.isAnonymous }))}
              className="flex-row items-center"
            >
              <View className={`w-6 h-6 rounded border-2 mr-3 items-center justify-center ${
                form.isAnonymous 
                  ? 'bg-green-500 border-green-500' 
                  : 'border-gray-300 dark:border-gray-600'
              }`}>
                {form.isAnonymous && (
                  <Ionicons name="checkmark" size={16} color="white" />
                )}
              </View>
              <View className="flex-1">
                <Text className="font-medium text-gray-900 dark:text-white">
                  Submit Anonymously
                </Text>
                <Text className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Recommended for your safety and privacy
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            onPress={submitReport}
            className="bg-gradient-to-r from-orange-500 to-red-500 rounded-xl p-4 items-center"
            disabled={isLoading}
          >
            {isLoading ? (
              <View className="flex-row items-center">
                <MotiView
                  animate={{ rotate: '360deg' }}
                  transition={{ type: 'timing', duration: 1000, loop: true }}
                >
                  <Ionicons name="sync" size={20} color="white" />
                </MotiView>
                <Text className="text-white font-bold text-lg ml-2">
                  Submitting...
                </Text>
              </View>
            ) : (
              <Text className="text-white font-bold text-lg">
                Submit Report
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Modals */}
      {renderServicePicker()}
      {renderDistrictPicker()}
    </KeyboardAvoidingView>
  );
}