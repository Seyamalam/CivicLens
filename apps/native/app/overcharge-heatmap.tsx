import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
// Using View-based implementation instead of SVG for better compatibility
import { useDatabase, useLocalDatabase } from '@/contexts/database-context';
import { OverchargeReportService, HeatmapData } from '@/lib/overcharge-service';
import { TABLES } from '@/lib/database';

const { width: screenWidth } = Dimensions.get('window');
const mapWidth = screenWidth - 32;
const mapHeight = mapWidth * 0.8;

interface DistrictHeatmapData {
  district: string;
  reportCount: number;
  totalOvercharge: number;
  averageOvercharge: number;
  riskLevel: 'low' | 'medium' | 'high';
  position: { x: number; y: number }; // Approximate position on Bangladesh map
}

// Simplified Bangladesh district positions (approximate coordinates normalized to map size)
const DISTRICT_POSITIONS: Record<string, { x: number; y: number }> = {
  // Major cities and divisions
  'Dhaka': { x: mapWidth * 0.45, y: mapHeight * 0.4 },
  'Chittagong': { x: mapWidth * 0.7, y: mapHeight * 0.55 },
  'Rajshahi': { x: mapWidth * 0.25, y: mapHeight * 0.3 },
  'Khulna': { x: mapWidth * 0.3, y: mapHeight * 0.6 },
  'Barisal': { x: mapWidth * 0.4, y: mapHeight * 0.7 },
  'Sylhet': { x: mapWidth * 0.7, y: mapHeight * 0.25 },
  'Rangpur': { x: mapWidth * 0.35, y: mapHeight * 0.15 },
  'Mymensingh': { x: mapWidth * 0.5, y: mapHeight * 0.3 },
  
  // Additional districts
  'Comilla': { x: mapWidth * 0.55, y: mapHeight * 0.45 },
  'Feni': { x: mapWidth * 0.65, y: mapHeight * 0.5 },
  'Noakhali': { x: mapWidth * 0.6, y: mapHeight * 0.6 },
  'Cox\'s Bazar': { x: mapWidth * 0.8, y: mapHeight * 0.75 },
  'Jessore': { x: mapWidth * 0.25, y: mapHeight * 0.55 },
  'Bogura': { x: mapWidth * 0.3, y: mapHeight * 0.25 },
  'Dinajpur': { x: mapWidth * 0.25, y: mapHeight * 0.2 },
  'Tangail': { x: mapWidth * 0.4, y: mapHeight * 0.35 },
  'Faridpur': { x: mapWidth * 0.35, y: mapHeight * 0.5 },
  'Patuakhali': { x: mapWidth * 0.35, y: mapHeight * 0.75 },
  'Kushtia': { x: mapWidth * 0.2, y: mapHeight * 0.45 }
};

export default function OverchargeHeatmapScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { isInitialized } = useDatabase();
  
  const [heatmapData, setHeatmapData] = useState<DistrictHeatmapData[]>([]);
  const [selectedDistrict, setSelectedDistrict] = useState<DistrictHeatmapData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'reports' | 'amount'>('reports');
  const [stats, setStats] = useState({
    totalReports: 0,
    totalAmount: 0,
    affectedDistricts: 0,
    highRiskDistricts: 0
  });

  const isEnglish = i18n.language === 'en';
  const overchargeService = OverchargeReportService.getInstance();

  useEffect(() => {
    if (isInitialized) {
      loadHeatmapData();
    }
  }, [isInitialized]);

  const loadHeatmapData = async () => {
    try {
      setIsLoading(true);
      const db = useLocalDatabase();
      
      // Get district-level statistics
      const districtStats = await db.getAllAsync<{
        district: string;
        reportCount: number;
        totalOvercharge: number;
        averageOvercharge: number;
      }>(`
        SELECT 
          district,
          COUNT(*) as reportCount,
          SUM(overcharge_amount) as totalOvercharge,
          AVG(overcharge_amount) as averageOvercharge
        FROM ${TABLES.OVERCHARGE_REPORTS}
        GROUP BY district
        ORDER BY reportCount DESC
      `);

      // Process data for heatmap
      const processedData: DistrictHeatmapData[] = districtStats.map(stat => {
        // Calculate risk level based on report frequency and average overcharge
        const reportWeight = Math.min(stat.reportCount / 5, 1);
        const overchargeWeight = Math.min(stat.averageOvercharge / 2000, 1);
        const riskScore = (reportWeight + overchargeWeight) / 2;
        
        let riskLevel: 'low' | 'medium' | 'high' = 'low';
        if (riskScore >= 0.7) riskLevel = 'high';
        else if (riskScore >= 0.4) riskLevel = 'medium';
        
        return {
          district: stat.district,
          reportCount: stat.reportCount,
          totalOvercharge: stat.totalOvercharge,
          averageOvercharge: stat.averageOvercharge,
          riskLevel,
          position: DISTRICT_POSITIONS[stat.district] || { x: mapWidth / 2, y: mapHeight / 2 }
        };
      });

      setHeatmapData(processedData);
      
      // Calculate overall statistics
      const totalReports = districtStats.reduce((sum, stat) => sum + stat.reportCount, 0);
      const totalAmount = districtStats.reduce((sum, stat) => sum + stat.totalOvercharge, 0);
      const affectedDistricts = districtStats.length;
      const highRiskDistricts = processedData.filter(d => d.riskLevel === 'high').length;
      
      setStats({
        totalReports,
        totalAmount,
        affectedDistricts,
        highRiskDistricts
      });
      
    } catch (error) {
      console.error('Failed to load heatmap data:', error);
      Alert.alert('Error', 'Failed to load heatmap data');
    } finally {
      setIsLoading(false);
    }
  };

  const getRiskColor = (riskLevel: 'low' | 'medium' | 'high'): string => {
    switch (riskLevel) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#10b981';
    }
  };

  const getCircleRadius = (data: DistrictHeatmapData): number => {
    const baseRadius = 8;
    const maxRadius = 25;
    
    if (viewMode === 'reports') {
      const maxReports = Math.max(...heatmapData.map(d => d.reportCount));
      return baseRadius + (data.reportCount / maxReports) * (maxRadius - baseRadius);
    } else {
      const maxAmount = Math.max(...heatmapData.map(d => d.totalOvercharge));
      return baseRadius + (data.totalOvercharge / maxAmount) * (maxRadius - baseRadius);
    }
  };

  const formatAmount = (amount: number): string => {
    if (amount >= 100000) {
      return `৳${(amount / 100000).toFixed(1)}L`;
    } else if (amount >= 1000) {
      return `৳${(amount / 1000).toFixed(1)}K`;
    }
    return `৳${amount}`;
  };

  const renderBangladeshGrid = () => {
    // Create a grid-based representation of Bangladesh districts
    const gridSize = 6;
    const cellSize = (mapWidth - 40) / gridSize;
    
    return (
      <View className="bg-gray-100 dark:bg-gray-700 rounded-xl p-4" style={{ height: mapHeight }}>
        <Text className="text-center text-gray-600 dark:text-gray-400 text-sm mb-4">
          Bangladesh Districts - Overcharge Distribution
        </Text>
        
        <View className="flex-row flex-wrap justify-center">
          {heatmapData.map((district, index) => {
            const radius = getCircleRadius(district);
            return (
              <TouchableOpacity
                key={district.district}
                onPress={() => setSelectedDistrict(district)}
                className="m-1 rounded-full items-center justify-center"
                style={{
                  width: radius * 2,
                  height: radius * 2,
                  backgroundColor: getRiskColor(district.riskLevel),
                  opacity: 0.8
                }}
              >
                <Text className="text-white text-xs font-bold" numberOfLines={1}>
                  {district.district.slice(0, 3)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        
        <Text className="text-center text-gray-500 dark:text-gray-400 text-xs mt-4">
          Tap on districts to view details
        </Text>
      </View>
    );
  };

  const renderLegend = () => (
    <View className="bg-white dark:bg-gray-800 rounded-xl p-4 mt-4">
      <Text className="font-bold text-gray-900 dark:text-white mb-3">
        Risk Level Legend
      </Text>
      
      <View className="space-y-2">
        {[
          { level: 'high', label: 'High Risk', color: '#ef4444' },
          { level: 'medium', label: 'Medium Risk', color: '#f59e0b' },
          { level: 'low', label: 'Low Risk', color: '#10b981' }
        ].map((item) => (
          <View key={item.level} className="flex-row items-center">
            <View 
              className="w-4 h-4 rounded-full mr-3"
              style={{ backgroundColor: item.color }}
            />
            <Text className="text-gray-700 dark:text-gray-300">
              {item.label}
            </Text>
          </View>
        ))}
      </View>
      
      <Text className="text-xs text-gray-500 dark:text-gray-400 mt-3">
        Circle size represents {viewMode === 'reports' ? 'number of reports' : 'total overcharge amount'}
      </Text>
    </View>
  );

  if (!isInitialized || isLoading) {
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
      <View className="bg-white dark:bg-gray-800 px-4 py-6 border-b border-gray-200 dark:border-gray-700">
        <View className="flex-row items-center mb-4">
          <TouchableOpacity 
            onPress={() => router.back()}
            className="mr-4"
          >
            <Ionicons name="arrow-back" size={24} color="#6b7280" />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-xl font-bold text-gray-900 dark:text-white">
              Overcharge Heatmap
            </Text>
            <Text className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Geographic distribution of overcharge reports
            </Text>
          </View>
        </View>
        
        {/* Statistics */}
        <View className="flex-row justify-between">
          <View className="items-center">
            <Text className="text-lg font-bold text-gray-900 dark:text-white">
              {stats.totalReports}
            </Text>
            <Text className="text-xs text-gray-600 dark:text-gray-400">
              Total Reports
            </Text>
          </View>
          
          <View className="items-center">
            <Text className="text-lg font-bold text-red-600">
              {formatAmount(stats.totalAmount)}
            </Text>
            <Text className="text-xs text-gray-600 dark:text-gray-400">
              Total Overcharge
            </Text>
          </View>
          
          <View className="items-center">
            <Text className="text-lg font-bold text-orange-600">
              {stats.affectedDistricts}
            </Text>
            <Text className="text-xs text-gray-600 dark:text-gray-400">
              Affected Districts
            </Text>
          </View>
          
          <View className="items-center">
            <Text className="text-lg font-bold text-red-600">
              {stats.highRiskDistricts}
            </Text>
            <Text className="text-xs text-gray-600 dark:text-gray-400">
              High Risk
            </Text>
          </View>
        </View>
      </View>

      <ScrollView className="flex-1">
        <View className="p-4">
          {/* View Mode Toggle */}
          <View className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-4">
            <Text className="font-bold text-gray-900 dark:text-white mb-3">
              Display Mode
            </Text>
            
            <View className="flex-row">
              {[
                { key: 'reports', label: 'Report Count', icon: 'document-text' },
                { key: 'amount', label: 'Overcharge Amount', icon: 'cash' }
              ].map((mode) => (
                <TouchableOpacity
                  key={mode.key}
                  onPress={() => setViewMode(mode.key as any)}
                  className={`flex-1 flex-row items-center justify-center py-3 mx-1 rounded-lg ${
                    viewMode === mode.key 
                      ? 'bg-primary-500' 
                      : 'bg-gray-100 dark:bg-gray-700'
                  }`}
                >
                  <Ionicons 
                    name={mode.icon as any} 
                    size={16} 
                    color={viewMode === mode.key ? 'white' : '#6b7280'} 
                  />
                  <Text className={`ml-2 text-sm font-medium ${
                    viewMode === mode.key 
                      ? 'text-white' 
                      : 'text-gray-700 dark:text-gray-300'
                  }`}>
                    {mode.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Heatmap */}
          <MotiView
            from={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'timing', duration: 500 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-4"
          >
            <Text className="font-bold text-gray-900 dark:text-white mb-3">
              Bangladesh Overcharge Distribution
            </Text>
            
            <View style={{ height: mapHeight + 40 }}>
              {renderBangladeshGrid()}
            </View>
          </MotiView>

          {/* Legend */}
          {renderLegend()}

          {/* Selected District Details */}
          {selectedDistrict && (
            <MotiView
              from={{ opacity: 0, translateY: 20 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'timing', duration: 300 }}
              className="bg-white dark:bg-gray-800 rounded-xl p-4 mt-4"
            >
              <View className="flex-row justify-between items-center mb-3">
                <Text className="text-lg font-bold text-gray-900 dark:text-white">
                  {selectedDistrict.district} District
                </Text>
                <TouchableOpacity 
                  onPress={() => setSelectedDistrict(null)}
                  className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 items-center justify-center"
                >
                  <Ionicons name="close" size={16} color="#6b7280" />
                </TouchableOpacity>
              </View>
              
              <View className="space-y-3">
                <View className="flex-row justify-between">
                  <Text className="text-gray-600 dark:text-gray-400">
                    Risk Level
                  </Text>
                  <View className="flex-row items-center">
                    <View 
                      className="w-3 h-3 rounded-full mr-2"
                      style={{ backgroundColor: getRiskColor(selectedDistrict.riskLevel) }}
                    />
                    <Text 
                      className="font-medium capitalize"
                      style={{ color: getRiskColor(selectedDistrict.riskLevel) }}
                    >
                      {selectedDistrict.riskLevel}
                    </Text>
                  </View>
                </View>
                
                <View className="flex-row justify-between">
                  <Text className="text-gray-600 dark:text-gray-400">
                    Total Reports
                  </Text>
                  <Text className="font-bold text-gray-900 dark:text-white">
                    {selectedDistrict.reportCount}
                  </Text>
                </View>
                
                <View className="flex-row justify-between">
                  <Text className="text-gray-600 dark:text-gray-400">
                    Total Overcharge
                  </Text>
                  <Text className="font-bold text-red-600">
                    {formatAmount(selectedDistrict.totalOvercharge)}
                  </Text>
                </View>
                
                <View className="flex-row justify-between">
                  <Text className="text-gray-600 dark:text-gray-400">
                    Average Overcharge
                  </Text>
                  <Text className="font-bold text-orange-600">
                    {formatAmount(selectedDistrict.averageOvercharge)}
                  </Text>
                </View>
              </View>
              
              <TouchableOpacity
                onPress={() => {
                  router.push(`/district-reports?district=${selectedDistrict.district}`);
                }}
                className="mt-4 bg-primary-500 rounded-lg p-3 items-center"
              >
                <Text className="text-white font-medium">
                  View Detailed Reports
                </Text>
              </TouchableOpacity>
            </MotiView>
          )}

          {/* District Ranking */}
          <View className="bg-white dark:bg-gray-800 rounded-xl p-4 mt-4">
            <Text className="font-bold text-gray-900 dark:text-white mb-3">
              Most Affected Districts
            </Text>
            
            {heatmapData.slice(0, 5).map((district, index) => (
              <TouchableOpacity
                key={district.district}
                onPress={() => setSelectedDistrict(district)}
                className="flex-row items-center justify-between p-3 border-b border-gray-100 dark:border-gray-700 last:border-b-0"
              >
                <View className="flex-row items-center flex-1">
                  <View className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 items-center justify-center mr-3">
                    <Text className="text-xs font-bold text-gray-600 dark:text-gray-400">
                      {index + 1}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text className="font-medium text-gray-900 dark:text-white">
                      {district.district}
                    </Text>
                    <Text className="text-sm text-gray-600 dark:text-gray-400">
                      {district.reportCount} reports
                    </Text>
                  </View>
                </View>
                
                <View className="items-end">
                  <Text className="font-bold text-red-600">
                    {formatAmount(district.totalOvercharge)}
                  </Text>
                  <View 
                    className="w-3 h-3 rounded-full mt-1"
                    style={{ backgroundColor: getRiskColor(district.riskLevel) }}
                  />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}