import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { PDFExportService, PDFExportOptions } from '@/lib/pdf-export';
import { TenderData, RiskAnalysis } from '@/lib/risk-scoring';

export const usePDFExport = () => {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const pdfService = PDFExportService.getInstance();

  const exportRiskBrief = useCallback(async (
    tender: TenderData,
    riskAnalysis: RiskAnalysis,
    options?: Partial<PDFExportOptions>
  ): Promise<boolean> => {
    try {
      setIsExporting(true);
      setError(null);
      
      const defaultOptions: PDFExportOptions = {
        includeRiskFactors: true,
        includeRecommendations: true,
        includeTimeline: true,
        includeSupplierInfo: false,
        language: 'en'
      };
      
      const finalOptions = { ...defaultOptions, ...options };
      
      const success = await pdfService.exportRiskBrief(tender, riskAnalysis, finalOptions);
      
      if (success) {
        Alert.alert(
          'Export Successful',
          'Risk brief has been exported and shared successfully.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Export Failed',
          'Unable to share the PDF. Please try again.',
          [{ text: 'OK' }]
        );
      }
      
      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('PDF export failed:', err);
      
      Alert.alert(
        'Export Error',
        `Failed to export PDF: ${errorMessage}`,
        [{ text: 'OK' }]
      );
      
      return false;
    } finally {
      setIsExporting(false);
    }
  }, [pdfService]);

  const exportTenderList = useCallback(async (
    tenders: TenderData[],
    title?: string,
    language?: 'en' | 'bn'
  ): Promise<boolean> => {
    try {
      setIsExporting(true);
      setError(null);
      
      if (tenders.length === 0) {
        Alert.alert(
          'No Data',
          'No tenders available to export.',
          [{ text: 'OK' }]
        );
        return false;
      }
      
      const success = await pdfService.exportTenderList(
        tenders,
        title || 'Tender List',
        language || 'en'
      );
      
      if (success) {
        Alert.alert(
          'Export Successful',
          'Tender list has been exported and shared successfully.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Export Failed',
          'Unable to share the PDF. Please try again.',
          [{ text: 'OK' }]
        );
      }
      
      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Tender list export failed:', err);
      
      Alert.alert(
        'Export Error',
        `Failed to export tender list: ${errorMessage}`,
        [{ text: 'OK' }]
      );
      
      return false;
    } finally {
      setIsExporting(false);
    }
  }, [pdfService]);

  const showExportOptions = useCallback((
    tender: TenderData,
    riskAnalysis: RiskAnalysis,
    currentLanguage: 'en' | 'bn'
  ) => {
    Alert.alert(
      'Export Options',
      'Choose what to include in the risk brief:',
      [
        {
          text: 'Quick Export',
          onPress: () => exportRiskBrief(tender, riskAnalysis, {
            language: currentLanguage,
            includeRiskFactors: true,
            includeRecommendations: true,
            includeTimeline: false,
            includeSupplierInfo: false
          })
        },
        {
          text: 'Detailed Export',
          onPress: () => exportRiskBrief(tender, riskAnalysis, {
            language: currentLanguage,
            includeRiskFactors: true,
            includeRecommendations: true,
            includeTimeline: true,
            includeSupplierInfo: true
          })
        },
        {
          text: 'Cancel',
          style: 'cancel'
        }
      ]
    );
  }, [exportRiskBrief]);

  return {
    isExporting,
    error,
    exportRiskBrief,
    exportTenderList,
    showExportOptions
  };
};