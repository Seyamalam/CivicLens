'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, FileSpreadsheet, FileJson, FileText, Database, AlertCircle, Calendar, Info } from 'lucide-react';
import { DataExporter } from '@/lib/data-export';

interface Dataset {
  id: string;
  name: string;
  description: string;
  category: string;
  recordCount: number;
  lastUpdated: string;
  size: string;
  icon: any;
  exportFunction: (format: 'csv' | 'json' | 'pdf') => void;
}

interface ExportStats {
  totalDatasets: number;
  totalRecords: number;
  lastExportDate: string;
  popularFormat: string;
}

export function DataExportCenter() {
  const [selectedFormat, setSelectedFormat] = useState<'csv' | 'json' | 'pdf'>('csv');
  const [isExporting, setIsExporting] = useState<string | null>(null);

  // Mock data for different datasets
  const mockProcurementData = [
    {
      id: 'T-2024-001',
      title: 'Construction of Metro Rail Bridge',
      organization: 'Dhaka Mass Transit Company',
      amount: 2500000000,
      riskScore: 75,
      status: 'active',
      deadline: '2024-03-15',
      riskFlags: ['single_bidder', 'high_value']
    }
  ];

  const mockServiceData = [
    {
      name: 'National ID Card',
      officialFee: 125,
      office: 'Election Commission'
    }
  ];

  const mockOverchargeReports = [
    {
      serviceName: 'National ID Card',
      officialFee: 125,
      reportedFee: 300,
      overchargePercent: 140,
      location: 'Dhaka',
      verified: true
    }
  ];

  const mockBudgetProjects = [
    {
      name: 'Metro Rail Extension',
      district: 'Dhaka',
      allocatedBudget: 15000000000,
      spentAmount: 8500000000,
      utilizationRate: 56.7,
      status: 'ongoing',
      progress: 56
    }
  ];

  const mockDistrictBudgets = [
    {
      district: 'Dhaka',
      totalAllocated: 20500000000,
      totalSpent: 11750000000,
      utilizationRate: 57.3,
      projectCount: 8
    }
  ];

  const mockRTIRequests = [
    {
      id: 'rti_001',
      subject: 'Budget allocation for rural roads',
      agency: 'Roads and Highways Department',
      topic: 'budget',
      status: 'responded',
      outcome: 'success',
      responseTime: 26,
      rating: 4.5,
      submittedDate: '2024-01-15'
    }
  ];

  const datasets: Dataset[] = [
    {
      id: 'procurement',
      name: 'Procurement Data',
      description: 'Public tender information with risk analysis and transparency metrics',
      category: 'ProcureLens',
      recordCount: 1247,
      lastUpdated: '2024-02-15',
      size: '2.3 MB',
      icon: FileSpreadsheet,
      exportFunction: (format) => DataExporter.exportProcurementData(mockProcurementData, format)
    },
    {
      id: 'services',
      name: 'Service Fees & Overcharges',
      description: 'Official government service fees and citizen overcharge reports',
      category: 'FeeCheck',
      recordCount: 856,
      lastUpdated: '2024-02-14',
      size: '1.8 MB',
      icon: Database,
      exportFunction: (format) => DataExporter.exportServiceData(mockServiceData, mockOverchargeReports, format)
    },
    {
      id: 'budget',
      name: 'Budget Transparency',
      description: 'Public project budgets, allocations, and utilization rates by district',
      category: 'WardWallet',
      recordCount: 432,
      lastUpdated: '2024-02-13',
      size: '3.1 MB',
      icon: FileText,
      exportFunction: (format) => DataExporter.exportBudgetData(mockBudgetProjects, mockDistrictBudgets, format)
    },
    {
      id: 'rti',
      name: 'RTI Requests & Outcomes',
      description: 'Right to Information requests and government response analytics',
      category: 'RTI Copilot',
      recordCount: 298,
      lastUpdated: '2024-02-12',
      size: '1.2 MB',
      icon: FileJson,
      exportFunction: (format) => DataExporter.exportRTIData(mockRTIRequests, [], format)
    }
  ];

  const stats: ExportStats = {
    totalDatasets: datasets.length,
    totalRecords: datasets.reduce((sum, d) => sum + d.recordCount, 0),
    lastExportDate: '2024-02-15',
    popularFormat: 'CSV'
  };

  const handleExport = async (dataset: Dataset) => {
    setIsExporting(dataset.id);
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Call the export function
      dataset.exportFunction(selectedFormat);
      
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(null);
    }
  };

  const handleBulkExport = async () => {
    setIsExporting('bulk');
    
    try {
      // Export all datasets sequentially
      for (const dataset of datasets) {
        await new Promise(resolve => setTimeout(resolve, 500));
        dataset.exportFunction(selectedFormat);
      }
    } catch (error) {
      console.error('Bulk export failed:', error);
    } finally {
      setIsExporting(null);
    }
  };

  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'csv': return <FileSpreadsheet className="h-4 w-4" />;
      case 'json': return <FileJson className="h-4 w-4" />;
      case 'pdf': return <FileText className="h-4 w-4" />;
      default: return <Download className="h-4 w-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'ProcureLens': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'FeeCheck': return 'bg-green-100 text-green-800 border-green-200';
      case 'WardWallet': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'RTI Copilot': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg p-6">
        <h1 className="text-3xl font-bold mb-2">📊 Data Export Center</h1>
        <p className="text-indigo-100">
          Download transparency datasets in multiple formats for research and accountability
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Datasets</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDatasets}</div>
            <p className="text-xs text-muted-foreground">Ready for export</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Records</CardTitle>
            <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRecords.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Across all datasets</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Updated</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{new Date(stats.lastExportDate).toLocaleDateString()}</div>
            <p className="text-xs text-muted-foreground">Most recent data</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Popular Format</CardTitle>
            <Download className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.popularFormat}</div>
            <p className="text-xs text-muted-foreground">Most downloaded</p>
          </CardContent>
        </Card>
      </div>

      {/* Export Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Export Format</label>
              <Select value={selectedFormat} onValueChange={(value: any) => setSelectedFormat(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="h-4 w-4" />
                      CSV - Comma Separated Values
                    </div>
                  </SelectItem>
                  <SelectItem value="json">
                    <div className="flex items-center gap-2">
                      <FileJson className="h-4 w-4" />
                      JSON - JavaScript Object Notation
                    </div>
                  </SelectItem>
                  <SelectItem value="pdf">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      PDF - Portable Document Format
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Button 
              onClick={handleBulkExport}
              disabled={isExporting !== null}
              className="w-full md:w-auto"
            >
              {getFormatIcon(selectedFormat)}
              <span className="ml-2">
                {isExporting === 'bulk' ? 'Exporting All...' : `Export All Datasets (${selectedFormat.toUpperCase()})`}
              </span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Dataset Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {datasets.map((dataset) => {
          const IconComponent = dataset.icon;
          return (
            <Card key={dataset.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <IconComponent className="h-6 w-6 text-gray-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{dataset.name}</CardTitle>
                      <Badge className={getCategoryColor(dataset.category)}>
                        {dataset.category}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <p className="text-gray-600 text-sm">{dataset.description}</p>
                
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Records</p>
                    <p className="font-semibold">{dataset.recordCount.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Size</p>
                    <p className="font-semibold">{dataset.size}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Updated</p>
                    <p className="font-semibold">{new Date(dataset.lastUpdated).toLocaleDateString()}</p>
                  </div>
                </div>
                
                <Button 
                  onClick={() => handleExport(dataset)}
                  disabled={isExporting !== null}
                  className="w-full"
                  variant={isExporting === dataset.id ? "secondary" : "default"}
                >
                  {getFormatIcon(selectedFormat)}
                  <span className="ml-2">
                    {isExporting === dataset.id 
                      ? 'Exporting...' 
                      : `Export as ${selectedFormat.toUpperCase()}`
                    }
                  </span>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Information Panel */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-800">
            <Info className="h-5 w-5" />
            Export Information
          </CardTitle>
        </CardHeader>
        <CardContent className="text-blue-700 space-y-2">
          <p className="text-sm">
            <strong>CSV:</strong> Best for spreadsheet analysis and data processing. Compatible with Excel, Google Sheets.
          </p>
          <p className="text-sm">
            <strong>JSON:</strong> Ideal for developers and API integration. Preserves data structure and relationships.
          </p>
          <p className="text-sm">
            <strong>PDF:</strong> Perfect for reports and documentation. Formatted for reading and sharing.
          </p>
          <div className="flex items-center gap-2 mt-4 p-3 bg-blue-100 rounded-lg">
            <AlertCircle className="h-4 w-4" />
            <span className="text-xs">
              All exported data is anonymized and contains only publicly available information for transparency purposes.
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}