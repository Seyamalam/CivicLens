import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { TenderData, RiskAnalysis } from './risk-scoring';

export interface PDFExportOptions {
  includeRiskFactors: boolean;
  includeRecommendations: boolean;
  includeTimeline: boolean;
  includeSupplierInfo: boolean;
  language: 'en' | 'bn';
}

export class PDFExportService {
  private static instance: PDFExportService;
  
  public static getInstance(): PDFExportService {
    if (!PDFExportService.instance) {
      PDFExportService.instance = new PDFExportService();
    }
    return PDFExportService.instance;
  }

  /**
   * Generate and export risk brief PDF
   */
  async exportRiskBrief(
    tender: TenderData,
    riskAnalysis: RiskAnalysis,
    options: PDFExportOptions = {
      includeRiskFactors: true,
      includeRecommendations: true,
      includeTimeline: true,
      includeSupplierInfo: false,
      language: 'en'
    }
  ): Promise<boolean> {
    try {
      console.log('Generating PDF for tender:', tender.id);
      
      const htmlContent = this.generateRiskBriefHTML(tender, riskAnalysis, options);
      
      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        base64: false
      });

      console.log('PDF generated at:', uri);

      // Share the PDF
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Risk Brief - ${options.language === 'en' ? tender.title_en : tender.title_bn}`,
          UTI: 'com.adobe.pdf'
        });
        return true;
      } else {
        console.warn('Sharing is not available on this platform');
        return false;
      }
    } catch (error) {
      console.error('Failed to export PDF:', error);
      throw new Error('PDF export failed');
    }
  }

  /**
   * Generate HTML content for risk brief
   */
  private generateRiskBriefHTML(
    tender: TenderData,
    riskAnalysis: RiskAnalysis,
    options: PDFExportOptions
  ): string {
    const isEnglish = options.language === 'en';
    const currentDate = new Date().toLocaleDateString(isEnglish ? 'en-US' : 'bn-BD');
    
    const title = isEnglish ? tender.title_en : tender.title_bn;
    const organization = isEnglish ? tender.organization_en : tender.organization_bn;
    
    // Risk level color
    const getRiskColor = (score: number) => {
      if (score >= 70) return '#dc2626';
      if (score >= 30) return '#ea580c';
      return '#84cc16';
    };

    const formatAmount = (amount: number) => {
      if (amount >= 10000000) {
        return `${(amount / 10000000).toFixed(1)}${isEnglish ? ' Cr' : ' কোটি'}`;
      } else if (amount >= 100000) {
        return `${(amount / 100000).toFixed(1)}${isEnglish ? ' Lakh' : ' লক্ষ'}`;
      }
      return amount.toLocaleString();
    };

    const getRiskLevelText = (score: number) => {
      if (score >= 70) return isEnglish ? 'High Risk' : 'উচ্চ ঝুঁকি';
      if (score >= 30) return isEnglish ? 'Medium Risk' : 'মধ্যম ঝুঁকি';
      return isEnglish ? 'Low Risk' : 'নিম্ন ঝুঁকি';
    };

    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Risk Brief - ${title}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Arial', sans-serif;
          line-height: 1.6;
          color: #333;
          background: #fff;
          font-size: 14px;
        }
        
        .container {
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }
        
        .header {
          text-align: center;
          border-bottom: 2px solid #0891b2;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        
        .header h1 {
          color: #0891b2;
          font-size: 28px;
          margin-bottom: 10px;
        }
        
        .header .subtitle {
          color: #666;
          font-size: 16px;
        }
        
        .risk-overview {
          background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
          border: 1px solid #0891b2;
          border-radius: 10px;
          padding: 20px;
          margin-bottom: 30px;
          text-align: center;
        }
        
        .risk-score {
          font-size: 48px;
          font-weight: bold;
          color: ${getRiskColor(riskAnalysis.totalScore)};
          margin-bottom: 10px;
        }
        
        .risk-level {
          font-size: 24px;
          font-weight: bold;
          color: ${getRiskColor(riskAnalysis.totalScore)};
          margin-bottom: 10px;
        }
        
        .flagged {
          background: #fee2e2;
          color: #dc2626;
          padding: 8px 16px;
          border-radius: 20px;
          display: inline-block;
          font-weight: bold;
          font-size: 12px;
        }
        
        .section {
          margin-bottom: 30px;
        }
        
        .section h2 {
          color: #0891b2;
          font-size: 20px;
          margin-bottom: 15px;
          border-bottom: 1px solid #e5e7eb;
          padding-bottom: 5px;
        }
        
        .tender-info {
          background: #f9fafb;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 20px;
        }
        
        .info-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 10px;
          padding: 8px 0;
          border-bottom: 1px solid #e5e7eb;
        }
        
        .info-row:last-child {
          border-bottom: none;
        }
        
        .info-label {
          font-weight: bold;
          color: #666;
          width: 40%;
        }
        
        .info-value {
          color: #333;
          width: 60%;
          text-align: right;
        }
        
        .risk-factor {
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 15px;
          margin-bottom: 15px;
        }
        
        .risk-factor-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        
        .risk-factor-name {
          font-weight: bold;
          color: #333;
        }
        
        .risk-factor-score {
          font-weight: bold;
          font-size: 16px;
        }
        
        .risk-factor-description {
          color: #666;
          font-size: 13px;
          margin-bottom: 8px;
        }
        
        .risk-factor-category {
          background: #f3f4f6;
          color: #6b7280;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 11px;
          text-transform: capitalize;
        }
        
        .recommendation {
          background: #dbeafe;
          border-left: 4px solid #3b82f6;
          padding: 15px;
          margin-bottom: 10px;
          border-radius: 0 6px 6px 0;
        }
        
        .recommendation-text {
          color: #1e40af;
          font-size: 13px;
        }
        
        .timeline-event {
          border-left: 3px solid #d1d5db;
          padding-left: 15px;
          margin-bottom: 20px;
          position: relative;
        }
        
        .timeline-event::before {
          content: '';
          position: absolute;
          left: -6px;
          top: 5px;
          width: 9px;
          height: 9px;
          background: #3b82f6;
          border-radius: 50%;
        }
        
        .timeline-event.completed::before {
          background: #10b981;
        }
        
        .timeline-event.current::before {
          background: #f59e0b;
        }
        
        .timeline-date {
          font-size: 12px;
          color: #666;
          margin-bottom: 5px;
        }
        
        .timeline-title {
          font-weight: bold;
          color: #333;
          margin-bottom: 3px;
        }
        
        .timeline-description {
          color: #666;
          font-size: 13px;
        }
        
        .footer {
          border-top: 1px solid #e5e7eb;
          padding-top: 20px;
          margin-top: 40px;
          text-align: center;
          color: #666;
          font-size: 12px;
        }
        
        .generated-date {
          margin-bottom: 10px;
        }
        
        .disclaimer {
          font-style: italic;
          max-width: 600px;
          margin: 0 auto;
        }
        
        @media print {
          body {
            font-size: 12px;
          }
          
          .container {
            padding: 10px;
          }
          
          .section {
            break-inside: avoid;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <!-- Header -->
        <div class="header">
          <h1>${isEnglish ? 'CivicLens Risk Brief' : 'সিভিকলেন্স ঝুঁকি সংক্ষিপ্তসার'}</h1>
          <div class="subtitle">${isEnglish ? 'Procurement Risk Analysis Report' : 'সংগ্রহ ঝুঁকি বিশ্লেষণ প্রতিবেদন'}</div>
        </div>

        <!-- Risk Overview -->
        <div class="risk-overview">
          <div class="risk-score">${riskAnalysis.totalScore}</div>
          <div class="risk-level">${getRiskLevelText(riskAnalysis.totalScore)}</div>
          ${riskAnalysis.flagged ? `<div class="flagged">🚩 ${isEnglish ? 'Flagged for Review' : 'পর্যালোচনার জন্য চিহ্নিত'}</div>` : ''}
        </div>

        <!-- Tender Information -->
        <div class="section">
          <h2>${isEnglish ? 'Tender Information' : 'দরপত্র তথ্য'}</h2>
          <div class="tender-info">
            <div class="info-row">
              <div class="info-label">${isEnglish ? 'Title' : 'শিরোনাম'}</div>
              <div class="info-value">${title}</div>
            </div>
            <div class="info-row">
              <div class="info-label">${isEnglish ? 'Organization' : 'সংস্থা'}</div>
              <div class="info-value">${organization}</div>
            </div>
            <div class="info-row">
              <div class="info-label">${isEnglish ? 'Tender ID' : 'দরপত্র আইডি'}</div>
              <div class="info-value">${tender.id}</div>
            </div>
            <div class="info-row">
              <div class="info-label">${isEnglish ? 'Amount' : 'পরিমাণ'}</div>
              <div class="info-value" style="color: #059669; font-weight: bold;">${formatAmount(tender.amount)}</div>
            </div>
            <div class="info-row">
              <div class="info-label">${isEnglish ? 'Type' : 'ধরন'}</div>
              <div class="info-value">${tender.tender_type}</div>
            </div>
            <div class="info-row">
              <div class="info-label">${isEnglish ? 'Submission Deadline' : 'জমা দেওয়ার শেষ তারিখ'}</div>
              <div class="info-value">${new Date(tender.submission_end).toLocaleDateString()}</div>
            </div>
            <div class="info-row">
              <div class="info-label">${isEnglish ? 'Decision Deadline' : 'সিদ্ধান্তের শেষ তারিখ'}</div>
              <div class="info-value">${new Date(tender.deadline).toLocaleDateString()}</div>
            </div>
          </div>
        </div>

        ${options.includeRiskFactors && riskAnalysis.factors.length > 0 ? `
        <!-- Risk Factors -->
        <div class="section">
          <h2>${isEnglish ? 'Risk Factors' : 'ঝুঁকির কারণসমূহ'} (${riskAnalysis.factors.length})</h2>
          ${riskAnalysis.factors.map(factor => `
            <div class="risk-factor">
              <div class="risk-factor-header">
                <div class="risk-factor-name">${factor.name}</div>
                <div class="risk-factor-score" style="color: ${getRiskColor(factor.score)};">+${factor.score}</div>
              </div>
              <div class="risk-factor-description">${factor.description}</div>
              <div class="risk-factor-category">${factor.category} • ${isEnglish ? 'Weight' : 'ওজন'}: ${(factor.weight * 100).toFixed(0)}%</div>
            </div>
          `).join('')}
        </div>
        ` : ''}

        ${options.includeRecommendations && riskAnalysis.recommendations.length > 0 ? `
        <!-- Recommendations -->
        <div class="section">
          <h2>${isEnglish ? 'Recommendations' : 'সুপারিশসমূহ'} (${riskAnalysis.recommendations.length})</h2>
          ${riskAnalysis.recommendations.map(rec => `
            <div class="recommendation">
              <div class="recommendation-text">💡 ${rec}</div>
            </div>
          `).join('')}
        </div>
        ` : ''}

        ${options.includeTimeline ? `
        <!-- Timeline -->
        <div class="section">
          <h2>${isEnglish ? 'Timeline' : 'সময়সূচী'}</h2>
          <div class="timeline-event completed">
            <div class="timeline-date">${new Date(tender.submission_start).toLocaleDateString()}</div>
            <div class="timeline-title">${isEnglish ? 'Submission Opens' : 'জমা দেওয়া শুরু'}</div>
            <div class="timeline-description">${isEnglish ? 'Tender submission period begins' : 'দরপত্র জমা দেওয়ার সময় শুরু'}</div>
          </div>
          
          <div class="timeline-event ${new Date() > new Date(tender.submission_end) ? 'completed' : 'current'}">
            <div class="timeline-date">${new Date(tender.submission_end).toLocaleDateString()}</div>
            <div class="timeline-title">${isEnglish ? 'Submission Closes' : 'জমা দেওয়া বন্ধ'}</div>
            <div class="timeline-description">${isEnglish ? 'Last date for bid submission' : 'দরপত্র জমা দেওয়ার শেষ তারিখ'}</div>
          </div>
          
          <div class="timeline-event ${new Date() > new Date(tender.deadline) ? 'completed' : ''}">
            <div class="timeline-date">${new Date(tender.deadline).toLocaleDateString()}</div>
            <div class="timeline-title">${isEnglish ? 'Decision Deadline' : 'সিদ্ধান্তের শেষ তারিখ'}</div>
            <div class="timeline-description">${isEnglish ? 'Tender evaluation and award decision' : 'দরপত্র মূল্যায়ন এবং পুরস্কার সিদ্ধান্ত'}</div>
          </div>
        </div>
        ` : ''}

        <!-- Footer -->
        <div class="footer">
          <div class="generated-date">
            ${isEnglish ? 'Generated on' : 'তৈরি হয়েছে'}: ${currentDate}
          </div>
          <div class="disclaimer">
            ${isEnglish 
              ? 'This risk assessment is generated automatically based on available data and should be used as a supplementary tool for procurement oversight. Human judgment and additional verification are recommended for critical decisions.'
              : 'এই ঝুঁকি মূল্যায়ন উপলব্ধ তথ্যের ভিত্তিতে স্বয়ংক্রিয়ভাবে তৈরি করা হয়েছে এবং সংগ্রহ তদারকির জন্য একটি সম্পূরক সরঞ্জাম হিসাবে ব্যবহার করা উচিত। গুরুত্বপূর্ণ সিদ্ধান্তের জন্য মানুষের বিচার এবং অতিরিক্ত যাচাইকরণ সুপারিশ করা হয়।'
            }
          </div>
          <div style="margin-top: 10px; color: #0891b2; font-weight: bold;">
            ${isEnglish ? 'Powered by CivicLens' : 'সিভিকলেন্স দ্বারা চালিত'}
          </div>
        </div>
      </div>
    </body>
    </html>
    `;
  }

  /**
   * Export simple tender list as PDF
   */
  async exportTenderList(
    tenders: TenderData[],
    title: string = 'Tender List',
    language: 'en' | 'bn' = 'en'
  ): Promise<boolean> {
    try {
      const isEnglish = language === 'en';
      const currentDate = new Date().toLocaleDateString(isEnglish ? 'en-US' : 'bn-BD');
      
      const formatAmount = (amount: number) => {
        if (amount >= 10000000) {
          return `${(amount / 10000000).toFixed(1)}${isEnglish ? ' Cr' : ' কোটি'}`;
        } else if (amount >= 100000) {
          return `${(amount / 100000).toFixed(1)}${isEnglish ? ' Lakh' : ' লক্ষ'}`;
        }
        return amount.toLocaleString();
      };

      const getRiskColor = (score: number) => {
        if (score >= 70) return '#dc2626';
        if (score >= 30) return '#ea580c';
        return '#84cc16';
      };

      const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #0891b2; padding-bottom: 20px; }
          .tender-item { border: 1px solid #e5e7eb; margin-bottom: 15px; padding: 15px; border-radius: 8px; }
          .tender-title { font-weight: bold; font-size: 16px; margin-bottom: 5px; }
          .tender-org { color: #666; margin-bottom: 10px; }
          .tender-details { display: flex; justify-content: space-between; align-items: center; }
          .risk-badge { padding: 4px 8px; border-radius: 12px; color: white; font-size: 12px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${title}</h1>
          <p>${isEnglish ? 'Generated on' : 'তৈরি হয়েছে'}: ${currentDate}</p>
        </div>
        
        ${tenders.map(tender => `
          <div class="tender-item">
            <div class="tender-title">${isEnglish ? tender.title_en : tender.title_bn}</div>
            <div class="tender-org">${isEnglish ? tender.organization_en : tender.organization_bn}</div>
            <div class="tender-details">
              <div>
                <strong>${isEnglish ? 'Amount' : 'পরিমাণ'}:</strong> ${formatAmount(tender.amount)}<br>
                <strong>${isEnglish ? 'Deadline' : 'শেষ তারিখ'}:</strong> ${new Date(tender.deadline).toLocaleDateString()}
              </div>
              <div class="risk-badge" style="background-color: ${getRiskColor(tender.risk_score)};">
                ${isEnglish ? 'Risk' : 'ঝুঁকি'}: ${tender.risk_score}%
              </div>
            </div>
          </div>
        `).join('')}
        
        <div style="margin-top: 30px; text-align: center; color: #666; font-size: 12px;">
          ${isEnglish ? 'Powered by CivicLens' : 'সিভিকলেন্স দ্বারা চালিত'}
        </div>
      </body>
      </html>
      `;

      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        base64: false
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: title,
          UTI: 'com.adobe.pdf'
        });
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Failed to export tender list PDF:', error);
      throw new Error('Tender list export failed');
    }
  }
}