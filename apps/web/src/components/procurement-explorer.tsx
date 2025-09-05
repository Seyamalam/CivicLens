'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Filter, Download, AlertTriangle, TrendingUp, Eye } from 'lucide-react';
import { DataExporter } from '@/lib/data-export';

interface Tender {
  id: string;
  title: string;
  organization: string;
  amount: number;
  deadline: string;
  riskScore: number;
  riskFlags: string[];
  status: 'active' | 'closed' | 'awarded';
  submissionStart: string;
  submissionEnd: string;
  tenderType: string;
  procurementMethod: string;
}

interface ProcurementStats {
  totalTenders: number;
  totalValue: number;
  highRiskTenders: number;
  averageRiskScore: number;
}

export function ProcurementExplorer() {
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [filteredTenders, setFilteredTenders] = useState<Tender[]>([]);
  const [stats, setStats] = useState<ProcurementStats | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRiskLevel, setSelectedRiskLevel] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTenderData();
  }, []);

  useEffect(() => {
    filterTenders();
  }, [searchTerm, selectedRiskLevel, selectedStatus, tenders]);

  const loadTenderData = () => {
    // Mock tender data
    const mockTenders: Tender[] = [
      {
        id: 'T-2024-001',
        title: 'Construction of Metro Rail Bridge over Buriganga River',
        organization: 'Dhaka Mass Transit Company Limited',
        amount: 2500000000,
        deadline: '2024-03-15',
        riskScore: 75,
        riskFlags: ['single_bidder', 'short_window', 'high_value'],
        status: 'active',
        submissionStart: '2024-02-01',
        submissionEnd: '2024-03-15',
        tenderType: 'construction',
        procurementMethod: 'open_tender'
      },
      {
        id: 'T-2024-002', 
        title: 'Supply of Medical Equipment for Government Hospitals',
        organization: 'Ministry of Health and Family Welfare',
        amount: 850000000,
        deadline: '2024-02-28',
        riskScore: 45,
        riskFlags: ['repeat_winner'],
        status: 'active',
        submissionStart: '2024-01-15',
        submissionEnd: '2024-02-28',
        tenderType: 'goods',
        procurementMethod: 'open_tender'
      },
      {
        id: 'T-2024-003',
        title: 'Road Development Project - Chittagong to Cox\'s Bazar',
        organization: 'Roads and Highways Department',
        amount: 4200000000,
        deadline: '2024-01-30',
        riskScore: 85,
        riskFlags: ['single_bidder', 'amount_pattern', 'process_deviation'],
        status: 'closed',
        submissionStart: '2023-12-01',
        submissionEnd: '2024-01-30',
        tenderType: 'construction',
        procurementMethod: 'limited_tender'
      },
      {
        id: 'T-2024-004',
        title: 'IT Infrastructure Upgrade for Government Offices',
        organization: 'Ministry of Public Administration',
        amount: 650000000,
        deadline: '2024-03-10',
        riskScore: 30,
        riskFlags: [],
        status: 'active',
        submissionStart: '2024-01-20',
        submissionEnd: '2024-03-10',
        tenderType: 'services',
        procurementMethod: 'open_tender'
      },
      {
        id: 'T-2024-005',
        title: 'Construction of Community Health Centers',
        organization: 'Local Government Division',
        amount: 1200000000,
        deadline: '2024-02-20',
        riskScore: 60,
        riskFlags: ['short_window', 'repeat_winner'],
        status: 'awarded',
        submissionStart: '2024-01-10',
        submissionEnd: '2024-02-20',
        tenderType: 'construction',
        procurementMethod: 'open_tender'
      }
    ];

    setTenders(mockTenders);

    // Calculate stats
    const totalValue = mockTenders.reduce((sum, tender) => sum + tender.amount, 0);
    const highRiskCount = mockTenders.filter(tender => tender.riskScore > 60).length;
    const avgRisk = mockTenders.reduce((sum, tender) => sum + tender.riskScore, 0) / mockTenders.length;

    setStats({
      totalTenders: mockTenders.length,
      totalValue,
      highRiskTenders: highRiskCount,
      averageRiskScore: Math.round(avgRisk)
    });

    setLoading(false);
  };

  const filterTenders = () => {
    let filtered = tenders;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(tender => 
        tender.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tender.organization.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tender.id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Risk level filter
    if (selectedRiskLevel !== 'all') {
      filtered = filtered.filter(tender => {
        if (selectedRiskLevel === 'high') return tender.riskScore > 60;
        if (selectedRiskLevel === 'medium') return tender.riskScore >= 30 && tender.riskScore <= 60;
        if (selectedRiskLevel === 'low') return tender.riskScore < 30;
        return true;
      });
    }

    // Status filter
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(tender => tender.status === selectedStatus);
    }

    setFilteredTenders(filtered);
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 10000000) {
      return `৳${(amount / 10000000).toFixed(1)}Cr`;
    } else if (amount >= 100000) {
      return `৳${(amount / 100000).toFixed(1)}L`;
    } else {
      return `৳${amount.toLocaleString()}`;
    }
  };

  const getRiskColor = (score: number) => {
    if (score > 60) return 'bg-red-100 text-red-800 border-red-200';
    if (score >= 30) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-green-100 text-green-800 border-green-200';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'closed': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'awarded': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const exportData = () => {
    // Use the new DataExporter for better export functionality
    DataExporter.exportProcurementData(filteredTenders, 'csv');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading procurement data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg p-6">
        <h1 className="text-3xl font-bold mb-2">🏛️ Procurement Explorer</h1>
        <p className="text-blue-100">
          Explore public procurement data with advanced risk analysis and transparency tools
        </p>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tenders</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalTenders}</div>
              <p className="text-xs text-muted-foreground">Active and closed tenders</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Value</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.totalValue)}</div>
              <p className="text-xs text-muted-foreground">Combined tender value</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">High Risk</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.highRiskTenders}</div>
              <p className="text-xs text-muted-foreground">Tenders with risk score &gt; 60</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Risk Score</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.averageRiskScore}</div>
              <p className="text-xs text-muted-foreground">Platform-wide average</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Search & Filter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search tenders, organizations, or IDs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={selectedRiskLevel} onValueChange={setSelectedRiskLevel}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Risk Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Risk Levels</SelectItem>
                <SelectItem value="high">High Risk (&gt;60)</SelectItem>
                <SelectItem value="medium">Medium Risk (30-60)</SelectItem>
                <SelectItem value="low">Low Risk (&lt;30)</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
                <SelectItem value="awarded">Awarded</SelectItem>
              </SelectContent>
            </Select>

            <Button onClick={exportData} variant="outline" className="w-full md:w-auto">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            Tender Results ({filteredTenders.length})
          </h2>
        </div>

        {filteredTenders.map((tender) => (
          <Card key={tender.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {tender.title}
                    </h3>
                    <Badge className={getRiskColor(tender.riskScore)}>
                      Risk: {tender.riskScore}
                    </Badge>
                    <Badge className={getStatusColor(tender.status)}>
                      {tender.status.charAt(0).toUpperCase() + tender.status.slice(1)}
                    </Badge>
                  </div>
                  
                  <p className="text-gray-600 mb-2">{tender.organization}</p>
                  
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                    <span>ID: {tender.id}</span>
                    <span>Value: {formatCurrency(tender.amount)}</span>
                    <span>Deadline: {new Date(tender.deadline).toLocaleDateString()}</span>
                    <span>Method: {tender.procurementMethod.replace('_', ' ')}</span>
                  </div>
                </div>
                
                <Button variant="outline" size="sm">
                  <Eye className="h-4 w-4 mr-2" />
                  View Details
                </Button>
              </div>

              {/* Risk Flags */}
              {tender.riskFlags.length > 0 && (
                <div className="border-t pt-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Risk Flags:</p>
                  <div className="flex flex-wrap gap-2">
                    {tender.riskFlags.map((flag) => (
                      <Badge key={flag} variant="secondary" className="text-xs">
                        {flag.replace('_', ' ')}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {filteredTenders.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No tenders found</h3>
              <p className="text-gray-500">Try adjusting your search criteria or filters.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}