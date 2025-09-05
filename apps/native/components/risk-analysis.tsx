import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { useRiskScoring } from '@/hooks/use-risk-scoring';
import { usePDFExport } from '@/hooks/use-pdf-export';
import { RiskAnalysis, RiskFactor, TenderData } from '@/lib/risk-scoring';

interface RiskAnalysisComponentProps {
  tender: TenderData;
  visible: boolean;
  onClose: () => void;
}

export const RiskAnalysisComponent: React.FC<RiskAnalysisComponentProps> = ({
  tender,
  visible,
  onClose
}) => {
  const { t, i18n } = useTranslation();
  const { analyzeRisk, isAnalyzing, getRiskColor, getRiskIcon } = useRiskScoring();
  const { exportRiskBrief, showExportOptions, isExporting } = usePDFExport();
  const [analysis, setAnalysis] = useState<RiskAnalysis | null>(null);

  const isEnglish = i18n.language === 'en';

  useEffect(() => {
    if (visible && tender) {
      performRiskAnalysis();
    }
  }, [visible, tender]);

  const performRiskAnalysis = async () => {
    const result = await analyzeRisk(tender);
    setAnalysis(result);
  };

  const renderRiskFactor = (factor: RiskFactor, index: number) => (
    <MotiView
      key={factor.id}
      from={{ opacity: 0, translateX: -20 }}
      animate={{ opacity: 1, translateX: 0 }}
      transition={{ type: 'timing', duration: 400, delay: index * 100 }}
      className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-3"
    >
      <View className="flex-row justify-between items-center mb-2">
        <View className="flex-row items-center flex-1">
          <View 
            className="w-3 h-3 rounded-full mr-3"
            style={{ backgroundColor: getRiskColor(factor.score) }}
          />
          <Text className="font-semibold text-gray-900 dark:text-white">
            {factor.name}
          </Text>
        </View>
        <View className="flex-row items-center">
          <Text 
            className="font-bold mr-2"
            style={{ color: getRiskColor(factor.score) }}
          >
            +{factor.score}
          </Text>
          <Ionicons 
            name={getRiskIcon(factor.score) as any} 
            size={16} 
            color={getRiskColor(factor.score)} 
          />
        </View>
      </View>
      
      <Text className="text-sm text-gray-600 dark:text-gray-400 mb-2">
        {factor.description}
      </Text>
      
      <View className="flex-row justify-between items-center">
        <Text className="text-xs text-gray-500 dark:text-gray-500 capitalize">
          {factor.category} • Weight: {(factor.weight * 100).toFixed(0)}%
        </Text>
        <View className="bg-gray-200 dark:bg-gray-600 rounded-full px-2 py-1">
          <Text className="text-xs font-medium text-gray-700 dark:text-gray-300">
            Impact: {factor.score >= 25 ? 'High' : factor.score >= 15 ? 'Medium' : 'Low'}
          </Text>
        </View>
      </View>
    </MotiView>
  );

  const renderRecommendation = (recommendation: string, index: number) => (
    <MotiView
      key={index}
      from={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'timing', duration: 400, delay: 200 + (index * 100) }}
      className="flex-row items-start p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg mb-2"
    >
      <Ionicons name="bulb" size={16} color="#3b82f6" className="mt-1 mr-3" />
      <Text className="flex-1 text-sm text-blue-700 dark:text-blue-300">
        {recommendation}
      </Text>
    </MotiView>
  );

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-white dark:bg-gray-900">
        {/* Header */}
        <View className="flex-row justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
          <Text className="text-xl font-bold text-gray-900 dark:text-white">
            Risk Analysis
          </Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color="#6b7280" />
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          {/* Tender Info */}
          <View className="p-4 border-b border-gray-200 dark:border-gray-700">
            <Text className="text-lg font-bold text-gray-900 dark:text-white mb-2">
              {isEnglish ? tender.title_en : tender.title_bn}
            </Text>
            <Text className="text-sm text-gray-600 dark:text-gray-400">
              {isEnglish ? tender.organization_en : tender.organization_bn}
            </Text>
          </View>

          {isAnalyzing ? (
            <View className="flex-1 justify-center items-center py-12">
              <MotiView
                animate={{ rotate: '360deg' }}
                transition={{ type: 'timing', duration: 1000, loop: true }}
              >
                <Ionicons name="sync" size={32} color="#0891b2" />
              </MotiView>
              <Text className="text-gray-600 dark:text-gray-400 mt-4">
                Analyzing risk factors...
              </Text>
            </View>
          ) : analysis ? (
            <View className="p-4">
              {/* Risk Score Overview */}
              <MotiView
                from={{ opacity: 0, translateY: 20 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'timing', duration: 600 }}
                className="bg-white dark:bg-gray-800 rounded-xl p-6 mb-6 shadow-sm border border-gray-100 dark:border-gray-700"
              >
                <View className="items-center">
                  <View 
                    className="w-20 h-20 rounded-full items-center justify-center mb-4"
                    style={{ backgroundColor: getRiskColor(analysis.totalScore) + '20' }}
                  >
                    <Text 
                      className="text-2xl font-bold"
                      style={{ color: getRiskColor(analysis.totalScore) }}
                    >
                      {analysis.totalScore}
                    </Text>
                  </View>
                  
                  <Text 
                    className="text-xl font-bold mb-2 capitalize"
                    style={{ color: getRiskColor(analysis.totalScore) }}
                  >
                    {analysis.riskLevel} Risk
                  </Text>
                  
                  {analysis.flagged && (
                    <View className="bg-red-100 dark:bg-red-900/30 px-3 py-1 rounded-full">
                      <Text className="text-red-700 dark:text-red-300 text-sm font-medium">
                        🚩 Flagged for Review
                      </Text>
                    </View>
                  )}
                </View>
              </MotiView>

              {/* Risk Factors */}
              {analysis.factors.length > 0 && (
                <View className="mb-6">
                  <Text className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                    Risk Factors ({analysis.factors.length})
                  </Text>
                  {analysis.factors.map((factor, index) => renderRiskFactor(factor, index))}
                </View>
              )}

              {/* Recommendations */}
              {analysis.recommendations.length > 0 && (
                <View className="mb-6">
                  <Text className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                    Recommendations ({analysis.recommendations.length})
                  </Text>
                  {analysis.recommendations.map((rec, index) => renderRecommendation(rec, index))}
                </View>
              )}

              {/* Risk Categories Breakdown */}
              <View className="mb-6">
                <Text className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                  Risk Categories
                </Text>
                
                {['bidder', 'timeline', 'process', 'transparency', 'supplier'].map((category) => {
                  const categoryFactors = analysis.factors.filter(f => f.category === category);
                  const categoryScore = categoryFactors.reduce((sum, f) => sum + f.score, 0);
                  
                  if (categoryFactors.length === 0) return null;
                  
                  return (
                    <View key={category} className="flex-row justify-between items-center py-3 border-b border-gray-100 dark:border-gray-700">
                      <Text className="font-medium text-gray-900 dark:text-white capitalize">
                        {category} ({categoryFactors.length})
                      </Text>
                      <Text 
                        className="font-bold"
                        style={{ color: getRiskColor(categoryScore) }}
                      >
                        {categoryScore} pts
                      </Text>
                    </View>
                  );
                })}
              </View>

              {/* Analysis Methodology */}
              <View className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <Text className="font-semibold text-gray-900 dark:text-white mb-2">
                  Analysis Methodology
                </Text>
                <Text className="text-sm text-gray-600 dark:text-gray-400 leading-5">
                  This risk assessment analyzes multiple factors including bidder competition, 
                  timeline patterns, supplier track records, and process deviations. Scores are 
                  weighted by impact and combined to determine overall risk level. 
                  Scores ≥70 indicate high risk, 30-69 medium risk, and &lt;30 low risk.
                </Text>
              </View>
            </View>
          ) : (
            <View className="flex-1 justify-center items-center py-12">
              <Ionicons name="alert-circle" size={48} color="#ef4444" />
              <Text className="text-gray-600 dark:text-gray-400 mt-4 text-center">
                Failed to analyze risk factors.{'\n'}Please try again.
              </Text>
              <TouchableOpacity 
                onPress={performRiskAnalysis}
                className="mt-4 bg-primary-500 px-6 py-2 rounded-lg"
              >
                <Text className="text-white font-medium">Retry Analysis</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>

        {/* Action Buttons */}
        {analysis && (
          <View className="p-4 border-t border-gray-200 dark:border-gray-700">
            <View className="flex-row space-x-3">
              <TouchableOpacity 
                className="flex-1 bg-primary-500 rounded-lg p-4 items-center"
                onPress={() => showExportOptions(tender, analysis, i18n.language as 'en' | 'bn')}
                disabled={isExporting}
              >
                <View className="flex-row items-center">
                  {isExporting ? (
                    <MotiView
                      animate={{ rotate: '360deg' }}
                      transition={{ type: 'timing', duration: 1000, loop: true }}
                    >
                      <Ionicons name="sync" size={16} color="white" />
                    </MotiView>
                  ) : (
                    <Ionicons name="download" size={16} color="white" />
                  )}
                  <Text className="text-white font-semibold ml-2">
                    {isExporting ? 'Exporting...' : 'Export Report'}
                  </Text>
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity 
                className="bg-gray-500 rounded-lg p-4 items-center"
                onPress={() => {
                  // TODO: Share analysis data
                  console.log('Share analysis for tender:', tender.id);
                }}
              >
                <Ionicons name="share" size={16} color="white" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
};