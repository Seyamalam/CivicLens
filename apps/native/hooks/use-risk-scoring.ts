import { useState, useCallback } from 'react';
import { RiskScoringService, RiskAnalysis, TenderData } from '@/lib/risk-scoring';

export const useRiskScoring = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const riskService = RiskScoringService.getInstance();

  const analyzeRisk = useCallback(async (tender: TenderData): Promise<RiskAnalysis | null> => {
    try {
      setIsAnalyzing(true);
      setError(null);
      
      const analysis = await riskService.calculateRiskScore(tender);
      return analysis;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Risk analysis failed:', err);
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  }, [riskService]);

  const updateTenderRiskScores = useCallback(async (tenderIds: string[]): Promise<boolean> => {
    try {
      setIsAnalyzing(true);
      setError(null);
      
      await riskService.updateTenderRiskScores(tenderIds);
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Risk score update failed:', err);
      return false;
    } finally {
      setIsAnalyzing(false);
    }
  }, [riskService]);

  const getOrganizationInsights = useCallback(async (organizationName: string) => {
    try {
      setIsAnalyzing(true);
      setError(null);
      
      const insights = await riskService.getOrganizationRiskInsights(organizationName);
      return insights;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Organization insights failed:', err);
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  }, [riskService]);

  const getRiskColor = useCallback((riskScore: number): string => {
    if (riskScore >= 70) return '#dc2626'; // High risk - red
    if (riskScore >= 30) return '#ea580c'; // Medium risk - orange
    return '#84cc16'; // Low risk - green
  }, []);

  const getRiskLabel = useCallback((riskScore: number): string => {
    if (riskScore >= 70) return 'High Risk';
    if (riskScore >= 30) return 'Medium Risk';
    return 'Low Risk';
  }, []);

  const getRiskIcon = useCallback((riskScore: number): string => {
    if (riskScore >= 70) return 'warning';
    if (riskScore >= 30) return 'alert-circle';
    return 'checkmark-circle';
  }, []);

  const formatRiskFactors = useCallback((factors: any[]): string[] => {
    return factors.map(factor => {
      switch (factor.id) {
        case 'single_bidder':
          return 'Single bidder only';
        case 'submission_window':
          return 'Short submission window';
        case 'repeat_winner':
          return 'Frequent winner pattern';
        case 'amount_pattern':
          return 'Unusual amount pattern';
        case 'value_competition':
          return 'High value, low competition';
        case 'supplier_track_record':
          return 'Supplier track record issues';
        case 'process_deviation':
          return 'Process deviation';
        case 'timeline_irregularities':
          return 'Timeline irregularities';
        default:
          return factor.name || 'Unknown risk factor';
      }
    });
  }, []);

  return {
    isAnalyzing,
    error,
    analyzeRisk,
    updateTenderRiskScores,
    getOrganizationInsights,
    getRiskColor,
    getRiskLabel,
    getRiskIcon,
    formatRiskFactors
  };
};