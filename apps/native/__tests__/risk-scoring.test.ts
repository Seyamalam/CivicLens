/**
 * Test Suite for ProcureLens Module - Risk Scoring Service
 * Tests the core corruption risk analysis algorithm
 */

import { RiskScoringService, RiskFactors, TenderData } from '../lib/risk-scoring';

describe('ProcureLens - Risk Scoring Service', () => {
  const mockTender: TenderData = {
    id: 'T-2024-001',
    title: 'Test Tender',
    organization: 'Test Ministry',
    amount: 1000000,
    submissionStart: '2024-01-01',
    submissionEnd: '2024-01-15',
    deadline: '2024-01-15',
    bidders: 3,
    winnerHistory: {
      'Test Company': 2,
      'Other Company': 1
    },
    category: 'construction',
    previousTenders: [],
    processDeviations: []
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateRiskScore', () => {
    it('should calculate risk score correctly for low-risk tender', () => {
      const lowRiskTender = {
        ...mockTender,
        bidders: 5,
        amount: 500000,
        submissionStart: '2024-01-01',
        submissionEnd: '2024-01-30' // 29 days window
      };

      const result = RiskScoringService.calculateRiskScore(lowRiskTender);

      expect(result.totalScore).toBeLessThan(30);
      expect(result.riskLevel).toBe('low');
      expect(result.flags).toHaveLength(0);
    });

    it('should detect single bidder risk factor', () => {
      const singleBidderTender = {
        ...mockTender,
        bidders: 1
      };

      const result = RiskScoringService.calculateRiskScore(singleBidderTender);

      expect(result.factors.singleBidder).toBe(40);
      expect(result.flags).toContain('single_bidder');
      expect(result.totalScore).toBeGreaterThanOrEqual(40);
    });

    it('should detect short submission window', () => {
      const shortWindowTender = {
        ...mockTender,
        submissionStart: '2024-01-10',
        submissionEnd: '2024-01-15' // 5 days only
      };

      const result = RiskScoringService.calculateRiskScore(shortWindowTender);

      expect(result.factors.shortWindow).toBe(25);
      expect(result.flags).toContain('short_window');
    });

    it('should detect repeat winner pattern', () => {
      const repeatWinnerTender = {
        ...mockTender,
        winnerHistory: {
          'Frequent Winner': 5,
          'Other Company': 1
        }
      };

      const result = RiskScoringService.calculateRiskScore(repeatWinnerTender);

      expect(result.factors.repeatWinner).toBe(30);
      expect(result.flags).toContain('repeat_winner');
    });

    it('should detect high-value tender risk', () => {
      const highValueTender = {
        ...mockTender,
        amount: 50000000 // 5 crore
      };

      const result = RiskScoringService.calculateRiskScore(highValueTender);

      expect(result.factors.valueVsCompetition).toBeGreaterThan(0);
      expect(result.flags).toContain('high_value');
    });

    it('should handle multiple risk factors correctly', () => {
      const highRiskTender = {
        ...mockTender,
        bidders: 1, // Single bidder
        amount: 100000000, // Very high value
        submissionStart: '2024-01-12',
        submissionEnd: '2024-01-15', // Short window
        winnerHistory: {
          'Monopoly Corp': 10 // Repeat winner
        },
        processDeviations: ['timeline_change', 'criteria_modification']
      };

      const result = RiskScoringService.calculateRiskScore(highRiskTender);

      expect(result.totalScore).toBeGreaterThan(70);
      expect(result.riskLevel).toBe('high');
      expect(result.flags.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('Risk Level Classification', () => {
    it('should classify low risk correctly', () => {
      const mockFactors: RiskFactors = {
        singleBidder: 0,
        shortWindow: 0,
        repeatWinner: 0,
        amountPattern: 10,
        valueVsCompetition: 5,
        supplierTrackRecord: 0,
        processDeviation: 0,
        timelineIrregularities: 0
      };

      const level = RiskScoringService.getRiskLevel(mockFactors);
      expect(level).toBe('low');
    });

    it('should classify medium risk correctly', () => {
      const mockFactors: RiskFactors = {
        singleBidder: 0,
        shortWindow: 25,
        repeatWinner: 30,
        amountPattern: 0,
        valueVsCompetition: 0,
        supplierTrackRecord: 0,
        processDeviation: 0,
        timelineIrregularities: 0
      };

      const level = RiskScoringService.getRiskLevel(mockFactors);
      expect(level).toBe('medium');
    });

    it('should classify high risk correctly', () => {
      const mockFactors: RiskFactors = {
        singleBidder: 40,
        shortWindow: 25,
        repeatWinner: 30,
        amountPattern: 20,
        valueVsCompetition: 35,
        supplierTrackRecord: 25,
        processDeviation: 15,
        timelineIrregularities: 20
      };

      const level = RiskScoringService.getRiskLevel(mockFactors);
      expect(level).toBe('high');
    });
  });

  describe('Flag Generation', () => {
    it('should generate appropriate flags for risk factors', () => {
      const factors: RiskFactors = {
        singleBidder: 40,
        shortWindow: 25,
        repeatWinner: 30,
        amountPattern: 20,
        valueVsCompetition: 35,
        supplierTrackRecord: 25,
        processDeviation: 15,
        timelineIrregularities: 20
      };

      const flags = RiskScoringService.generateFlags(factors);

      expect(flags).toContain('single_bidder');
      expect(flags).toContain('short_window');
      expect(flags).toContain('repeat_winner');
      expect(flags).toContain('amount_pattern');
      expect(flags).toContain('process_deviation');
    });

    it('should not generate flags for zero risk factors', () => {
      const factors: RiskFactors = {
        singleBidder: 0,
        shortWindow: 0,
        repeatWinner: 0,
        amountPattern: 0,
        valueVsCompetition: 0,
        supplierTrackRecord: 0,
        processDeviation: 0,
        timelineIrregularities: 0
      };

      const flags = RiskScoringService.generateFlags(factors);
      expect(flags).toHaveLength(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle tender with no historical data', () => {
      const noHistoryTender = {
        ...mockTender,
        winnerHistory: {},
        previousTenders: []
      };

      const result = RiskScoringService.calculateRiskScore(noHistoryTender);

      expect(result).toBeDefined();
      expect(result.totalScore).toBeGreaterThanOrEqual(0);
      expect(typeof result.riskLevel).toBe('string');
    });

    it('should handle invalid date ranges', () => {
      const invalidDateTender = {
        ...mockTender,
        submissionStart: '2024-01-15',
        submissionEnd: '2024-01-10' // End before start
      };

      const result = RiskScoringService.calculateRiskScore(invalidDateTender);

      expect(result).toBeDefined();
      expect(result.factors.shortWindow).toBeGreaterThanOrEqual(0);
    });

    it('should handle zero amount tender', () => {
      const zeroAmountTender = {
        ...mockTender,
        amount: 0
      };

      const result = RiskScoringService.calculateRiskScore(zeroAmountTender);

      expect(result).toBeDefined();
      expect(result.factors.valueVsCompetition).toBe(0);
    });

    it('should handle negative bidder count', () => {
      const negativeBidderTender = {
        ...mockTender,
        bidders: -1
      };

      const result = RiskScoringService.calculateRiskScore(negativeBidderTender);

      expect(result).toBeDefined();
      expect(result.factors.singleBidder).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Performance', () => {
    it('should calculate risk score efficiently for large datasets', () => {
      const startTime = Date.now();
      
      // Test with 100 tenders
      for (let i = 0; i < 100; i++) {
        const testTender = {
          ...mockTender,
          id: `T-2024-${i.toString().padStart(3, '0')}`,
          amount: Math.random() * 100000000,
          bidders: Math.floor(Math.random() * 10) + 1
        };
        
        RiskScoringService.calculateRiskScore(testTender);
      }
      
      const endTime = Date.now();
      const executionTime = endTime - startTime;
      
      // Should complete within 1 second for 100 calculations
      expect(executionTime).toBeLessThan(1000);
    });
  });
});