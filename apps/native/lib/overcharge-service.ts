import { getDatabase, TABLES } from './database';

export interface OverchargeReport {
  id: string;
  service_id: string;
  official_fee: number;
  paid_fee: number;
  overcharge_amount: number;
  office_name_en: string;
  office_name_bn: string;
  district: string;
  upazila?: string;
  description_en?: string;
  description_bn?: string;
  geo_location?: string;
  is_anonymous: boolean;
  reported_at: string;
  created_at: string;
}

export interface OverchargeAnalytics {
  totalReports: number;
  totalOverchargeAmount: number;
  averageOvercharge: number;
  topOverchargedServices: Array<{
    service_id: string;
    service_name_en: string;
    service_name_bn: string;
    report_count: number;
    total_overcharge: number;
    avg_overcharge: number;
  }>;
  districtStats: Array<{
    district: string;
    report_count: number;
    total_overcharge: number;
  }>;
  monthlyTrends: Array<{
    month: string;
    report_count: number;
    total_overcharge: number;
  }>;
}

export interface HeatmapData {
  latitude: number;
  longitude: number;
  intensity: number; // Based on overcharge amount
  district: string;
  reportCount: number;
}

export class OverchargeReportService {
  private static instance: OverchargeReportService;
  
  public static getInstance(): OverchargeReportService {
    if (!OverchargeReportService.instance) {
      OverchargeReportService.instance = new OverchargeReportService();
    }
    return OverchargeReportService.instance;
  }

  /**
   * Create an anonymous overcharge report
   */
  async createReport(reportData: Omit<OverchargeReport, 'id' | 'reported_at' | 'created_at'>): Promise<string> {
    const db = getDatabase();
    const reportId = `overcharge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date().toISOString();

    await db.runAsync(
      `INSERT INTO ${TABLES.OVERCHARGE_REPORTS} (
        id, service_id, official_fee, paid_fee, overcharge_amount,
        office_name_en, office_name_bn, district, upazila,
        description_en, description_bn, geo_location, is_anonymous,
        reported_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        reportId,
        reportData.service_id,
        reportData.official_fee,
        reportData.paid_fee,
        reportData.overcharge_amount,
        reportData.office_name_en,
        reportData.office_name_bn,
        reportData.district,
        reportData.upazila || null,
        reportData.description_en || null,
        reportData.description_bn || null,
        reportData.geo_location || null,
        reportData.is_anonymous ? 1 : 0,
        timestamp,
        timestamp
      ]
    );

    console.log(`✅ Overcharge report created: ${reportId}`);
    return reportId;
  }

  /**
   * Get all overcharge reports with optional filtering
   */
  async getReports(filters?: {
    district?: string;
    serviceId?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
  }): Promise<OverchargeReport[]> {
    const db = getDatabase();
    let query = `SELECT * FROM ${TABLES.OVERCHARGE_REPORTS}`;
    const params: any[] = [];
    const conditions: string[] = [];

    if (filters?.district) {
      conditions.push('district = ?');
      params.push(filters.district);
    }

    if (filters?.serviceId) {
      conditions.push('service_id = ?');
      params.push(filters.serviceId);
    }

    if (filters?.dateFrom) {
      conditions.push('reported_at >= ?');
      params.push(filters.dateFrom);
    }

    if (filters?.dateTo) {
      conditions.push('reported_at <= ?');
      params.push(filters.dateTo);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += ' ORDER BY reported_at DESC';

    if (filters?.limit) {
      query += ` LIMIT ${filters.limit}`;
    }

    return await db.getAllAsync<OverchargeReport>(query, params);
  }

  /**
   * Get comprehensive analytics for overcharge reports
   */
  async getAnalytics(timeframe?: 'week' | 'month' | 'year'): Promise<OverchargeAnalytics> {
    const db = getDatabase();
    
    // Calculate date filter based on timeframe
    let dateFilter = '';
    if (timeframe) {
      const now = new Date();
      let startDate: Date;
      
      switch (timeframe) {
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case 'year':
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
      }
      
      dateFilter = ` WHERE reported_at >= '${startDate.toISOString()}'`;
    }

    // Get total statistics
    const totalStats = await db.getFirstAsync<{
      totalReports: number;
      totalOverchargeAmount: number;
      averageOvercharge: number;
    }>(`
      SELECT 
        COUNT(*) as totalReports,
        COALESCE(SUM(overcharge_amount), 0) as totalOverchargeAmount,
        COALESCE(AVG(overcharge_amount), 0) as averageOvercharge
      FROM ${TABLES.OVERCHARGE_REPORTS}${dateFilter}
    `);

    // Get top overcharged services
    const topServices = await db.getAllAsync<{
      service_id: string;
      service_name_en: string;
      service_name_bn: string;
      report_count: number;
      total_overcharge: number;
      avg_overcharge: number;
    }>(`
      SELECT 
        r.service_id,
        s.name_en as service_name_en,
        s.name_bn as service_name_bn,
        COUNT(*) as report_count,
        SUM(r.overcharge_amount) as total_overcharge,
        AVG(r.overcharge_amount) as avg_overcharge
      FROM ${TABLES.OVERCHARGE_REPORTS} r
      JOIN ${TABLES.SERVICES} s ON r.service_id = s.id
      ${dateFilter}
      GROUP BY r.service_id, s.name_en, s.name_bn
      ORDER BY total_overcharge DESC
      LIMIT 10
    `);

    // Get district statistics
    const districtStats = await db.getAllAsync<{
      district: string;
      report_count: number;
      total_overcharge: number;
    }>(`
      SELECT 
        district,
        COUNT(*) as report_count,
        SUM(overcharge_amount) as total_overcharge
      FROM ${TABLES.OVERCHARGE_REPORTS}${dateFilter}
      GROUP BY district
      ORDER BY total_overcharge DESC
    `);

    // Get monthly trends (last 12 months)
    const monthlyTrends = await db.getAllAsync<{
      month: string;
      report_count: number;
      total_overcharge: number;
    }>(`
      SELECT 
        strftime('%Y-%m', reported_at) as month,
        COUNT(*) as report_count,
        SUM(overcharge_amount) as total_overcharge
      FROM ${TABLES.OVERCHARGE_REPORTS}
      WHERE reported_at >= date('now', '-12 months')
      GROUP BY strftime('%Y-%m', reported_at)
      ORDER BY month DESC
    `);

    return {
      totalReports: totalStats?.totalReports || 0,
      totalOverchargeAmount: totalStats?.totalOverchargeAmount || 0,
      averageOvercharge: totalStats?.averageOvercharge || 0,
      topOverchargedServices: topServices || [],
      districtStats: districtStats || [],
      monthlyTrends: monthlyTrends || []
    };
  }

  /**
   * Get heatmap data for geographic visualization
   */
  async getHeatmapData(): Promise<HeatmapData[]> {
    const db = getDatabase();
    
    const reports = await db.getAllAsync<{
      geo_location: string;
      district: string;
      overcharge_amount: number;
    }>(`
      SELECT geo_location, district, overcharge_amount
      FROM ${TABLES.OVERCHARGE_REPORTS}
      WHERE geo_location IS NOT NULL AND geo_location != ''
    `);

    const heatmapData: HeatmapData[] = [];
    const districtAggregates: Record<string, {
      latitude: number;
      longitude: number;
      totalOvercharge: number;
      reportCount: number;
    }> = {};

    // Process reports with location data
    for (const report of reports) {
      try {
        const location = JSON.parse(report.geo_location);
        
        if (location.latitude && location.longitude) {
          // Add individual point
          heatmapData.push({
            latitude: location.latitude,
            longitude: location.longitude,
            intensity: Math.min(report.overcharge_amount / 1000, 10), // Normalize intensity
            district: report.district,
            reportCount: 1
          });

          // Aggregate by district for district-level heatmap
          if (!districtAggregates[report.district]) {
            districtAggregates[report.district] = {
              latitude: location.latitude,
              longitude: location.longitude,
              totalOvercharge: 0,
              reportCount: 0
            };
          }
          
          districtAggregates[report.district].totalOvercharge += report.overcharge_amount;
          districtAggregates[report.district].reportCount += 1;
        }
      } catch (error) {
        console.error('Error parsing geo_location:', error);
      }
    }

    return heatmapData;
  }

  /**
   * Get service-specific overcharge statistics
   */
  async getServiceStats(serviceId: string): Promise<{
    reportCount: number;
    averageOvercharge: number;
    totalOvercharge: number;
    maxOvercharge: number;
    minOvercharge: number;
    recentReports: OverchargeReport[];
  }> {
    const db = getDatabase();
    
    const stats = await db.getFirstAsync<{
      reportCount: number;
      averageOvercharge: number;
      totalOvercharge: number;
      maxOvercharge: number;
      minOvercharge: number;
    }>(`
      SELECT 
        COUNT(*) as reportCount,
        COALESCE(AVG(overcharge_amount), 0) as averageOvercharge,
        COALESCE(SUM(overcharge_amount), 0) as totalOvercharge,
        COALESCE(MAX(overcharge_amount), 0) as maxOvercharge,
        COALESCE(MIN(overcharge_amount), 0) as minOvercharge
      FROM ${TABLES.OVERCHARGE_REPORTS}
      WHERE service_id = ?
    `, [serviceId]);

    const recentReports = await db.getAllAsync<OverchargeReport>(`
      SELECT * FROM ${TABLES.OVERCHARGE_REPORTS}
      WHERE service_id = ?
      ORDER BY reported_at DESC
      LIMIT 5
    `, [serviceId]);

    return {
      reportCount: stats?.reportCount || 0,
      averageOvercharge: stats?.averageOvercharge || 0,
      totalOvercharge: stats?.totalOvercharge || 0,
      maxOvercharge: stats?.maxOvercharge || 0,
      minOvercharge: stats?.minOvercharge || 0,
      recentReports: recentReports || []
    };
  }

  /**
   * Anonymize sensitive data for public sharing
   */
  async getAnonymizedReports(limit: number = 100): Promise<Array<{
    service_name_en: string;
    service_name_bn: string;
    official_fee: number;
    overcharge_amount: number;
    district: string;
    reported_month: string;
  }>> {
    const db = getDatabase();
    
    return await db.getAllAsync<{
      service_name_en: string;
      service_name_bn: string;
      official_fee: number;
      overcharge_amount: number;
      district: string;
      reported_month: string;
    }>(`
      SELECT 
        s.name_en as service_name_en,
        s.name_bn as service_name_bn,
        r.official_fee,
        r.overcharge_amount,
        r.district,
        strftime('%Y-%m', r.reported_at) as reported_month
      FROM ${TABLES.OVERCHARGE_REPORTS} r
      JOIN ${TABLES.SERVICES} s ON r.service_id = s.id
      WHERE r.is_anonymous = 1
      ORDER BY r.reported_at DESC
      LIMIT ?
    `, [limit]);
  }

  /**
   * Export overcharge data for transparency (CSV format)
   */
  async exportToCsv(): Promise<string> {
    const reports = await this.getAnonymizedReports(1000);
    
    const headers = [
      'Service Name (EN)',
      'Service Name (BN)',
      'Official Fee',
      'Overcharge Amount',
      'District',
      'Month'
    ];
    
    const csvRows = [headers.join(',')];
    
    for (const report of reports) {
      const row = [
        `"${report.service_name_en}"`,
        `"${report.service_name_bn}"`,
        report.official_fee,
        report.overcharge_amount,
        `"${report.district}"`,
        report.reported_month
      ];
      csvRows.push(row.join(','));
    }
    
    return csvRows.join('\n');
  }

  /**
   * Get corruption risk indicators by district
   */
  async getDistrictRiskIndicators(): Promise<Array<{
    district: string;
    riskScore: number;
    reportCount: number;
    averageOvercharge: number;
    riskLevel: 'low' | 'medium' | 'high';
  }>> {
    const db = getDatabase();
    
    const districtData = await db.getAllAsync<{
      district: string;
      reportCount: number;
      averageOvercharge: number;
      totalOvercharge: number;
    }>(`
      SELECT 
        district,
        COUNT(*) as reportCount,
        AVG(overcharge_amount) as averageOvercharge,
        SUM(overcharge_amount) as totalOvercharge
      FROM ${TABLES.OVERCHARGE_REPORTS}
      GROUP BY district
      ORDER BY reportCount DESC
    `);

    return districtData.map(data => {
      // Calculate risk score based on report frequency and average overcharge
      const reportWeight = Math.min(data.reportCount / 10, 5); // Max 5 points for reports
      const overchargeWeight = Math.min(data.averageOvercharge / 1000, 5); // Max 5 points for overcharge
      const riskScore = Math.round((reportWeight + overchargeWeight) * 10);
      
      let riskLevel: 'low' | 'medium' | 'high' = 'low';
      if (riskScore >= 70) riskLevel = 'high';
      else if (riskScore >= 40) riskLevel = 'medium';
      
      return {
        district: data.district,
        riskScore,
        reportCount: data.reportCount,
        averageOvercharge: data.averageOvercharge,
        riskLevel
      };
    });
  }
}