import { getDatabase, TABLES } from './database';

export interface RiskFactor {
  id: string;
  name: string;
  description: string;
  score: number;
  weight: number;
  category: 'bidder' | 'timeline' | 'process' | 'transparency' | 'supplier';
}

export interface RiskAnalysis {
  totalScore: number;
  riskLevel: 'low' | 'medium' | 'high';
  factors: RiskFactor[];
  recommendations: string[];
  flagged: boolean;
}

export interface TenderData {
  id: string;
  title_en: string;
  title_bn: string;
  organization_en: string;
  organization_bn: string;
  amount: number;
  deadline: string;
  submission_start: string;
  submission_end: string;
  tender_type: string;
  procurement_method: string;
  supplier_count?: number;
  winning_supplier_id?: string;
  previous_contracts?: any[];
}

export class RiskScoringService {
  private static instance: RiskScoringService;
  
  public static getInstance(): RiskScoringService {
    if (!RiskScoringService.instance) {
      RiskScoringService.instance = new RiskScoringService();
    }
    return RiskScoringService.instance;
  }

  /**
   * Calculate comprehensive risk score for a tender
   */
  async calculateRiskScore(tender: TenderData): Promise<RiskAnalysis> {
    const factors: RiskFactor[] = [];
    let totalScore = 0;
    const recommendations: string[] = [];

    // 1. Single Bidder Risk (+40 points)
    const singleBidderRisk = await this.analyzeSingleBidder(tender);
    if (singleBidderRisk.score > 0) {
      factors.push(singleBidderRisk);
      totalScore += singleBidderRisk.score;
      recommendations.push('Investigate why only one supplier submitted a bid. Consider extending deadline or revising requirements.');
    }

    // 2. Short Submission Window (+25 points)
    const shortWindowRisk = this.analyzeSubmissionWindow(tender);
    if (shortWindowRisk.score > 0) {
      factors.push(shortWindowRisk);
      totalScore += shortWindowRisk.score;
      recommendations.push('Submission window may be too short, potentially limiting competition.');
    }

    // 3. Repeat Winner Pattern (+30 points)
    const repeatWinnerRisk = await this.analyzeRepeatWinner(tender);
    if (repeatWinnerRisk.score > 0) {
      factors.push(repeatWinnerRisk);
      totalScore += repeatWinnerRisk.score;
      recommendations.push('Same supplier wins frequently. Review selection criteria and process transparency.');
    }

    // 4. Unusual Amount Patterns (+20 points)
    const amountRisk = await this.analyzeAmountPatterns(tender);
    if (amountRisk.score > 0) {
      factors.push(amountRisk);
      totalScore += amountRisk.score;
      recommendations.push('Tender amount appears unusual compared to similar contracts. Verify budget justification.');
    }

    // 5. High-Value Low-Competition (+35 points)
    const valueCompetitionRisk = await this.analyzeValueVsCompetition(tender);
    if (valueCompetitionRisk.score > 0) {
      factors.push(valueCompetitionRisk);
      totalScore += valueCompetitionRisk.score;
      recommendations.push('High-value tender with limited competition requires additional oversight.');
    }

    // 6. Supplier Track Record Issues (+25 points)
    const supplierRisk = await this.analyzeSupplierTrackRecord(tender);
    if (supplierRisk.score > 0) {
      factors.push(supplierRisk);
      totalScore += supplierRisk.score;
      recommendations.push('Winning supplier has concerning track record. Verify qualifications and references.');
    }

    // 7. Process Deviation (+15 points)
    const processRisk = this.analyzeProcessDeviations(tender);
    if (processRisk.score > 0) {
      factors.push(processRisk);
      totalScore += processRisk.score;
      recommendations.push('Procurement process deviates from standard procedures. Review compliance.');
    }

    // 8. Timeline Irregularities (+20 points)
    const timelineRisk = this.analyzeTimelineIrregularities(tender);
    if (timelineRisk.score > 0) {
      factors.push(timelineRisk);
      totalScore += timelineRisk.score;
      recommendations.push('Irregular timeline patterns detected. Verify schedule legitimacy.');
    }

    // Determine risk level
    const riskLevel = this.determineRiskLevel(totalScore);
    const flagged = totalScore >= 50; // Flag for manual review if score is 50+

    return {
      totalScore: Math.min(totalScore, 100), // Cap at 100
      riskLevel,
      factors,
      recommendations,
      flagged
    };
  }

  /**
   * Analyze single bidder risk
   */
  private async analyzeSingleBidder(tender: TenderData): Promise<RiskFactor> {
    const bidderCount = tender.supplier_count || 1;
    
    if (bidderCount === 1) {
      return {
        id: 'single_bidder',
        name: 'Single Bidder',
        description: 'Only one supplier submitted a bid for this tender',
        score: 40,
        weight: 0.4,
        category: 'bidder'
      };
    }
    
    return {
      id: 'single_bidder',
      name: 'Single Bidder',
      description: 'Multiple bidders participated',
      score: 0,
      weight: 0.4,
      category: 'bidder'
    };
  }

  /**
   * Analyze submission window duration
   */
  private analyzeSubmissionWindow(tender: TenderData): RiskFactor {
    const startDate = new Date(tender.submission_start);
    const endDate = new Date(tender.submission_end);
    const windowDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Risk factors based on submission window
    let score = 0;
    let description = `Submission window: ${windowDays} days`;
    
    if (windowDays < 7) {
      score = 25;
      description += ' (Very short - may limit competition)';
    } else if (windowDays < 14) {
      score = 15;
      description += ' (Short - may affect participation)';
    } else if (windowDays < 21) {
      score = 5;
      description += ' (Adequate but tight)';
    }
    
    return {
      id: 'submission_window',
      name: 'Submission Window',
      description,
      score,
      weight: 0.25,
      category: 'timeline'
    };
  }

  /**
   * Analyze repeat winner patterns
   */
  private async analyzeRepeatWinner(tender: TenderData): Promise<RiskFactor> {
    if (!tender.winning_supplier_id) {
      return {
        id: 'repeat_winner',
        name: 'Repeat Winner',
        description: 'No winner data available',
        score: 0,
        weight: 0.3,
        category: 'supplier'
      };
    }

    try {
      const db = getDatabase();
      
      // Check how many contracts this supplier has won in the last year
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      
      const winCount = await db.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) as count FROM ${TABLES.TENDERS} 
         WHERE winning_supplier_id = ? AND created_at >= ? AND id != ?`,
        [tender.winning_supplier_id, oneYearAgo.toISOString(), tender.id]
      );

      const wins = winCount?.count || 0;
      let score = 0;
      let description = `Supplier won ${wins} contracts in last year`;

      if (wins >= 10) {
        score = 30;
        description += ' (Very high win rate - potential monopoly)';
      } else if (wins >= 5) {
        score = 20;
        description += ' (High win rate - review competition)';
      } else if (wins >= 3) {
        score = 10;
        description += ' (Moderate win rate)';
      }

      return {
        id: 'repeat_winner',
        name: 'Repeat Winner',
        description,
        score,
        weight: 0.3,
        category: 'supplier'
      };
    } catch (error) {
      console.error('Error analyzing repeat winner:', error);
      return {
        id: 'repeat_winner',
        name: 'Repeat Winner',
        description: 'Error analyzing win patterns',
        score: 0,
        weight: 0.3,
        category: 'supplier'
      };
    }
  }

  /**
   * Analyze amount patterns against similar tenders
   */
  private async analyzeAmountPatterns(tender: TenderData): Promise<RiskFactor> {
    try {
      const db = getDatabase();
      
      // Get similar tenders (same type, similar size)
      const similarTenders = await db.getAllAsync<{ amount: number }>(
        `SELECT amount FROM ${TABLES.TENDERS} 
         WHERE tender_type = ? AND amount BETWEEN ? AND ? AND id != ?
         ORDER BY created_at DESC LIMIT 20`,
        [
          tender.tender_type,
          tender.amount * 0.5, // 50% below
          tender.amount * 2,   // 200% above
          tender.id
        ]
      );

      if (similarTenders.length < 3) {
        return {
          id: 'amount_pattern',
          name: 'Amount Analysis',
          description: 'Insufficient similar tenders for comparison',
          score: 0,
          weight: 0.2,
          category: 'transparency'
        };
      }

      const amounts = similarTenders.map(t => t.amount);
      const avgAmount = amounts.reduce((sum, amt) => sum + amt, 0) / amounts.length;
      const deviation = Math.abs(tender.amount - avgAmount) / avgAmount;

      let score = 0;
      let description = `Amount ${deviation > 0 ? 'above' : 'below'} average by ${(deviation * 100).toFixed(1)}%`;

      if (deviation > 0.5) { // 50% deviation
        score = 20;
        description += ' (Significant deviation from similar tenders)';
      } else if (deviation > 0.3) { // 30% deviation
        score = 10;
        description += ' (Moderate deviation)';
      }

      return {
        id: 'amount_pattern',
        name: 'Amount Analysis',
        description,
        score,
        weight: 0.2,
        category: 'transparency'
      };
    } catch (error) {
      console.error('Error analyzing amount patterns:', error);
      return {
        id: 'amount_pattern',
        name: 'Amount Analysis',
        description: 'Error analyzing amount patterns',
        score: 0,
        weight: 0.2,
        category: 'transparency'
      };
    }
  }

  /**
   * Analyze value vs competition relationship
   */
  private async analyzeValueVsCompetition(tender: TenderData): Promise<RiskFactor> {
    const amount = tender.amount;
    const bidderCount = tender.supplier_count || 1;
    
    let score = 0;
    let description = `High-value (${amount >= 10000000 ? 'Crore+' : 'Lakh+'}) tender with ${bidderCount} bidder(s)`;
    
    // High value (>1 crore) with low competition
    if (amount >= 10000000 && bidderCount === 1) {
      score = 35;
      description += ' (Critical: High-value single bidder)';
    } else if (amount >= 10000000 && bidderCount === 2) {
      score = 25;
      description += ' (High risk: Limited competition for high value)';
    } else if (amount >= 5000000 && bidderCount === 1) {
      score = 20;
      description += ' (Medium-high risk: Single bidder for significant amount)';
    }
    
    return {
      id: 'value_competition',
      name: 'Value vs Competition',
      description,
      score,
      weight: 0.35,
      category: 'bidder'
    };
  }

  /**
   * Analyze supplier track record
   */
  private async analyzeSupplierTrackRecord(tender: TenderData): Promise<RiskFactor> {
    if (!tender.winning_supplier_id) {
      return {
        id: 'supplier_track_record',
        name: 'Supplier Track Record',
        description: 'No supplier data available',
        score: 0,
        weight: 0.25,
        category: 'supplier'
      };
    }

    try {
      const db = getDatabase();
      
      // Get supplier information
      const supplier = await db.getFirstAsync<any>(
        `SELECT * FROM ${TABLES.SUPPLIERS} WHERE id = ?`,
        [tender.winning_supplier_id]
      );

      if (!supplier) {
        return {
          id: 'supplier_track_record',
          name: 'Supplier Track Record',
          description: 'Supplier not found in database',
          score: 15,
          weight: 0.25,
          category: 'supplier'
        };
      }

      let score = 0;
      let description = `Supplier: ${supplier.name_en} (Risk Score: ${supplier.risk_score || 0})`;

      // Check supplier's own risk score
      if (supplier.risk_score >= 70) {
        score = 25;
        description += ' (High-risk supplier)';
      } else if (supplier.risk_score >= 40) {
        score = 15;
        description += ' (Medium-risk supplier)';
      }

      // Check if supplier is newly registered
      const registrationAge = new Date().getFullYear() - (supplier.established_year || new Date().getFullYear());
      if (registrationAge < 1) {
        score += 10;
        description += ' (Newly established)';
      }

      return {
        id: 'supplier_track_record',
        name: 'Supplier Track Record',
        description,
        score,
        weight: 0.25,
        category: 'supplier'
      };
    } catch (error) {
      console.error('Error analyzing supplier track record:', error);
      return {
        id: 'supplier_track_record',
        name: 'Supplier Track Record',
        description: 'Error analyzing supplier data',
        score: 10,
        weight: 0.25,
        category: 'supplier'
      };
    }
  }

  /**
   * Analyze process deviations
   */
  private analyzeProcessDeviations(tender: TenderData): RiskFactor {
    let score = 0;
    let description = 'Standard procurement process';
    
    // Check for emergency/direct procurement
    if (tender.procurement_method === 'direct' || tender.procurement_method === 'emergency') {
      score = 15;
      description = `${tender.procurement_method} procurement (bypasses normal competition)`;
    }
    
    return {
      id: 'process_deviation',
      name: 'Process Deviation',
      description,
      score,
      weight: 0.15,
      category: 'process'
    };
  }

  /**
   * Analyze timeline irregularities
   */
  private analyzeTimelineIrregularities(tender: TenderData): RiskFactor {
    const submissionStart = new Date(tender.submission_start);
    const submissionEnd = new Date(tender.submission_end);
    const deadline = new Date(tender.deadline);
    
    let score = 0;
    let description = 'Timeline appears regular';
    
    // Check if deadline is very close to submission end
    const daysToDeadline = Math.ceil((deadline.getTime() - submissionEnd.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysToDeadline < 7) {
      score = 20;
      description = `Very short evaluation period (${daysToDeadline} days)`;
    } else if (daysToDeadline < 14) {
      score = 10;
      description = `Short evaluation period (${daysToDeadline} days)`;
    }
    
    // Check if submission period is on weekends/holidays (simplified check)
    const startDay = submissionStart.getDay();
    const endDay = submissionEnd.getDay();
    if (startDay === 0 || startDay === 6 || endDay === 0 || endDay === 6) {
      score += 5;
      description += ' (Weekend submission period)';
    }
    
    return {
      id: 'timeline_irregularities',
      name: 'Timeline Analysis',
      description,
      score,
      weight: 0.2,
      category: 'timeline'
    };
  }

  /**
   * Determine risk level based on total score
   */
  private determineRiskLevel(score: number): 'low' | 'medium' | 'high' {
    if (score >= 70) return 'high';
    if (score >= 30) return 'medium';
    return 'low';
  }

  /**
   * Batch update risk scores for multiple tenders
   */
  async updateTenderRiskScores(tenderIds: string[]): Promise<void> {
    const db = getDatabase();
    
    for (const tenderId of tenderIds) {
      try {
        const tender = await db.getFirstAsync<TenderData>(
          `SELECT * FROM ${TABLES.TENDERS} WHERE id = ?`,
          [tenderId]
        );
        
        if (tender) {
          const riskAnalysis = await this.calculateRiskScore(tender);
          
          await db.runAsync(
            `UPDATE ${TABLES.TENDERS} 
             SET risk_score = ?, risk_flags = ? 
             WHERE id = ?`,
            [
              riskAnalysis.totalScore,
              JSON.stringify(riskAnalysis.factors.map(f => f.id)),
              tenderId
            ]
          );
        }
      } catch (error) {
        console.error(`Error updating risk score for tender ${tenderId}:`, error);
      }
    }
  }

  /**
   * Get risk insights for organization/department
   */
  async getOrganizationRiskInsights(organizationName: string): Promise<{
    averageRiskScore: number;
    highRiskCount: number;
    totalTenders: number;
    commonRiskFactors: string[];
  }> {
    try {
      const db = getDatabase();
      
      const tenders = await db.getAllAsync<{ risk_score: number; risk_flags: string }>(
        `SELECT risk_score, risk_flags FROM ${TABLES.TENDERS} 
         WHERE organization_en LIKE ? OR organization_bn LIKE ?`,
        [`%${organizationName}%`, `%${organizationName}%`]
      );

      const totalTenders = tenders.length;
      const averageRiskScore = tenders.reduce((sum, t) => sum + (t.risk_score || 0), 0) / totalTenders;
      const highRiskCount = tenders.filter(t => (t.risk_score || 0) >= 70).length;
      
      // Extract common risk factors
      const allFactors: string[] = [];
      tenders.forEach(t => {
        try {
          const factors = JSON.parse(t.risk_flags || '[]');
          allFactors.push(...factors);
        } catch (e) {
          // Ignore parse errors
        }
      });
      
      const factorCounts = allFactors.reduce((acc, factor) => {
        acc[factor] = (acc[factor] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const commonRiskFactors = Object.entries(factorCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([factor]) => factor);

      return {
        averageRiskScore,
        highRiskCount,
        totalTenders,
        commonRiskFactors
      };
    } catch (error) {
      console.error('Error getting organization risk insights:', error);
      return {
        averageRiskScore: 0,
        highRiskCount: 0,
        totalTenders: 0,
        commonRiskFactors: []
      };
    }
  }
}