import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { AudioRecordingService } from '@/lib/audio-recording';
import * as Location from 'expo-location';

interface StorageStats {
  totalFiles: number;
  totalSize: number;
  evidenceDir: string;
}

interface GuideSection {
  id: string;
  title: string;
  icon: string;
  color: string;
  content: Array<{
    subtitle?: string;
    text: string;
    tips?: string[];
  }>;
}

const GUIDE_SECTIONS: GuideSection[] = [
  {
    id: 'voice_recording',
    title: 'Voice Recording Best Practices',
    icon: 'mic',
    color: '#ef4444',
    content: [
      {
        subtitle: 'When to Use Voice Recording',
        text: 'Voice memos provide crucial evidence when documenting bribe solicitation incidents. Record when you can do so safely.',
        tips: [
          'Record immediately after the incident when details are fresh',
          'Speak clearly and mention date, time, and location',
          'Describe what happened in your own words',
          'Include names, positions, and amounts if known'
        ]
      },
      {
        subtitle: 'Recording Quality Tips',
        text: 'High-quality recordings are more credible and useful as evidence.',
        tips: [
          'Find a quiet environment when possible',
          'Hold device at speaking distance (6-12 inches)',
          'Speak at normal volume and pace',
          'Avoid background noise and interruptions'
        ]
      },
      {
        subtitle: 'Security Considerations',
        text: 'Your safety is paramount. Only record when it\'s safe to do so.',
        tips: [
          'Never record if it puts you at risk',
          'Be aware of local recording laws',
          'Recordings are stored locally and encrypted',
          'Delete recordings from device after secure submission'
        ]
      }
    ]
  },
  {
    id: 'geo_tagging',
    title: 'GPS Location Evidence',
    icon: 'location',
    color: '#3b82f6',
    content: [
      {
        subtitle: 'Why Location Matters',
        text: 'GPS coordinates provide crucial context and help verify the authenticity of your report.',
        tips: [
          'Enables mapping of corruption hotspots',
          'Helps authorities investigate specific locations',
          'Provides timestamp and accuracy verification',
          'Supports pattern analysis across regions'
        ]
      },
      {
        subtitle: 'Location Accuracy',
        text: 'For the most accurate location data, ensure optimal GPS conditions.',
        tips: [
          'Use location services outdoors when possible',
          'Wait for GPS lock (±10m accuracy is ideal)',
          'Avoid recording in tunnels or dense buildings',
          'Check location accuracy before submitting'
        ]
      },
      {
        subtitle: 'Privacy Protection',
        text: 'Your location data is used only for evidence verification and analysis.',
        tips: [
          'Location data is anonymized in reports',
          'No personal tracking or monitoring',
          'Data used only for anti-corruption purposes',
          'You can submit reports without location if needed'
        ]
      }
    ]
  },
  {
    id: 'evidence_security',
    title: 'Evidence Security & Storage',
    icon: 'shield-checkmark',
    color: '#10b981',
    content: [
      {
        subtitle: 'Tamper-Proof Storage',
        text: 'All evidence is secured using cryptographic hash chains to prevent tampering.',
        tips: [
          'Each submission gets a unique verification code',
          'Evidence is linked cryptographically',
          'Any tampering is automatically detected',
          'Public verification available anytime'
        ]
      },
      {
        subtitle: 'Local Storage Security',
        text: 'Voice recordings and data are encrypted on your device.',
        tips: [
          'Files stored in secure device directories',
          'Automatic cleanup after successful submission',
          'No cloud storage without your consent',
          'Data protected by device security features'
        ]
      }
    ]
  },
  {
    id: 'legal_considerations',
    title: 'Legal Guidelines & Ethics',
    icon: 'library',
    color: '#8b5cf6',
    content: [
      {
        subtitle: 'Know Your Rights',
        text: 'Understanding your legal rights and protections when reporting corruption.',
        tips: [
          'Right to report corruption anonymously',
          'Protection under whistleblower laws',
          'Evidence can be used in legal proceedings',
          'Reports can trigger official investigations'
        ]
      },
      {
        subtitle: 'Ethical Reporting',
        text: 'Report incidents truthfully and provide accurate information.',
        tips: [
          'Only report incidents you personally experienced',
          'Provide truthful and accurate details',
          'Avoid speculation or assumptions',
          'Respect privacy of all parties involved'
        ]
      }
    ]
  }
];

export default function EvidenceGuideScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  
  const [storageStats, setStorageStats] = useState<StorageStats | null>(null);
  const [locationPermission, setLocationPermission] = useState<boolean>(false);
  const [audioPermission, setAudioPermission] = useState<boolean>(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const isEnglish = i18n.language === 'en';

  useEffect(() => {
    loadStorageStats();
    checkPermissions();
  }, []);

  const loadStorageStats = async () => {
    try {
      const audioService = AudioRecordingService.getInstance();
      const stats = await audioService.getStorageStats();
      setStorageStats(stats);
    } catch (error) {
      console.error('Failed to load storage stats:', error);
    }
  };

  const checkPermissions = async () => {
    try {
      // Check location permission
      const locationStatus = await Location.getForegroundPermissionsAsync();
      setLocationPermission(locationStatus.granted);

      // Check audio permission
      const audioService = AudioRecordingService.getInstance();
      const audioPerms = await audioService.requestPermissions();
      setAudioPermission(audioPerms.granted);
    } catch (error) {
      console.error('Failed to check permissions:', error);
    }
  };

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status === 'granted');
      
      if (status === 'granted') {
        Alert.alert('Permission Granted', 'Location access enabled for evidence collection.');
      }
    } catch (error) {
      console.error('Location permission error:', error);
    }
  };

  const requestAudioPermission = async () => {
    try {
      const audioService = AudioRecordingService.getInstance();
      const permissions = await audioService.requestPermissions();
      setAudioPermission(permissions.granted);
      
      if (permissions.granted) {
        Alert.alert('Permission Granted', 'Microphone access enabled for voice recordings.');
      }
    } catch (error) {
      console.error('Audio permission error:', error);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSection(expandedSection === sectionId ? null : sectionId);
  };

  const renderPermissionCard = () => (
    <MotiView
      from={{ opacity: 0, translateY: 20 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 500 }}
      className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-4"
    >
      <Text className="font-bold text-gray-900 dark:text-white mb-3">
        📱 Required Permissions
      </Text>
      
      <View className="space-y-3">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center flex-1">
            <Ionicons 
              name="mic" 
              size={20} 
              color={audioPermission ? '#10b981' : '#ef4444'} 
            />
            <Text className="ml-3 text-gray-700 dark:text-gray-300">
              Microphone Access
            </Text>
          </View>
          
          {audioPermission ? (
            <View className="flex-row items-center">
              <Ionicons name="checkmark-circle" size={20} color="#10b981" />
              <Text className="text-green-600 dark:text-green-400 ml-1 text-sm">Granted</Text>
            </View>
          ) : (
            <TouchableOpacity 
              onPress={requestAudioPermission}
              className="bg-blue-500 px-3 py-1 rounded-lg"
            >
              <Text className="text-white text-sm">Enable</Text>
            </TouchableOpacity>
          )}
        </View>
        
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center flex-1">
            <Ionicons 
              name="location" 
              size={20} 
              color={locationPermission ? '#10b981' : '#f59e0b'} 
            />
            <Text className="ml-3 text-gray-700 dark:text-gray-300">
              Location Access
            </Text>
          </View>
          
          {locationPermission ? (
            <View className="flex-row items-center">
              <Ionicons name="checkmark-circle" size={20} color="#10b981" />
              <Text className="text-green-600 dark:text-green-400 ml-1 text-sm">Granted</Text>
            </View>
          ) : (
            <TouchableOpacity 
              onPress={requestLocationPermission}
              className="bg-orange-500 px-3 py-1 rounded-lg"
            >
              <Text className="text-white text-sm">Enable</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </MotiView>
  );

  const renderStorageInfo = () => (
    <MotiView
      from={{ opacity: 0, translateY: 20 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 500, delay: 200 }}
      className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 mb-4"
    >
      <Text className="font-bold text-blue-800 dark:text-blue-200 mb-3">
        💾 Evidence Storage
      </Text>
      
      {storageStats ? (
        <View className="space-y-2">
          <View className="flex-row justify-between">
            <Text className="text-blue-700 dark:text-blue-300">Audio Files:</Text>
            <Text className="text-blue-600 dark:text-blue-400 font-medium">
              {storageStats.totalFiles}
            </Text>
          </View>
          
          <View className="flex-row justify-between">
            <Text className="text-blue-700 dark:text-blue-300">Storage Used:</Text>
            <Text className="text-blue-600 dark:text-blue-400 font-medium">
              {formatFileSize(storageStats.totalSize)}
            </Text>
          </View>
          
          <Text className="text-blue-600 dark:text-blue-400 text-xs mt-2">
            Files are automatically cleaned up after secure submission
          </Text>
        </View>
      ) : (
        <Text className="text-blue-600 dark:text-blue-400">Loading storage information...</Text>
      )}
    </MotiView>
  );

  const renderGuideSection = (section: GuideSection, index: number) => (
    <MotiView
      key={section.id}
      from={{ opacity: 0, translateY: 20 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 500, delay: 400 + (index * 100) }}
      className="bg-white dark:bg-gray-800 rounded-xl mb-4 overflow-hidden"
    >
      <TouchableOpacity
        onPress={() => toggleSection(section.id)}
        className="p-4 flex-row items-center justify-between"
        style={{ backgroundColor: section.color + '10' }}
      >
        <View className="flex-row items-center flex-1">
          <View 
            className="w-10 h-10 rounded-full items-center justify-center"
            style={{ backgroundColor: section.color + '20' }}
          >
            <Ionicons name={section.icon as any} size={20} color={section.color} />
          </View>
          <Text className="ml-3 font-bold text-gray-900 dark:text-white">
            {section.title}
          </Text>
        </View>
        
        <Ionicons 
          name={expandedSection === section.id ? "chevron-up" : "chevron-down"} 
          size={20} 
          color="#6b7280" 
        />
      </TouchableOpacity>
      
      {expandedSection === section.id && (
        <View className="p-4 border-t border-gray-100 dark:border-gray-700">
          {section.content.map((item, itemIndex) => (
            <View key={itemIndex} className="mb-4 last:mb-0">
              {item.subtitle && (
                <Text className="font-semibold text-gray-900 dark:text-white mb-2">
                  {item.subtitle}
                </Text>
              )}
              
              <Text className="text-gray-700 dark:text-gray-300 mb-3 leading-6">
                {item.text}
              </Text>
              
              {item.tips && (
                <View className="ml-4">
                  {item.tips.map((tip, tipIndex) => (
                    <Text key={tipIndex} className="text-gray-600 dark:text-gray-400 text-sm mb-1">
                      • {tip}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          ))}
        </View>
      )}
    </MotiView>
  );

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <View className="bg-gradient-to-r from-purple-600 to-blue-600 px-4 py-6">
        <View className="flex-row items-center">
          <TouchableOpacity 
            onPress={() => router.back()}
            className="mr-4"
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-white text-xl font-bold">
              Evidence Collection Guide
            </Text>
            <Text className="text-white/80 text-sm mt-1">
              Voice recording and location best practices
            </Text>
          </View>
        </View>
      </View>

      <ScrollView className="flex-1 p-4">
        {renderPermissionCard()}
        {renderStorageInfo()}
        
        {GUIDE_SECTIONS.map((section, index) => renderGuideSection(section, index))}
        
        {/* Quick Actions */}
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 500, delay: 800 }}
          className="bg-gradient-to-r from-red-500 to-orange-500 rounded-xl p-4 mb-4"
        >
          <Text className="font-bold text-white mb-3">
            🚨 Need to Report Now?
          </Text>
          <Text className="text-white/90 text-sm mb-4">
            If you're experiencing bribe solicitation right now, don't wait. Log the incident immediately.
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/fairline-logger')}
            className="bg-white/20 rounded-lg p-3 items-center"
          >
            <Text className="text-white font-bold">
              Go to FairLine Logger
            </Text>
          </TouchableOpacity>
        </MotiView>
      </ScrollView>
    </View>
  );
}