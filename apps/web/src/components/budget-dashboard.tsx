'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Filter, Download, MapPin, TrendingUp, BarChart, Eye } from 'lucide-react';

interface Project {
  id: string;
  name: string;
  district: string;
  category: string;
  allocatedBudget: number;
  spentAmount: number;
  utilizationRate: number;
  status: 'planning' | 'ongoing' | 'completed' | 'delayed';
  progress: number;
}

interface DistrictBudget {
  district: string;
  totalAllocated: number;
  totalSpent: number;
  utilizationRate: number;
  projectCount: number;
  riskLevel: 'low' | 'medium' | 'high';
}

interface BudgetStats {
  totalAllocated: number;
  totalSpent: number;
  overallUtilization: number;
  totalProjects: number;
  delayedProjects: number;
}

export function BudgetDashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [districtBudgets, setDistrictBudgets] = useState<DistrictBudget[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [stats, setStats] = useState<BudgetStats | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedDistrict, setSelectedDistrict] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBudgetData();
  }, []);

  useEffect(() => {
    filterProjects();
  }, [searchTerm, selectedCategory, selectedDistrict, projects]);

  const loadBudgetData = () => {
    // Mock project data
    const mockProjects: Project[] = [
      {
        id: 'proj_001',
        name: 'Metro Rail Extension Phase 2',
        district: 'Dhaka',
        category: 'transport',
        allocatedBudget: 15000000000,
        spentAmount: 8500000000,
        utilizationRate: 56.7,
        status: 'ongoing',
        progress: 56
      },
      {
        id: 'proj_002',
        name: 'Chittagong Port Expansion',
        district: 'Chittagong',
        category: 'infrastructure',
        allocatedBudget: 8500000000,
        spentAmount: 6800000000,
        utilizationRate: 80.0,
        status: 'ongoing',
        progress: 75
      },
      {
        id: 'proj_003',
        name: 'Rural Health Center Network',
        district: 'Sylhet',
        category: 'healthcare',
        allocatedBudget: 2200000000,
        spentAmount: 1100000000,
        utilizationRate: 50.0,
        status: 'delayed',
        progress: 35
      },
      {
        id: 'proj_004',
        name: 'University Campus Development',
        district: 'Rajshahi',
        category: 'education',
        allocatedBudget: 3500000000,
        spentAmount: 3500000000,
        utilizationRate: 100.0,
        status: 'completed',
        progress: 100
      }
    ];

    setProjects(mockProjects);

    // District budgets
    const mockDistrictBudgets: DistrictBudget[] = [
      {
        district: 'Dhaka',
        totalAllocated: 20500000000,
        totalSpent: 11750000000,
        utilizationRate: 57.3,
        projectCount: 8,
        riskLevel: 'medium'
      },
      {
        district: 'Chittagong',
        totalAllocated: 12300000000,
        totalSpent: 9840000000,
        utilizationRate: 80.0,
        projectCount: 5,
        riskLevel: 'low'
      },
      {
        district: 'Sylhet',
        totalAllocated: 5800000000,
        totalSpent: 2900000000,
        utilizationRate: 50.0,
        projectCount: 4,
        riskLevel: 'high'
      }
    ];

    setDistrictBudgets(mockDistrictBudgets);

    // Calculate stats
    const totalAllocated = mockProjects.reduce((sum, p) => sum + p.allocatedBudget, 0);
    const totalSpent = mockProjects.reduce((sum, p) => sum + p.spentAmount, 0);
    const delayedCount = mockProjects.filter(p => p.status === 'delayed').length;

    setStats({
      totalAllocated,
      totalSpent,
      overallUtilization: (totalSpent / totalAllocated) * 100,
      totalProjects: mockProjects.length,
      delayedProjects: delayedCount
    });

    setLoading(false);
  };

  const filterProjects = () => {
    let filtered = projects;

    if (searchTerm) {
      filtered = filtered.filter(project => 
        project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.district.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(project => project.category === selectedCategory);
    }

    if (selectedDistrict !== 'all') {
      filtered = filtered.filter(project => project.district === selectedDistrict);
    }

    setFilteredProjects(filtered);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'ongoing': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'delayed': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading budget data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg p-6">
        <h1 className="text-3xl font-bold mb-2">📊 WardWallet - Budget Transparency</h1>
        <p className="text-purple-100">
          Public budget allocation, utilization tracking, and project monitoring dashboard
        </p>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Allocated</CardTitle>
              <BarChart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.totalAllocated)}</div>
              <p className="text-xs text-muted-foreground">Across all projects</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{formatCurrency(stats.totalSpent)}</div>
              <p className="text-xs text-muted-foreground">{stats.overallUtilization.toFixed(1)}% utilization</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalProjects}</div>
              <p className="text-xs text-muted-foreground">Active monitoring</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Delayed Projects</CardTitle>
              <TrendingUp className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.delayedProjects}</div>
              <p className="text-xs text-muted-foreground">Requires attention</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="districts">Districts</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Budget Utilization Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Budget Utilization by District</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {districtBudgets.map((district) => (
                  <div key={district.district} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{district.district}</span>
                      <div className="text-right">
                        <span className="text-sm text-gray-600">
                          {formatCurrency(district.totalSpent)} / {formatCurrency(district.totalAllocated)}
                        </span>
                        <span className="ml-2 font-bold">{district.utilizationRate.toFixed(1)}%</span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className={`h-3 rounded-full ${
                          district.utilizationRate >= 80 ? 'bg-green-500' :
                          district.utilizationRate >= 60 ? 'bg-yellow-500' :
                          'bg-red-500'
                        }`}
                        style={{ width: `${Math.min(district.utilizationRate, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="projects" className="space-y-6">
          {/* Project Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filter Projects
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search projects or districts..."
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
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="transport">Transport</SelectItem>
                    <SelectItem value="infrastructure">Infrastructure</SelectItem>
                    <SelectItem value="healthcare">Healthcare</SelectItem>
                    <SelectItem value="education">Education</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={selectedDistrict} onValueChange={setSelectedDistrict}>
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="District" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Districts</SelectItem>
                    <SelectItem value="Dhaka">Dhaka</SelectItem>
                    <SelectItem value="Chittagong">Chittagong</SelectItem>
                    <SelectItem value="Sylhet">Sylhet</SelectItem>
                    <SelectItem value="Rajshahi">Rajshahi</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Project Results */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Projects ({filteredProjects.length})</h2>

            {filteredProjects.map((project) => (
              <Card key={project.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {project.name}
                        </h3>
                        <Badge className={getStatusColor(project.status)}>
                          {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                        </Badge>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                        <span>📍 {project.district}</span>
                        <span>🏗️ {project.category}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-600">Allocated Budget</p>
                      <p className="font-bold text-lg">{formatCurrency(project.allocatedBudget)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Amount Spent</p>
                      <p className="font-bold text-lg text-blue-600">{formatCurrency(project.spentAmount)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Utilization Rate</p>
                      <p className="font-bold text-lg">{project.utilizationRate.toFixed(1)}%</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Progress</p>
                      <p className="font-bold text-lg">{project.progress}%</p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Project Progress</span>
                      <span>{project.progress}% Complete</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          project.status === 'completed' ? 'bg-green-500' :
                          project.status === 'delayed' ? 'bg-red-500' :
                          'bg-blue-500'
                        }`}
                        style={{ width: `${project.progress}%` }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="districts" className="space-y-6">
          {/* District Heatmap */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                District Performance Dashboard
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {districtBudgets.map((district) => (
                  <div key={district.district} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-gray-900">{district.district} District</h4>
                      <Badge className={getRiskColor(district.riskLevel)}>
                        {district.riskLevel.toUpperCase()} RISK
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Total Budget</p>
                        <p className="font-bold">{formatCurrency(district.totalAllocated)}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Amount Spent</p>
                        <p className="font-bold text-blue-600">{formatCurrency(district.totalSpent)}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Projects</p>
                        <p className="font-bold">{district.projectCount}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Utilization</p>
                        <p className="font-bold">{district.utilizationRate.toFixed(1)}%</p>
                      </div>
                    </div>

                    <div className="mt-3">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            district.utilizationRate >= 80 ? 'bg-green-500' :
                            district.utilizationRate >= 60 ? 'bg-yellow-500' :
                            'bg-red-500'
                          }`}
                          style={{ width: `${Math.min(district.utilizationRate, 100)}%` }}
                        />
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