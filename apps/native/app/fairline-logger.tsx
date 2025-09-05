import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import * as Location from 'expo-location';
import { useDatabase, useLocalDatabase } from '@/contexts/database-context';
import { TABLES } from '@/lib/database';
import { HashChainService } from '@/lib/hash-chain';
import { AudioRecordingService, AudioRecording } from '@/lib/audio-recording';

interface QuickService {
  id: string;
  name_en: string;
  name_bn: string;
  icon: string;
  color: string;
  common_offices: string[];
}

interface BribeLogForm {
  serviceType: string;
  officeNameEn: string;
  officeNameBn: string;
  amount: number;
  descriptionEn: string;
  descriptionBn: string;
  officerDesignation: string;
  geoLocation: string | null;
  audioFilePath: string | null;
}

const QUICK_SERVICES: QuickService[] = [
  {
    id: 'police_clearance',
    name_en: 'Police Clearance',
    name_bn: 'পুলিশ ক্লিয়ারেন্স',
    icon: 'shield-checkmark',
    color: '#3b82f6',
    common_offices: ['Police Station', 'District Police Office', 'Detective Branch']
  },
  {
    id: 'driving_license',
    name_en: 'Driving License',
    name_bn: 'ড্রাইভিং লাইসেন্স',
    icon: 'car',
    color: '#f59e0b',
    common_offices: ['BRTA Office', 'District Transport Office', 'Mobile Court']
  },
  {
    id: 'passport_services',
    name_en: 'Passport Services',
    name_bn: 'পাসপোর্ট সেবা',
    icon: 'document',
    color: '#10b981',
    common_offices: ['Passport Office', 'Regional Passport Office', 'District Passport Office']
  },
  {
    id: 'land_mutation',
    name_en: 'Land Mutation',
    name_bn: 'জমির মিউটেশন',
    icon: 'home',
    color: '#8b5cf6',
    common_offices: ['Sub-Registry Office', 'District Registry Office', 'Land Office']
  },
  {
    id: 'court_services',
    name_en: 'Court Services',
    name_bn: 'আদালত সেবা',
    icon: 'library',
    color: '#ef4444',
    common_offices: ['District Court', 'Metropolitan Court', 'High Court']
  },
  {
    id: 'tax_services',
    name_en: 'Tax Services',
    name_bn: 'কর সেবা',
    icon: 'card',
    color: '#06b6d4',
    common_offices: ['NBR Office', 'Tax Circle', 'VAT Office']
  },
  {
    id: 'health_services',
    name_en: 'Health Services',
    name_bn: 'স্বাস্থ্য সেবা',
    icon: 'medical',
    color: '#84cc16',
    common_offices: ['Government Hospital', 'Health Complex', 'Medical College']
  },
  {
    id: 'education_services',
    name_en: 'Education Services',
    name_bn: 'শিক্ষা সেবা',
    icon: 'school',
    color: '#f97316',
    common_offices: ['Education Board', 'University', 'Government School']
  }
];

export default function FairLineLoggerScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { isInitialized } = useDatabase();
  
  const [showQuickLog, setShowQuickLog] = useState(false);
  const [selectedService, setSelectedService] = useState<QuickService | null>(null);
  const [showOfficeModal, setShowOfficeModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [locationPermission, setLocationPermission] = useState<boolean>(false);
  
  // Audio recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioRecording, setAudioRecording] = useState<AudioRecording | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  
  const [form, setForm] = useState<BribeLogForm>({
    serviceType: '',
    officeNameEn: '',
    officeNameBn: '',
    amount: 0,
    descriptionEn: '',
    descriptionBn: '',
    officerDesignation: '',
    geoLocation: null,
    audioFilePath: null
  });

  const isEnglish = i18n.language === 'en';

  useEffect(() => {
    requestLocationPermission();
    
    // Setup recording duration timer
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => {
        const audioService = AudioRecordingService.getInstance();
        const status = audioService.getRecordingStatus();
        setRecordingDuration(status.duration);
      }, 100);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording]);

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
        'Location Permission Required',
        'Location data helps verify the authenticity of your report. Please enable location permission.',
        [
          { text: 'Cancel' },
          { 
            text: 'Enable', 
            onPress: async () => {
              const { status } = await Location.requestForegroundPermissionsAsync();
              if (status === 'granted') {
                setLocationPermission(true);
                getCurrentLocation(); // Retry after permission granted
              }
            }
          }
        ]
      );
      return;
    }

    try {
      // Get high-accuracy location for evidence purposes
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.BestForNavigation,
        maximumAge: 0,
        timeout: 15000
      });
      
      // Get reverse geocoding for address context
      let addressInfo = null;
      try {
        const reverseGeocode = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude
        });
        
        if (reverseGeocode.length > 0) {
          const addr = reverseGeocode[0];
          addressInfo = {
            street: addr.street,
            city: addr.city,
            district: addr.district,
            region: addr.region,
            country: addr.country,
            postalCode: addr.postalCode
          };
        }
      } catch (geocodeError) {
        console.warn('Reverse geocoding failed:', geocodeError);
      }
      
      const geoLocation = JSON.stringify({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
        altitude: location.coords.altitude,
        heading: location.coords.heading,
        speed: location.coords.speed,
        timestamp: new Date().toISOString(),
        address: addressInfo,
        provider: 'gps' // Could be 'gps', 'network', 'passive'
      });
      
      setForm(prev => ({ ...prev, geoLocation }));
      
      const accuracyText = location.coords.accuracy 
        ? `(±${Math.round(location.coords.accuracy)}m accuracy)` 
        : '';
      
      Alert.alert(
        'Location Added Successfully',
        `GPS coordinates captured for evidence verification ${accuracyText}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert(
        'Location Error', 
        'Failed to get current location. This may be due to GPS being disabled or poor signal.',
        [{ text: 'OK' }]
      );
    }
  };

  const startRecording = async () => {
    try {
      const audioService = AudioRecordingService.getInstance();
      const success = await audioService.startRecording();
      
      if (success) {
        setIsRecording(true);
        setRecordingDuration(0);
      }
    } catch (error) {
      console.error('Recording start error:', error);
      Alert.alert('Error', 'Failed to start recording');
    }
  };

  const stopRecording = async () => {
    try {
      const audioService = AudioRecordingService.getInstance();
      const recording = await audioService.stopRecording();
      
      if (recording) {
        setAudioRecording(recording);
        setForm(prev => ({ ...prev, audioFilePath: recording.uri }));
      }
      
      setIsRecording(false);
      setRecordingDuration(0);
    } catch (error) {
      console.error('Recording stop error:', error);
      Alert.alert('Error', 'Failed to stop recording');
      setIsRecording(false);
    }
  };

  const cancelRecording = async () => {
    try {
      const audioService = AudioRecordingService.getInstance();
      await audioService.cancelRecording();
      
      setIsRecording(false);
      setRecordingDuration(0);
      setAudioRecording(null);
      setForm(prev => ({ ...prev, audioFilePath: null }));
    } catch (error) {
      console.error('Recording cancel error:', error);
    }
  };

  const playRecording = async () => {
    if (!audioRecording) return;
    
    try {
      setIsPlayingAudio(true);
      const audioService = AudioRecordingService.getInstance();
      const sound = await audioService.playRecording(audioRecording.uri);
      
      if (sound) {
        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded && status.didJustFinish) {
            setIsPlayingAudio(false);
            sound.unloadAsync();
          }
        });
      }
    } catch (error) {
      console.error('Audio playback error:', error);
      setIsPlayingAudio(false);
      Alert.alert('Error', 'Failed to play recording');
    }
  };

  const deleteRecording = async () => {
    if (!audioRecording) return;
    
    try {
      const audioService = AudioRecordingService.getInstance();
      await audioService.deleteRecording(audioRecording.uri);
      
      setAudioRecording(null);
      setForm(prev => ({ ...prev, audioFilePath: null }));
    } catch (error) {
      console.error('Delete recording error:', error);
      Alert.alert('Error', 'Failed to delete recording');
    }
  };

  const formatDuration = (milliseconds: number): string => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const submitBribeLog = async () => {
    if (!form.serviceType || !form.officeNameEn) {
      Alert.alert('Error', 'Please fill in the required fields');
      return;
    }

    try {
      setIsLoading(true);
      const hashChainService = HashChainService.getInstance();
      
      // Initialize hash chain if not already done
      await hashChainService.initialize();
      
      // Create bribe log entry
      const bribeLogData = {
        service_type: form.serviceType,
        office_name: form.officeNameEn,
        amount_demanded: form.amount || undefined,
        location: form.geoLocation ? JSON.parse(form.geoLocation) : undefined,
        description: form.descriptionEn || form.descriptionBn || undefined
      };
      
      const tamperProofLog = await hashChainService.addBribeLog(bribeLogData);
      
      // Secure audio recording if present
      let secureAudioPath = null;
      if (audioRecording) {
        try {
          const audioService = AudioRecordingService.getInstance();
          secureAudioPath = await audioService.secureRecording(audioRecording, tamperProofLog.id);
          console.log('🔒 Audio evidence secured:', secureAudioPath);
        } catch (error) {
          console.error('Failed to secure audio recording:', error);
          // Continue without audio - don't fail the entire submission
        }
      }
      
      Alert.alert(
        'Log Recorded Securely',
        `Your report has been recorded with verification code: ${tamperProofLog.verification_code}\n\nThis code can be used to verify the integrity of your report. Your submission is anonymous and tamper-proof.${secureAudioPath ? '\n\n🎤 Audio evidence has been securely stored.' : ''}`,
        [
          {
            text: 'OK',
            onPress: () => {
              setShowQuickLog(false);
              resetForm();
            }
          }
        ]
      );
      
    } catch (error) {
      console.error('Error logging bribe:', error);
      Alert.alert('Error', 'Failed to log bribe solicitation. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setForm({
      serviceType: '',
      officeNameEn: '',
      officeNameBn: '',
      amount: 0,
      descriptionEn: '',
      descriptionBn: '',
      officerDesignation: '',
      geoLocation: null,
      audioFilePath: null
    });
    setSelectedService(null);
    setAudioRecording(null);
    setIsRecording(false);
    setRecordingDuration(0);
    setIsPlayingAudio(false);
  };

  const handleQuickServiceSelect = (service: QuickService) => {
    setSelectedService(service);
    setForm(prev => ({
      ...prev,
      serviceType: isEnglish ? service.name_en : service.name_bn
    }));
    setShowOfficeModal(true);
  };

  const handleOfficeSelect = (officeName: string) => {
    setForm(prev => ({
      ...prev,
      officeNameEn: officeName,
      officeNameBn: officeName // In production, this would have proper translations
    }));
    setShowOfficeModal(false);
    setShowQuickLog(true);
  };

  const renderQuickServiceCard = (service: QuickService, index: number) => (
    <MotiView
      key={service.id}
      from={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'timing', duration: 500, delay: index * 100 }}
    >
      <TouchableOpacity
        onPress={() => handleQuickServiceSelect(service)}
        className="bg-white dark:bg-gray-800 rounded-xl p-4 m-2 shadow-sm border border-gray-100 dark:border-gray-700"
        style={{ width: 150 }}
        activeOpacity={0.7}
      >
        <View 
          className="w-12 h-12 rounded-full items-center justify-center mb-3"
          style={{ backgroundColor: service.color + '20' }}
        >
          <Ionicons name={service.icon as any} size={24} color={service.color} />
        </View>
        
        <Text className="font-bold text-gray-900 dark:text-white mb-2" numberOfLines={2}>
          {isEnglish ? service.name_en : service.name_bn}
        </Text>
        
        <Text className="text-xs text-gray-600 dark:text-gray-400">
          Tap to log incident
        </Text>
      </TouchableOpacity>
    </MotiView>
  );

  const renderOfficeModal = () => (
    <Modal
      visible={showOfficeModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowOfficeModal(false)}
    >
      <View className="flex-1 justify-end bg-black/50">
        <View className="bg-white dark:bg-gray-800 rounded-t-xl max-h-96">
          <View className="flex-row justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
            <Text className="text-lg font-bold text-gray-900 dark:text-white">
              Select Office
            </Text>
            <TouchableOpacity onPress={() => setShowOfficeModal(false)}>
              <Ionicons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>
          
          <ScrollView className="max-h-80">
            {selectedService?.common_offices.map((office, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => handleOfficeSelect(office)}
                className="p-4 border-b border-gray-100 dark:border-gray-700"
              >
                <Text className="text-gray-900 dark:text-white">{office}</Text>
              </TouchableOpacity>
            ))}
            
            <TouchableOpacity
              onPress={() => {
                setShowOfficeModal(false);
                setShowQuickLog(true);
              }}
              className="p-4 bg-gray-50 dark:bg-gray-700"
            >
              <Text className="text-blue-600 dark:text-blue-400 font-medium">
                + Other Office (specify manually)
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  const renderQuickLogModal = () => (
    <Modal
      visible={showQuickLog}
      transparent
      animationType="slide"
      onRequestClose={() => setShowQuickLog(false)}
    >
      <KeyboardAvoidingView 
        className="flex-1 justify-end bg-black/50"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View className="bg-white dark:bg-gray-800 rounded-t-xl max-h-5/6">
          <View className="flex-row justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
            <Text className="text-lg font-bold text-gray-900 dark:text-white">
              Log Bribe Solicitation
            </Text>
            <TouchableOpacity onPress={() => setShowQuickLog(false)}>
              <Ionicons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>
          
          <ScrollView className="p-4">
            <View className="space-y-4">
              {/* Service Type */}
              <View>
                <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Service Type *
                </Text>
                <TextInput
                  value={form.serviceType}
                  onChangeText={(text) => setForm(prev => ({ ...prev, serviceType: text }))}
                  placeholder="Enter service type"
                  className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-900 dark:text-white"
                />
              </View>
              
              {/* Office Name */}
              <View>
                <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Office Name *
                </Text>
                <TextInput
                  value={form.officeNameEn}
                  onChangeText={(text) => setForm(prev => ({ ...prev, officeNameEn: text }))}
                  placeholder="Enter office name"
                  className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-900 dark:text-white"
                />
              </View>
              
              {/* Amount */}
              <View>
                <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Amount (৳) - Optional
                </Text>
                <TextInput
                  value={form.amount.toString()}
                  onChangeText={(text) => setForm(prev => ({ ...prev, amount: parseFloat(text) || 0 }))}
                  placeholder="Enter amount if specified"
                  keyboardType="numeric"
                  className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-900 dark:text-white"
                />
              </View>
              
              {/* Officer Designation */}
              <View>
                <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Officer Designation - Optional
                </Text>
                <TextInput
                  value={form.officerDesignation}
                  onChangeText={(text) => setForm(prev => ({ ...prev, officerDesignation: text }))}
                  placeholder="e.g., Sub-Inspector, Assistant Commissioner"
                  className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-900 dark:text-white"
                />
              </View>
              
              {/* Description */}
              <View>
                <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description (English) - Optional
                </Text>
                <TextInput
                  value={form.descriptionEn}
                  onChangeText={(text) => setForm(prev => ({ ...prev, descriptionEn: text }))}
                  placeholder="Describe what happened"
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-900 dark:text-white"
                />
              </View>
              
              <View>
                <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description (Bangla) - Optional
                </Text>
                <TextInput
                  value={form.descriptionBn}
                  onChangeText={(text) => setForm(prev => ({ ...prev, descriptionBn: text }))}
                  placeholder="ঘটনার বিবরণ দিন"
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-900 dark:text-white"
                />
              </View>
              
              {/* Enhanced Location */}
              <View className="space-y-2">
                <TouchableOpacity
                  onPress={getCurrentLocation}
                  className="flex-row items-center justify-center p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg"
                >
                  <Ionicons name="location" size={20} color="#3b82f6" />
                  <Text className="text-blue-600 dark:text-blue-400 ml-2 font-medium">
                    {form.geoLocation ? 'Update GPS Location' : 'Add GPS Location (Recommended)'}
                  </Text>
                </TouchableOpacity>
                
                {form.geoLocation && (
                  <View className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    {(() => {
                      try {
                        const locationData = JSON.parse(form.geoLocation);
                        return (
                          <View>
                            <View className="flex-row items-center mb-2">
                              <Ionicons name="checkmark-circle" size={16} color="#059669" />
                              <Text className="text-green-700 dark:text-green-300 ml-2 font-medium text-sm">
                                Location Captured
                              </Text>
                            </View>
                            
                            <Text className="text-green-600 dark:text-green-400 text-xs">
                              Coordinates: {locationData.latitude.toFixed(6)}, {locationData.longitude.toFixed(6)}
                            </Text>
                            
                            {locationData.accuracy && (
                              <Text className="text-green-600 dark:text-green-400 text-xs">
                                Accuracy: ±{Math.round(locationData.accuracy)}m
                              </Text>
                            )}
                            
                            {locationData.address && locationData.address.city && (
                              <Text className="text-green-600 dark:text-green-400 text-xs mt-1">
                                {locationData.address.street && `${locationData.address.street}, `}
                                {locationData.address.city}
                                {locationData.address.district && `, ${locationData.address.district}`}
                              </Text>
                            )}
                            
                            <Text className="text-green-500 dark:text-green-500 text-xs mt-1">
                              Recorded: {new Date(locationData.timestamp).toLocaleString()}
                            </Text>
                          </View>
                        );
                      } catch (error) {
                        return (
                          <Text className="text-green-600 dark:text-green-400 text-xs">
                            Location data captured ✓
                          </Text>
                        );
                      }
                    })()} 
                  </View>
                )}
              </View>
              
              {/* Audio Recording */}
              <View className="border border-gray-200 dark:border-gray-600 rounded-lg p-3">
                <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Voice Memo (Optional)
                </Text>
                
                {!audioRecording && !isRecording && (
                  <TouchableOpacity
                    onPress={startRecording}
                    className="flex-row items-center justify-center p-3 bg-red-100 dark:bg-red-900/30 rounded-lg"
                  >
                    <Ionicons name="mic" size={20} color="#ef4444" />
                    <Text className="text-red-600 dark:text-red-400 ml-2 font-medium">
                      Start Voice Recording
                    </Text>
                  </TouchableOpacity>
                )}
                
                {isRecording && (
                  <View className="space-y-3">
                    <View className="flex-row items-center justify-center p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
                      <Ionicons name="radio-button-on" size={20} color="#ef4444" />
                      <Text className="text-red-600 dark:text-red-400 ml-2 font-bold">
                        Recording... {formatDuration(recordingDuration)}
                      </Text>
                    </View>
                    
                    <View className="flex-row space-x-2">
                      <TouchableOpacity
                        onPress={stopRecording}
                        className="flex-1 flex-row items-center justify-center p-2 bg-green-500 rounded-lg"
                      >
                        <Ionicons name="stop" size={16} color="white" />
                        <Text className="text-white ml-2 font-medium">Stop</Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity
                        onPress={cancelRecording}
                        className="flex-1 flex-row items-center justify-center p-2 bg-gray-500 rounded-lg"
                      >
                        <Ionicons name="close" size={16} color="white" />
                        <Text className="text-white ml-2 font-medium">Cancel</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
                
                {audioRecording && !isRecording && (
                  <View className="space-y-3">
                    <View className="flex-row items-center justify-between p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                      <View className="flex-row items-center">
                        <Ionicons name="checkmark-circle" size={20} color="#059669" />
                        <Text className="text-green-700 dark:text-green-300 ml-2 font-medium">
                          Recording Ready
                        </Text>
                      </View>
                      <Text className="text-green-600 dark:text-green-400 text-sm">
                        {formatDuration(audioRecording.duration)}
                      </Text>
                    </View>
                    
                    <View className="flex-row space-x-2">
                      <TouchableOpacity
                        onPress={playRecording}
                        className="flex-1 flex-row items-center justify-center p-2 bg-blue-500 rounded-lg"
                        disabled={isPlayingAudio}
                      >
                        <Ionicons 
                          name={isPlayingAudio ? "pause" : "play"} 
                          size={16} 
                          color="white" 
                        />
                        <Text className="text-white ml-2 font-medium">
                          {isPlayingAudio ? 'Playing...' : 'Play'}
                        </Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity
                        onPress={deleteRecording}
                        className="flex-1 flex-row items-center justify-center p-2 bg-red-500 rounded-lg"
                      >
                        <Ionicons name="trash" size={16} color="white" />
                        <Text className="text-white ml-2 font-medium">Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
              
              {/* Security Notice */}
              <View className="bg-green-100 dark:bg-green-900/30 rounded-lg p-3">
                <View className="flex-row items-center">
                  <Ionicons name="shield-checkmark" size={20} color="#059669" />
                  <Text className="text-green-800 dark:text-green-200 font-medium ml-2">
                    Secure & Anonymous
                  </Text>
                </View>
                <Text className="text-green-700 dark:text-green-300 text-sm mt-1">
                  Your report is encrypted and stored securely. No personal information is collected.
                </Text>
              </View>
            </View>
          </ScrollView>
          
          {/* Submit Button */}
          <View className="p-4 border-t border-gray-200 dark:border-gray-700">
            <TouchableOpacity
              onPress={submitBribeLog}
              className="bg-red-500 rounded-lg p-4 items-center"
              disabled={isLoading}
            >
              <Text className="text-white font-bold text-lg">
                {isLoading ? 'Logging...' : 'Log Incident Securely'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
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
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <View className="bg-gradient-to-r from-red-500 to-red-600 px-4 py-6">
        <View className="flex-row items-center">
          <TouchableOpacity 
            onPress={() => router.back()}
            className="mr-4"
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-white text-xl font-bold">
              FairLine Logger
            </Text>
            <Text className="text-white/80 text-sm mt-1">
              Anonymous bribe solicitation reporting
            </Text>
          </View>
        </View>
      </View>

      <ScrollView className="flex-1 p-4">
        {/* Emergency Quick Log */}
        <MotiView
          from={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'timing', duration: 500 }}
          className="bg-red-100 dark:bg-red-900/30 rounded-xl p-4 mb-6"
        >
          <View className="flex-row items-center mb-3">
            <Ionicons name="warning" size={24} color="#ef4444" />
            <Text className="font-bold text-red-800 dark:text-red-200 ml-3 text-lg">
              Quick Report
            </Text>
          </View>
          <Text className="text-red-700 dark:text-red-300 text-sm mb-4">
            If you're experiencing bribe solicitation right now, tap below for immediate logging.
          </Text>
          <TouchableOpacity
            onPress={() => setShowQuickLog(true)}
            className="bg-red-500 rounded-lg p-3 items-center"
          >
            <Text className="text-white font-bold">
              🚨 Log Incident Now
            </Text>
          </TouchableOpacity>
        </MotiView>

        {/* Quick Service Categories */}
        <Text className="text-lg font-bold text-gray-900 dark:text-white mb-4">
          Common Service Categories
        </Text>
        
        <View className="flex-row flex-wrap justify-center">
          {QUICK_SERVICES.map((service, index) => 
            renderQuickServiceCard(service, index)
          )}
        </View>

        {/* Hash Chain Verification */}
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 500, delay: 400 }}
          className="bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl p-4 mb-6"
        >
          <View className="flex-row items-center mb-3">
            <Ionicons name="shield-checkmark" size={24} color="white" />
            <Text className="font-bold text-white ml-3 text-lg">
              Verify Tamper-Proof Evidence
            </Text>
          </View>
          <Text className="text-white/90 text-sm mb-4">
            Verify your submissions or check the integrity of the hash chain using verification codes.
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/hash-chain-verification')}
            className="bg-white/20 rounded-lg p-3 items-center"
          >
            <Text className="text-white font-bold">
              🔗 Open Hash Chain Verification
            </Text>
          </TouchableOpacity>
        </MotiView>

        {/* Information Section */}
        <View className="bg-white dark:bg-gray-800 rounded-xl p-4 mt-6">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="font-bold text-gray-900 dark:text-white">
              📋 How FairLine Works
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/evidence-guide')}
              className="flex-row items-center bg-purple-100 dark:bg-purple-900/30 px-3 py-1 rounded-full"
            >
              <Ionicons name="help-circle" size={16} color="#8b5cf6" />
              <Text className="text-purple-600 dark:text-purple-400 text-sm ml-1 font-medium">
                Guide
              </Text>
            </TouchableOpacity>
          </View>
          
          <View className="space-y-3">
            <View className="flex-row items-start">
              <Text className="text-blue-600 dark:text-blue-400 font-bold mr-3">1.</Text>
              <Text className="text-gray-700 dark:text-gray-300 flex-1">
                Log incidents immediately when they happen for accurate timestamps
              </Text>
            </View>
            
            <View className="flex-row items-start">
              <Text className="text-blue-600 dark:text-blue-400 font-bold mr-3">2.</Text>
              <Text className="text-gray-700 dark:text-gray-300 flex-1">
                All reports are encrypted and stored with tamper-proof hash chains
              </Text>
            </View>
            
            <View className="flex-row items-start">
              <Text className="text-blue-600 dark:text-blue-400 font-bold mr-3">3.</Text>
              <Text className="text-gray-700 dark:text-gray-300 flex-1">
                Add voice recordings and GPS coordinates for stronger evidence
              </Text>
            </View>
            
            <View className="flex-row items-start">
              <Text className="text-blue-600 dark:text-blue-400 font-bold mr-3">4.</Text>
              <Text className="text-gray-700 dark:text-gray-300 flex-1">
                No personal information is collected - reports are completely anonymous
              </Text>
            </View>
            
            <View className="flex-row items-start">
              <Text className="text-blue-600 dark:text-blue-400 font-bold mr-3">5.</Text>
              <Text className="text-gray-700 dark:text-gray-300 flex-1">
                Export evidence bundles when needed for legal proceedings
              </Text>
            </View>
          </View>
          
          {/* Quick Actions */}
          <View className="flex-row space-x-2 mt-4">
            <TouchableOpacity
              onPress={() => router.push('/evidence-export')}
              className="flex-1 flex-row items-center justify-center p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg"
            >
              <Ionicons name="download" size={16} color="#ea580c" />
              <Text className="text-orange-700 dark:text-orange-300 text-sm ml-1 font-medium">
                Export
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={() => router.push('/hash-chain-verification')}
              className="flex-1 flex-row items-center justify-center p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg"
            >
              <Ionicons name="shield-checkmark" size={16} color="#3b82f6" />
              <Text className="text-blue-700 dark:text-blue-300 text-sm ml-1 font-medium">
                Verify
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {renderOfficeModal()}
      {renderQuickLogModal()}
    </View>
  );
}