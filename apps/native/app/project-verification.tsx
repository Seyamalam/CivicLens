import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import * as FileSystem from 'expo-file-system';

interface PhotoVerification {
  id: string;
  projectId: string;
  photoUri: string;
  location: {
    latitude: number;
    longitude: number;
    accuracy: number;
    timestamp: string;
  };
  verificationNotes: string;
  submittedBy: string;
  submittedAt: string;
  verificationStatus: 'pending' | 'verified' | 'disputed';
}

interface ProjectMonitoring {
  id: string;
  projectName: string;
  expectedProgress: number;
  reportedProgress: number;
  photoCount: number;
  lastUpdate: string;
  verificationScore: number;
}

export default function ProjectVerificationScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [verifications, setVerifications] = useState<PhotoVerification[]>([]);
  const [projectData, setProjectData] = useState<ProjectMonitoring | null>(null);

  const isEnglish = i18n.language === 'en';
  const projectId = params.projectId as string;

  useEffect(() => {
    loadProjectData();
    loadVerifications();
    getCurrentLocation();
  }, [projectId]);

  const loadProjectData = () => {
    // Mock project data
    const mockProject: ProjectMonitoring = {
      id: projectId || 'proj_001',
      projectName: 'Metro Rail Extension Phase 2',
      expectedProgress: 65,
      reportedProgress: 56,
      photoCount: 24,
      lastUpdate: '2024-02-15',
      verificationScore: 78
    };
    
    setProjectData(mockProject);
  };

  const loadVerifications = () => {
    // Mock verification data
    const mockVerifications: PhotoVerification[] = [
      {
        id: 'ver_001',
        projectId: projectId || 'proj_001',
        photoUri: 'https://via.placeholder.com/400x300/3b82f6/ffffff?text=Construction+Site',
        location: {
          latitude: 23.8103,
          longitude: 90.4125,
          accuracy: 5,
          timestamp: '2024-02-15T10:30:00Z'
        },
        verificationNotes: 'Construction progressing as planned. Steel framework 60% complete.',
        submittedBy: 'Citizen Reporter',
        submittedAt: '2024-02-15T10:35:00Z',
        verificationStatus: 'verified'
      },
      {
        id: 'ver_002',
        projectId: projectId || 'proj_001',
        photoUri: 'https://via.placeholder.com/400x300/10b981/ffffff?text=Progress+Update',
        location: {
          latitude: 23.8105,
          longitude: 90.4127,
          accuracy: 8,
          timestamp: '2024-02-14T15:20:00Z'
        },
        verificationNotes: 'Station platform construction started. Foundations laid.',
        submittedBy: 'Anonymous',
        submittedAt: '2024-02-14T15:25:00Z',
        verificationStatus: 'pending'
      }
    ];
    
    setVerifications(mockVerifications);
  };

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Location access is required for photo verification');
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.BestForNavigation
      });
      
      setLocation(location);
    } catch (error) {
      console.error('Error getting location:', error);
    }
  };

  const selectImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Camera roll access is required');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error selecting image:', error);
      Alert.alert('Error', 'Failed to select image');
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Camera access is required');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const submitVerification = async () => {
    if (!selectedImage || !location) {
      Alert.alert('Error', 'Please select an image and ensure location is available');
      return;
    }

    try {
      setIsSubmitting(true);
      
      // In production, this would:
      // 1. Upload image to secure storage
      // 2. Save verification data to database
      // 3. Update project monitoring statistics
      
      const newVerification: PhotoVerification = {
        id: `ver_${Date.now()}`,
        projectId: projectId || 'proj_001',
        photoUri: selectedImage,
        location: {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          accuracy: location.coords.accuracy || 0,
          timestamp: new Date().toISOString()
        },
        verificationNotes: 'Progress verification submitted by citizen',
        submittedBy: 'Anonymous',
        submittedAt: new Date().toISOString(),
        verificationStatus: 'pending'
      };
      
      setVerifications(prev => [newVerification, ...prev]);
      setSelectedImage(null);
      
      Alert.alert(
        'Verification Submitted',
        'Thank you for contributing to project transparency. Your photo has been submitted for verification.',
        [{ text: 'OK' }]
      );
      
    } catch (error) {
      console.error('Error submitting verification:', error);
      Alert.alert('Error', 'Failed to submit verification');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getVerificationStatusColor = (status: string) => {
    switch (status) {
      case 'verified': return '#10b981';
      case 'disputed': return '#ef4444';
      case 'pending': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  const getVerificationStatusIcon = (status: string) => {
    switch (status) {
      case 'verified': return 'checkmark-circle';
      case 'disputed': return 'close-circle';
      case 'pending': return 'time';
      default: return 'help-circle';
    }
  };

  const renderProjectHeader = () => {
    if (!projectData) return null;
    
    return (
      <View className="bg-gradient-to-r from-green-600 to-blue-600 px-4 py-6">
        <View className="flex-row items-center mb-4">
          <TouchableOpacity 
            onPress={() => router.back()}
            className="mr-4"
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-white text-xl font-bold">
              Project Verification
            </Text>
            <Text className="text-white/80 text-sm mt-1">
              {projectData.projectName}
            </Text>
          </View>
        </View>
        
        <View className="bg-white/20 rounded-xl p-4">
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-white/80 text-sm">Expected Progress</Text>
            <Text className="text-white font-bold">{projectData.expectedProgress}%</Text>
          </View>
          
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-white/80 text-sm">Reported Progress</Text>
            <Text className="text-white font-bold">{projectData.reportedProgress}%</Text>
          </View>
          
          <View className="flex-row justify-between items-center">
            <Text className="text-white/80 text-sm">Verification Score</Text>
            <Text className="text-white font-bold">{projectData.verificationScore}/100</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderPhotoCapture = () => (
    <MotiView
      from={{ opacity: 0, translateY: 20 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 500 }}
      className="bg-white dark:bg-gray-800 rounded-xl mx-4 mb-4 p-4"
    >
      <Text className="font-bold text-gray-900 dark:text-white mb-4">
        📸 Submit Photo Verification
      </Text>
      
      {selectedImage ? (
        <View className="mb-4">
          <Image 
            source={{ uri: selectedImage }} 
            className="w-full h-48 rounded-lg"
            resizeMode="cover"
          />
          <TouchableOpacity
            onPress={() => setSelectedImage(null)}
            className="absolute top-2 right-2 bg-red-500 rounded-full p-2"
          >
            <Ionicons name="close" size={16} color="white" />
          </TouchableOpacity>
        </View>
      ) : (
        <View className="bg-gray-100 dark:bg-gray-700 rounded-lg h-48 items-center justify-center mb-4">
          <Ionicons name="camera" size={48} color="#9ca3af" />
          <Text className="text-gray-500 text-center mt-2">
            Take a photo or select from gallery
          </Text>
        </View>
      )}
      
      <View className="flex-row space-x-3 mb-4">
        <TouchableOpacity
          onPress={takePhoto}
          className="flex-1 bg-blue-500 py-3 rounded-lg flex-row items-center justify-center"
        >
          <Ionicons name="camera" size={20} color="white" />
          <Text className="text-white font-medium ml-2">Take Photo</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          onPress={selectImage}
          className="flex-1 bg-gray-500 py-3 rounded-lg flex-row items-center justify-center"
        >
          <Ionicons name="images" size={20} color="white" />
          <Text className="text-white font-medium ml-2">Gallery</Text>
        </TouchableOpacity>
      </View>
      
      {location && (
        <View className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 mb-4">
          <View className="flex-row items-center">
            <Ionicons name="location" size={16} color="#10b981" />
            <Text className="text-green-700 dark:text-green-300 ml-2 text-sm">
              Location: {location.coords.latitude.toFixed(6)}, {location.coords.longitude.toFixed(6)}
            </Text>
          </View>
          <Text className="text-green-600 dark:text-green-400 text-xs mt-1">
            Accuracy: ±{Math.round(location.coords.accuracy || 0)}m
          </Text>
        </View>
      )}
      
      <TouchableOpacity
        onPress={submitVerification}
        disabled={!selectedImage || !location || isSubmitting}
        className={`py-3 rounded-lg ${
          (!selectedImage || !location || isSubmitting) 
            ? 'bg-gray-300 dark:bg-gray-600' 
            : 'bg-green-500'
        }`}
      >
        <Text className="text-white text-center font-bold">
          {isSubmitting ? 'Submitting...' : 'Submit Verification'}
        </Text>
      </TouchableOpacity>
    </MotiView>
  );

  const renderVerificationHistory = () => (
    <View className="bg-white dark:bg-gray-800 rounded-xl mx-4 mb-4 p-4">
      <Text className="font-bold text-gray-900 dark:text-white mb-4">
        🔍 Recent Verifications
      </Text>
      
      {verifications.map((verification, index) => (
        <MotiView
          key={verification.id}
          from={{ opacity: 0, translateX: 20 }}
          animate={{ opacity: 1, translateX: 0 }}
          transition={{ type: 'timing', duration: 500, delay: index * 100 }}
          className="mb-4 last:mb-0"
        >
          <View className="flex-row">
            <Image 
              source={{ uri: verification.photoUri }} 
              className="w-16 h-16 rounded-lg mr-3"
              resizeMode="cover"
            />
            
            <View className="flex-1">
              <View className="flex-row items-center justify-between mb-1">
                <Text className="font-medium text-gray-900 dark:text-white text-sm">
                  {verification.submittedBy}
                </Text>
                <View className="flex-row items-center">
                  <Ionicons 
                    name={getVerificationStatusIcon(verification.verificationStatus) as any} 
                    size={16} 
                    color={getVerificationStatusColor(verification.verificationStatus)} 
                  />
                  <Text 
                    className="ml-1 text-xs font-medium capitalize"
                    style={{ color: getVerificationStatusColor(verification.verificationStatus) }}
                  >
                    {verification.verificationStatus}
                  </Text>
                </View>
              </View>
              
              <Text className="text-gray-600 dark:text-gray-400 text-xs mb-1">
                {verification.verificationNotes}
              </Text>
              
              <View className="flex-row items-center">
                <Ionicons name="location" size={12} color="#6b7280" />
                <Text className="text-gray-500 text-xs ml-1">
                  {verification.location.latitude.toFixed(4)}, {verification.location.longitude.toFixed(4)}
                </Text>
                <Text className="text-gray-500 text-xs ml-2">
                  {new Date(verification.submittedAt).toLocaleDateString()}
                </Text>
              </View>
            </div>
          </View>
        </MotiView>
      ))}
      
      {verifications.length === 0 && (
        <View className="items-center py-8">
          <Ionicons name="camera-outline" size={48} color="#9ca3af" />
          <Text className="text-gray-500 text-center mt-2">
            No verifications yet. Be the first to contribute!
          </Text>
        </View>
      )}
    </View>
  );

  const renderVerificationGuidelines = () => (
    <View className="bg-blue-50 dark:bg-blue-900/20 rounded-xl mx-4 mb-4 p-4">
      <Text className="font-bold text-blue-800 dark:text-blue-200 mb-3">
        📋 Verification Guidelines
      </Text>
      
      <View className="space-y-2">
        <Text className="text-blue-700 dark:text-blue-300 text-sm">
          • Take clear photos showing current progress
        </Text>
        <Text className="text-blue-700 dark:text-blue-300 text-sm">
          • Ensure GPS location is enabled for accuracy
        </Text>
        <Text className="text-blue-700 dark:text-blue-300 text-sm">
          • Include timestamps and relevant landmarks
        </Text>
        <Text className="text-blue-700 dark:text-blue-300 text-sm">
          • Be objective and factual in observations
        </Text>
        <Text className="text-blue-700 dark:text-blue-300 text-sm">
          • Respect privacy and safety guidelines
        </Text>
      </View>
    </View>
  );

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      {renderProjectHeader()}
      
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {renderPhotoCapture()}
        {renderVerificationGuidelines()}
        {renderVerificationHistory()}
      </ScrollView>
    </View>
  );
}