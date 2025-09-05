import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Dimensions
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { useDatabase } from '@/lib/database';

interface Project {
  id: string;
  name_en: string;
  name_bn: string;
  description_en?: string;
  description_bn?: string;
  budget: number;
  spent_amount: number;
  start_date: string;
  end_date?: string;
  current_status: string;
  district: string;
  upazila?: string;
  ward?: string;
  contractor_name?: string;
  geo_location?: string;
  completion_percentage: number;
}

interface BudgetSummary {
  totalBudget: number;
  totalSpent: number;
  activeProjects: number;
  completedProjects: number;
  pendingProjects: number;
  utilizationRate: number;
}

const PROJECT_CATEGORIES = [
  { id: 'all', name: 'All Projects', icon: 'list', color: '#6b7280' },
  { id: 'infrastructure', name: 'Infrastructure', icon: 'construct', color: '#3b82f6' },
  { id: 'education', name: 'Education', icon: 'school', color: '#10b981' },
  { id: 'health', name: 'Healthcare', icon: 'medical', color: '#ef4444' },
  { id: 'environment', name: 'Environment', icon: 'leaf', color: '#22c55e' },
  { id: 'social', name: 'Social Welfare', icon: 'people', color: '#8b5cf6' }
];

const PROJECT_STATUS = {
  'planning': { label: 'Planning', color: '#f59e0b', icon: 'clipboard' },
  'ongoing': { label: 'Ongoing', color: '#3b82f6', icon: 'time' },
  'completed': { label: 'Completed', color: '#10b981', icon: 'checkmark-circle' },
  'suspended': { label: 'Suspended', color: '#ef4444', icon: 'pause-circle' },
  'cancelled': { label: 'Cancelled', color: '#6b7280', icon: 'close-circle' }
};

export default function BudgetsScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { isInitialized } = useDatabase();
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [budgetSummary, setBudgetSummary] = useState<BudgetSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedDistrict, setSelectedDistrict] = useState('all');

  const isEnglish = i18n.language === 'en';
  const screenWidth = Dimensions.get('window').width;

  useEffect(() => {
    if (isInitialized) {
      loadBudgetData();
    }
  }, [isInitialized, selectedCategory, selectedDistrict]);

  const loadBudgetData = async () => {
    try {
      setLoading(true);
      
      // Mock data - in production this would come from SQLite database
      const mockProjects: Project[] = [
        {
          id: 'proj_001',
          name_en: 'Dhaka Metro Rail Extension',
          name_bn: 'ঢাকা মেট্রো রেল সম্প্রসারণ',
          description_en: 'Extension of metro rail from Motijheel to Kamalapur',
          budget: 15000000000, // 15 billion
          spent_amount: 8500000000,
          start_date: '2023-01-15',
          end_date: '2025-12-31',
          current_status: 'ongoing',
          district: 'Dhaka',
          upazila: 'Dhaka Metropolitan',
          contractor_name: 'Metro Rail Construction Ltd.',
          completion_percentage: 56
        },
        {
          id: 'proj_002',
          name_en: 'Rural Road Development',
          name_bn: 'গ্রামীণ সড়ক উন্নয়ন',
          description_en: 'Construction of 50km rural roads in Chittagong',
          budget: 500000000, // 500 million
          spent_amount: 485000000,
          start_date: '2022-06-01',
          end_date: '2024-01-31',
          current_status: 'completed',
          district: 'Chittagong',
          upazila: 'Raozan',
          contractor_name: 'Rural Infrastructure Co.',
          completion_percentage: 100
        },
        {
          id: 'proj_003',
          name_en: 'Digital Education Initiative',
          name_bn: 'ডিজিটাল শিক্ষা উদ্যোগ',
          description_en: 'Providing tablets and internet to 1000 schools',
          budget: 250000000, // 250 million
          spent_amount: 125000000,
          start_date: '2023-08-01',
          end_date: '2024-07-31',
          current_status: 'ongoing',
          district: 'Sylhet',
          upazila: 'Sylhet Sadar',
          contractor_name: 'EduTech Solutions',
          completion_percentage: 40
        },
        {
          id: 'proj_004',
          name_en: 'Community Health Centers',
          name_bn: 'কমিউনিটি স্বাস্থ্য কেন্দ্র',
          description_en: 'Building 25 community health centers',
          budget: 750000000, // 750 million
          spent_amount: 225000000,
          start_date: '2023-03-15',
          current_status: 'ongoing',
          district: 'Rajshahi',
          upazila: 'Rajshahi Sadar',
          contractor_name: 'Health Infrastructure Ltd.',
          completion_percentage: 30
        }
      ];
      
      // Filter projects based on selected category and district
      let filteredProjects = mockProjects;
      
      if (selectedDistrict !== 'all') {
        filteredProjects = filteredProjects.filter(p => p.district === selectedDistrict);
      }
      
      setProjects(filteredProjects);
      
      // Calculate budget summary
      const summary: BudgetSummary = {
        totalBudget: filteredProjects.reduce((sum, p) => sum + p.budget, 0),
        totalSpent: filteredProjects.reduce((sum, p) => sum + p.spent_amount, 0),
        activeProjects: filteredProjects.filter(p => p.current_status === 'ongoing').length,
        completedProjects: filteredProjects.filter(p => p.current_status === 'completed').length,
        pendingProjects: filteredProjects.filter(p => p.current_status === 'planning').length,
        utilizationRate: 0
      };
      
      summary.utilizationRate = summary.totalBudget > 0 
        ? (summary.totalSpent / summary.totalBudget) * 100 
        : 0;
      
      setBudgetSummary(summary);
    } catch (error) {
      console.error('Error loading budget data:', error);
      Alert.alert('Error', 'Failed to load budget information');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadBudgetData();
    setRefreshing(false);
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

  const getStatusInfo = (status: string) => {
    return PROJECT_STATUS[status as keyof typeof PROJECT_STATUS] || PROJECT_STATUS.planning;
  };

  const renderBudgetSummary = () => (
    <MotiView
      from={{ opacity: 0, translateY: 20 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 500 }}
      className="mx-4 mb-4"
    >
      <View className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-4">
        <Text className="text-white text-lg font-bold mb-4">
          📊 Budget Overview
        </Text>
        
        <View className="flex-row flex-wrap gap-3">
          <View className="bg-white/20 rounded-lg p-3 flex-1 min-w-[140px]">
            <Text className="text-white/80 text-sm">Total Budget</Text>
            <Text className="text-white text-xl font-bold">
              {budgetSummary && formatCurrency(budgetSummary.totalBudget)}
            </Text>
          </View>
          
          <View className="bg-white/20 rounded-lg p-3 flex-1 min-w-[140px]">
            <Text className="text-white/80 text-sm">Total Spent</Text>
            <Text className="text-white text-xl font-bold">
              {budgetSummary && formatCurrency(budgetSummary.totalSpent)}
            </Text>
          </View>
          
          <View className="bg-white/20 rounded-lg p-3 flex-1 min-w-[140px]">
            <Text className="text-white/80 text-sm">Utilization</Text>
            <Text className="text-white text-xl font-bold">
              {budgetSummary && Math.round(budgetSummary.utilizationRate)}%
            </Text>
          </View>
          
          <View className="bg-white/20 rounded-lg p-3 flex-1 min-w-[140px]">
            <Text className="text-white/80 text-sm">Active Projects</Text>
            <Text className="text-white text-xl font-bold">
              {budgetSummary?.activeProjects || 0}
            </Text>
          </View>
        </View>
      </View>
    </MotiView>
  );

  const renderDistrictFilter = () => (
    <View className="px-4 mb-4">
      <Text className="text-gray-900 dark:text-white font-bold mb-3">
        🗺️ Filter by District
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View className="flex-row space-x-3">
          {['all', 'Dhaka', 'Chittagong', 'Sylhet', 'Rajshahi', 'Khulna', 'Barisal'].map((district) => (
            <TouchableOpacity
              key={district}
              onPress={() => setSelectedDistrict(district)}
              className={`px-4 py-2 rounded-xl ${
                selectedDistrict === district
                  ? 'bg-blue-500'
                  : 'bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600'
              }`}
            >
              <Text className={`${
                selectedDistrict === district
                  ? 'text-white'
                  : 'text-gray-700 dark:text-gray-300'
              }`}>
                {district === 'all' ? 'All Districts' : district}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );

  const renderProjectCard = (project: Project, index: number) => {
    const statusInfo = getStatusInfo(project.current_status);
    const progressPercentage = project.completion_percentage;
    const budgetUtilization = (project.spent_amount / project.budget) * 100;
    
    return (
      <MotiView
        key={project.id}
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 500, delay: index * 100 }}
        className="bg-white dark:bg-gray-800 rounded-xl mx-4 mb-4 shadow-sm"
      >
        <TouchableOpacity
          onPress={() => router.push(`/project-detail?id=${project.id}`)}
          className="p-4"
        >
          {/* Header */}
          <View className="flex-row items-start justify-between mb-3">
            <View className="flex-1 mr-3">
              <Text className="font-bold text-gray-900 dark:text-white text-lg">
                {isEnglish ? project.name_en : project.name_bn}
              </Text>
              <Text className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                {project.district} • {project.contractor_name}
              </Text>
            </View>
            
            <View className="items-end">
              <View 
                className="px-3 py-1 rounded-full flex-row items-center"
                style={{ backgroundColor: statusInfo.color + '20' }}
              >
                <Ionicons name={statusInfo.icon as any} size={14} color={statusInfo.color} />
                <Text 
                  className="ml-1 text-sm font-medium"
                  style={{ color: statusInfo.color }}
                >
                  {statusInfo.label}
                </Text>
              </View>
            </View>
          </View>

          {/* Budget Information */}
          <View className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 mb-3">
            <View className="flex-row justify-between items-center mb-2">
              <Text className="text-gray-600 dark:text-gray-400 text-sm">Budget</Text>
              <Text className="text-gray-900 dark:text-white font-bold">
                {formatCurrency(project.budget)}
              </Text>
            </View>
            
            <View className="flex-row justify-between items-center mb-2">
              <Text className="text-gray-600 dark:text-gray-400 text-sm">Spent</Text>
              <Text className="text-blue-600 font-bold">
                {formatCurrency(project.spent_amount)}
              </Text>
            </View>
            
            {/* Budget Utilization Bar */}
            <View className="mb-2">
              <Text className="text-gray-600 dark:text-gray-400 text-xs mb-1">
                Budget Utilization: {Math.round(budgetUtilization)}%
              </Text>
              <View className="h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                <View 
                  className={`h-full rounded-full ${
                    budgetUtilization > 90 ? 'bg-red-500' : 
                    budgetUtilization > 70 ? 'bg-orange-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(budgetUtilization, 100)}%` }}
                />
              </View>
            </View>
          </View>

          {/* Progress Information */}
          <View className="mb-3">
            <View className="flex-row justify-between items-center mb-2">
              <Text className="text-gray-600 dark:text-gray-400 text-sm">
                Project Progress
              </Text>
              <Text className="text-blue-600 font-bold text-sm">
                {progressPercentage}% Complete
              </Text>
            </View>
            
            <View className="h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
              <View 
                className="h-full bg-blue-500 rounded-full"
                style={{ width: `${progressPercentage}%` }}
              />
            </View>
          </View>

          {/* Timeline */}
          <View className="flex-row items-center">
            <Ionicons name="calendar" size={16} color="#6b7280" />
            <Text className="ml-2 text-gray-600 dark:text-gray-400 text-sm">
              Started: {new Date(project.start_date).toLocaleDateString()}
              {project.end_date && ` • Due: ${new Date(project.end_date).toLocaleDateString()}`}
            </Text>
          </View>
        </TouchableOpacity>
      </MotiView>
    );
  };

  const renderEmptyState = () => (
    <MotiView
      from={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'timing', duration: 500 }}
      className="items-center justify-center py-16"
    >
      <View className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full items-center justify-center mb-4">
        <Ionicons name="business" size={40} color="#6b7280" />
      </View>
      <Text className="text-gray-900 dark:text-white font-bold text-lg mb-2">
        No Projects Found
      </Text>
      <Text className="text-gray-600 dark:text-gray-400 text-center px-8">
        No budget projects found for the selected filters. Try adjusting your search criteria.
      </Text>
    </MotiView>
  );

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <View className="bg-gradient-to-r from-green-600 to-blue-600 px-4 py-6">
        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <Text className="text-white text-2xl font-bold">
              WardWallet
            </Text>
            <Text className="text-white/80 text-sm mt-1">
              Budget transparency and project monitoring
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/budget-map')}
            className="bg-white/20 p-3 rounded-xl"
          >
            <Ionicons name="map" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Budget Summary */}
        {budgetSummary && renderBudgetSummary()}

        {/* District Filter */}
        {renderDistrictFilter()}

        {/* Projects List */}
        {loading ? (
          <View className="items-center justify-center py-16">
            <Text className="text-gray-600 dark:text-gray-400">Loading projects...</Text>
          </View>
        ) : projects.length === 0 ? (
          renderEmptyState()
        ) : (
          <View className="pb-6">
            {projects.map((project, index) => renderProjectCard(project, index))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}