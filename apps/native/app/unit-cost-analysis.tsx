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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';

interface UnitCostData {
  item: string;
  unit: string;
  currentCost: number;
  benchmarkCost: number;
  deviation: number;
  category: string;
  lastUpdated: string;
}

interface ProjectComparison {
  projectId: string;
  projectName: string;
  totalCost: number;
  unitCosts: UnitCostData[];
  overallEfficiency: number;
  flaggedItems: number;
}

interface BenchmarkData {
  category: string;
  nationalAverage: number;
  regionalAverage: number;
  internationalBenchmark: number;
  variation: number;
}

const CONSTRUCTION_CATEGORIES = [
  { id: 'all', name: 'All Categories', icon: 'list' },
  { id: 'roads', name: 'Roads & Highways', icon: 'car' },
  { id: 'buildings', name: 'Buildings', icon: 'business' },
  { id: 'bridges', name: 'Bridges', icon: 'bridge' },
  { id: 'utilities', name: 'Utilities', icon: 'flash' },
  { id: 'drainage', name: 'Drainage', icon: 'water' }
];

export default function UnitCostAnalysisScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [unitCosts, setUnitCosts] = useState<UnitCostData[]>([]);
  const [projectComparisons, setProjectComparisons] = useState<ProjectComparison[]>([]);
  const [benchmarks, setBenchmarks] = useState<BenchmarkData[]>([]);
  const [loading, setLoading] = useState(true);

  const isEnglish = i18n.language === 'en';
  const projectId = params.projectId as string;

  useEffect(() => {
    loadCostAnalysisData();
  }, [selectedCategory, projectId]);

  const loadCostAnalysisData = () => {
    // Mock unit cost data
    const mockUnitCosts: UnitCostData[] = [
      {
        item: 'Concrete (M25)',
        unit: 'per cubic meter',
        currentCost: 8500,
        benchmarkCost: 7200,
        deviation: 18.1,
        category: 'buildings',
        lastUpdated: '2024-02-15'
      },
      {
        item: 'Steel Reinforcement',
        unit: 'per kg',
        currentCost: 95,
        benchmarkCost: 88,
        deviation: 8.0,
        category: 'buildings',
        lastUpdated: '2024-02-15'
      },
      {
        item: 'Bituminous Road',
        unit: 'per sq meter',
        currentCost: 450,
        benchmarkCost: 420,
        deviation: 7.1,
        category: 'roads',
        lastUpdated: '2024-02-14'
      },
      {
        item: 'Brick Work',
        unit: 'per sq meter',
        currentCost: 320,
        benchmarkCost: 350,
        deviation: -8.6,
        category: 'buildings',
        lastUpdated: '2024-02-14'
      },
      {
        item: 'Excavation',
        unit: 'per cubic meter',
        currentCost: 180,
        benchmarkCost: 165,
        deviation: 9.1,
        category: 'all',
        lastUpdated: '2024-02-13'
      }
    ];

    // Filter by category
    const filteredCosts = selectedCategory === 'all' 
      ? mockUnitCosts 
      : mockUnitCosts.filter(cost => cost.category === selectedCategory || cost.category === 'all');

    setUnitCosts(filteredCosts);

    // Mock project comparisons
    const mockComparisons: ProjectComparison[] = [
      {
        projectId: 'proj_001',
        projectName: 'Metro Rail Extension',
        totalCost: 15000000000,
        unitCosts: mockUnitCosts.slice(0, 3),
        overallEfficiency: 78,
        flaggedItems: 2
      },
      {
        projectId: 'proj_002',
        projectName: 'Highway Construction',
        totalCost: 5000000000,
        unitCosts: mockUnitCosts.slice(2, 5),
        overallEfficiency: 85,
        flaggedItems: 1
      }
    ];

    setProjectComparisons(mockComparisons);

    // Mock benchmark data
    const mockBenchmarks: BenchmarkData[] = [
      {
        category: 'Concrete Work',
        nationalAverage: 7200,
        regionalAverage: 7500,
        internationalBenchmark: 6800,
        variation: 12.5
      },
      {
        category: 'Steel Work',
        nationalAverage: 88,
        regionalAverage: 92,
        internationalBenchmark: 85,
        variation: 8.2
      },
      {
        category: 'Road Construction',
        nationalAverage: 420,
        regionalAverage: 445,
        internationalBenchmark: 380,
        variation: 17.1
      }
    ];

    setBenchmarks(mockBenchmarks);
    setLoading(false);
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

  const getDeviationColor = (deviation: number) => {
    if (deviation > 15) return '#ef4444'; // Red - High overrun
    if (deviation > 5) return '#f59e0b'; // Orange - Moderate overrun
    if (deviation < -5) return '#10b981'; // Green - Under budget
    return '#6b7280'; // Gray - Within range
  };

  const getEfficiencyColor = (efficiency: number) => {
    if (efficiency >= 85) return '#10b981'; // Green
    if (efficiency >= 70) return '#f59e0b'; // Orange
    return '#ef4444'; // Red
  };

  const renderCategoryFilter = () => (
    <View className="px-4 mb-4">
      <Text className="text-gray-900 dark:text-white font-bold mb-3">
        🏗️ Construction Categories
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View className="flex-row space-x-3">
          {CONSTRUCTION_CATEGORIES.map((category) => (
            <TouchableOpacity
              key={category.id}
              onPress={() => setSelectedCategory(category.id)}
              className={`px-4 py-2 rounded-xl flex-row items-center ${
                selectedCategory === category.id
                  ? 'bg-green-500'
                  : 'bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600'
              }`}
            >
              <Ionicons 
                name={category.icon as any} 
                size={16} 
                color={selectedCategory === category.id ? 'white' : '#6b7280'} 
              />
              <Text className={`ml-2 ${
                selectedCategory === category.id
                  ? 'text-white'
                  : 'text-gray-700 dark:text-gray-300'
              }`}>
                {category.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );

  const renderUnitCostAnalysis = () => (
    <View className="bg-white dark:bg-gray-800 rounded-xl mx-4 mb-4 p-4">
      <Text className="font-bold text-gray-900 dark:text-white mb-4">
        📊 Unit Cost Analysis
      </Text>
      
      {unitCosts.map((cost, index) => (
        <MotiView
          key={`${cost.item}-${index}`}
          from={{ opacity: 0, translateX: 20 }}
          animate={{ opacity: 1, translateX: 0 }}
          transition={{ type: 'timing', duration: 500, delay: index * 100 }}
          className="mb-4 last:mb-0"
        >
          <View className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
            <View className="flex-row justify-between items-start mb-2">
              <View className="flex-1">
                <Text className="font-medium text-gray-900 dark:text-white">
                  {cost.item}
                </Text>
                <Text className="text-gray-600 dark:text-gray-400 text-sm">
                  {cost.unit}
                </Text>
              </View>
              
              <View className="items-end">
                <Text 
                  className="font-bold text-sm"
                  style={{ color: getDeviationColor(cost.deviation) }}
                >
                  {cost.deviation > 0 ? '+' : ''}{cost.deviation}%
                </Text>
                <Text className="text-gray-500 text-xs">vs benchmark</Text>
              </View>
            </View>
            
            <View className="space-y-2">
              <View className="flex-row justify-between">
                <Text className="text-gray-600 dark:text-gray-400 text-sm">Current Cost:</Text>
                <Text className="text-gray-900 dark:text-white font-medium">
                  ৳{cost.currentCost.toLocaleString()}
                </Text>
              </View>
              
              <View className="flex-row justify-between">
                <Text className="text-gray-600 dark:text-gray-400 text-sm">Benchmark:</Text>
                <Text className="text-blue-600 font-medium">
                  ৳{cost.benchmarkCost.toLocaleString()}
                </Text>
              </View>
              
              <View className="flex-row justify-between">
                <Text className="text-gray-600 dark:text-gray-400 text-sm">Difference:</Text>
                <Text 
                  className="font-bold"
                  style={{ color: getDeviationColor(cost.deviation) }}
                >
                  ৳{Math.abs(cost.currentCost - cost.benchmarkCost).toLocaleString()}
                </Text>
              </View>
            </View>
            
            {/* Visual comparison bar */}
            <View className="mt-3">
              <View className="h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                <View 
                  className="h-full rounded-full"
                  style={{ 
                    width: `${Math.min((cost.currentCost / cost.benchmarkCost) * 100, 150)}%`,
                    backgroundColor: getDeviationColor(cost.deviation)
                  }}
                />
              </View>
              <Text className="text-gray-500 text-xs mt-1">
                Updated: {new Date(cost.lastUpdated).toLocaleDateString()}
              </Text>
            </View>
          </View>
        </MotiView>
      ))}
    </View>
  );

  const renderProjectComparisons = () => (
    <View className="bg-white dark:bg-gray-800 rounded-xl mx-4 mb-4 p-4">
      <Text className="font-bold text-gray-900 dark:text-white mb-4">
        🏗️ Project Cost Efficiency
      </Text>
      
      {projectComparisons.map((project, index) => (
        <MotiView
          key={project.projectId}
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 500, delay: index * 150 }}
          className="mb-4 last:mb-0"
        >
          <TouchableOpacity
            onPress={() => router.push(`/project-detail?id=${project.projectId}`)}
            className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4"
          >
            <View className="flex-row justify-between items-start mb-3">
              <View className="flex-1">
                <Text className="font-bold text-gray-900 dark:text-white">
                  {project.projectName}
                </Text>
                <Text className="text-gray-600 dark:text-gray-400 text-sm">
                  Total Cost: {formatCurrency(project.totalCost)}
                </Text>
              </View>
              
              <View className="items-end">
                <View 
                  className="px-3 py-1 rounded-full"
                  style={{ backgroundColor: getEfficiencyColor(project.overallEfficiency) + '20' }}
                >
                  <Text 
                    className="font-bold text-sm"
                    style={{ color: getEfficiencyColor(project.overallEfficiency) }}
                  >
                    {project.overallEfficiency}%
                  </Text>
                </View>
                <Text className="text-gray-500 text-xs mt-1">Efficiency</Text>
              </View>
            </View>
            
            <View className="flex-row justify-between items-center">
              <Text className="text-gray-600 dark:text-gray-400 text-sm">
                {project.unitCosts.length} cost items analyzed
              </Text>
              
              {project.flaggedItems > 0 && (
                <View className="flex-row items-center">
                  <Ionicons name="warning" size={16} color="#f59e0b" />
                  <Text className="text-orange-600 text-sm ml-1">
                    {project.flaggedItems} flagged
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </MotiView>
      ))}
    </View>
  );

  const renderBenchmarkComparison = () => (
    <View className="bg-white dark:bg-gray-800 rounded-xl mx-4 mb-4 p-4">
      <Text className="font-bold text-gray-900 dark:text-white mb-4">
        🌍 Benchmark Comparison
      </Text>
      
      {benchmarks.map((benchmark, index) => (
        <MotiView
          key={benchmark.category}
          from={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'timing', duration: 500, delay: index * 100 }}
          className="mb-4 last:mb-0"
        >
          <View className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
            <Text className="font-medium text-gray-900 dark:text-white mb-3">
              {benchmark.category}
            </Text>
            
            <View className="space-y-2">
              <View className="flex-row justify-between">
                <Text className="text-gray-600 dark:text-gray-400 text-sm">National Average:</Text>
                <Text className="text-gray-900 dark:text-white">
                  ৳{benchmark.nationalAverage.toLocaleString()}
                </Text>
              </View>
              
              <View className="flex-row justify-between">
                <Text className="text-gray-600 dark:text-gray-400 text-sm">Regional Average:</Text>
                <Text className="text-blue-600">
                  ৳{benchmark.regionalAverage.toLocaleString()}
                </Text>
              </View>
              
              <View className="flex-row justify-between">
                <Text className="text-gray-600 dark:text-gray-400 text-sm">International:</Text>
                <Text className="text-green-600">
                  ৳{benchmark.internationalBenchmark.toLocaleString()}
                </Text>
              </View>
              
              <View className="flex-row justify-between items-center pt-1 border-t border-gray-200 dark:border-gray-600">
                <Text className="text-gray-600 dark:text-gray-400 text-sm">Variation:</Text>
                <Text className="text-orange-600 font-bold">
                  ±{benchmark.variation}%
                </Text>
              </View>
            </View>
          </View>
        </MotiView>
      ))}
    </View>
  );

  const renderCostInsights = () => (
    <View className="bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl mx-4 mb-4 p-4">
      <Text className="text-white font-bold mb-3">
        💡 Cost Analysis Insights
      </Text>
      
      <View className="space-y-2">
        <Text className="text-white/90 text-sm">
          • 23% of projects exceed unit cost benchmarks
        </Text>
        <Text className="text-white/90 text-sm">
          • Concrete costs are 18% above national average
        </Text>
        <Text className="text-white/90 text-sm">
          • Steel procurement shows best value efficiency
        </Text>
        <Text className="text-white/90 text-sm">
          • Regional variations up to 25% in some categories
        </Text>
      </View>
      
      <TouchableOpacity
        onPress={() => router.push('/cost-optimization-report')}
        className="bg-white/20 rounded-lg p-3 mt-4"
      >
        <Text className="text-white font-medium text-center">
          View Detailed Cost Optimization Report
        </Text>
      </TouchableOpacity>
    </View>
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
              Unit Cost Analysis
            </Text>
            <Text className="text-white/80 text-sm mt-1">
              Construction cost benchmarking and comparison
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/cost-export')}
          >
            <Ionicons name="download" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Category Filter */}
        {renderCategoryFilter()}
        
        {/* Cost Insights */}
        {renderCostInsights()}
        
        {/* Unit Cost Analysis */}
        {renderUnitCostAnalysis()}
        
        {/* Project Comparisons */}
        {renderProjectComparisons()}
        
        {/* Benchmark Comparison */}
        {renderBenchmarkComparison()}
      </ScrollView>
    </View>
  );
}