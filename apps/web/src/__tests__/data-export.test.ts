/**
 * Test Suite for Data Export Functionality
 * Tests the transparency data export system (CSV, JSON, PDF)
 */

import { DataExporter, ExportData } from '../lib/data-export';

// Mock DOM APIs
const mockCreateElement = jest.fn();
const mockAppendChild = jest.fn();
const mockRemoveChild = jest.fn();
const mockClick = jest.fn();
const mockCreateObjectURL = jest.fn();
const mockRevokeObjectURL = jest.fn();

// Setup DOM mocks
beforeAll(() => {
  Object.defineProperty(document, 'createElement', {
    value: mockCreateElement
  });
  
  Object.defineProperty(document.body, 'appendChild', {
    value: mockAppendChild
  });
  
  Object.defineProperty(document.body, 'removeChild', {
    value: mockRemoveChild
  });
  
  Object.defineProperty(window.URL, 'createObjectURL', {
    value: mockCreateObjectURL
  });
  
  Object.defineProperty(window.URL, 'revokeObjectURL', {
    value: mockRevokeObjectURL
  });

  Object.defineProperty(window, 'open', {
    value: jest.fn(() => ({
      document: {
        write: jest.fn(),
        close: jest.fn()
      },
      focus: jest.fn(),
      print: jest.fn(),
      close: jest.fn()
    }))
  });
});

describe('Data Export System', () => {
  const mockExportData: ExportData = {
    title: 'Test Export',
    description: 'Test data for export',
    headers: ['ID', 'Name', 'Amount', 'Date'],
    rows: [
      { 'ID': 'T-001', 'Name': 'Test Item 1', 'Amount': 1000, 'Date': '2024-01-15' },
      { 'ID': 'T-002', 'Name': 'Test Item 2', 'Amount': 2000, 'Date': '2024-01-16' },
      { 'ID': 'T-003', 'Name': 'Test Item with, comma', 'Amount': 3000, 'Date': '2024-01-17' }
    ],
    metadata: {
      exportDate: '2024-02-15T10:30:00Z',
      totalRecords: 3,
      source: 'Test Module'
    }
  };

  const mockTenderData = [
    {
      id: 'T-2024-001',
      title: 'Construction Project',
      organization: 'Test Ministry',
      amount: 5000000,
      riskScore: 75,
      status: 'active',
      deadline: '2024-03-15',
      riskFlags: ['high_value', 'single_bidder']
    },
    {
      id: 'T-2024-002',
      title: 'IT Equipment Purchase',
      organization: 'Education Ministry',
      amount: 1500000,
      riskScore: 30,
      status: 'completed',
      deadline: '2024-02-20',
      riskFlags: []
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateElement.mockReturnValue({
      href: '',
      download: '',
      click: mockClick
    });
    mockCreateObjectURL.mockReturnValue('mock-blob-url');
  });

  describe('CSV Export', () => {
    it('should generate correct CSV format', async () => {
      const mockBlob = jest.fn();
      global.Blob = mockBlob;

      await DataExporter.exportCSV(mockExportData);

      expect(mockBlob).toHaveBeenCalledWith(
        [expect.stringContaining('ID,Name,Amount,Date')],
        { type: 'text/csv' }
      );
      
      expect(mockCreateObjectURL).toHaveBeenCalled();
      expect(mockClick).toHaveBeenCalled();
      expect(mockRevokeObjectURL).toHaveBeenCalled();
    });

    it('should handle special characters in CSV', async () => {
      const specialData: ExportData = {
        headers: ['Field1', 'Field2'],
        rows: [
          { 'Field1': 'Text with "quotes"', 'Field2': 'Text, with, commas' },
          { 'Field1': 'Text\nwith\nnewlines', 'Field2': 'Normal text' }
        ]
      };

      const mockBlob = jest.fn();
      global.Blob = mockBlob;

      await DataExporter.exportCSV(specialData);

      const csvContent = mockBlob.mock.calls[0][0][0];
      expect(csvContent).toContain('"Text with ""quotes"""');
      expect(csvContent).toContain('"Text, with, commas"');
    });

    it('should include metadata as comments', async () => {
      const mockBlob = jest.fn();
      global.Blob = mockBlob;

      await DataExporter.exportCSV(mockExportData);

      const csvContent = mockBlob.mock.calls[0][0][0];
      expect(csvContent).toContain('# Test Export');
      expect(csvContent).toContain('# Export Date: 2024-02-15T10:30:00Z');
      expect(csvContent).toContain('# Total Records: 3');
    });
  });

  describe('JSON Export', () => {
    it('should generate correct JSON structure', async () => {
      const mockBlob = jest.fn();
      global.Blob = mockBlob;

      await DataExporter.exportJSON(mockExportData);

      expect(mockBlob).toHaveBeenCalledWith(
        [expect.stringContaining('"title":"Test Export"')],
        { type: 'application/json' }
      );

      const jsonContent = JSON.parse(mockBlob.mock.calls[0][0][0]);
      expect(jsonContent).toHaveProperty('title', 'Test Export');
      expect(jsonContent).toHaveProperty('metadata');
      expect(jsonContent).toHaveProperty('headers');
      expect(jsonContent).toHaveProperty('data');
    });

    it('should include complete metadata in JSON', async () => {
      const mockBlob = jest.fn();
      global.Blob = mockBlob;

      await DataExporter.exportJSON(mockExportData);

      const jsonContent = JSON.parse(mockBlob.mock.calls[0][0][0]);
      expect(jsonContent.metadata).toHaveProperty('exportDate');
      expect(jsonContent.metadata).toHaveProperty('totalRecords', 3);
      expect(jsonContent.metadata).toHaveProperty('source', 'CivicLens Platform');
    });
  });

  describe('PDF Export', () => {
    it('should open print window for PDF generation', async () => {
      const mockWindow = {
        document: {
          write: jest.fn(),
          close: jest.fn()
        },
        focus: jest.fn(),
        print: jest.fn(),
        close: jest.fn()
      };

      const mockOpen = jest.fn().mockReturnValue(mockWindow);
      Object.defineProperty(window, 'open', { value: mockOpen });

      await DataExporter.exportPDF(mockExportData);

      expect(mockOpen).toHaveBeenCalledWith('', '_blank');
      expect(mockWindow.document.write).toHaveBeenCalled();
      expect(mockWindow.focus).toHaveBeenCalled();
    });

    it('should generate proper HTML structure for PDF', async () => {
      const mockWindow = {
        document: {
          write: jest.fn(),
          close: jest.fn()
        },
        focus: jest.fn(),
        print: jest.fn(),
        close: jest.fn()
      };

      Object.defineProperty(window, 'open', { value: jest.fn().mockReturnValue(mockWindow) });

      await DataExporter.exportPDF(mockExportData);

      const htmlContent = mockWindow.document.write.mock.calls[0][0];
      expect(htmlContent).toContain('<!DOCTYPE html>');
      expect(htmlContent).toContain('<table>');
      expect(htmlContent).toContain('Test Export');
      expect(htmlContent).toContain('CivicLens Platform');
    });
  });

  describe('Procurement Data Export', () => {
    it('should format procurement data correctly', () => {
      const mockBlob = jest.fn();
      global.Blob = mockBlob;

      DataExporter.exportProcurementData(mockTenderData, 'csv');

      const csvContent = mockBlob.mock.calls[0][0][0];
      expect(csvContent).toContain('ID,Title,Organization,Amount (BDT),Risk Score,Status,Deadline,Risk Flags');
      expect(csvContent).toContain('T-2024-001');
      expect(csvContent).toContain('Construction Project');
      expect(csvContent).toContain('high_value; single_bidder');
    });

    it('should handle all export formats for procurement data', () => {
      const mockBlob = jest.fn();
      global.Blob = mockBlob;

      // Test CSV
      DataExporter.exportProcurementData(mockTenderData, 'csv');
      expect(mockBlob).toHaveBeenCalledWith(
        [expect.stringContaining('ProcureLens Module')],
        { type: 'text/csv' }
      );

      // Test JSON
      DataExporter.exportProcurementData(mockTenderData, 'json');
      expect(mockBlob).toHaveBeenCalledWith(
        [expect.stringContaining('Procurement Transparency Data')],
        { type: 'application/json' }
      );
    });
  });

  describe('Service Data Export', () => {
    const mockServices = [
      { name: 'NID Card', officialFee: 125, office: 'Election Commission' }
    ];

    const mockReports = [
      {
        serviceName: 'NID Card',
        officialFee: 125,
        reportedFee: 300,
        overchargePercent: 140,
        location: 'Dhaka',
        verified: true
      }
    ];

    it('should combine services and reports data', () => {
      const mockBlob = jest.fn();
      global.Blob = mockBlob;

      DataExporter.exportServiceData(mockServices, mockReports, 'csv');

      const csvContent = mockBlob.mock.calls[0][0][0];
      expect(csvContent).toContain('Official Service');
      expect(csvContent).toContain('Citizen Report');
      expect(csvContent).toContain('NID Card');
    });

    it('should export structured JSON for services', () => {
      const mockBlob = jest.fn();
      global.Blob = mockBlob;

      DataExporter.exportServiceData(mockServices, mockReports, 'json');

      const jsonContent = JSON.parse(mockBlob.mock.calls[0][0][0]);
      expect(jsonContent).toHaveProperty('services');
      expect(jsonContent).toHaveProperty('overchargeReports');
      expect(jsonContent.services).toEqual(mockServices);
      expect(jsonContent.overchargeReports).toEqual(mockReports);
    });
  });

  describe('Error Handling', () => {
    it('should handle Blob creation errors', async () => {
      global.Blob = jest.fn().mockImplementation(() => {
        throw new Error('Blob creation failed');
      });

      await expect(DataExporter.exportCSV(mockExportData)).rejects.toThrow();
    });

    it('should handle missing data gracefully', async () => {
      const emptyData: ExportData = {
        headers: [],
        rows: []
      };

      const mockBlob = jest.fn();
      global.Blob = mockBlob;

      await DataExporter.exportCSV(emptyData);

      expect(mockBlob).toHaveBeenCalled();
    });

    it('should handle null/undefined values in data', () => {
      const dataWithNulls: ExportData = {
        headers: ['Field1', 'Field2'],
        rows: [
          { 'Field1': null, 'Field2': undefined },
          { 'Field1': '', 'Field2': 0 }
        ]
      };

      const mockBlob = jest.fn();
      global.Blob = mockBlob;

      expect(() => DataExporter.exportCSV(dataWithNulls)).not.toThrow();
    });
  });

  describe('File Naming', () => {
    it('should generate proper filenames with timestamps', () => {
      const mockBlob = jest.fn();
      global.Blob = mockBlob;

      DataExporter.exportProcurementData(mockTenderData, 'csv');

      expect(mockCreateElement).toHaveBeenCalled();
      const downloadElement = mockCreateElement.mock.results[0].value;
      expect(downloadElement.download).toBe('procurement-data.csv');
    });

    it('should use custom filenames when provided', async () => {
      const mockBlob = jest.fn();
      global.Blob = mockBlob;

      await DataExporter.exportCSV(mockExportData, { 
        format: 'csv', 
        filename: 'custom-export.csv' 
      });

      const downloadElement = mockCreateElement.mock.results[0].value;
      expect(downloadElement.download).toBe('custom-export.csv');
    });
  });

  describe('Performance', () => {
    it('should handle large datasets efficiently', async () => {
      // Generate large dataset
      const largeData: ExportData = {
        headers: ['ID', 'Name', 'Value'],
        rows: Array.from({ length: 10000 }, (_, index) => ({
          'ID': `item-${index}`,
          'Name': `Item ${index}`,
          'Value': Math.random() * 1000
        }))
      };

      const mockBlob = jest.fn();
      global.Blob = mockBlob;

      const startTime = Date.now();
      await DataExporter.exportCSV(largeData);
      const endTime = Date.now();

      // Should process large dataset within 2 seconds
      expect(endTime - startTime).toBeLessThan(2000);
    });
  });
});