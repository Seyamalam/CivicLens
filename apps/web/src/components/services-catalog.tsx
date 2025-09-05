'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Filter, Download, AlertTriangle, MapPin, TrendingUp, Clock, DollarSign, Users } from 'lucide-react';

interface Service {
  id: string;
  name: string;
  category: string;
  officialFee: number;
  averageTime: string;
  office: string;
  description: string;
  documents: string[];
  lastUpdated: string;
}

interface OverchargeReport {
  id: string;
  serviceId: string;
  serviceName: string;
  reportedFee: number;
  officialFee: number;
  overchargeAmount: number;
  overchargePercent: number;
  location: string;
  district: string;
  reportedAt: string;
  verified: boolean;
}

interface ServiceStats {
  totalServices: number;
  totalReports: number;
  averageOvercharge: number;
  mostReportedService: string;
}

interface DistrictOvercharge {
  district: string;
  reportCount: number;
  avgOvercharge: number;
  totalOvercharged: number;
  riskLevel: 'low' | 'medium' | 'high';
}

const SERVICE_CATEGORIES = [
  { id: 'all', name: 'All Services', icon: 'list' },
  { id: 'identity', name: 'Identity Documents', icon: 'id-card' },
  { id: 'civil', name: 'Civil Registration', icon: 'file-text' },
  { id: 'land', name: 'Land & Property', icon: 'map' },
  { id: 'business', name: 'Business & Trade', icon: 'briefcase' },
  { id: 'transport', name: 'Transport', icon: 'car' },
  { id: 'other', name: 'Other Services', icon: 'more-horizontal' }
];

export function ServicesCatalog() {
  const [services, setServices] = useState<Service[]>([]);
  const [overchargeReports, setOverchargeReports] = useState<OverchargeReport[]>([]);
  const [districtData, setDistrictData] = useState<DistrictOvercharge[]>([]);
  const [filteredServices, setFilteredServices] = useState<Service[]>([]);
  const [stats, setStats] = useState<ServiceStats | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedDistrict, setSelectedDistrict] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadServiceData();
    loadOverchargeData();
  }, []);

  useEffect(() => {
    filterServices();
  }, [searchTerm, selectedCategory, services]);

  const loadServiceData = () => {
    // Mock service data
    const mockServices: Service[] = [
      {
        id: 'srv_001',
        name: 'National ID Card (New)',
        category: 'identity',
        officialFee: 125,
        averageTime: '7-10 days',
        office: 'Election Commission Secretariat',
        description: 'New National ID Card issuance for first-time applicants',
        documents: ['Birth Certificate', 'Passport Size Photo', 'Address Proof'],
        lastUpdated: '2024-01-15'
      },
      {
        id: 'srv_002',
        name: 'Birth Certificate',
        category: 'civil',
        officialFee: 50,
        averageTime: '3-5 days',
        office: 'City Corporation/Union Parishad',
        description: 'Official birth certificate issuance',
        documents: ['Hospital Certificate', 'Parents NID', 'Affidavit'],
        lastUpdated: '2024-01-20'
      },
      {
        id: 'srv_003',
        name: 'Land Mutation',
        category: 'land',
        officialFee: 1000,
        averageTime: '15-30 days',
        office: 'Sub-Registrar Office',
        description: 'Transfer of land ownership records',
        documents: ['Sale Deed', 'Tax Clearance', 'Survey Report'],
        lastUpdated: '2024-02-01'
      },
      {
        id: 'srv_004',
        name: 'Trade License',
        category: 'business',
        officialFee: 2500,
        averageTime: '10-15 days',
        office: 'City Corporation',
        description: 'Business operation license',
        documents: ['TIN Certificate', 'Rent Agreement', 'NOC'],
        lastUpdated: '2024-01-25'
      },
      {
        id: 'srv_005',
        name: 'Driving License (New)',
        category: 'transport',
        officialFee: 1200,
        averageTime: '5-7 days',
        office: 'BRTA Office',
        description: 'New driving license issuance',
        documents: ['Medical Certificate', 'Learner License', 'Training Certificate'],
        lastUpdated: '2024-02-10'
      },
      {
        id: 'srv_006',
        name: 'Passport (General)',
        category: 'identity',
        officialFee: 3500,
        averageTime: '21 days',
        office: 'Passport Office',
        description: 'General category passport issuance',
        documents: ['NID', 'Online Application', 'Police Verification'],
        lastUpdated: '2024-02-05'
      }
    ];

    setServices(mockServices);

    // Calculate stats
    const totalServices = mockServices.length;
    setStats({
      totalServices,
      totalReports: 156,
      averageOvercharge: 75.5,
      mostReportedService: 'National ID Card'
    });

    setLoading(false);
  };

  const loadOverchargeData = () => {
    // Mock overcharge reports
    const mockReports: OverchargeReport[] = [
      {
        id: 'or_001',
        serviceId: 'srv_001',
        serviceName: 'National ID Card (New)',
        reportedFee: 300,
        officialFee: 125,
        overchargeAmount: 175,
        overchargePercent: 140,
        location: 'Dhanmondi, Dhaka',
        district: 'Dhaka',
        reportedAt: '2024-02-14',
        verified: true
      },
      {
        id: 'or_002',
        serviceId: 'srv_002',
        serviceName: 'Birth Certificate',
        reportedFee: 150,
        officialFee: 50,
        overchargeAmount: 100,
        overchargePercent: 200,
        location: 'Agrabad, Chittagong',
        district: 'Chittagong',
        reportedAt: '2024-02-13',
        verified: true
      },
      {
        id: 'or_003',
        serviceId: 'srv_003',
        serviceName: 'Land Mutation',
        reportedFee: 2500,
        officialFee: 1000,
        overchargeAmount: 1500,
        overchargePercent: 150,
        location: 'Sylhet Sadar',
        district: 'Sylhet',
        reportedAt: '2024-02-12',
        verified: false
      },
      {
        id: 'or_004',
        serviceId: 'srv_004',
        serviceName: 'Trade License',
        reportedFee: 4000,
        officialFee: 2500,
        overchargeAmount: 1500,
        overchargePercent: 60,
        location: 'Rajshahi City',
        district: 'Rajshahi',
        reportedAt: '2024-02-11',
        verified: true
      }
    ];

    setOverchargeReports(mockReports);

    // Calculate district-wise data
    const mockDistrictData: DistrictOvercharge[] = [
      {
        district: 'Dhaka',
        reportCount: 45,
        avgOvercharge: 85.2,
        totalOvercharged: 125000,
        riskLevel: 'high'
      },
      {
        district: 'Chittagong',
        reportCount: 32,
        avgOvercharge: 72.1,
        totalOvercharged: 89000,
        riskLevel: 'medium'
      },
      {
        district: 'Sylhet',
        reportCount: 28,
        avgOvercharge: 65.5,
        totalOvercharged: 67000,
        riskLevel: 'medium'
      },
      {
        district: 'Rajshahi',
        reportCount: 21,
        avgOvercharge: 58.3,
        totalOvercharged: 48000,
        riskLevel: 'low'
      },
      {
        district: 'Khulna',
        reportCount: 18,
        avgOvercharge: 45.7,
        totalOvercharged: 35000,
        riskLevel: 'low'
      },
      {
        district: 'Barisal',
        reportCount: 12,
        avgOvercharge: 38.2,
        totalOvercharged: 22000,
        riskLevel: 'low'
      }
    ];

    setDistrictData(mockDistrictData);
  };

  const filterServices = () => {
    let filtered = services;

    if (searchTerm) {
      filtered = filtered.filter(service => 
        service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        service.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        service.office.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(service => service.category === selectedCategory);
    }

    setFilteredServices(filtered);
  };

  const formatCurrency = (amount: number) => {
    return `৳${amount.toLocaleString()}`;
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const exportData = () => {
    const csvContent = [
      ['Service', 'Category', 'Official Fee', 'Average Time', 'Office'].join(','),
      ...filteredServices.map(service => [
        `"${service.name}"`,
        service.category,
        service.officialFee,
        service.averageTime,
        `"${service.office}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'service-catalog.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading service data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-lg p-6">
        <h1 className="text-3xl font-bold mb-2">💵 FeeCheck - Service Catalog</h1>
        <p className="text-green-100">
          Official government service fees, timelines, and overcharge detection dashboard
        </p>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Services</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalServices}</div>
              <p className="text-xs text-muted-foreground">Government services cataloged</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overcharge Reports</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.totalReports}</div>
              <p className="text-xs text-muted-foreground">Citizen reports received</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Overcharge</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.averageOvercharge}%</div>
              <p className="text-xs text-muted-foreground">Above official fees</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Most Reported</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">{stats.mostReportedService}</div>
              <p className="text-xs text-muted-foreground">Service with most reports</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="catalog" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="catalog">Service Catalog</TabsTrigger>
          <TabsTrigger value="reports">Overcharge Reports</TabsTrigger>
          <TabsTrigger value="analytics">District Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="catalog" className="space-y-6">
          {/* Service Catalog Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Search & Filter Services
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search services, offices, or descriptions..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {SERVICE_CATEGORIES.map(category => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button onClick={exportData} variant="outline" className="w-full md:w-auto">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Service Catalog Results */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">
                Services ({filteredServices.length})
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredServices.map((service) => (
                <Card key={service.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          {service.name}
                        </h3>
                        <Badge variant="secondary" className="mb-2">
                          {service.category}
                        </Badge>
                        <p className="text-gray-600 text-sm">
                          {service.description}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="font-medium text-gray-700">Official Fee</p>
                          <p className="text-lg font-bold text-green-600">
                            {formatCurrency(service.officialFee)}
                          </p>
                        </div>
                        <div>
                          <p className="font-medium text-gray-700">Processing Time</p>
                          <p className="text-gray-900">{service.averageTime}</p>
                        </div>
                      </div>

                      <div>
                        <p className="font-medium text-gray-700 text-sm">Office</p>
                        <p className="text-gray-600 text-sm">{service.office}</p>
                      </div>

                      <div>
                        <p className="font-medium text-gray-700 text-sm mb-2">Required Documents</p>
                        <div className="flex flex-wrap gap-1">
                          {service.documents.map((doc, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {doc}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div className="pt-2 border-t">
                        <p className="text-xs text-gray-500">
                          Last updated: {new Date(service.lastUpdated).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredServices.length === 0 && (
              <Card>
                <CardContent className="p-12 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No services found</h3>
                  <p className="text-gray-500">Try adjusting your search criteria or filters.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          {/* Overcharge Reports */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                Recent Overcharge Reports
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {overchargeReports.map((report) => (
                  <div key={report.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">{report.serviceName}</h4>
                        <p className="text-gray-600 text-sm flex items-center mt-1">
                          <MapPin className="h-4 w-4 mr-1" />
                          {report.location}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge className={report.verified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                          {report.verified ? 'Verified' : 'Pending'}
                        </Badge>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Reported Fee</p>
                        <p className="font-bold text-red-600">{formatCurrency(report.reportedFee)}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Official Fee</p>
                        <p className="font-bold text-green-600">{formatCurrency(report.officialFee)}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Overcharge</p>
                        <p className="font-bold text-orange-600">{formatCurrency(report.overchargeAmount)}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Increase</p>
                        <p className="font-bold text-red-600">+{report.overchargePercent}%</p>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t text-xs text-gray-500">
                      Reported on {new Date(report.reportedAt).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          {/* District Analytics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                District-wise Overcharge Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {districtData.map((district) => (
                  <div key={district.district} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-gray-900">{district.district} District</h4>
                      <Badge className={getRiskColor(district.riskLevel)}>
                        {district.riskLevel.toUpperCase()} RISK
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Reports</p>
                        <p className="font-bold text-blue-600">{district.reportCount}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Avg Overcharge</p>
                        <p className="font-bold text-orange-600">{district.avgOvercharge}%</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Total Overcharged</p>
                        <p className="font-bold text-red-600">{formatCurrency(district.totalOvercharged)}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Risk Level</p>
                        <div 
                          className="w-full bg-gray-200 rounded-full h-2 mt-1"
                        >
                          <div 
                            className={`h-2 rounded-full ${
                              district.riskLevel === 'high' ? 'bg-red-500' :
                              district.riskLevel === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                            }`}
                            style={{ 
                              width: `${district.riskLevel === 'high' ? 85 : 
                                      district.riskLevel === 'medium' ? 60 : 35}%` 
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}