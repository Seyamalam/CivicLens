// Data export utilities for CivicLens transparency tools

export interface ExportOptions {
  format: 'csv' | 'json' | 'pdf';
  filename?: string;
  title?: string;
  description?: string;
}

export interface DataRow {
  [key: string]: any;
}

export interface ExportData {
  headers: string[];
  rows: DataRow[];
  title?: string;
  description?: string;
  metadata?: {
    exportDate: string;
    totalRecords: number;
    source: string;
  };
}

export class DataExporter {
  private static generateFilename(baseName: string, format: string): string {
    const timestamp = new Date().toISOString().split('T')[0];
    return `${baseName}-${timestamp}.${format}`;
  }

  static async exportCSV(data: ExportData, options: ExportOptions = { format: 'csv' }): Promise<void> {
    const filename = options.filename || this.generateFilename('export', 'csv');
    
    // Create CSV header
    const csvHeader = data.headers.join(',');
    
    // Create CSV rows
    const csvRows = data.rows.map(row => 
      data.headers.map(header => {
        const value = row[header] || '';
        // Escape quotes and wrap in quotes if contains comma or quote
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      }).join(',')
    );

    // Combine header and rows
    const csvContent = [csvHeader, ...csvRows].join('\n');

    // Add metadata as comments if available
    let finalContent = csvContent;
    if (data.metadata) {
      const metadataComments = [
        `# ${data.title || 'Data Export'}`,
        `# ${data.description || 'Exported from CivicLens'}`,
        `# Export Date: ${data.metadata.exportDate}`,
        `# Total Records: ${data.metadata.totalRecords}`,
        `# Source: ${data.metadata.source}`,
        '#',
        csvContent
      ].join('\n');
      finalContent = metadataComments;
    }

    // Download file
    this.downloadFile(finalContent, filename, 'text/csv');
  }

  static async exportJSON(data: ExportData, options: ExportOptions = { format: 'json' }): Promise<void> {
    const filename = options.filename || this.generateFilename('export', 'json');
    
    const jsonData = {
      title: data.title || 'CivicLens Data Export',
      description: data.description || 'Exported data for transparency',
      metadata: {
        exportDate: new Date().toISOString(),
        totalRecords: data.rows.length,
        source: 'CivicLens Platform',
        ...data.metadata
      },
      headers: data.headers,
      data: data.rows
    };

    const jsonContent = JSON.stringify(jsonData, null, 2);
    this.downloadFile(jsonContent, filename, 'application/json');
  }

  static async exportPDF(data: ExportData, options: ExportOptions = { format: 'pdf' }): Promise<void> {
    const filename = options.filename || this.generateFilename('export', 'pdf');
    
    // Create HTML content for PDF generation
    const htmlContent = this.generatePDFHTML(data, options);
    
    // For web implementation, we'll use browser's print functionality
    // In a real implementation, you'd use a PDF library like jsPDF or puppeteer
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.focus();
      
      // Trigger print dialog
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 1000);
    }
  }

  private static generatePDFHTML(data: ExportData, options: ExportOptions): string {
    const title = options.title || data.title || 'CivicLens Data Export';
    const description = options.description || data.description || 'Data exported for transparency';
    
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${title}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 40px;
            color: #333;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #0891b2;
            padding-bottom: 20px;
        }
        .title {
            font-size: 24px;
            font-weight: bold;
            color: #0891b2;
            margin-bottom: 10px;
        }
        .description {
            font-size: 14px;
            color: #666;
            margin-bottom: 10px;
        }
        .metadata {
            font-size: 12px;
            color: #888;
        }
        .table-container {
            margin-top: 20px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }
        th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
            font-size: 11px;
        }
        th {
            background-color: #f8f9fa;
            font-weight: bold;
            color: #0891b2;
        }
        tr:nth-child(even) {
            background-color: #f9f9f9;
        }
        .footer {
            margin-top: 30px;
            text-align: center;
            font-size: 10px;
            color: #888;
            border-top: 1px solid #ddd;
            padding-top: 10px;
        }
        @media print {
            body { margin: 20px; }
            .no-print { display: none; }
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="title">${title}</div>
        <div class="description">${description}</div>
        <div class="metadata">
            Export Date: ${new Date().toLocaleDateString()} | 
            Total Records: ${data.rows.length} | 
            Source: CivicLens Platform
        </div>
    </div>
    
    <div class="table-container">
        <table>
            <thead>
                <tr>
                    ${data.headers.map(header => `<th>${header}</th>`).join('')}
                </tr>
            </thead>
            <tbody>
                ${data.rows.map(row => `
                    <tr>
                        ${data.headers.map(header => `<td>${row[header] || ''}</td>`).join('')}
                    </tr>
                `).join('')}
            </tbody>
        </table>
    </div>
    
    <div class="footer">
        Generated by CivicLens - Anti-Corruption Platform for Bangladesh<br>
        This document contains public data exported for transparency purposes.
    </div>
</body>
</html>
    `;
  }

  private static downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  // Specific exporters for different data types
  static exportProcurementData(tenders: any[], format: 'csv' | 'json' | 'pdf' = 'csv'): void {
    const data: ExportData = {
      title: 'Procurement Transparency Data',
      description: 'Public tender information with risk analysis',
      headers: ['ID', 'Title', 'Organization', 'Amount (BDT)', 'Risk Score', 'Status', 'Deadline', 'Risk Flags'],
      rows: tenders.map(tender => ({
        'ID': tender.id,
        'Title': tender.title,
        'Organization': tender.organization,
        'Amount (BDT)': tender.amount.toLocaleString(),
        'Risk Score': tender.riskScore,
        'Status': tender.status,
        'Deadline': new Date(tender.deadline).toLocaleDateString(),
        'Risk Flags': tender.riskFlags.join('; ')
      })),
      metadata: {
        exportDate: new Date().toISOString(),
        totalRecords: tenders.length,
        source: 'ProcureLens Module'
      }
    };

    switch (format) {
      case 'csv':
        this.exportCSV(data, { format, filename: 'procurement-data.csv' });
        break;
      case 'json':
        this.exportJSON(data, { format, filename: 'procurement-data.json' });
        break;
      case 'pdf':
        this.exportPDF(data, { format, filename: 'procurement-data.pdf', title: data.title });
        break;
    }
  }

  static exportServiceData(services: any[], overchargeReports: any[], format: 'csv' | 'json' | 'pdf' = 'csv'): void {
    if (format === 'json') {
      // For JSON, export both services and reports in structured format
      const data = {
        title: 'Service Fee Transparency Data',
        description: 'Official service fees and citizen overcharge reports',
        metadata: {
          exportDate: new Date().toISOString(),
          totalServices: services.length,
          totalReports: overchargeReports.length,
          source: 'FeeCheck Module'
        },
        services: services,
        overchargeReports: overchargeReports
      };
      
      const filename = this.generateFilename('service-data', 'json');
      const jsonContent = JSON.stringify(data, null, 2);
      this.downloadFile(jsonContent, filename, 'application/json');
      return;
    }

    // For CSV and PDF, combine the data
    const combinedData: ExportData = {
      title: 'Service Fee & Overcharge Data',
      description: 'Official fees and citizen reports for transparency',
      headers: ['Type', 'Service', 'Official Fee (BDT)', 'Reported Fee (BDT)', 'Overcharge (%)', 'Location', 'Status'],
      rows: [
        ...services.map(service => ({
          'Type': 'Official Service',
          'Service': service.name,
          'Official Fee (BDT)': service.officialFee.toLocaleString(),
          'Reported Fee (BDT)': '-',
          'Overcharge (%)': '-',
          'Location': service.office,
          'Status': 'Official'
        })),
        ...overchargeReports.map(report => ({
          'Type': 'Citizen Report',
          'Service': report.serviceName,
          'Official Fee (BDT)': report.officialFee.toLocaleString(),
          'Reported Fee (BDT)': report.reportedFee.toLocaleString(),
          'Overcharge (%)': report.overchargePercent.toFixed(1),
          'Location': report.location,
          'Status': report.verified ? 'Verified' : 'Pending'
        }))
      ],
      metadata: {
        exportDate: new Date().toISOString(),
        totalRecords: services.length + overchargeReports.length,
        source: 'FeeCheck Module'
      }
    };

    const filename = this.generateFilename('service-data', format);
    
    switch (format) {
      case 'csv':
        this.exportCSV(combinedData, { format, filename });
        break;
      case 'pdf':
        this.exportPDF(combinedData, { format, filename, title: combinedData.title });
        break;
    }
  }

  static exportBudgetData(projects: any[], districts: any[], format: 'csv' | 'json' | 'pdf' = 'csv'): void {
    if (format === 'json') {
      const data = {
        title: 'Budget Transparency Data',
        description: 'Public project budgets and district-wise allocation',
        metadata: {
          exportDate: new Date().toISOString(),
          totalProjects: projects.length,
          totalDistricts: districts.length,
          source: 'WardWallet Module'
        },
        projects: projects,
        districts: districts
      };
      
      const filename = this.generateFilename('budget-data', 'json');
      const jsonContent = JSON.stringify(data, null, 2);
      this.downloadFile(jsonContent, filename, 'application/json');
      return;
    }

    const combinedData: ExportData = {
      title: 'Budget Transparency Report',
      description: 'Project allocations and district performance',
      headers: ['Type', 'Name', 'District', 'Allocated (BDT)', 'Spent (BDT)', 'Utilization (%)', 'Status', 'Progress (%)'],
      rows: [
        ...projects.map(project => ({
          'Type': 'Project',
          'Name': project.name,
          'District': project.district,
          'Allocated (BDT)': project.allocatedBudget.toLocaleString(),
          'Spent (BDT)': project.spentAmount.toLocaleString(),
          'Utilization (%)': project.utilizationRate.toFixed(1),
          'Status': project.status,
          'Progress (%)': project.progress
        })),
        ...districts.map(district => ({
          'Type': 'District Summary',
          'Name': district.district,
          'District': district.district,
          'Allocated (BDT)': district.totalAllocated.toLocaleString(),
          'Spent (BDT)': district.totalSpent.toLocaleString(),
          'Utilization (%)': district.utilizationRate.toFixed(1),
          'Status': `${district.projectCount} projects`,
          'Progress (%)': '-'
        }))
      ],
      metadata: {
        exportDate: new Date().toISOString(),
        totalRecords: projects.length + districts.length,
        source: 'WardWallet Module'
      }
    };

    const filename = this.generateFilename('budget-data', format);
    
    switch (format) {
      case 'csv':
        this.exportCSV(combinedData, { format, filename });
        break;
      case 'pdf':
        this.exportPDF(combinedData, { format, filename, title: combinedData.title });
        break;
    }
  }

  static exportRTIData(requests: any[], outcomes: any[], format: 'csv' | 'json' | 'pdf' = 'csv'): void {
    if (format === 'json') {
      const data = {
        title: 'RTI Transparency Data',
        description: 'Right to Information requests and government responses',
        metadata: {
          exportDate: new Date().toISOString(),
          totalRequests: requests.length,
          totalOutcomes: outcomes.length,
          source: 'RTI Copilot Module'
        },
        requests: requests,
        outcomes: outcomes
      };
      
      const filename = this.generateFilename('rti-data', 'json');
      const jsonContent = JSON.stringify(data, null, 2);
      this.downloadFile(jsonContent, filename, 'application/json');
      return;
    }

    const combinedData: ExportData = {
      title: 'RTI Requests & Outcomes Report',
      description: 'Public information requests and government responses',
      headers: ['ID', 'Subject', 'Agency', 'Topic', 'Status', 'Outcome', 'Response Time (days)', 'Rating', 'Submitted Date'],
      rows: requests.map(request => ({
        'ID': request.id,
        'Subject': request.subject,
        'Agency': request.agency,
        'Topic': request.topic,
        'Status': request.status,
        'Outcome': request.outcome,
        'Response Time (days)': request.responseTime || 'Pending',
        'Rating': request.rating ? `${request.rating}/5` : 'N/A',
        'Submitted Date': new Date(request.submittedDate).toLocaleDateString()
      })),
      metadata: {
        exportDate: new Date().toISOString(),
        totalRecords: requests.length,
        source: 'RTI Copilot Module'
      }
    };

    const filename = this.generateFilename('rti-data', format);
    
    switch (format) {
      case 'csv':
        this.exportCSV(combinedData, { format, filename });
        break;
      case 'pdf':
        this.exportPDF(combinedData, { format, filename, title: combinedData.title });
        break;
    }
  }
}