import { getDatabase, TABLES } from './database';

export interface DelayAnalysis {
  permitType: string;
  applicationId: string;
  expectedDays: number;
  actualDays: number;
  delayDays: number;
  delayPercentage: number;
  delayCategory: 'on_time' | 'minor_delay' | 'moderate_delay' | 'severe_delay';
  crowdAverage: number;
  officialStandard: number;
  isDelayed: boolean;
}

export interface DelayStatistics {
  totalApplications: number;
  onTimeApplications: number;
  delayedApplications: number;
  averageDelayDays: number;
  averageCompletionTime: number;
  delayRate: number;
  mostDelayedPermitType: string;
  officeBenchmarks: Record<string, {
    averageDays: number;
    delayRate: number;
    totalApplications: number;
  }>;
}

export interface DelayPattern {
  permitType: string;
  office: string;
  averageDelay: number;
  maxDelay: number;
  minDelay: number;
  delayFrequency: number;
  commonReasons: string[];
  seasonalTrends: Array<{
    month: number;
    averageDelay: number;
  }>;
}

/**
 * Delay Detection Service for PermitPath
 * Analyzes permit processing delays and compares against benchmarks
 */
export class DelayDetectionService {
  private static instance: DelayDetectionService;
  
  public static getInstance(): DelayDetectionService {
    if (!DelayDetectionService.instance) {
      DelayDetectionService.instance = new DelayDetectionService();
    }
    return DelayDetectionService.instance;
  }

  /**
   * Analyze delay for a specific permit application
   */
  async analyzePermitDelay(applicationId: string): Promise<DelayAnalysis | null> {
    const db = getDatabase();
    
    try {
      // Get permit application details
      const application = await db.getFirstAsync<{
        id: string;
        permit_type: string;
        submitted_date: string;
        expected_completion: string;
        actual_completion?: string;
        expected_days: number;
        status: string;
      }>(`
        SELECT id, permit_type, submitted_date, expected_completion, 
               actual_completion, expected_days, status
        FROM ${TABLES.PERMIT_APPLICATIONS} 
        WHERE id = ?
      `, [applicationId]);

      if (!application) {
        return null;
      }

      // Calculate actual days
      const submittedDate = new Date(application.submitted_date);
      const completionDate = application.actual_completion 
        ? new Date(application.actual_completion)
        : new Date(); // Use current date if not completed

      const actualDays = Math.ceil(
        (completionDate.getTime() - submittedDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Get crowd-sourced average for this permit type
      const crowdAverage = await this.getCrowdAverageProcessingTime(application.permit_type);
      
      // Calculate delay metrics
      const delayDays = actualDays - application.expected_days;
      const delayPercentage = (delayDays / application.expected_days) * 100;
      
      // Categorize delay
      const delayCategory = this.categorizeDelay(delayPercentage);
      
      return {
        permitType: application.permit_type,
        applicationId: application.id,
        expectedDays: application.expected_days,
        actualDays,
        delayDays,
        delayPercentage,
        delayCategory,
        crowdAverage,
        officialStandard: application.expected_days,
        isDelayed: delayDays > 0
      };
    } catch (error) {
      console.error('Error analyzing permit delay:', error);
      return null;
    }
  }

  /**
   * Get comprehensive delay statistics
   */
  async getDelayStatistics(): Promise<DelayStatistics> {
    const db = getDatabase();
    
    try {
      // Get all completed applications
      const applications = await db.getAllAsync<{
        permit_type: string;
        office_name: string;
        expected_days: number;
        submitted_date: string;
        actual_completion: string;
      }>(`
        SELECT permit_type, office_name, expected_days, 
               submitted_date, actual_completion
        FROM ${TABLES.PERMIT_APPLICATIONS}
        WHERE actual_completion IS NOT NULL
      `);

      const totalApplications = applications.length;
      let delayedApplications = 0;
      let totalDelayDays = 0;
      let totalCompletionDays = 0;
      
      const permitTypeDelays: Record<string, number[]> = {};
      const officeBenchmarks: Record<string, {
        totalDays: number;
        totalApplications: number;
        delayedCount: number;
      }> = {};

      applications.forEach(app => {
        const submittedDate = new Date(app.submitted_date);
        const completionDate = new Date(app.actual_completion);
        const actualDays = Math.ceil(
          (completionDate.getTime() - submittedDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        
        const delayDays = actualDays - app.expected_days;
        
        if (delayDays > 0) {
          delayedApplications++;
          totalDelayDays += delayDays;
        }
        
        totalCompletionDays += actualDays;
        
        // Track by permit type
        if (!permitTypeDelays[app.permit_type]) {
          permitTypeDelays[app.permit_type] = [];
        }
        permitTypeDelays[app.permit_type].push(delayDays);
        
        // Track by office
        if (!officeBenchmarks[app.office_name]) {
          officeBenchmarks[app.office_name] = {
            totalDays: 0,
            totalApplications: 0,
            delayedCount: 0
          };
        }
        
        officeBenchmarks[app.office_name].totalDays += actualDays;
        officeBenchmarks[app.office_name].totalApplications++;
        if (delayDays > 0) {
          officeBenchmarks[app.office_name].delayedCount++;
        }
      });

      // Find most delayed permit type
      let mostDelayedPermitType = '';
      let maxAverageDelay = 0;
      
      Object.entries(permitTypeDelays).forEach(([permitType, delays]) => {
        const averageDelay = delays.reduce((sum, delay) => sum + Math.max(0, delay), 0) / delays.length;
        if (averageDelay > maxAverageDelay) {
          maxAverageDelay = averageDelay;
          mostDelayedPermitType = permitType;
        }
      });

      // Calculate office benchmarks
      const processedOfficeBenchmarks: Record<string, {
        averageDays: number;
        delayRate: number;
        totalApplications: number;
      }> = {};

      Object.entries(officeBenchmarks).forEach(([office, data]) => {
        processedOfficeBenchmarks[office] = {
          averageDays: data.totalDays / data.totalApplications,
          delayRate: (data.delayedCount / data.totalApplications) * 100,
          totalApplications: data.totalApplications
        };
      });

      return {
        totalApplications,
        onTimeApplications: totalApplications - delayedApplications,
        delayedApplications,
        averageDelayDays: delayedApplications > 0 ? totalDelayDays / delayedApplications : 0,
        averageCompletionTime: totalCompletionDays / totalApplications,
        delayRate: (delayedApplications / totalApplications) * 100,
        mostDelayedPermitType,
        officeBenchmarks: processedOfficeBenchmarks
      };
    } catch (error) {
      console.error('Error getting delay statistics:', error);
      return {
        totalApplications: 0,
        onTimeApplications: 0,
        delayedApplications: 0,
        averageDelayDays: 0,
        averageCompletionTime: 0,
        delayRate: 0,
        mostDelayedPermitType: '',
        officeBenchmarks: {}
      };
    }
  }

  /**
   * Identify delay patterns for specific permit types and offices
   */
  async getDelayPatterns(permitType?: string, office?: string): Promise<DelayPattern[]> {
    const db = getDatabase();
    
    try {
      let query = `
        SELECT permit_type, office_name, expected_days, 
               submitted_date, actual_completion, delay_reason
        FROM ${TABLES.PERMIT_APPLICATIONS}
        WHERE actual_completion IS NOT NULL
      `;
      const params: any[] = [];
      
      if (permitType) {
        query += ' AND permit_type = ?';
        params.push(permitType);
      }
      
      if (office) {
        query += ' AND office_name = ?';
        params.push(office);
      }
      
      const applications = await db.getAllAsync<{
        permit_type: string;
        office_name: string;
        expected_days: number;
        submitted_date: string;
        actual_completion: string;
        delay_reason?: string;
      }>(query, params);

      // Group by permit type and office
      const patterns: Record<string, {
        delays: number[];
        reasons: string[];
        monthlyDelays: Record<number, number[]>;
      }> = {};

      applications.forEach(app => {
        const key = `${app.permit_type}:${app.office_name}`;
        
        if (!patterns[key]) {
          patterns[key] = {
            delays: [],
            reasons: [],
            monthlyDelays: {}
          };
        }
        
        const submittedDate = new Date(app.submitted_date);
        const completionDate = new Date(app.actual_completion);
        const actualDays = Math.ceil(
          (completionDate.getTime() - submittedDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        
        const delayDays = actualDays - app.expected_days;
        patterns[key].delays.push(delayDays);
        
        if (app.delay_reason) {
          patterns[key].reasons.push(app.delay_reason);
        }
        
        // Track monthly trends
        const month = submittedDate.getMonth();
        if (!patterns[key].monthlyDelays[month]) {
          patterns[key].monthlyDelays[month] = [];
        }
        patterns[key].monthlyDelays[month].push(delayDays);
      });

      // Convert to DelayPattern array
      return Object.entries(patterns).map(([key, data]) => {
        const [permitType, office] = key.split(':');
        const delays = data.delays;
        
        // Calculate statistics
        const averageDelay = delays.reduce((sum, delay) => sum + Math.max(0, delay), 0) / delays.length;
        const maxDelay = Math.max(...delays);
        const minDelay = Math.min(...delays);
        const delayedCount = delays.filter(delay => delay > 0).length;
        const delayFrequency = (delayedCount / delays.length) * 100;
        
        // Get common reasons
        const reasonCounts: Record<string, number> = {};
        data.reasons.forEach(reason => {
          reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
        });
        
        const commonReasons = Object.entries(reasonCounts)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 3)
          .map(([reason]) => reason);
        
        // Calculate seasonal trends
        const seasonalTrends = Array.from({ length: 12 }, (_, month) => {
          const monthDelays = data.monthlyDelays[month] || [];
          const monthAverage = monthDelays.length > 0
            ? monthDelays.reduce((sum, delay) => sum + Math.max(0, delay), 0) / monthDelays.length
            : 0;
          
          return {
            month,
            averageDelay: monthAverage
          };
        });

        return {
          permitType,
          office,
          averageDelay,
          maxDelay,
          minDelay,
          delayFrequency,
          commonReasons,
          seasonalTrends
        };
      });
    } catch (error) {
      console.error('Error getting delay patterns:', error);
      return [];
    }
  }

  /**
   * Get crowd-sourced average processing time for a permit type
   */
  private async getCrowdAverageProcessingTime(permitType: string): Promise<number> {
    const db = getDatabase();
    
    try {
      const result = await db.getFirstAsync<{ avgDays: number }>(`
        SELECT AVG(
          CASE 
            WHEN actual_completion IS NOT NULL 
            THEN julianday(actual_completion) - julianday(submitted_date)
            ELSE julianday('now') - julianday(submitted_date)
          END
        ) as avgDays
        FROM ${TABLES.PERMIT_APPLICATIONS}
        WHERE permit_type = ?
      `, [permitType]);
      
      return Math.ceil(result?.avgDays || 0);
    } catch (error) {
      console.error('Error getting crowd average:', error);
      return 0;
    }
  }

  /**
   * Categorize delay based on percentage
   */
  private categorizeDelay(delayPercentage: number): DelayAnalysis['delayCategory'] {
    if (delayPercentage <= 0) return 'on_time';
    if (delayPercentage <= 20) return 'minor_delay';
    if (delayPercentage <= 50) return 'moderate_delay';
    return 'severe_delay';
  }

  /**
   * Predict expected completion time based on historical data
   */
  async predictCompletionTime(
    permitType: string, 
    office: string, 
    submissionDate: string
  ): Promise<{
    predictedDays: number;
    confidenceLevel: 'high' | 'medium' | 'low';
    factorsConsidered: string[];
  }> {
    const db = getDatabase();
    
    try {
      // Get historical data for similar applications
      const historicalData = await db.getAllAsync<{
        submitted_date: string;
        actual_completion: string;
        expected_days: number;
      }>(`
        SELECT submitted_date, actual_completion, expected_days
        FROM ${TABLES.PERMIT_APPLICATIONS}
        WHERE permit_type = ? AND office_name = ? 
          AND actual_completion IS NOT NULL
        ORDER BY submitted_date DESC
        LIMIT 50
      `, [permitType, office]);

      if (historicalData.length < 5) {
        return {
          predictedDays: 0,
          confidenceLevel: 'low',
          factorsConsidered: ['Insufficient historical data']
        };
      }

      // Calculate average processing time
      const processingTimes = historicalData.map(app => {
        const submitted = new Date(app.submitted_date);
        const completed = new Date(app.actual_completion);
        return Math.ceil((completed.getTime() - submitted.getTime()) / (1000 * 60 * 60 * 24));
      });

      const averageProcessingTime = processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length;
      
      // Consider seasonal factors
      const submissionMonth = new Date(submissionDate).getMonth();
      const seasonalFactor = await this.getSeasonalFactor(permitType, office, submissionMonth);
      
      // Apply seasonal adjustment
      const predictedDays = Math.ceil(averageProcessingTime * seasonalFactor);
      
      // Determine confidence level
      const standardDeviation = Math.sqrt(
        processingTimes.reduce((sum, time) => sum + Math.pow(time - averageProcessingTime, 2), 0) / processingTimes.length
      );
      
      const coefficientOfVariation = standardDeviation / averageProcessingTime;
      let confidenceLevel: 'high' | 'medium' | 'low';
      
      if (coefficientOfVariation < 0.2) confidenceLevel = 'high';
      else if (coefficientOfVariation < 0.4) confidenceLevel = 'medium';
      else confidenceLevel = 'low';

      return {
        predictedDays,
        confidenceLevel,
        factorsConsidered: [
          `${historicalData.length} similar applications`,
          'Seasonal trends',
          'Office-specific patterns'
        ]
      };
    } catch (error) {
      console.error('Error predicting completion time:', error);
      return {
        predictedDays: 0,
        confidenceLevel: 'low',
        factorsConsidered: ['Prediction error']
      };
    }
  }

  /**
   * Get seasonal factor for processing time adjustment
   */
  private async getSeasonalFactor(permitType: string, office: string, month: number): Promise<number> {
    const db = getDatabase();
    
    try {
      // Get processing times by month for the last 2 years
      const monthlyData = await db.getAllAsync<{
        month: number;
        avgDays: number;
      }>(`
        SELECT 
          strftime('%m', submitted_date) as month,
          AVG(julianday(actual_completion) - julianday(submitted_date)) as avgDays
        FROM ${TABLES.PERMIT_APPLICATIONS}
        WHERE permit_type = ? AND office_name = ? 
          AND actual_completion IS NOT NULL
          AND submitted_date >= date('now', '-2 years')
        GROUP BY strftime('%m', submitted_date)
      `, [permitType, office]);

      if (monthlyData.length === 0) return 1.0;

      // Calculate overall average
      const overallAverage = monthlyData.reduce((sum, data) => sum + data.avgDays, 0) / monthlyData.length;
      
      // Find specific month data
      const monthData = monthlyData.find(data => parseInt(data.month) === month + 1);
      
      if (!monthData) return 1.0;
      
      // Return seasonal factor (ratio to overall average)
      return monthData.avgDays / overallAverage;
    } catch (error) {
      console.error('Error calculating seasonal factor:', error);
      return 1.0;
    }
  }

  /**
   * Generate delay alert for applications at risk
   */
  async generateDelayAlerts(): Promise<Array<{
    applicationId: string;
    permitType: string;
    daysOverdue: number;
    riskLevel: 'low' | 'medium' | 'high';
    recommendedAction: string;
  }>> {
    const db = getDatabase();
    
    try {
      // Get active applications that might be delayed
      const activeApplications = await db.getAllAsync<{
        id: string;
        permit_type: string;
        submitted_date: string;
        expected_completion: string;
        expected_days: number;
      }>(`
        SELECT id, permit_type, submitted_date, expected_completion, expected_days
        FROM ${TABLES.PERMIT_APPLICATIONS}
        WHERE status IN ('pending', 'processing')
      `);

      const alerts = [];
      const today = new Date();

      for (const app of activeApplications) {
        const expectedCompletion = new Date(app.expected_completion);
        const daysOverdue = Math.ceil((today.getTime() - expectedCompletion.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysOverdue > 0) {
          let riskLevel: 'low' | 'medium' | 'high';
          let recommendedAction: string;
          
          if (daysOverdue <= 5) {
            riskLevel = 'low';
            recommendedAction = 'Monitor progress, no action needed yet';
          } else if (daysOverdue <= 15) {
            riskLevel = 'medium';
            recommendedAction = 'Contact office for status update';
          } else {
            riskLevel = 'high';
            recommendedAction = 'Consider filing escalation or complaint';
          }
          
          alerts.push({
            applicationId: app.id,
            permitType: app.permit_type,
            daysOverdue,
            riskLevel,
            recommendedAction
          });
        }
      }

      return alerts.sort((a, b) => b.daysOverdue - a.daysOverdue);
    } catch (error) {
      console.error('Error generating delay alerts:', error);
      return [];
    }
  }
}