/**
 * Test Suite for PermitPath Module - Delay Detection Service
 * Tests permit processing delay analysis and statistical comparison
 */

import { DelayDetectionService, PermitApplication, DelayAnalysis } from '../lib/delay-detection';

describe('PermitPath - Delay Detection Service', () => {
  const mockPermitApplication: PermitApplication = {
    id: 'permit_001',
    type: 'trade_license',
    office: 'Dhaka City Corporation',
    submittedDate: '2024-01-15',
    expectedDays: 15,
    currentStatus: 'under_review',
    district: 'Dhaka',
    applicantId: 'user_001'
  };

  const mockHistoricalData = [
    { type: 'trade_license', office: 'Dhaka City Corporation', actualDays: 18, completedDate: '2024-01-10' },
    { type: 'trade_license', office: 'Dhaka City Corporation', actualDays: 22, completedDate: '2024-01-05' },
    { type: 'trade_license', office: 'Dhaka City Corporation', actualDays: 16, completedDate: '2023-12-20' },
    { type: 'trade_license', office: 'Dhaka City Corporation', actualDays: 25, completedDate: '2023-12-15' },
    { type: 'trade_license', office: 'Dhaka City Corporation', actualDays: 19, completedDate: '2023-12-10' }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock current date
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-02-15'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Delay Detection', () => {
    it('should detect delays correctly for overdue applications', () => {
      const overdueApplication = {
        ...mockPermitApplication,
        submittedDate: '2024-01-01', // 45 days ago
        expectedDays: 15
      };

      const analysis = DelayDetectionService.analyzeDelay(overdueApplication, mockHistoricalData);

      expect(analysis.isDelayed).toBe(true);
      expect(analysis.currentDays).toBe(45);
      expect(analysis.expectedDays).toBe(15);
      expect(analysis.delayDays).toBe(30);
      expect(analysis.delayPercentage).toBeCloseTo(200, 0); // 300% of expected time
    });

    it('should not detect delays for applications within expected timeframe', () => {
      const onTimeApplication = {
        ...mockPermitApplication,
        submittedDate: '2024-02-10', // 5 days ago
        expectedDays: 15
      };

      const analysis = DelayDetectionService.analyzeDelay(onTimeApplication, mockHistoricalData);

      expect(analysis.isDelayed).toBe(false);
      expect(analysis.currentDays).toBe(5);
      expect(analysis.delayDays).toBe(0);
    });

    it('should calculate delay percentage correctly', () => {
      const delayedApplication = {
        ...mockPermitApplication,
        submittedDate: '2024-01-16', // 30 days ago
        expectedDays: 20
      };

      const analysis = DelayDetectionService.analyzeDelay(delayedApplication, mockHistoricalData);

      expect(analysis.delayPercentage).toBeCloseTo(50, 0); // 150% of expected time = 50% delay
    });
  });

  describe('Statistical Analysis', () => {
    it('should calculate average processing time correctly', () => {
      const stats = DelayDetectionService.calculateStatistics(mockHistoricalData);

      const expectedAverage = (18 + 22 + 16 + 25 + 19) / 5; // 20 days
      expect(stats.averageProcessingTime).toBeCloseTo(expectedAverage, 1);
    });

    it('should calculate success rate within expected time', () => {
      const dataWithExpectedTime = mockHistoricalData.map(item => ({
        ...item,
        expectedDays: 20
      }));

      const stats = DelayDetectionService.calculateStatistics(dataWithExpectedTime);

      // 3 out of 5 applications completed within 20 days (18, 16, 19)
      expect(stats.onTimeRate).toBeCloseTo(60, 0);
    });

    it('should identify fastest and slowest processing times', () => {
      const stats = DelayDetectionService.calculateStatistics(mockHistoricalData);

      expect(stats.fastestProcessing).toBe(16);
      expect(stats.slowestProcessing).toBe(25);
    });

    it('should calculate median processing time', () => {
      const stats = DelayDetectionService.calculateStatistics(mockHistoricalData);

      // Sorted: [16, 18, 19, 22, 25] - median is 19
      expect(stats.medianProcessingTime).toBe(19);
    });
  });

  describe('Prediction Algorithm', () => {
    it('should predict completion date based on historical data', () => {
      const prediction = DelayDetectionService.predictCompletion(mockPermitApplication, mockHistoricalData);

      expect(prediction.predictedDays).toBeGreaterThan(0);
      expect(prediction.confidence).toBeGreaterThan(0);
      expect(prediction.confidence).toBeLessThanOrEqual(100);
      expect(prediction.predictedCompletionDate).toBeDefined();
    });

    it('should have higher confidence with more historical data', () => {
      const limitedData = mockHistoricalData.slice(0, 2);
      const fullData = mockHistoricalData;

      const predictionLimited = DelayDetectionService.predictCompletion(mockPermitApplication, limitedData);
      const predictionFull = DelayDetectionService.predictCompletion(mockPermitApplication, fullData);

      expect(predictionFull.confidence).toBeGreaterThanOrEqual(predictionLimited.confidence);
    });

    it('should consider recent data more heavily', () => {
      const recentData = [
        { type: 'trade_license', office: 'Dhaka City Corporation', actualDays: 10, completedDate: '2024-02-01' },
        { type: 'trade_license', office: 'Dhaka City Corporation', actualDays: 12, completedDate: '2024-01-25' }
      ];

      const oldData = [
        { type: 'trade_license', office: 'Dhaka City Corporation', actualDays: 30, completedDate: '2023-06-01' },
        { type: 'trade_license', office: 'Dhaka City Corporation', actualDays: 35, completedDate: '2023-05-01' }
      ];

      const recentPrediction = DelayDetectionService.predictCompletion(mockPermitApplication, recentData);
      const oldPrediction = DelayDetectionService.predictCompletion(mockPermitApplication, oldData);

      expect(recentPrediction.predictedDays).toBeLessThan(oldPrediction.predictedDays);
    });
  });

  describe('Risk Assessment', () => {
    it('should assess delay risk correctly for high-risk applications', () => {
      const highRiskApplication = {
        ...mockPermitApplication,
        submittedDate: '2024-01-20', // Already past half of expected time
        expectedDays: 15
      };

      const riskAssessment = DelayDetectionService.assessDelayRisk(highRiskApplication, mockHistoricalData);

      expect(riskAssessment.riskLevel).toBe('high');
      expect(riskAssessment.riskFactors.length).toBeGreaterThan(0);
    });

    it('should assess delay risk correctly for low-risk applications', () => {
      const lowRiskApplication = {
        ...mockPermitApplication,
        submittedDate: '2024-02-12', // Just submitted
        expectedDays: 15
      };

      const riskAssessment = DelayDetectionService.assessDelayRisk(lowRiskApplication, mockHistoricalData);

      expect(riskAssessment.riskLevel).toBe('low');
    });

    it('should identify specific risk factors', () => {
      const riskApplication = {
        ...mockPermitApplication,
        submittedDate: '2024-01-01', // Very old
        office: 'Slow Processing Office'
      };

      const riskAssessment = DelayDetectionService.assessDelayRisk(riskApplication, mockHistoricalData);

      expect(riskAssessment.riskFactors).toContain('excessive_processing_time');
    });
  });

  describe('Office Performance Comparison', () => {
    it('should compare office performance accurately', () => {
      const multiOfficeData = [
        ...mockHistoricalData, // Dhaka City Corporation
        { type: 'trade_license', office: 'Chittagong City Corporation', actualDays: 12, completedDate: '2024-01-10' },
        { type: 'trade_license', office: 'Chittagong City Corporation', actualDays: 14, completedDate: '2024-01-05' },
        { type: 'trade_license', office: 'Chittagong City Corporation', actualDays: 13, completedDate: '2023-12-20' }
      ];

      const comparison = DelayDetectionService.compareOfficePerformance(multiOfficeData);

      expect(comparison).toHaveProperty('Dhaka City Corporation');
      expect(comparison).toHaveProperty('Chittagong City Corporation');
      
      // Chittagong should have better (lower) average processing time
      expect(comparison['Chittagong City Corporation'].averageProcessingTime)
        .toBeLessThan(comparison['Dhaka City Corporation'].averageProcessingTime);
    });

    it('should rank offices by performance', () => {
      const multiOfficeData = [
        { type: 'trade_license', office: 'Fast Office', actualDays: 10, completedDate: '2024-01-10' },
        { type: 'trade_license', office: 'Fast Office', actualDays: 12, completedDate: '2024-01-05' },
        { type: 'trade_license', office: 'Slow Office', actualDays: 25, completedDate: '2024-01-10' },
        { type: 'trade_license', office: 'Slow Office', actualDays: 30, completedDate: '2024-01-05' }
      ];

      const ranking = DelayDetectionService.rankOfficesByPerformance(multiOfficeData);

      expect(ranking[0].office).toBe('Fast Office');
      expect(ranking[1].office).toBe('Slow Office');
      expect(ranking[0].averageProcessingTime).toBeLessThan(ranking[1].averageProcessingTime);
    });
  });

  describe('Seasonal Analysis', () => {
    it('should detect seasonal patterns in processing times', () => {
      const seasonalData = [
        { type: 'trade_license', office: 'Test Office', actualDays: 15, completedDate: '2023-12-15' }, // Winter
        { type: 'trade_license', office: 'Test Office', actualDays: 25, completedDate: '2023-06-15' }, // Summer
        { type: 'trade_license', office: 'Test Office', actualDays: 18, completedDate: '2023-03-15' }, // Spring
        { type: 'trade_license', office: 'Test Office', actualDays: 22, completedDate: '2023-09-15' }  // Fall
      ];

      const seasonalAnalysis = DelayDetectionService.analyzeSeasonalPatterns(seasonalData);

      expect(seasonalAnalysis).toHaveProperty('winter');
      expect(seasonalAnalysis).toHaveProperty('summer');
      expect(seasonalAnalysis).toHaveProperty('spring');
      expect(seasonalAnalysis).toHaveProperty('fall');
    });
  });

  describe('Edge Cases', () => {
    it('should handle applications with no historical data', () => {
      const analysis = DelayDetectionService.analyzeDelay(mockPermitApplication, []);

      expect(analysis).toBeDefined();
      expect(analysis.historicalAverage).toBeUndefined();
    });

    it('should handle future submission dates gracefully', () => {
      const futureApplication = {
        ...mockPermitApplication,
        submittedDate: '2024-12-01' // Future date
      };

      const analysis = DelayDetectionService.analyzeDelay(futureApplication, mockHistoricalData);

      expect(analysis.currentDays).toBe(0);
      expect(analysis.isDelayed).toBe(false);
    });

    it('should handle invalid date formats', () => {
      const invalidDateApplication = {
        ...mockPermitApplication,
        submittedDate: 'invalid-date'
      };

      expect(() => {
        DelayDetectionService.analyzeDelay(invalidDateApplication, mockHistoricalData);
      }).not.toThrow();
    });

    it('should handle applications with zero expected days', () => {
      const zeroExpectedApplication = {
        ...mockPermitApplication,
        expectedDays: 0
      };

      const analysis = DelayDetectionService.analyzeDelay(zeroExpectedApplication, mockHistoricalData);

      expect(analysis).toBeDefined();
      expect(analysis.isDelayed).toBeDefined();
    });
  });

  describe('Performance', () => {
    it('should handle large datasets efficiently', () => {
      // Generate large dataset
      const largeDataset = Array.from({ length: 10000 }, (_, index) => ({
        type: 'trade_license',
        office: `Office ${index % 100}`,
        actualDays: Math.floor(Math.random() * 30) + 10,
        completedDate: new Date(2024, 0, index % 365 + 1).toISOString().split('T')[0]
      }));

      const startTime = Date.now();
      DelayDetectionService.calculateStatistics(largeDataset);
      const endTime = Date.now();

      // Should process large dataset within 1 second
      expect(endTime - startTime).toBeLessThan(1000);
    });
  });
});