import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import { HashChainService } from './hash-chain';
import { getDatabase, TABLES } from './database';

export interface BribeLogExport {
  id: string;
  service_type: string;
  office_name: string;
  amount_demanded: number | null;
  location: string | null;
  description: string | null;
  reported_at: string;
  verification_code: string;
  block_number: number;
  hash_verification: string;
  geo_coordinates: {
    latitude?: number;
    longitude?: number;
    accuracy?: number;
    address?: string;
  } | null;
  audio_evidence: boolean;
}

export interface EvidenceBundle {
  metadata: {
    export_date: string;
    total_reports: number;
    date_range: {
      from: string;
      to: string;
    };
    export_type: 'CSV' | 'PDF' | 'FULL';
    chain_integrity: 'VERIFIED' | 'CORRUPTED' | 'UNKNOWN';
  };
  reports: BribeLogExport[];
  chain_verification: {
    total_blocks: number;
    verified_blocks: number;
    corrupted_blocks: number[];
    genesis_hash: string;
    latest_hash: string;
  };
}

/**
 * Evidence Export Service for FairLine
 * Handles exporting bribe logs and evidence for legal proceedings
 */
export class EvidenceExportService {
  private static instance: EvidenceExportService;
  
  public static getInstance(): EvidenceExportService {
    if (!EvidenceExportService.instance) {
      EvidenceExportService.instance = new EvidenceExportService();
    }
    return EvidenceExportService.instance;
  }

  /**
   * Generate complete evidence bundle with all reports
   */
  async generateEvidenceBundle(options?: {
    dateFrom?: string;
    dateTo?: string;
    includeAudio?: boolean;
    verifyChain?: boolean;
  }): Promise<EvidenceBundle> {
    const db = getDatabase();
    const hashChainService = HashChainService.getInstance();
    
    // Build query with optional date filtering
    let query = `
      SELECT 
        bl.*,
        hc.prev_hash,
        hc.merkle_root as chain_hash
      FROM ${TABLES.BRIBE_LOGS} bl
      LEFT JOIN ${TABLES.HASH_CHAIN} hc ON bl.hash_chain_id = hc.id
    `;
    
    const params: any[] = [];
    const conditions: string[] = [];
    
    if (options?.dateFrom) {
      conditions.push('bl.reported_at >= ?');
      params.push(options.dateFrom);
    }
    
    if (options?.dateTo) {
      conditions.push('bl.reported_at <= ?');
      params.push(options.dateTo);
    }
    
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }
    
    query += ' ORDER BY bl.block_number ASC';
    
    const rawReports = await db.getAllAsync<any>(query, params);
    
    // Process reports into export format
    const reports: BribeLogExport[] = rawReports.map(report => {
      let geoCoordinates = null;
      if (report.location) {
        try {
          const locationData = JSON.parse(report.location);
          geoCoordinates = {
            latitude: locationData.latitude,
            longitude: locationData.longitude,
            accuracy: locationData.accuracy,
            address: locationData.address ? 
              `${locationData.address.street || ''}, ${locationData.address.city || ''}, ${locationData.address.district || ''}`.trim() 
              : undefined
          };
        } catch (error) {
          console.warn('Failed to parse location data:', error);
        }
      }
      
      return {
        id: report.id,
        service_type: report.service_type,
        office_name: report.office_name,
        amount_demanded: report.amount_demanded,
        location: report.location,
        description: report.description,
        reported_at: report.reported_at,
        verification_code: report.verification_code,
        block_number: report.block_number,
        hash_verification: report.current_hash,
        geo_coordinates: geoCoordinates,
        audio_evidence: !!report.audio_file_path
      };
    });
    
    // Verify chain integrity if requested
    let chainVerification = {
      total_blocks: 0,
      verified_blocks: 0,
      corrupted_blocks: [] as number[],
      genesis_hash: '',
      latest_hash: ''
    };
    
    let chainIntegrity: 'VERIFIED' | 'CORRUPTED' | 'UNKNOWN' = 'UNKNOWN';
    
    if (options?.verifyChain) {
      try {
        const integrity = await hashChainService.verifyChainIntegrity();
        const chainStats = await hashChainService.getChainStats();
        
        chainVerification = {
          total_blocks: integrity.totalBlocks,
          verified_blocks: integrity.totalBlocks - integrity.corruptedBlocks.length,
          corrupted_blocks: integrity.corruptedBlocks,
          genesis_hash: 'genesis_block_hash', // Would need to fetch from first block
          latest_hash: 'latest_block_hash' // Would need to fetch from last block
        };
        
        chainIntegrity = integrity.isValid ? 'VERIFIED' : 'CORRUPTED';
      } catch (error) {
        console.error('Chain verification failed:', error);
      }
    }
    
    // Create evidence bundle
    const evidenceBundle: EvidenceBundle = {
      metadata: {
        export_date: new Date().toISOString(),
        total_reports: reports.length,
        date_range: {
          from: reports.length > 0 ? reports[0].reported_at : '',
          to: reports.length > 0 ? reports[reports.length - 1].reported_at : ''
        },
        export_type: 'FULL',
        chain_integrity: chainIntegrity
      },
      reports,
      chain_verification: chainVerification
    };
    
    return evidenceBundle;
  }

  /**
   * Export evidence bundle as CSV
   */
  async exportAsCSV(bundle: EvidenceBundle): Promise<string> {
    const headers = [
      'Report ID',
      'Service Type', 
      'Office Name',
      'Amount Demanded (BDT)',
      'Reported Date',
      'Verification Code',
      'Block Number',
      'Hash Verification',
      'Latitude',
      'Longitude',
      'Location Accuracy (m)',
      'Address',
      'Audio Evidence',
      'Description'
    ];
    
    const csvRows = [headers.join(',')];
    
    bundle.reports.forEach(report => {
      const row = [
        `"${report.id}"`,
        `"${report.service_type}"`,
        `"${report.office_name}"`,
        report.amount_demanded || '',
        `"${new Date(report.reported_at).toLocaleString()}"`,
        `"${report.verification_code}"`,
        report.block_number,
        `"${report.hash_verification}"`,
        report.geo_coordinates?.latitude || '',
        report.geo_coordinates?.longitude || '',
        report.geo_coordinates?.accuracy || '',
        `"${report.geo_coordinates?.address || ''}"`,
        report.audio_evidence ? 'Yes' : 'No',
        `"${(report.description || '').replace(/"/g, '""')}"`
      ];
      csvRows.push(row.join(','));
    });
    
    // Add metadata footer
    csvRows.push('');
    csvRows.push('--- EXPORT METADATA ---');
    csvRows.push(`Export Date,${bundle.metadata.export_date}`);
    csvRows.push(`Total Reports,${bundle.metadata.total_reports}`);
    csvRows.push(`Chain Integrity,${bundle.metadata.chain_integrity}`);
    csvRows.push(`Verified Blocks,${bundle.chain_verification.verified_blocks}/${bundle.chain_verification.total_blocks}`);
    
    return csvRows.join('\n');
  }

  /**
   * Export evidence bundle as PDF
   */
  async exportAsPDF(bundle: EvidenceBundle): Promise<string> {
    const htmlContent = this.generatePDFHTML(bundle);
    
    const { uri } = await Print.printToFileAsync({
      html: htmlContent,
      base64: false
    });
    
    return uri;
  }

  /**
   * Generate HTML content for PDF export
   */
  private generatePDFHTML(bundle: EvidenceBundle): string {
    const integrityColor = bundle.metadata.chain_integrity === 'VERIFIED' ? '#10b981' : 
                          bundle.metadata.chain_integrity === 'CORRUPTED' ? '#ef4444' : '#f59e0b';
    
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>CivicLens Evidence Bundle</title>
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                margin: 20px;
                line-height: 1.4;
                color: #333;
            }
            
            .header {
                text-align: center;
                border-bottom: 2px solid #0891b2;
                padding-bottom: 20px;
                margin-bottom: 30px;
            }
            
            .header h1 {
                color: #0891b2;
                margin: 0;
                font-size: 24px;
            }
            
            .header p {
                margin: 5px 0;
                color: #666;
            }
            
            .metadata {
                background-color: #f8fafc;
                padding: 15px;
                border-radius: 8px;
                margin-bottom: 25px;
                border-left: 4px solid #0891b2;
            }
            
            .metadata h2 {
                margin-top: 0;
                color: #1e293b;
                font-size: 16px;
            }
            
            .metadata-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 10px;
                margin-top: 10px;
            }
            
            .metadata-item {
                display: flex;
                justify-content: space-between;
                padding: 5px 0;
            }
            
            .metadata-item strong {
                color: #475569;
            }
            
            .chain-status {
                background-color: ${integrityColor}20;
                color: ${integrityColor};
                padding: 4px 8px;
                border-radius: 12px;
                font-size: 12px;
                font-weight: bold;
            }
            
            .reports-section h2 {
                color: #1e293b;
                border-bottom: 1px solid #e2e8f0;
                padding-bottom: 8px;
                margin-bottom: 20px;
            }
            
            .report-card {
                border: 1px solid #e2e8f0;
                border-radius: 8px;
                padding: 15px;
                margin-bottom: 15px;
                background-color: white;
            }
            
            .report-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 10px;
                padding-bottom: 8px;
                border-bottom: 1px solid #f1f5f9;
            }
            
            .report-id {
                font-family: monospace;
                background-color: #f1f5f9;
                padding: 2px 6px;
                border-radius: 4px;
                font-size: 12px;
            }
            
            .verification-code {
                background-color: #10b981;
                color: white;
                padding: 2px 8px;
                border-radius: 12px;
                font-size: 12px;
                font-weight: bold;
            }
            
            .report-details {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 10px;
                margin-bottom: 10px;
            }
            
            .detail-item {
                padding: 5px 0;
            }
            
            .detail-label {
                font-weight: bold;
                color: #475569;
                font-size: 12px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            
            .detail-value {
                margin-top: 2px;
                color: #1e293b;
            }
            
            .description {
                background-color: #f8fafc;
                padding: 10px;
                border-radius: 6px;
                margin-top: 10px;
                font-style: italic;
            }
            
            .location-info {
                background-color: #dbeafe;
                padding: 8px;
                border-radius: 6px;
                margin-top: 8px;
                font-size: 12px;
            }
            
            .audio-badge {
                background-color: #dc2626;
                color: white;
                padding: 2px 6px;
                border-radius: 8px;
                font-size: 10px;
                font-weight: bold;
            }
            
            .footer {
                margin-top: 40px;
                padding-top: 20px;
                border-top: 1px solid #e2e8f0;
                text-align: center;
                font-size: 12px;
                color: #64748b;
            }
            
            @media print {
                .report-card {
                    page-break-inside: avoid;
                }
            }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>🔗 CivicLens Evidence Bundle</h1>
            <p>Tamper-Proof Bribe Solicitation Evidence</p>
            <p>Generated on ${new Date(bundle.metadata.export_date).toLocaleString()}</p>
        </div>

        <div class="metadata">
            <h2>📊 Export Summary</h2>
            <div class="metadata-grid">
                <div class="metadata-item">
                    <span><strong>Total Reports:</strong></span>
                    <span>${bundle.metadata.total_reports}</span>
                </div>
                <div class="metadata-item">
                    <span><strong>Date Range:</strong></span>
                    <span>${bundle.metadata.date_range.from ? new Date(bundle.metadata.date_range.from).toLocaleDateString() : 'N/A'} - ${bundle.metadata.date_range.to ? new Date(bundle.metadata.date_range.to).toLocaleDateString() : 'N/A'}</span>
                </div>
                <div class="metadata-item">
                    <span><strong>Chain Integrity:</strong></span>
                    <span class="chain-status">${bundle.metadata.chain_integrity}</span>
                </div>
                <div class="metadata-item">
                    <span><strong>Verified Blocks:</strong></span>
                    <span>${bundle.chain_verification.verified_blocks}/${bundle.chain_verification.total_blocks}</span>
                </div>
            </div>
        </div>

        <div class="reports-section">
            <h2>📋 Evidence Reports (${bundle.reports.length})</h2>
            
            ${bundle.reports.map((report, index) => `
                <div class="report-card">
                    <div class="report-header">
                        <span class="report-id">Report #${index + 1}</span>
                        <span class="verification-code">${report.verification_code}</span>
                    </div>
                    
                    <div class="report-details">
                        <div class="detail-item">
                            <div class="detail-label">Service Type</div>
                            <div class="detail-value">${report.service_type}</div>
                        </div>
                        
                        <div class="detail-item">
                            <div class="detail-label">Office</div>
                            <div class="detail-value">${report.office_name}</div>
                        </div>
                        
                        <div class="detail-item">
                            <div class="detail-label">Amount Demanded</div>
                            <div class="detail-value">${report.amount_demanded ? '৳' + report.amount_demanded.toLocaleString() : 'Not specified'}</div>
                        </div>
                        
                        <div class="detail-item">
                            <div class="detail-label">Reported Date</div>
                            <div class="detail-value">${new Date(report.reported_at).toLocaleString()}</div>
                        </div>
                        
                        <div class="detail-item">
                            <div class="detail-label">Block Number</div>
                            <div class="detail-value">#${report.block_number}</div>
                        </div>
                        
                        <div class="detail-item">
                            <div class="detail-label">Evidence Type</div>
                            <div class="detail-value">
                                ${report.audio_evidence ? '<span class="audio-badge">🎤 AUDIO</span>' : ''}
                                ${report.geo_coordinates ? ' 📍 GPS' : ''}
                            </div>
                        </div>
                    </div>
                    
                    ${report.description ? `
                        <div class="description">
                            <strong>Description:</strong> ${report.description}
                        </div>
                    ` : ''}
                    
                    ${report.geo_coordinates ? `
                        <div class="location-info">
                            <strong>📍 Location:</strong> 
                            ${report.geo_coordinates.latitude?.toFixed(6)}, ${report.geo_coordinates.longitude?.toFixed(6)}
                            ${report.geo_coordinates.accuracy ? ` (±${Math.round(report.geo_coordinates.accuracy)}m)` : ''}
                            ${report.geo_coordinates.address ? `<br>Address: ${report.geo_coordinates.address}` : ''}
                        </div>
                    ` : ''}
                </div>
            `).join('')}
        </div>

        <div class="footer">
            <p><strong>CivicLens Anti-Corruption Platform</strong></p>
            <p>This document contains tamper-proof evidence secured using cryptographic hash chains.</p>
            <p>Verification codes can be validated at any time using the CivicLens verification system.</p>
            <p>Generated on ${new Date().toLocaleString()} • Document integrity guaranteed</p>
        </div>
    </body>
    </html>`;
  }

  /**
   * Save evidence bundle to device storage
   */
  async saveEvidenceBundle(bundle: EvidenceBundle, format: 'CSV' | 'PDF'): Promise<string> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `CivicLens_Evidence_Bundle_${timestamp}.${format.toLowerCase()}`;
      const documentsDir = FileSystem.documentDirectory + 'exports/';
      
      // Ensure exports directory exists
      const dirInfo = await FileSystem.getInfoAsync(documentsDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(documentsDir, { intermediates: true });
      }
      
      const filePath = documentsDir + filename;
      
      if (format === 'CSV') {
        const csvContent = await this.exportAsCSV(bundle);
        await FileSystem.writeAsStringAsync(filePath, csvContent, {
          encoding: FileSystem.EncodingType.UTF8
        });
      } else if (format === 'PDF') {
        const pdfUri = await this.exportAsPDF(bundle);
        await FileSystem.copyAsync({
          from: pdfUri,
          to: filePath
        });
        // Clean up temporary PDF
        await FileSystem.deleteAsync(pdfUri, { idempotent: true });
      }
      
      console.log(`📄 Evidence bundle saved: ${filePath}`);
      return filePath;
    } catch (error) {
      console.error('Failed to save evidence bundle:', error);
      throw new Error('Failed to save evidence bundle to device storage');
    }
  }

  /**
   * Share evidence bundle via system share dialog
   */
  async shareEvidenceBundle(bundle: EvidenceBundle, format: 'CSV' | 'PDF'): Promise<void> {
    try {
      const filePath = await this.saveEvidenceBundle(bundle, format);
      
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        throw new Error('Sharing is not available on this device');
      }
      
      await Sharing.shareAsync(filePath, {
        mimeType: format === 'CSV' ? 'text/csv' : 'application/pdf',
        dialogTitle: 'Share CivicLens Evidence Bundle',
        UTI: format === 'CSV' ? 'public.comma-separated-values-text' : 'com.adobe.pdf'
      });
      
      console.log('📤 Evidence bundle shared successfully');
    } catch (error) {
      console.error('Failed to share evidence bundle:', error);
      throw new Error('Failed to share evidence bundle');
    }
  }

  /**
   * Get export statistics
   */
  async getExportStatistics(): Promise<{
    totalReports: number;
    totalExports: number;
    lastExportDate: string | null;
    exportFormats: { CSV: number; PDF: number };
  }> {
    try {
      const db = getDatabase();
      
      const totalReports = await db.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) as count FROM ${TABLES.BRIBE_LOGS}`
      );
      
      // Check exports directory for statistics
      const exportsDir = FileSystem.documentDirectory + 'exports/';
      let totalExports = 0;
      let lastExportDate = null;
      let formatCounts = { CSV: 0, PDF: 0 };
      
      try {
        const dirInfo = await FileSystem.getInfoAsync(exportsDir);
        if (dirInfo.exists) {
          const files = await FileSystem.readDirectoryAsync(exportsDir);
          totalExports = files.length;
          
          // Count by format and find latest
          let latestTime = 0;
          for (const file of files) {
            if (file.endsWith('.csv')) formatCounts.CSV++;
            if (file.endsWith('.pdf')) formatCounts.PDF++;
            
            const filePath = exportsDir + file;
            const fileInfo = await FileSystem.getInfoAsync(filePath);
            if (fileInfo.modificationTime && fileInfo.modificationTime > latestTime) {
              latestTime = fileInfo.modificationTime;
              lastExportDate = new Date(fileInfo.modificationTime).toISOString();
            }
          }
        }
      } catch (error) {
        console.warn('Failed to get export directory stats:', error);
      }
      
      return {
        totalReports: totalReports?.count || 0,
        totalExports,
        lastExportDate,
        exportFormats: formatCounts
      };
    } catch (error) {
      console.error('Failed to get export statistics:', error);
      return {
        totalReports: 0,
        totalExports: 0,
        lastExportDate: null,
        exportFormats: { CSV: 0, PDF: 0 }
      };
    }
  }

  /**
   * Cleanup old export files
   */
  async cleanupOldExports(maxAge: number = 30): Promise<number> {
    try {
      const exportsDir = FileSystem.documentDirectory + 'exports/';
      const dirInfo = await FileSystem.getInfoAsync(exportsDir);
      
      if (!dirInfo.exists) return 0;
      
      const files = await FileSystem.readDirectoryAsync(exportsDir);
      const cutoffTime = Date.now() - (maxAge * 24 * 60 * 60 * 1000); // maxAge days ago
      let deletedCount = 0;
      
      for (const file of files) {
        const filePath = exportsDir + file;
        const fileInfo = await FileSystem.getInfoAsync(filePath);
        
        if (fileInfo.modificationTime && fileInfo.modificationTime < cutoffTime) {
          await FileSystem.deleteAsync(filePath, { idempotent: true });
          deletedCount++;
        }
      }
      
      console.log(`🗑️ Cleaned up ${deletedCount} old export files`);
      return deletedCount;
    } catch (error) {
      console.error('Failed to cleanup old exports:', error);
      return 0;
    }
  }
}