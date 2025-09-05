import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';

interface MapProject {
  id: string;
  name: string;
  budget: number;
  spent: number;
  latitude: number;
  longitude: number;
  status: string;
  district: string;
  completion: number;
}

interface DistrictData {
  name: string;
  totalBudget: number;
  totalSpent: number;
  projectCount: number;
  utilizationRate: number;
  coordinates: { lat: number; lng: number };
}

const BANGLADESH_DISTRICTS: DistrictData[] = [
  {
    name: 'Dhaka',
    totalBudget: 15750000000,
    totalSpent: 8725000000,
    projectCount: 12,
    utilizationRate: 55.4,
    coordinates: { lat: 23.8103, lng: 90.4125 }
  },
  {
    name: 'Chittagong',
    totalBudget: 8500000000,
    totalSpent: 6800000000,
    projectCount: 8,
    utilizationRate: 80.0,
    coordinates: { lat: 22.3569, lng: 91.7832 }
  },
  {
    name: 'Sylhet',
    totalBudget: 3250000000,
    totalSpent: 1625000000,
    projectCount: 5,
    utilizationRate: 50.0,
    coordinates: { lat: 24.8949, lng: 91.8687 }
  },
  {
    name: 'Rajshahi',
    totalBudget: 4750000000,
    totalSpent: 2850000000,
    projectCount: 7,
    utilizationRate: 60.0,
    coordinates: { lat: 24.3745, lng: 88.6042 }
  },
  {
    name: 'Khulna',
    totalBudget: 3800000000,
    totalSpent: 2660000000,
    projectCount: 6,
    utilizationRate: 70.0,
    coordinates: { lat: 22.8456, lng: 89.5403 }
  },
  {
    name: 'Barisal',
    totalBudget: 2200000000,
    totalSpent: 1540000000,
    projectCount: 4,
    utilizationRate: 70.0,
    coordinates: { lat: 22.7010, lng: 90.3535 }
  }
];

export default function BudgetMapScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  
  const [selectedDistrict, setSelectedDistrict] = useState<DistrictData | null>(null);
  const [mapProjects, setMapProjects] = useState<MapProject[]>([]);
  const [viewMode, setViewMode] = useState<'budget' | 'utilization' | 'projects'>('budget');

  const screenWidth = Dimensions.get('window').width;
  const isEnglish = i18n.language === 'en';

  useEffect(() => {
    loadMapData();
  }, []);

  const loadMapData = () => {
    // Mock project data for map visualization
    const mockProjects: MapProject[] = [
      {
        id: 'proj_001',
        name: 'Metro Rail Extension',
        budget: 15000000000,
        spent: 8500000000,
        latitude: 23.8103,
        longitude: 90.4125,
        status: 'ongoing',
        district: 'Dhaka',
        completion: 56
      },
      {
        id: 'proj_002',
        name: 'Port Development',
        budget: 5000000000,
        spent: 4000000000,
        latitude: 22.3569,
        longitude: 91.7832,
        status: 'ongoing',
        district: 'Chittagong',
        completion: 80
      }
    ];
    
    setMapProjects(mockProjects);
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 10000000) {
      return `৳${(amount / 10000000).toFixed(1)}Cr`;
    } else if (amount >= 100000) {
      return `৳${(amount / 100000).toFixed(1)}L`;
    } else {
      return `৳${amount.toLocaleString()}`;
    }
  };

  const getUtilizationColor = (rate: number) => {
    if (rate >= 80) return '#10b981'; // Green
    if (rate >= 60) return '#f59e0b'; // Orange
    if (rate >= 40) return '#ef4444'; // Red
    return '#6b7280'; // Gray
  };

  const getBudgetSize = (budget: number, maxBudget: number) => {
    const ratio = budget / maxBudget;
    return Math.max(30, Math.min(80, ratio * 80));
  };

  const renderMapLegend = () => (
    <View className="bg-white dark:bg-gray-800 rounded-xl p-4 mx-4 mb-4">
      <Text className="font-bold text-gray-900 dark:text-white mb-3">
        📍 Map Legend
      </Text>
      
      <View className="space-y-2">
        {viewMode === 'budget' && (
          <>
            <View className="flex-row items-center">
              <View className="w-4 h-4 rounded-full bg-blue-500 mr-2" />
              <Text className="text-gray-700 dark:text-gray-300 text-sm">
                Circle size = Budget amount
              </Text>
            </View>
            <Text className="text-gray-500 text-xs ml-6">
              Larger circles indicate higher budget allocations
            </Text>
          </>
        )}
        
        {viewMode === 'utilization' && (
          <>
            <View className="flex-row items-center">
              <View className="w-4 h-4 rounded-full bg-green-500 mr-2" />
              <Text className="text-gray-700 dark:text-gray-300 text-sm">80%+ Utilization</Text>
            </View>
            <View className="flex-row items-center">
              <View className="w-4 h-4 rounded-full bg-orange-500 mr-2" />
              <Text className="text-gray-700 dark:text-gray-300 text-sm">60-79% Utilization</Text>
            </View>
            <View className="flex-row items-center">
              <View className="w-4 h-4 rounded-full bg-red-500 mr-2" />
              <Text className="text-gray-700 dark:text-gray-300 text-sm">40-59% Utilization</Text>
            </View>
            <View className="flex-row items-center">
              <View className="w-4 h-4 rounded-full bg-gray-500 mr-2" />
              <Text className="text-gray-700 dark:text-gray-300 text-sm">&lt;40% Utilization</Text>
            </View>
          </>
        )}
        
        {viewMode === 'projects' && (
          <>
            <View className="flex-row items-center">
              <View className="w-4 h-4 rounded-full bg-blue-500 mr-2" />
              <Text className="text-gray-700 dark:text-gray-300 text-sm">
                Project locations
              </Text>
            </View>
            <Text className="text-gray-500 text-xs ml-6">
              Tap districts to see project details
            </Text>
          </>
        )}
      </View>
    </View>
  );

  const renderViewModeSelector = () => (
    <View className="bg-white dark:bg-gray-800 rounded-xl mx-4 mb-4 p-1">
      <View className="flex-row">
        {[
          { key: 'budget', label: 'Budget', icon: 'cash' },
          { key: 'utilization', label: 'Utilization', icon: 'pie-chart' },
          { key: 'projects', label: 'Projects', icon: 'business' }
        ].map((mode) => (
          <TouchableOpacity
            key={mode.key}
            onPress={() => setViewMode(mode.key as any)}
            className={`flex-1 py-3 items-center rounded-lg ${
              viewMode === mode.key 
                ? 'bg-green-500' 
                : 'bg-transparent'
            }`}
          >
            <Ionicons 
              name={mode.icon as any} 
              size={20} 
              color={viewMode === mode.key ? 'white' : '#6b7280'} 
            />
            <Text className={`text-sm mt-1 ${
              viewMode === mode.key 
                ? 'text-white font-medium' 
                : 'text-gray-600 dark:text-gray-400'
            }`}>
              {mode.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderSimpleMap = () => {
    const maxBudget = Math.max(...BANGLADESH_DISTRICTS.map(d => d.totalBudget));
    
    return (
      <View className="bg-white dark:bg-gray-800 rounded-xl mx-4 mb-4 p-4">
        <Text className="font-bold text-gray-900 dark:text-white mb-4">
          🗺️ Bangladesh Budget Map
        </Text>
        
        {/* Simplified map representation */}
        <View className="bg-gray-100 dark:bg-gray-700 rounded-lg p-6 min-h-[300px] relative">
          {BANGLADESH_DISTRICTS.map((district, index) => {
            const size = viewMode === 'budget' 
              ? getBudgetSize(district.totalBudget, maxBudget)
              : 40;
            
            const color = viewMode === 'utilization' 
              ? getUtilizationColor(district.utilizationRate)
              : '#3b82f6';
            
            // Simplified positioning based on relative coordinates
            const left = ((district.coordinates.lng - 88) / (92 - 88)) * 100;
            const top = ((25 - district.coordinates.lat) / (25 - 22)) * 100;
            
            return (
              <TouchableOpacity
                key={district.name}
                onPress={() => setSelectedDistrict(district)}
                className="absolute items-center"
                style={{
                  left: `${Math.max(5, Math.min(85, left))}%`,
                  top: `${Math.max(5, Math.min(85, top))}%`,
                  transform: [{ translateX: -size/2 }, { translateY: -size/2 }]
                }}
              >
                <View
                  className="rounded-full items-center justify-center border-2 border-white"
                  style={{
                    width: size,
                    height: size,
                    backgroundColor: color
                  }}
                >
                  {size >= 40 && (
                    <Text className="text-white text-xs font-bold">
                      {district.name.substring(0, 3)}
                    </Text>
                  )}
                </View>
                
                <View className="bg-black/70 rounded px-2 py-1 mt-1">
                  <Text className="text-white text-xs font-medium">
                    {district.name}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
        
        <Text className="text-gray-500 text-xs text-center mt-2">
          Interactive map visualization of budget allocation across Bangladesh
        </Text>
      </View>
    );
  };

  const renderDistrictDetails = () => {
    if (!selectedDistrict) return null;
    
    return (
      <MotiView
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 500 }}
        className="bg-white dark:bg-gray-800 rounded-xl mx-4 mb-4 p-4"
      >
        <View className="flex-row items-center justify-between mb-3">
          <Text className="font-bold text-gray-900 dark:text-white text-lg">
            📊 {selectedDistrict.name} District
          </Text>
          <TouchableOpacity
            onPress={() => setSelectedDistrict(null)}
          >
            <Ionicons name="close" size={24} color="#6b7280" />
          </TouchableOpacity>
        </View>
        
        <View className="space-y-3">
          <View className="flex-row justify-between">
            <Text className="text-gray-600 dark:text-gray-400">Total Budget:</Text>
            <Text className="text-gray-900 dark:text-white font-bold">
              {formatCurrency(selectedDistrict.totalBudget)}
            </Text>
          </View>
          
          <View className="flex-row justify-between">
            <Text className="text-gray-600 dark:text-gray-400">Amount Spent:</Text>
            <Text className="text-blue-600 font-bold">
              {formatCurrency(selectedDistrict.totalSpent)}
            </Text>
          </View>
          
          <View className="flex-row justify-between">
            <Text className="text-gray-600 dark:text-gray-400">Projects:</Text>
            <Text className="text-gray-900 dark:text-white font-bold">
              {selectedDistrict.projectCount}
            </Text>
          </View>
          
          <View className="flex-row justify-between">
            <Text className="text-gray-600 dark:text-gray-400">Utilization Rate:</Text>
            <Text 
              className="font-bold"
              style={{ color: getUtilizationColor(selectedDistrict.utilizationRate) }}
            >
              {selectedDistrict.utilizationRate}%
            </Text>
          </View>
          
          {/* Utilization Bar */}
          <View className="mt-2">
            <Text className="text-gray-600 dark:text-gray-400 text-sm mb-1">
              Budget Utilization Progress
            </Text>
            <View className="h-3 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
              <View 
                className="h-full rounded-full"
                style={{ 
                  width: `${selectedDistrict.utilizationRate}%`,
                  backgroundColor: getUtilizationColor(selectedDistrict.utilizationRate)
                }}
              />
            </View>
          </View>
        </View>
        
        <TouchableOpacity
          onPress={() => router.push(`/district-projects?district=${selectedDistrict.name}`)}
          className="mt-4 bg-green-500 py-3 rounded-lg"
        >
          <Text className="text-white text-center font-bold">
            View All Projects in {selectedDistrict.name}
          </Text>
        </TouchableOpacity>
      </MotiView>
    );
  };

  const renderDistrictList = () => (
    <View className="bg-white dark:bg-gray-800 rounded-xl mx-4 mb-4 p-4">
      <Text className="font-bold text-gray-900 dark:text-white mb-4">
        📋 District Summary
      </Text>
      
      {BANGLADESH_DISTRICTS.map((district, index) => (
        <TouchableOpacity
          key={district.name}
          onPress={() => setSelectedDistrict(district)}
          className="flex-row items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700 last:border-b-0"
        >
          <View className="flex-1">
            <Text className="font-medium text-gray-900 dark:text-white">
              {district.name}
            </Text>
            <Text className="text-gray-600 dark:text-gray-400 text-sm">
              {district.projectCount} projects • {formatCurrency(district.totalBudget)}
            </Text>
          </View>
          
          <View className="items-end">
            <Text 
              className="font-bold text-sm"
              style={{ color: getUtilizationColor(district.utilizationRate) }}
            >
              {district.utilizationRate}%
            </Text>
            <View className="w-16 h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden mt-1">
              <View 
                className="h-full rounded-full"
                style={{ 
                  width: `${district.utilizationRate}%`,
                  backgroundColor: getUtilizationColor(district.utilizationRate)
                }}
              />
            </View>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <View className="bg-gradient-to-r from-green-600 to-blue-600 px-4 py-6">
        <View className="flex-row items-center">
          <TouchableOpacity 
            onPress={() => router.back()}
            className="mr-4"
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-white text-xl font-bold">
              Budget Map
            </Text>
            <Text className="text-white/80 text-sm mt-1">
              Geographic budget visualization across Bangladesh
            </Text>
          </View>
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* View Mode Selector */}
        {renderViewModeSelector()}
        
        {/* Map Legend */}
        {renderMapLegend()}
        
        {/* Map Visualization */}
        {renderSimpleMap()}
        
        {/* District Details (if selected) */}
        {renderDistrictDetails()}
        
        {/* District List */}
        {renderDistrictList()}
      </ScrollView>
    </View>
  );
}