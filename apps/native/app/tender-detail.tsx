import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
  Share,
  RefreshControl
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { useDatabase, useLocalDatabase } from '@/contexts/database-context';
import { TABLES } from '@/lib/database';
import { useRiskScoring } from '@/hooks/use-risk-scoring';
import { usePDFExport } from '@/hooks/use-pdf-export';
import { RiskAnalysisComponent } from '@/components/risk-analysis';
import { TenderData, RiskAnalysis } from '@/lib/risk-scoring';

const { width } = Dimensions.get('window');

interface Supplier {
  id: string;
  name_en: string;
  name_bn: string;
  registration_number: string;
  contact_email: string;
  contact_phone: string;
  established_year: number;
  business_type: string;
  win_rate: number;
  total_contracts: number;
  risk_score: number;
}

interface TimelineEvent {
  date: string;
  title: string;
  description: string;
  type: 'submission' | 'evaluation' | 'award' | 'milestone';
  status: 'completed' | 'current' | 'upcoming';
}

export default function TenderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { isInitialized } = useDatabase();
  const { analyzeRisk, getRiskColor, getRiskLabel, getRiskIcon, formatRiskFactors } = useRiskScoring();
  const { exportRiskBrief, exportTenderList, isExporting } = usePDFExport();
  
  const [tender, setTender] = useState<TenderData | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [riskAnalysis, setRiskAnalysis] = useState<RiskAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showRiskAnalysis, setShowRiskAnalysis] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'timeline' | 'suppliers' | 'risk'>('overview');

  const isEnglish = i18n.language === 'en';

  useEffect(() => {
    if (isInitialized && id) {
      loadTenderDetail();
    }
  }, [isInitialized, id]);

  const loadTenderDetail = async () => {
    try {
      setIsLoading(true);
      const db = useLocalDatabase();

      // Load tender details
      const tenderResult = await db.getFirstAsync<TenderData>(
        `SELECT * FROM ${TABLES.TENDERS} WHERE id = ?`,
        [id]
      );

      if (!tenderResult) {
        Alert.alert(t('common.error'), 'Tender not found');
        router.back();
        return;
      }

      setTender(tenderResult);

      // Load related suppliers
      await loadSuppliers(tenderResult);

      // Generate timeline
      generateTimeline(tenderResult);

      // Perform risk analysis
      const analysis = await analyzeRisk(tenderResult);
      setRiskAnalysis(analysis);

    } catch (error) {
      console.error('Failed to load tender details:', error);
      Alert.alert(t('common.error'), 'Failed to load tender details');
    } finally {
      setIsLoading(false);
    }
  };

  const loadSuppliers = async (tenderData: TenderData) => {
    try {
      const db = useLocalDatabase();
      
      // Get all suppliers (in a real scenario, we'd get bidding suppliers)
      const suppliersResult = await db.getAllAsync<Supplier>(
        `SELECT * FROM ${TABLES.SUPPLIERS} ORDER BY win_rate DESC LIMIT 5`
      );
      
      setSuppliers(suppliersResult);
    } catch (error) {
      console.error('Failed to load suppliers:', error);
    }
  };

  const generateTimeline = (tenderData: TenderData) => {
    const submissionStart = new Date(tenderData.submission_start);
    const submissionEnd = new Date(tenderData.submission_end);
    const deadline = new Date(tenderData.deadline);
    const now = new Date();

    const events: TimelineEvent[] = [
      {
        date: tenderData.submission_start,
        title: 'Submission Opens',
        description: 'Tender submission period begins',
        type: 'submission',
        status: now > submissionStart ? 'completed' : 'upcoming'
      },
      {
        date: tenderData.submission_end,
        title: 'Submission Closes',
        description: 'Last date for bid submission',
        type: 'submission',
        status: now > submissionEnd ? 'completed' : now > submissionStart ? 'current' : 'upcoming'
      },
      {
        date: tenderData.deadline,
        title: 'Evaluation Complete',
        description: 'Tender evaluation and award decision',
        type: 'award',
        status: now > deadline ? 'completed' : 'upcoming'
      }
    ];

    // Add milestones between submission end and deadline
    const evaluationDays = Math.ceil((deadline.getTime() - submissionEnd.getTime()) / (1000 * 60 * 60 * 24));
    if (evaluationDays > 7) {
      const midEvaluation = new Date(submissionEnd);
      midEvaluation.setDate(midEvaluation.getDate() + Math.floor(evaluationDays / 2));
      
      events.splice(2, 0, {
        date: midEvaluation.toISOString(),
        title: 'Technical Evaluation',
        description: 'Technical and commercial evaluation in progress',
        type: 'evaluation',
        status: now > midEvaluation ? 'completed' : now > submissionEnd ? 'current' : 'upcoming'
      });
    }

    setTimeline(events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTenderDetail();
    setRefreshing(false);
  };

  const handleShare = async () => {
    if (!tender) return;

    try {
      const message = `Check out this tender: ${isEnglish ? tender.title_en : tender.title_bn}\n\nRisk Score: ${tender.risk_score}%\nAmount: ${formatAmount(tender.amount)}\n\nShared from CivicLens`;
      
      await Share.share({
        message,
        title: 'Tender Information'
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleExportRiskBrief = async () => {
    if (tender && riskAnalysis) {
      await exportRiskBrief(tender, riskAnalysis, {
        language: i18n.language as 'en' | 'bn',
        includeRiskFactors: true,
        includeRecommendations: true,
        includeTimeline: true,
        includeSupplierInfo: true
      });
    }
  };

  const formatAmount = (amount: number) => {
    if (amount >= 10000000) {
      return `${(amount / 10000000).toFixed(1)}${isEnglish ? ' Cr' : ' কোটি'}`;
    } else if (amount >= 100000) {
      return `${(amount / 100000).toFixed(1)}${isEnglish ? ' Lakh' : ' লক্ষ'}`;
    }
    return amount.toLocaleString();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(isEnglish ? 'en-US' : 'bn-BD', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const renderTabButton = (tab: typeof activeTab, label: string, icon: string) => (
    <TouchableOpacity
      onPress={() => setActiveTab(tab)}
      className={`flex-1 items-center py-3 border-b-2 ${
        activeTab === tab 
          ? 'border-primary-500' 
          : 'border-transparent'
      }`}
    >
      <Ionicons 
        name={icon as any} 
        size={20} 
        color={activeTab === tab ? '#0891b2' : '#6b7280'} 
      />
      <Text className={`text-xs mt-1 ${
        activeTab === tab 
          ? 'text-primary-600 font-medium' 
          : 'text-gray-600'
      }`}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderOverviewTab = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      {/* Basic Information */}
      <MotiView
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 600 }}
        className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-4 shadow-sm"
      >
        <Text className="text-lg font-bold text-gray-900 dark:text-white mb-4">
          Basic Information
        </Text>
        
        <View className="space-y-3">
          <View className="flex-row justify-between">
            <Text className="text-gray-600 dark:text-gray-400">Tender ID</Text>
            <Text className="font-medium text-gray-900 dark:text-white">{tender?.id}</Text>
          </View>
          
          <View className="flex-row justify-between">
            <Text className="text-gray-600 dark:text-gray-400">Type</Text>
            <Text className="font-medium text-gray-900 dark:text-white capitalize">{tender?.tender_type}</Text>
          </View>
          
          <View className="flex-row justify-between">
            <Text className="text-gray-600 dark:text-gray-400">Method</Text>
            <Text className="font-medium text-gray-900 dark:text-white capitalize">{tender?.procurement_method}</Text>
          </View>
          
          <View className="flex-row justify-between">
            <Text className="text-gray-600 dark:text-gray-400">Amount</Text>
            <Text className="font-bold text-green-600 text-lg">{formatAmount(tender?.amount || 0)}</Text>
          </View>
        </View>
      </MotiView>

      {/* Key Dates */}
      <MotiView
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 600, delay: 100 }}
        className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-4 shadow-sm"
      >
        <Text className="text-lg font-bold text-gray-900 dark:text-white mb-4">
          Key Dates
        </Text>
        
        <View className="space-y-3">
          <View>
            <Text className="text-gray-600 dark:text-gray-400 text-sm">Submission Period</Text>
            <Text className="font-medium text-gray-900 dark:text-white">
              {formatDate(tender?.submission_start || '')} - {formatDate(tender?.submission_end || '')}
            </Text>
          </View>
          
          <View>
            <Text className="text-gray-600 dark:text-gray-400 text-sm">Decision Deadline</Text>
            <Text className="font-medium text-gray-900 dark:text-white">
              {formatDate(tender?.deadline || '')}
            </Text>
          </View>
        </View>
      </MotiView>

      {/* Risk Summary */}
      {riskAnalysis && (
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 600, delay: 200 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-4 shadow-sm"
        >
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-lg font-bold text-gray-900 dark:text-white">
              Risk Assessment
            </Text>
            <TouchableOpacity
              onPress={() => setShowRiskAnalysis(true)}
              className="bg-primary-100 dark:bg-primary-900 px-3 py-1 rounded-full"
            >
              <Text className="text-primary-700 dark:text-primary-300 text-sm font-medium">
                View Details
              </Text>
            </TouchableOpacity>
          </View>
          
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <View 
                className="w-12 h-12 rounded-full items-center justify-center mr-3"
                style={{ backgroundColor: getRiskColor(riskAnalysis.totalScore) + '20' }}
              >
                <Text 
                  className="font-bold"
                  style={{ color: getRiskColor(riskAnalysis.totalScore) }}
                >
                  {riskAnalysis.totalScore}
                </Text>
              </View>
              <View>
                <Text 
                  className="font-bold capitalize"
                  style={{ color: getRiskColor(riskAnalysis.totalScore) }}
                >
                  {riskAnalysis.riskLevel} Risk
                </Text>
                <Text className="text-sm text-gray-600 dark:text-gray-400">
                  {riskAnalysis.factors.length} risk factors
                </Text>
              </View>
            </View>
            
            {riskAnalysis.flagged && (
              <View className="bg-red-100 dark:bg-red-900/30 px-3 py-2 rounded-lg">
                <Text className="text-red-700 dark:text-red-300 text-sm font-medium">
                  🚩 Flagged
                </Text>
              </View>
            )}
          </View>
          
          {riskAnalysis.factors.length > 0 && (
            <View className="mt-4">
              <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Top Risk Factors:
              </Text>
              {formatRiskFactors(riskAnalysis.factors.slice(0, 3)).map((factor, index) => (
                <Text key={index} className="text-sm text-gray-600 dark:text-gray-400">
                  • {factor}
                </Text>
              ))}
            </View>
          )}
        </MotiView>
      )}
    </ScrollView>
  );

  const renderTimelineTab = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View className="p-4">
        {timeline.map((event, index) => (
          <MotiView
            key={index}
            from={{ opacity: 0, translateX: -20 }}
            animate={{ opacity: 1, translateX: 0 }}
            transition={{ type: 'timing', duration: 400, delay: index * 100 }}
            className="flex-row mb-6"
          >
            {/* Timeline indicator */}
            <View className="items-center mr-4">
              <View 
                className={`w-4 h-4 rounded-full ${
                  event.status === 'completed' 
                    ? 'bg-green-500' 
                    : event.status === 'current'
                    ? 'bg-blue-500'
                    : 'bg-gray-300'
                }`}
              />
              {index < timeline.length - 1 && (
                <View className="w-0.5 h-8 bg-gray-200 dark:bg-gray-600 mt-2" />
              )}
            </View>
            
            {/* Event content */}
            <View className="flex-1">
              <View className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
                <View className="flex-row justify-between items-start mb-2">
                  <Text className="font-semibold text-gray-900 dark:text-white">
                    {event.title}
                  </Text>
                  <Text className="text-xs text-gray-500 dark:text-gray-400">
                    {formatDate(event.date)}
                  </Text>
                </View>
                <Text className="text-sm text-gray-600 dark:text-gray-400">
                  {event.description}
                </Text>
                <View className="mt-2">
                  <View className={`inline-flex px-2 py-1 rounded-full ${
                    event.status === 'completed' 
                      ? 'bg-green-100 dark:bg-green-900/30' 
                      : event.status === 'current'
                      ? 'bg-blue-100 dark:bg-blue-900/30'
                      : 'bg-gray-100 dark:bg-gray-700'
                  }`}>
                    <Text className={`text-xs font-medium ${
                      event.status === 'completed' 
                        ? 'text-green-700 dark:text-green-300' 
                        : event.status === 'current'
                        ? 'text-blue-700 dark:text-blue-300'
                        : 'text-gray-600 dark:text-gray-400'
                    }`}>
                      {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </MotiView>
        ))}
      </View>
    </ScrollView>
  );

  const renderSuppliersTab = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View className="p-4">
        {suppliers.map((supplier, index) => (
          <MotiView
            key={supplier.id}
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 400, delay: index * 100 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-4 shadow-sm"
          >
            <View className="flex-row justify-between items-start mb-3">
              <View className="flex-1">
                <Text className="font-bold text-gray-900 dark:text-white text-lg">
                  {isEnglish ? supplier.name_en : supplier.name_bn}
                </Text>
                <Text className="text-sm text-gray-600 dark:text-gray-400">
                  Reg: {supplier.registration_number}
                </Text>
              </View>
              
              <View 
                className="px-3 py-1 rounded-full"
                style={{ backgroundColor: getRiskColor(supplier.risk_score) + '20' }}
              >
                <Text 
                  className="text-xs font-bold"
                  style={{ color: getRiskColor(supplier.risk_score) }}
                >
                  Risk: {supplier.risk_score}%
                </Text>
              </View>
            </View>
            
            <View className="space-y-2">
              <View className="flex-row justify-between">
                <Text className="text-gray-600 dark:text-gray-400">Business Type</Text>
                <Text className="font-medium text-gray-900 dark:text-white capitalize">
                  {supplier.business_type}
                </Text>
              </View>
              
              <View className="flex-row justify-between">
                <Text className="text-gray-600 dark:text-gray-400">Established</Text>
                <Text className="font-medium text-gray-900 dark:text-white">
                  {supplier.established_year}
                </Text>
              </View>
              
              <View className="flex-row justify-between">
                <Text className="text-gray-600 dark:text-gray-400">Win Rate</Text>
                <Text className="font-medium text-gray-900 dark:text-white">
                  {(supplier.win_rate * 100).toFixed(1)}%
                </Text>
              </View>
              
              <View className="flex-row justify-between">
                <Text className="text-gray-600 dark:text-gray-400">Total Contracts</Text>
                <Text className="font-medium text-gray-900 dark:text-white">
                  {supplier.total_contracts}
                </Text>
              </View>
            </View>
            
            {supplier.contact_email && (
              <View className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                <Text className="text-sm text-gray-600 dark:text-gray-400">
                  📧 {supplier.contact_email}
                </Text>
                {supplier.contact_phone && (
                  <Text className="text-sm text-gray-600 dark:text-gray-400">
                    📞 {supplier.contact_phone}
                  </Text>
                )}
              </View>
            )}
          </MotiView>
        ))}
        
        {suppliers.length === 0 && (
          <View className="items-center justify-center py-12">
            <Ionicons name="business-outline" size={48} color="#9ca3af" />
            <Text className="text-gray-500 dark:text-gray-400 text-center mt-4">
              No supplier information available
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );

  const renderRiskTab = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View className="p-4">
        {riskAnalysis ? (
          <>
            {/* Risk Score Card */}
            <MotiView
              from={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'timing', duration: 600 }}
              className="bg-white dark:bg-gray-800 rounded-xl p-6 mb-4 shadow-sm items-center"
            >
              <View 
                className="w-20 h-20 rounded-full items-center justify-center mb-4"
                style={{ backgroundColor: getRiskColor(riskAnalysis.totalScore) + '20' }}
              >
                <Text 
                  className="text-2xl font-bold"
                  style={{ color: getRiskColor(riskAnalysis.totalScore) }}
                >
                  {riskAnalysis.totalScore}
                </Text>
              </View>
              
              <Text 
                className="text-xl font-bold mb-2 capitalize"
                style={{ color: getRiskColor(riskAnalysis.totalScore) }}
              >
                {riskAnalysis.riskLevel} Risk
              </Text>
              
              {riskAnalysis.flagged && (
                <View className="bg-red-100 dark:bg-red-900/30 px-3 py-1 rounded-full">
                  <Text className="text-red-700 dark:text-red-300 text-sm font-medium">
                    🚩 Flagged for Review
                  </Text>
                </View>
              )}
            </MotiView>

            {/* Risk Factors */}
            {riskAnalysis.factors.map((factor, index) => (
              <MotiView
                key={factor.id}
                from={{ opacity: 0, translateX: -20 }}
                animate={{ opacity: 1, translateX: 0 }}
                transition={{ type: 'timing', duration: 400, delay: index * 100 }}
                className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-3 shadow-sm"
              >
                <View className="flex-row justify-between items-center mb-2">
                  <Text className="font-semibold text-gray-900 dark:text-white">
                    {factor.name}
                  </Text>
                  <Text 
                    className="font-bold"
                    style={{ color: getRiskColor(factor.score) }}
                  >
                    +{factor.score}
                  </Text>
                </View>
                
                <Text className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  {factor.description}
                </Text>
                
                <View className="flex-row justify-between items-center">
                  <Text className="text-xs text-gray-500 dark:text-gray-500 capitalize">
                    {factor.category}
                  </Text>
                  <View className="bg-gray-100 dark:bg-gray-700 rounded-full px-2 py-1">
                    <Text className="text-xs text-gray-600 dark:text-gray-300">
                      Weight: {(factor.weight * 100).toFixed(0)}%
                    </Text>
                  </View>
                </View>
              </MotiView>
            ))}

            {/* Recommendations */}
            {riskAnalysis.recommendations.length > 0 && (
              <View className="mt-4">
                <Text className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                  Recommendations
                </Text>
                {riskAnalysis.recommendations.map((rec, index) => (
                  <MotiView
                    key={index}
                    from={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: 'timing', duration: 400, delay: 200 + (index * 100) }}
                    className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-3"
                  >
                    <View className="flex-row items-start">
                      <Ionicons name="bulb" size={16} color="#3b82f6" className="mt-1 mr-3" />
                      <Text className="flex-1 text-sm text-blue-700 dark:text-blue-300">
                        {rec}
                      </Text>
                    </View>
                  </MotiView>
                ))}
              </View>
            )}
          </>
        ) : (
          <View className="items-center justify-center py-12">
            <Ionicons name="analytics-outline" size={48} color="#9ca3af" />
            <Text className="text-gray-500 dark:text-gray-400 text-center mt-4">
              Risk analysis not available
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );

  if (isLoading || !tender) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50 dark:bg-gray-900">
        <MotiView
          animate={{ rotate: '360deg' }}
          transition={{ type: 'timing', duration: 1000, loop: true }}
        >
          <Ionicons name="sync" size={32} color="#0891b2" />
        </MotiView>
        <Text className="text-gray-600 dark:text-gray-400 mt-4">
          {t('common.loading')}
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <View className="bg-white dark:bg-gray-800 px-4 py-4 border-b border-gray-200 dark:border-gray-700">
        <View className="flex-row items-center justify-between mb-3">
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#0891b2" />
          </TouchableOpacity>
          
          <View className="flex-row space-x-3">
            {riskAnalysis && (
              <TouchableOpacity 
                onPress={handleExportRiskBrief}
                disabled={isExporting}
              >
                {isExporting ? (
                  <MotiView
                    animate={{ rotate: '360deg' }}
                    transition={{ type: 'timing', duration: 1000, loop: true }}
                  >
                    <Ionicons name="sync" size={20} color="#6b7280" />
                  </MotiView>
                ) : (
                  <Ionicons name="download" size={20} color="#6b7280" />
                )}
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={handleShare}>
              <Ionicons name="share" size={20} color="#6b7280" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => console.log('Bookmark tender')}>
              <Ionicons name="bookmark-outline" size={20} color="#6b7280" />
            </TouchableOpacity>
          </View>
        </View>
        
        <Text className="text-xl font-bold text-gray-900 dark:text-white">
          {isEnglish ? tender.title_en : tender.title_bn}
        </Text>
        <Text className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          {isEnglish ? tender.organization_en : tender.organization_bn}
        </Text>
      </View>

      {/* Tab Navigation */}
      <View className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <View className="flex-row">
          {renderTabButton('overview', 'Overview', 'information-circle')}
          {renderTabButton('timeline', 'Timeline', 'time')}
          {renderTabButton('suppliers', 'Suppliers', 'business')}
          {renderTabButton('risk', 'Risk', 'warning')}
        </View>
      </View>

      {/* Tab Content */}
      <View className="flex-1">
        <ScrollView 
          className="flex-1"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {activeTab === 'overview' && renderOverviewTab()}
          {activeTab === 'timeline' && renderTimelineTab()}
          {activeTab === 'suppliers' && renderSuppliersTab()}
          {activeTab === 'risk' && renderRiskTab()}
        </ScrollView>
      </View>

      {/* Risk Analysis Modal */}
      {tender && (
        <RiskAnalysisComponent
          tender={tender}
          visible={showRiskAnalysis}
          onClose={() => setShowRiskAnalysis(false)}
        />
      )}
    </View>
  );
}