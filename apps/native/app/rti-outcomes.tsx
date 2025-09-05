import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  FlatList,
  RefreshControl,
  Alert,
  Modal
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { useDatabase, useLocalDatabase } from '@/contexts/database-context';
import { TABLES } from '@/lib/database';

interface RTIOutcome {
  id: string;
  title_en: string;
  title_bn: string;
  agency_name_en: string;
  agency_name_bn: string;
  category: string;
  outcome: 'information_provided' | 'information_denied' | 'partial_information' | 'no_response' | 'appealed';
  response_summary_en?: string;
  response_summary_bn?: string;
  published_date: string;
  usefulness_rating: number;
  view_count: number;
}

const OUTCOME_CATEGORIES = [
  { key: 'all', label_en: 'All Categories', label_bn: 'সব ক্যাটেগরি' },
  { key: 'budget', label_en: 'Budget & Finance', label_bn: 'বাজেট ও অর্থ' },
  { key: 'procurement', label_en: 'Procurement', label_bn: 'ক্রয়' },
  { key: 'project', label_en: 'Development Projects', label_bn: 'উন্নয়ন প্রকল্প' },
  { key: 'service', label_en: 'Government Services', label_bn: 'সরকারি সেবা' },
  { key: 'policy', label_en: 'Policies & Decisions', label_bn: 'নীতি ও সিদ্ধান্ত' },
  { key: 'complaint', label_en: 'Complaints & Grievances', label_bn: 'অভিযোগ ও নালিশ' }
];

export default function RTIOutcomeRepositoryScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { isInitialized } = useDatabase();
  
  const [outcomes, setOutcomes] = useState<RTIOutcome[]>([]);
  const [filteredOutcomes, setFilteredOutcomes] = useState<RTIOutcome[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedOutcome, setSelectedOutcome] = useState<'all' | 'information_provided' | 'information_denied' | 'partial_information' | 'no_response'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState<RTIOutcome | null>(null);
  const [stats, setStats] = useState({
    totalPublished: 0,
    informationProvided: 0,
    informationDenied: 0,
    averageRating: 0
  });

  const isEnglish = i18n.language === 'en';

  useEffect(() => {
    if (isInitialized) {
      loadPublishedOutcomes();
    }
  }, [isInitialized]);

  useEffect(() => {
    applyFilters();
  }, [outcomes, searchQuery, selectedCategory, selectedOutcome]);

  const loadPublishedOutcomes = async () => {
    try {
      setIsLoading(true);
      
      // Since we don't have actual published outcomes yet, let's create some sample data
      const sampleOutcomes: RTIOutcome[] = [
        {
          id: 'outcome_1',
          title_en: 'Budget Allocation for Road Development',
          title_bn: 'সড়ক উন্নয়নের জন্য বাজেট বরাদ্দ',
          agency_name_en: 'Ministry of Roads and Highways',
          agency_name_bn: 'সড়ক ও জনপথ মন্ত্রণালয়',
          category: 'budget',
          outcome: 'information_provided',
          response_summary_en: 'Complete budget breakdown provided including district-wise allocations and contractor details.',
          response_summary_bn: 'জেলাওয়ারী বরাদ্দ এবং ঠিকাদারের বিবরণসহ সম্পূর্ণ বাজেট বিশ্লেষণ প্রদান করা হয়েছে।',
          published_date: '2024-01-15',
          usefulness_rating: 4.2,
          view_count: 156
        },
        {
          id: 'outcome_2',
          title_en: 'Tender Process for Hospital Equipment',
          title_bn: 'হাসপাতালের যন্ত্রপাতির জন্য টেন্ডার প্রক্রিয়া',
          agency_name_en: 'Ministry of Health',
          agency_name_bn: 'স্বাস্থ্য মন্ত্রণালয়',
          category: 'procurement',
          outcome: 'partial_information',
          response_summary_en: 'Partial information provided. Some commercial details withheld citing business confidentiality.',
          response_summary_bn: 'আংশিক তথ্য প্রদান করা হয়েছে। ব্যবসায়িক গোপনীয়তার কারণে কিছু বাণিজ্যিক বিবরণ গোপন রাখা হয়েছে।',
          published_date: '2024-01-20',
          usefulness_rating: 3.1,
          view_count: 89
        },
        {
          id: 'outcome_3',
          title_en: 'School Construction Project Status',
          title_bn: 'স্কুল নির্মাণ প্রকল্পের অবস্থা',
          agency_name_en: 'Ministry of Education',
          agency_name_bn: 'শিক্ষা মন্ত্রণালয়',
          category: 'project',
          outcome: 'information_denied',
          response_summary_en: 'Information denied citing ongoing legal proceedings and investigation.',
          response_summary_bn: 'চলমান আইনি প্রক্রিয়া এবং তদন্তের কারণে তথ্য প্রদান করা হয়নি।',
          published_date: '2024-01-25',
          usefulness_rating: 2.8,
          view_count: 203
        }
      ];

      setOutcomes(sampleOutcomes);
      
      // Calculate statistics
      const totalPublished = sampleOutcomes.length;
      const informationProvided = sampleOutcomes.filter(o => o.outcome === 'information_provided').length;
      const informationDenied = sampleOutcomes.filter(o => o.outcome === 'information_denied').length;
      const averageRating = sampleOutcomes.reduce((sum, o) => sum + o.usefulness_rating, 0) / totalPublished;
      
      setStats({
        totalPublished,
        informationProvided,
        informationDenied,
        averageRating
      });
      
    } catch (error) {
      console.error('Failed to load published outcomes:', error);
      Alert.alert('Error', 'Failed to load published outcomes');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPublishedOutcomes();
    setRefreshing(false);
  };

  const applyFilters = () => {
    let filtered = [...outcomes];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(outcome =>
        outcome.title_en.toLowerCase().includes(query) ||
        outcome.title_bn.toLowerCase().includes(query) ||
        outcome.agency_name_en.toLowerCase().includes(query) ||
        outcome.agency_name_bn.toLowerCase().includes(query)
      );
    }

    // Apply category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(outcome => outcome.category === selectedCategory);
    }

    // Apply outcome filter
    if (selectedOutcome !== 'all') {
      filtered = filtered.filter(outcome => outcome.outcome === selectedOutcome);
    }

    setFilteredOutcomes(filtered);
  };

  const getOutcomeColor = (outcome: string): string => {
    switch (outcome) {
      case 'information_provided': return '#10b981';
      case 'partial_information': return '#f59e0b';
      case 'information_denied': return '#ef4444';
      case 'no_response': return '#6b7280';
      case 'appealed': return '#8b5cf6';
      default: return '#6b7280';
    }
  };

  const getOutcomeLabel = (outcome: string): string => {
    const labels: Record<string, string> = {
      information_provided: isEnglish ? 'Information Provided' : 'তথ্য প্রদান করা হয়েছে',
      partial_information: isEnglish ? 'Partial Information' : 'আংশিক তথ্য',
      information_denied: isEnglish ? 'Information Denied' : 'তথ্য প্রদান করা হয়নি',
      no_response: isEnglish ? 'No Response' : 'কোনো উত্তর নেই',
      appealed: isEnglish ? 'Appealed' : 'আপিল করা হয়েছে'
    };
    return labels[outcome] || outcome;
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating - fullStars >= 0.5;
    
    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <Ionicons key={i} name="star" size={14} color="#f59e0b" />
      );
    }
    
    if (hasHalfStar) {
      stars.push(
        <Ionicons key="half" name="star-half" size={14} color="#f59e0b" />
      );
    }
    
    const remainingStars = 5 - Math.ceil(rating);
    for (let i = 0; i < remainingStars; i++) {
      stars.push(
        <Ionicons key={`empty-${i}`} name="star-outline" size={14} color="#d1d5db" />
      );
    }
    
    return <View className="flex-row">{stars}</View>;
  };

  const handleOutcomePress = (outcome: RTIOutcome) => {
    setSelectedDetail(outcome);
    setShowDetailModal(true);
    
    // Increment view count (in real app, this would update the database)
    setOutcomes(prev => 
      prev.map(o => 
        o.id === outcome.id 
          ? { ...o, view_count: o.view_count + 1 }
          : o
      )
    );
  };

  const renderOutcomeCard = ({ item, index }: { item: RTIOutcome; index: number }) => (
    <MotiView
      from={{ opacity: 0, translateY: 20 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 600, delay: index * 100 }}
      className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-3 shadow-sm border border-gray-100 dark:border-gray-700"
    >
      <TouchableOpacity
        onPress={() => handleOutcomePress(item)}
        activeOpacity={0.7}
      >
        {/* Header */}
        <View className="flex-row justify-between items-start mb-3">
          <View className="flex-1 mr-3">
            <Text className="text-lg font-bold text-gray-900 dark:text-white">
              {isEnglish ? item.title_en : item.title_bn}
            </Text>
            <Text className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {isEnglish ? item.agency_name_en : item.agency_name_bn}
            </Text>
          </View>
          
          <View 
            className="px-3 py-1 rounded-full"
            style={{ backgroundColor: getOutcomeColor(item.outcome) + '20' }}
          >
            <Text 
              className="text-xs font-bold"
              style={{ color: getOutcomeColor(item.outcome) }}
            >
              {getOutcomeLabel(item.outcome)}
            </Text>
          </View>
        </View>

        {/* Summary */}
        {item.response_summary_en && (
          <Text className="text-sm text-gray-700 dark:text-gray-300 mb-3" numberOfLines={2}>
            {isEnglish ? item.response_summary_en : item.response_summary_bn}
          </Text>
        )}

        {/* Metrics */}
        <View className="flex-row justify-between items-center">
          <View className="flex-row items-center">
            {renderStars(item.usefulness_rating)}
            <Text className="text-sm text-gray-600 dark:text-gray-400 ml-2">
              {item.usefulness_rating.toFixed(1)}
            </Text>
          </View>
          
          <View className="flex-row items-center space-x-4">
            <View className="flex-row items-center">
              <Ionicons name="eye" size={14} color="#6b7280" />
              <Text className="text-sm text-gray-600 dark:text-gray-400 ml-1">
                {item.view_count}
              </Text>
            </View>
            
            <Text className="text-sm text-gray-500 dark:text-gray-400">
              {new Date(item.published_date).toLocaleDateString()}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </MotiView>
  );

  const renderCategoryFilter = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-4 py-3">
      <View className="flex-row">
        {OUTCOME_CATEGORIES.map((category) => (
          <TouchableOpacity
            key={category.key}
            onPress={() => setSelectedCategory(category.key)}
            className={`px-4 py-2 rounded-full mr-3 ${
              selectedCategory === category.key
                ? 'bg-blue-500'
                : 'bg-gray-100 dark:bg-gray-700'
            }`}
          >
            <Text className={`text-sm font-medium ${
              selectedCategory === category.key
                ? 'text-white'
                : 'text-gray-700 dark:text-gray-300'
            }`}>
              {isEnglish ? category.label_en : category.label_bn}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );

  const renderDetailModal = () => (
    <Modal
      visible={showDetailModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowDetailModal(false)}
    >
      <View className="flex-1 bg-black/50 justify-end">
        <View className="bg-white dark:bg-gray-800 rounded-t-xl max-h-96">
          {selectedDetail && (
            <ScrollView className="p-4">
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-lg font-bold text-gray-900 dark:text-white flex-1">
                  {isEnglish ? selectedDetail.title_en : selectedDetail.title_bn}
                </Text>
                <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                  <Ionicons name="close" size={24} color="#6b7280" />
                </TouchableOpacity>
              </View>
              
              <View className="space-y-3">
                <View>
                  <Text className="font-medium text-gray-700 dark:text-gray-300">Agency</Text>
                  <Text className="text-gray-600 dark:text-gray-400">
                    {isEnglish ? selectedDetail.agency_name_en : selectedDetail.agency_name_bn}
                  </Text>
                </View>
                
                <View>
                  <Text className="font-medium text-gray-700 dark:text-gray-300">Outcome</Text>
                  <Text style={{ color: getOutcomeColor(selectedDetail.outcome) }}>
                    {getOutcomeLabel(selectedDetail.outcome)}
                  </Text>
                </View>
                
                {selectedDetail.response_summary_en && (
                  <View>
                    <Text className="font-medium text-gray-700 dark:text-gray-300">Response Summary</Text>
                    <Text className="text-gray-600 dark:text-gray-400">
                      {isEnglish ? selectedDetail.response_summary_en : selectedDetail.response_summary_bn}
                    </Text>
                  </View>
                )}
                
                <View className="flex-row justify-between">
                  <View>
                    <Text className="font-medium text-gray-700 dark:text-gray-300">Rating</Text>
                    <View className="flex-row items-center">
                      {renderStars(selectedDetail.usefulness_rating)}
                      <Text className="text-gray-600 dark:text-gray-400 ml-2">
                        ({selectedDetail.usefulness_rating.toFixed(1)})
                      </Text>
                    </View>
                  </View>
                  
                  <View>
                    <Text className="font-medium text-gray-700 dark:text-gray-300">Views</Text>
                    <Text className="text-gray-600 dark:text-gray-400">{selectedDetail.view_count}</Text>
                  </View>
                </View>
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
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
              RTI Outcome Repository
            </Text>
            <Text className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Browse published RTI outcomes for transparency
            </Text>
          </View>
        </View>
        
        {/* Quick Stats */}
        <View className="flex-row justify-between">
          <View className="items-center">
            <Text className="text-lg font-bold text-gray-900 dark:text-white">
              {stats.totalPublished}
            </Text>
            <Text className="text-xs text-gray-600 dark:text-gray-400">
              Published
            </Text>
          </View>
          
          <View className="items-center">
            <Text className="text-lg font-bold text-green-600">
              {stats.informationProvided}
            </Text>
            <Text className="text-xs text-gray-600 dark:text-gray-400">
              Successful
            </Text>
          </View>
          
          <View className="items-center">
            <Text className="text-lg font-bold text-red-600">
              {stats.informationDenied}
            </Text>
            <Text className="text-xs text-gray-600 dark:text-gray-400">
              Denied
            </Text>
          </View>
          
          <View className="items-center">
            <Text className="text-lg font-bold text-yellow-600">
              {stats.averageRating.toFixed(1)}★
            </Text>
            <Text className="text-xs text-gray-600 dark:text-gray-400">
              Avg Rating
            </Text>
          </View>
        </View>
      </View>

      {/* Search Bar */}
      <View className="bg-white dark:bg-gray-800 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <View className="flex-row items-center bg-gray-100 dark:bg-gray-700 rounded-xl px-3 py-2">
          <Ionicons name="search" size={20} color="#6b7280" />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search RTI outcomes..."
            placeholderTextColor="#9ca3af"
            className="flex-1 ml-2 text-gray-900 dark:text-white"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#6b7280" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Category Filter */}
      {renderCategoryFilter()}

      {/* Outcomes List */}
      <FlatList
        data={filteredOutcomes}
        renderItem={renderOutcomeCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View className="items-center justify-center py-12">
            <Ionicons name="library-outline" size={64} color="#9ca3af" />
            <Text className="text-gray-500 dark:text-gray-400 text-center mt-4">
              {searchQuery || selectedCategory !== 'all'
                ? 'No outcomes found matching your criteria'
                : 'No published RTI outcomes yet'
              }
            </Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />

      {renderDetailModal()}
    </View>
  );
}