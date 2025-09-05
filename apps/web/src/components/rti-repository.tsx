'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Filter, Download, FileText, Calendar, Star, TrendingUp, CheckCircle, XCircle } from 'lucide-react';

interface RTIRequest {
  id: string;
  subject: string;
  topic: string;
  agency: string;
  submittedDate: string;
  responseDate?: string;
  status: 'pending' | 'responded' | 'denied' | 'partial';
  outcome: 'success' | 'failure' | 'partial' | 'pending';
  isPublic: boolean;
  rating?: number;
  responseTime: number; // in days
  district: string;
}

interface RTIOutcome {
  id: string;
  requestId: string;
  subject: string;
  agency: string;
  responseText: string;
  documentsProvided: number;
  isHelpful: boolean;
  rating: number;
  responseTime: number;
  publishedDate: string;
  category: string;
}

interface RTIStats {
  totalRequests: number;
  successfulRequests: number;
  avgResponseTime: number;
  successRate: number;
  totalOutcomes: number;
  avgRating: number;
}

interface AgencyPerformance {
  agency: string;
  totalRequests: number;
  successfulRequests: number;
  avgResponseTime: number;
  successRate: number;
  avgRating: number;
}

const RTI_TOPICS = [
  { id: 'all', name: 'All Topics' },
  { id: 'budget', name: 'Budget & Finance' },
  { id: 'procurement', name: 'Procurement' },
  { id: 'employment', name: 'Employment' },
  { id: 'education', name: 'Education' },
  { id: 'healthcare', name: 'Healthcare' },
  { id: 'infrastructure', name: 'Infrastructure' },
  { id: 'policy', name: 'Policy & Regulations' },
  { id: 'other', name: 'Other' }
];

const GOVERNMENT_AGENCIES = [
  'Ministry of Public Administration',
  'Ministry of Finance',
  'Ministry of Education',
  'Ministry of Health',
  'Roads and Highways Department',
  'Local Government Division',
  'Bangladesh Railway',
  'Election Commission',
  'Anti-Corruption Commission'
];

export function RTIRepository() {
  const [rtiRequests, setRTIRequests] = useState<RTIRequest[]>([]);
  const [rtiOutcomes, setRTIOutcomes] = useState<RTIOutcome[]>([]);
  const [agencyPerformance, setAgencyPerformance] = useState<AgencyPerformance[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<RTIRequest[]>([]);
  const [filteredOutcomes, setFilteredOutcomes] = useState<RTIOutcome[]>([]);
  const [stats, setStats] = useState<RTIStats | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('all');
  const [selectedAgency, setSelectedAgency] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRTIData();
  }, []);

  useEffect(() => {
    filterData();
  }, [searchTerm, selectedTopic, selectedAgency, selectedStatus, rtiRequests, rtiOutcomes]);

  const loadRTIData = () => {
    // Mock RTI request data
    const mockRequests: RTIRequest[] = [
      {
        id: 'rti_001',
        subject: 'Budget allocation for rural road development in 2023-24',
        topic: 'budget',
        agency: 'Roads and Highways Department',
        submittedDate: '2024-01-15',
        responseDate: '2024-02-10',
        status: 'responded',
        outcome: 'success',
        isPublic: true,
        rating: 4.5,
        responseTime: 26,
        district: 'Dhaka'
      },
      {
        id: 'rti_002',
        subject: 'Teacher recruitment process and selection criteria',
        topic: 'employment',
        agency: 'Ministry of Education',
        submittedDate: '2024-01-20',
        responseDate: '2024-02-15',
        status: 'responded',
        outcome: 'partial',
        isPublic: true,
        rating: 3.2,
        responseTime: 26,
        district: 'Chittagong'
      },
      {
        id: 'rti_003',
        subject: 'Hospital equipment procurement details for FY 2023-24',
        topic: 'procurement',
        agency: 'Ministry of Health',
        submittedDate: '2024-02-01',
        responseDate: '2024-02-20',
        status: 'responded',
        outcome: 'success',
        isPublic: true,
        rating: 4.8,
        responseTime: 19,
        district: 'Sylhet'
      },
      {
        id: 'rti_004',
        subject: 'Election Commission voter registration statistics',
        topic: 'policy',
        agency: 'Election Commission',
        submittedDate: '2024-02-05',
        status: 'pending',
        outcome: 'pending',
        isPublic: true,
        responseTime: 0,
        district: 'Dhaka'
      },
      {
        id: 'rti_005',
        subject: 'Railway project cost breakdown and timeline',
        topic: 'infrastructure',
        agency: 'Bangladesh Railway',
        submittedDate: '2024-01-10',
        responseDate: '2024-02-05',
        status: 'denied',
        outcome: 'failure',
        isPublic: true,
        rating: 1.5,
        responseTime: 26,
        district: 'Rajshahi'
      }
    ];

    setRTIRequests(mockRequests);

    // Mock RTI outcomes
    const mockOutcomes: RTIOutcome[] = [
      {
        id: 'out_001',
        requestId: 'rti_001',
        subject: 'Budget allocation for rural road development in 2023-24',
        agency: 'Roads and Highways Department',
        responseText: 'Complete budget breakdown provided with district-wise allocation details. Total budget: ৳2,500 crores for rural road development across 64 districts.',
        documentsProvided: 5,
        isHelpful: true,
        rating: 4.5,
        responseTime: 26,
        publishedDate: '2024-02-12',
        category: 'budget'
      },
      {
        id: 'out_002',
        requestId: 'rti_002',
        subject: 'Teacher recruitment process and selection criteria',
        agency: 'Ministry of Education',
        responseText: 'Partial information provided regarding general recruitment guidelines. Specific selection criteria for 2024 recruitment cycle was not disclosed citing ongoing process.',
        documentsProvided: 2,
        isHelpful: false,
        rating: 3.2,
        responseTime: 26,
        publishedDate: '2024-02-17',
        category: 'employment'
      },
      {
        id: 'out_003',
        requestId: 'rti_003',
        subject: 'Hospital equipment procurement details for FY 2023-24',
        agency: 'Ministry of Health',
        responseText: 'Comprehensive procurement details provided including vendor lists, equipment specifications, and cost comparisons. Total procurement value: ৳850 crores.',
        documentsProvided: 8,
        isHelpful: true,
        rating: 4.8,
        responseTime: 19,
        publishedDate: '2024-02-22',
        category: 'procurement'
      }
    ];

    setRTIOutcomes(mockOutcomes);

    // Calculate agency performance
    const mockAgencyPerformance: AgencyPerformance[] = [
      {
        agency: 'Roads and Highways Department',
        totalRequests: 25,
        successfulRequests: 18,
        avgResponseTime: 22.5,
        successRate: 72.0,
        avgRating: 4.1
      },
      {
        agency: 'Ministry of Education',
        totalRequests: 32,
        successfulRequests: 20,
        avgResponseTime: 28.3,
        successRate: 62.5,
        avgRating: 3.6
      },
      {
        agency: 'Ministry of Health',
        totalRequests: 18,
        successfulRequests: 15,
        avgResponseTime: 20.1,
        successRate: 83.3,
        avgRating: 4.4
      },
      {
        agency: 'Election Commission',
        totalRequests: 15,
        successfulRequests: 12,
        avgResponseTime: 25.7,
        successRate: 80.0,
        avgRating: 4.0
      }
    ];

    setAgencyPerformance(mockAgencyPerformance);

    // Calculate overall stats
    const totalRequests = mockRequests.length;
    const successfulRequests = mockRequests.filter(r => r.outcome === 'success').length;
    const respondedRequests = mockRequests.filter(r => r.status === 'responded');
    const avgResponseTime = respondedRequests.reduce((sum, r) => sum + r.responseTime, 0) / respondedRequests.length;
    const avgRating = mockOutcomes.reduce((sum, o) => sum + o.rating, 0) / mockOutcomes.length;

    setStats({
      totalRequests,
      successfulRequests,
      avgResponseTime: Math.round(avgResponseTime),
      successRate: (successfulRequests / totalRequests) * 100,
      totalOutcomes: mockOutcomes.length,
      avgRating: Math.round(avgRating * 10) / 10
    });

    setLoading(false);
  };

  const filterData = () => {
    let filteredReqs = rtiRequests;
    let filteredOuts = rtiOutcomes;

    // Search filter
    if (searchTerm) {
      filteredReqs = filteredReqs.filter(req => 
        req.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.agency.toLowerCase().includes(searchTerm.toLowerCase())
      );
      
      filteredOuts = filteredOuts.filter(out => 
        out.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
        out.agency.toLowerCase().includes(searchTerm.toLowerCase()) ||
        out.responseText.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Topic filter
    if (selectedTopic !== 'all') {
      filteredReqs = filteredReqs.filter(req => req.topic === selectedTopic);
      filteredOuts = filteredOuts.filter(out => out.category === selectedTopic);
    }

    // Agency filter
    if (selectedAgency !== 'all') {
      filteredReqs = filteredReqs.filter(req => req.agency === selectedAgency);
      filteredOuts = filteredOuts.filter(out => out.agency === selectedAgency);
    }

    // Status filter
    if (selectedStatus !== 'all') {
      filteredReqs = filteredReqs.filter(req => req.status === selectedStatus);
    }

    setFilteredRequests(filteredReqs);
    setFilteredOutcomes(filteredOuts);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'responded': return 'bg-green-100 text-green-800 border-green-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'denied': return 'bg-red-100 text-red-800 border-red-200';
      case 'partial': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getOutcomeColor = (outcome: string) => {
    switch (outcome) {
      case 'success': return 'bg-green-100 text-green-800 border-green-200';
      case 'failure': return 'bg-red-100 text-red-800 border-red-200';
      case 'partial': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'pending': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const renderStarRating = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(<Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />);
    }

    if (hasHalfStar) {
      stars.push(<Star key="half" className="h-4 w-4 fill-yellow-200 text-yellow-400" />);
    }

    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<Star key={`empty-${i}`} className="h-4 w-4 text-gray-300" />);
    }

    return <div className="flex items-center">{stars}</div>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading RTI data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg p-6">
        <h1 className="text-3xl font-bold mb-2">📜 RTI Copilot - Public Repository</h1>
        <p className="text-blue-100">
          Public repository of Right to Information requests and government responses
        </p>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalRequests}</div>
              <p className="text-xs text-muted-foreground">Public RTI requests</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.successRate.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">{stats.successfulRequests} successful</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.avgResponseTime} days</div>
              <p className="text-xs text-muted-foreground">Government response time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Rating</CardTitle>
              <Star className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.avgRating}/5</div>
              <p className="text-xs text-muted-foreground">Response quality</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="requests" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="requests">RTI Requests</TabsTrigger>
          <TabsTrigger value="outcomes">Outcomes</TabsTrigger>
          <TabsTrigger value="agencies">Agencies</TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="space-y-6">
          {/* RTI Request Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filter RTI Requests
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search requests, agencies, or subjects..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <Select value={selectedTopic} onValueChange={setSelectedTopic}>
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="Topic" />
                  </SelectTrigger>
                  <SelectContent>
                    {RTI_TOPICS.map(topic => (
                      <SelectItem key={topic.id} value={topic.id}>
                        {topic.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedAgency} onValueChange={setSelectedAgency}>
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="Agency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Agencies</SelectItem>
                    {GOVERNMENT_AGENCIES.map(agency => (
                      <SelectItem key={agency} value={agency}>
                        {agency}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="responded">Responded</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="denied">Denied</SelectItem>
                    <SelectItem value="partial">Partial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* RTI Request Results */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">RTI Requests ({filteredRequests.length})</h2>

            {filteredRequests.map((request) => (
              <Card key={request.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {request.subject}
                        </h3>
                        <Badge className={getStatusColor(request.status)}>
                          {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                        </Badge>
                        <Badge className={getOutcomeColor(request.outcome)}>
                          {request.outcome.charAt(0).toUpperCase() + request.outcome.slice(1)}
                        </Badge>
                      </div>
                      
                      <p className="text-gray-600 mb-2">{request.agency}</p>
                      
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                        <span>📅 Submitted: {new Date(request.submittedDate).toLocaleDateString()}</span>
                        {request.responseDate && (
                          <span>📝 Responded: {new Date(request.responseDate).toLocaleDateString()}</span>
                        )}
                        <span>⏱️ {request.responseTime} days</span>
                        <span>📍 {request.district}</span>
                      </div>
                    </div>
                    
                    {request.rating && (
                      <div className="text-right">
                        {renderStarRating(request.rating)}
                        <p className="text-sm text-gray-500 mt-1">{request.rating}/5</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="outcomes" className="space-y-6">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Published Outcomes ({filteredOutcomes.length})</h2>

            {filteredOutcomes.map((outcome) => (
              <Card key={outcome.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {outcome.subject}
                      </h3>
                      <p className="text-gray-600 mb-3">{outcome.agency}</p>
                      <p className="text-gray-800 mb-4">{outcome.responseText}</p>
                      
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                        <span>📄 {outcome.documentsProvided} documents</span>
                        <span>⏱️ {outcome.responseTime} days response</span>
                        <span>📅 Published: {new Date(outcome.publishedDate).toLocaleDateString()}</span>
                        <span className={outcome.isHelpful ? 'text-green-600' : 'text-red-600'}>
                          {outcome.isHelpful ? '✅ Helpful' : '❌ Not Helpful'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      {renderStarRating(outcome.rating)}
                      <p className="text-sm text-gray-500 mt-1">{outcome.rating}/5</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="agencies" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Agency Performance Dashboard</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {agencyPerformance.map((agency) => (
                  <div key={agency.agency} className="border rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-3">{agency.agency}</h4>
                    
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Total Requests</p>
                        <p className="font-bold text-lg">{agency.totalRequests}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Success Rate</p>
                        <p className="font-bold text-lg text-green-600">{agency.successRate.toFixed(1)}%</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Avg Response Time</p>
                        <p className="font-bold text-lg">{agency.avgResponseTime.toFixed(1)} days</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Avg Rating</p>
                        <p className="font-bold text-lg">{agency.avgRating.toFixed(1)}/5</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Performance</p>
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                          <div 
                            className={`h-2 rounded-full ${
                              agency.successRate >= 80 ? 'bg-green-500' :
                              agency.successRate >= 60 ? 'bg-yellow-500' :
                              'bg-red-500'
                            }`}
                            style={{ width: `${agency.successRate}%` }}
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