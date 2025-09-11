import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { useLocalSearchParams, useRouter } from "expo-router";
import { MotiView } from "moti";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

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
  verificationStatus: "pending" | "verified" | "disputed";
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
  const [location, setLocation] = useState<Location.LocationObject | null>(
    null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [verifications, setVerifications] = useState<PhotoVerification[]>([]);
  const [projectData, setProjectData] = useState<ProjectMonitoring | null>(
    null
  );

  const isEnglish = i18n.language === "en";
  const projectId = params.projectId as string;

  useEffect(() => {
    loadProjectData();
    loadVerifications();
    getCurrentLocation();
  }, [projectId]);

  const loadProjectData = () => {
    // Mock project data
    const mockProject: ProjectMonitoring = {
      id: projectId || "proj_001",
      projectName: "Metro Rail Extension Phase 2",
      expectedProgress: 65,
      reportedProgress: 56,
      photoCount: 24,
      lastUpdate: "2024-02-15",
      verificationScore: 78,
    };

    setProjectData(mockProject);
  };

  const loadVerifications = () => {
    // Mock verification data
    const mockVerifications: PhotoVerification[] = [
      {
        id: "ver_001",
        projectId: projectId || "proj_001",
        photoUri:
          "https://via.placeholder.com/400x300/3b82f6/ffffff?text=Construction+Site",
        location: {
          latitude: 23.8103,
          longitude: 90.4125,
          accuracy: 5,
          timestamp: "2024-02-15T10:30:00Z",
        },
        verificationNotes:
          "Construction progressing as planned. Steel framework 60% complete.",
        submittedBy: "Citizen Reporter",
        submittedAt: "2024-02-15T10:35:00Z",
        verificationStatus: "verified",
      },
      {
        id: "ver_002",
        projectId: projectId || "proj_001",
        photoUri:
          "https://via.placeholder.com/400x300/10b981/ffffff?text=Progress+Update",
        location: {
          latitude: 23.8105,
          longitude: 90.4127,
          accuracy: 8,
          timestamp: "2024-02-14T15:20:00Z",
        },
        verificationNotes:
          "Station platform construction started. Foundations laid.",
        submittedBy: "Anonymous",
        submittedAt: "2024-02-14T15:25:00Z",
        verificationStatus: "pending",
      },
    ];

    setVerifications(mockVerifications);
  };

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Location access is required for photo verification"
        );
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.BestForNavigation,
      });

      setLocation(location);
    } catch (error) {
      console.error("Error getting location:", error);
    }
  };

  const selectImage = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Required", "Camera roll access is required");
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
      console.error("Error selecting image:", error);
      Alert.alert("Error", "Failed to select image");
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Required", "Camera access is required");
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
      console.error("Error taking photo:", error);
      Alert.alert("Error", "Failed to take photo");
    }
  };

  const submitVerification = async () => {
    if (!(selectedImage && location)) {
      Alert.alert(
        "Error",
        "Please select an image and ensure location is available"
      );
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
        projectId: projectId || "proj_001",
        photoUri: selectedImage,
        location: {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          accuracy: location.coords.accuracy || 0,
          timestamp: new Date().toISOString(),
        },
        verificationNotes: "Progress verification submitted by citizen",
        submittedBy: "Anonymous",
        submittedAt: new Date().toISOString(),
        verificationStatus: "pending",
      };

      setVerifications((prev) => [newVerification, ...prev]);
      setSelectedImage(null);

      Alert.alert(
        "Verification Submitted",
        "Thank you for contributing to project transparency. Your photo has been submitted for verification.",
        [{ text: "OK" }]
      );
    } catch (error) {
      console.error("Error submitting verification:", error);
      Alert.alert("Error", "Failed to submit verification");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getVerificationStatusColor = (status: string) => {
    switch (status) {
      case "verified":
        return "#10b981";
      case "disputed":
        return "#ef4444";
      case "pending":
        return "#f59e0b";
      default:
        return "#6b7280";
    }
  };

  const getVerificationStatusIcon = (status: string) => {
    switch (status) {
      case "verified":
        return "checkmark-circle";
      case "disputed":
        return "close-circle";
      case "pending":
        return "time";
      default:
        return "help-circle";
    }
  };

  const renderProjectHeader = () => {
    if (!projectData) return null;

    return (
      <View className="bg-gradient-to-r from-green-600 to-blue-600 px-4 py-6">
        <View className="mb-4 flex-row items-center">
          <TouchableOpacity className="mr-4" onPress={() => router.back()}>
            <Ionicons color="white" name="arrow-back" size={24} />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="font-bold text-white text-xl">
              Project Verification
            </Text>
            <Text className="mt-1 text-sm text-white/80">
              {projectData.projectName}
            </Text>
          </View>
        </View>

        <View className="rounded-xl bg-white/20 p-4">
          <View className="mb-2 flex-row items-center justify-between">
            <Text className="text-sm text-white/80">Expected Progress</Text>
            <Text className="font-bold text-white">
              {projectData.expectedProgress}%
            </Text>
          </View>

          <View className="mb-2 flex-row items-center justify-between">
            <Text className="text-sm text-white/80">Reported Progress</Text>
            <Text className="font-bold text-white">
              {projectData.reportedProgress}%
            </Text>
          </View>

          <View className="flex-row items-center justify-between">
            <Text className="text-sm text-white/80">Verification Score</Text>
            <Text className="font-bold text-white">
              {projectData.verificationScore}/100
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderPhotoCapture = () => (
    <MotiView
      animate={{ opacity: 1, translateY: 0 }}
      className="mx-4 mb-4 rounded-xl bg-white p-4 dark:bg-gray-800"
      from={{ opacity: 0, translateY: 20 }}
      transition={{ type: "timing", duration: 500 }}
    >
      <Text className="mb-4 font-bold text-gray-900 dark:text-white">
        📸 Submit Photo Verification
      </Text>

      {selectedImage ? (
        <View className="mb-4">
          <Image
            className="h-48 w-full rounded-lg"
            resizeMode="cover"
            source={{ uri: selectedImage }}
          />
          <TouchableOpacity
            className="absolute top-2 right-2 rounded-full bg-red-500 p-2"
            onPress={() => setSelectedImage(null)}
          >
            <Ionicons color="white" name="close" size={16} />
          </TouchableOpacity>
        </View>
      ) : (
        <View className="mb-4 h-48 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700">
          <Ionicons color="#9ca3af" name="camera" size={48} />
          <Text className="mt-2 text-center text-gray-500">
            Take a photo or select from gallery
          </Text>
        </View>
      )}

      <View className="mb-4 flex-row space-x-3">
        <TouchableOpacity
          className="flex-1 flex-row items-center justify-center rounded-lg bg-blue-500 py-3"
          onPress={takePhoto}
        >
          <Ionicons color="white" name="camera" size={20} />
          <Text className="ml-2 font-medium text-white">Take Photo</Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="flex-1 flex-row items-center justify-center rounded-lg bg-gray-500 py-3"
          onPress={selectImage}
        >
          <Ionicons color="white" name="images" size={20} />
          <Text className="ml-2 font-medium text-white">Gallery</Text>
        </TouchableOpacity>
      </View>

      {location && (
        <View className="mb-4 rounded-lg bg-green-50 p-3 dark:bg-green-900/20">
          <View className="flex-row items-center">
            <Ionicons color="#10b981" name="location" size={16} />
            <Text className="ml-2 text-green-700 text-sm dark:text-green-300">
              Location: {location.coords.latitude.toFixed(6)},{" "}
              {location.coords.longitude.toFixed(6)}
            </Text>
          </View>
          <Text className="mt-1 text-green-600 text-xs dark:text-green-400">
            Accuracy: ±{Math.round(location.coords.accuracy || 0)}m
          </Text>
        </View>
      )}

      <TouchableOpacity
        className={`rounded-lg py-3 ${
          !(selectedImage && location) || isSubmitting
            ? "bg-gray-300 dark:bg-gray-600"
            : "bg-green-500"
        }`}
        disabled={!(selectedImage && location) || isSubmitting}
        onPress={submitVerification}
      >
        <Text className="text-center font-bold text-white">
          {isSubmitting ? "Submitting..." : "Submit Verification"}
        </Text>
      </TouchableOpacity>
    </MotiView>
  );

  const renderVerificationHistory = () => (
    <View className="mx-4 mb-4 rounded-xl bg-white p-4 dark:bg-gray-800">
      <Text className="mb-4 font-bold text-gray-900 dark:text-white">
        🔍 Recent Verifications
      </Text>

      {verifications.map((verification, index) => (
        <MotiView
          animate={{ opacity: 1, translateX: 0 }}
          className="mb-4 last:mb-0"
          from={{ opacity: 0, translateX: 20 }}
          key={verification.id}
          transition={{ type: "timing", duration: 500, delay: index * 100 }}
        >
          <View className="flex-row">
            <Image
              className="mr-3 h-16 w-16 rounded-lg"
              resizeMode="cover"
              source={{ uri: verification.photoUri }}
            />

            <View className="flex-1">
              <View className="mb-1 flex-row items-center justify-between">
                <Text className="font-medium text-gray-900 text-sm dark:text-white">
                  {verification.submittedBy}
                </Text>
                <View className="flex-row items-center">
                  <Ionicons
                    color={getVerificationStatusColor(
                      verification.verificationStatus
                    )}
                    name={
                      getVerificationStatusIcon(
                        verification.verificationStatus
                      ) as any
                    }
                    size={16}
                  />
                  <Text
                    className="ml-1 font-medium text-xs capitalize"
                    style={{
                      color: getVerificationStatusColor(
                        verification.verificationStatus
                      ),
                    }}
                  >
                    {verification.verificationStatus}
                  </Text>
                </View>
              </View>

              <Text className="mb-1 text-gray-600 text-xs dark:text-gray-400">
                {verification.verificationNotes}
              </Text>

              <View className="flex-row items-center">
                <Ionicons color="#6b7280" name="location" size={12} />
                <Text className="ml-1 text-gray-500 text-xs">
                  {verification.location.latitude.toFixed(4)},{" "}
                  {verification.location.longitude.toFixed(4)}
                </Text>
                <Text className="ml-2 text-gray-500 text-xs">
                  {new Date(verification.submittedAt).toLocaleDateString()}
                </Text>
              </View>
            </View>
          </View>
        </MotiView>
      ))}

      {verifications.length === 0 && (
        <View className="items-center py-8">
          <Ionicons color="#9ca3af" name="camera-outline" size={48} />
          <Text className="mt-2 text-center text-gray-500">
            No verifications yet. Be the first to contribute!
          </Text>
        </View>
      )}
    </View>
  );

  const renderVerificationGuidelines = () => (
    <View className="mx-4 mb-4 rounded-xl bg-blue-50 p-4 dark:bg-blue-900/20">
      <Text className="mb-3 font-bold text-blue-800 dark:text-blue-200">
        📋 Verification Guidelines
      </Text>

      <View className="space-y-2">
        <Text className="text-blue-700 text-sm dark:text-blue-300">
          • Take clear photos showing current progress
        </Text>
        <Text className="text-blue-700 text-sm dark:text-blue-300">
          • Ensure GPS location is enabled for accuracy
        </Text>
        <Text className="text-blue-700 text-sm dark:text-blue-300">
          • Include timestamps and relevant landmarks
        </Text>
        <Text className="text-blue-700 text-sm dark:text-blue-300">
          • Be objective and factual in observations
        </Text>
        <Text className="text-blue-700 text-sm dark:text-blue-300">
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
