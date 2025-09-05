'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Play, 
  Pause, 
  SkipForward, 
  RotateCcw, 
  CheckCircle, 
  AlertTriangle,
  Users,
  TrendingUp,
  Shield,
  Eye,
  Clock,
  Download,
  Smartphone,
  Monitor,
  Globe,
  ArrowRight,
  Star
} from 'lucide-react';

interface DemoStep {
  id: string;
  title: string;
  description: string;
  module: string;
  duration: number; // in seconds
  highlights: string[];
  impact: string;
  mockData?: any;
  component: React.ComponentType<any>;
}

interface DemoStats {
  totalUsers: number;
  corruptionReports: number;
  budgetTransparency: number;
  rtiRequests: number;
  riskPrevented: number;
}

const DemoStatCard = ({ title, value, icon: Icon, color }: any) => (
  <Card className="text-center">
    <CardContent className="p-6">
      <Icon className={`h-8 w-8 mx-auto mb-2 ${color}`} />
      <div className="text-2xl font-bold">{value}</div>
      <p className="text-sm text-muted-foreground">{title}</p>
    </CardContent>
  </Card>
);

const ProcureLensDemo = ({ isActive }: { isActive: boolean }) => (
  <div className={`transition-all duration-500 ${isActive ? 'opacity-100 scale-100' : 'opacity-50 scale-95'}`}>
    <Card className="border-blue-200">
      <CardHeader className="bg-blue-50">
        <CardTitle className="flex items-center gap-2">
          🏛️ ProcureLens - Procurement Risk Detection
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span>Metro Rail Extension Phase 2</span>
            <Badge className="bg-red-100 text-red-800">High Risk: 85</Badge>
          </div>
          <div className="text-sm text-gray-600">
            ⚠️ Risk Factors: Single bidder, Short submission window, Repeat winner pattern
          </div>
          <Progress value={85} className="h-2" />
          <div className="text-xs text-gray-500">
            💰 Value: ৳25 Crore | 📅 Deadline: March 15, 2024
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
);

const FeeCheckDemo = ({ isActive }: { isActive: boolean }) => (
  <div className={`transition-all duration-500 ${isActive ? 'opacity-100 scale-100' : 'opacity-50 scale-95'}`}>
    <Card className="border-green-200">
      <CardHeader className="bg-green-50">
        <CardTitle className="flex items-center gap-2">
          💵 FeeCheck - Service Overcharge Detection
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-3">
          <div className="flex justify-between">
            <span>National ID Card (New)</span>
            <span className="font-bold">Official: ৳125</span>
          </div>
          <div className="flex justify-between text-red-600">
            <span>Reported Fee (Dhanmondi)</span>
            <span className="font-bold">৳300 (+140%)</span>
          </div>
          <div className="bg-red-50 p-3 rounded">
            <div className="text-sm">📍 45 overcharge reports in Dhaka this month</div>
            <div className="text-xs text-gray-600">Avg overcharge: 75% above official fee</div>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
);

const RTICopilotDemo = ({ isActive }: { isActive: boolean }) => (
  <div className={`transition-all duration-500 ${isActive ? 'opacity-100 scale-100' : 'opacity-50 scale-95'}`}>
    <Card className="border-orange-200">
      <CardHeader className="bg-orange-50">
        <CardTitle className="flex items-center gap-2">
          📜 RTI Copilot - Right to Information Assistant
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-3">
          <div className="font-medium">Budget allocation for rural road development 2023-24</div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-orange-500" />
            <span className="text-sm">Response due in 8 days</span>
          </div>
          <div className="bg-green-50 p-3 rounded">
            <CheckCircle className="h-4 w-4 text-green-600 inline mr-2" />
            <span className="text-sm">72% success rate for similar requests</span>
          </div>
          <div className="text-xs text-gray-600">
            📊 298 RTI outcomes published for transparency
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
);

const FairLineDemo = ({ isActive }: { isActive: boolean }) => (
  <div className={`transition-all duration-500 ${isActive ? 'opacity-100 scale-100' : 'opacity-50 scale-95'}`}>
    <Card className="border-red-200">
      <CardHeader className="bg-red-50">
        <CardTitle className="flex items-center gap-2">
          🔗 FairLine - Bribe Solicitation Logger
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-3">
          <div className="font-medium">Anonymous Bribe Report Logged</div>
          <div className="text-sm">Service: Passport Renewal | Office: Dhaka</div>
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-blue-500" />
            <span className="text-sm">Hash: 7a8f9b2e... (Tamper-Evident)</span>
          </div>
          <div className="bg-blue-50 p-3 rounded">
            <div className="text-sm">🔒 Blockchain-inspired integrity</div>
            <div className="text-xs text-gray-600">156 logs verified in chain</div>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
);

const PermitPathDemo = ({ isActive }: { isActive: boolean }) => (
  <div className={`transition-all duration-500 ${isActive ? 'opacity-100 scale-100' : 'opacity-50 scale-95'}`}>
    <Card className="border-purple-200">
      <CardHeader className="bg-purple-50">
        <CardTitle className="flex items-center gap-2">
          📋 PermitPath - Delay Detection System
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-3">
          <div className="font-medium">Trade License Application</div>
          <div className="flex justify-between">
            <span>Expected: 15 days</span>
            <span className="text-red-600 font-bold">Actual: 30 days (+100%)</span>
          </div>
          <Progress value={200} className="h-2" />
          <div className="bg-yellow-50 p-3 rounded">
            <AlertTriangle className="h-4 w-4 text-yellow-600 inline mr-2" />
            <span className="text-sm">Delay alert triggered - Escalation recommended</span>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
);

const WardWalletDemo = ({ isActive }: { isActive: boolean }) => (
  <div className={`transition-all duration-500 ${isActive ? 'opacity-100 scale-100' : 'opacity-50 scale-95'}`}>
    <Card className="border-indigo-200">
      <CardHeader className="bg-indigo-50">
        <CardTitle className="flex items-center gap-2">
          📊 WardWallet - Budget Transparency
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-3">
          <div className="font-medium">Metro Rail Extension Phase 2</div>
          <div className="flex justify-between">
            <span>Allocated: ৳150 Crore</span>
            <span>Spent: ৳85 Crore (57%)</span>
          </div>
          <Progress value={57} className="h-2" />
          <div className="bg-blue-50 p-3 rounded">
            <Eye className="h-4 w-4 text-blue-600 inline mr-2" />
            <span className="text-sm">24 citizen photo verifications uploaded</span>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
);

export function DemoFlow() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stats, setStats] = useState<DemoStats>({
    totalUsers: 1247,
    corruptionReports: 156,
    budgetTransparency: 89,
    rtiRequests: 298,
    riskPrevented: 65
  });

  const demoSteps: DemoStep[] = [
    {
      id: 'intro',
      title: 'Welcome to CivicLens',
      description: 'Unified anti-corruption platform with 6 powerful transparency modules',
      module: 'Overview',
      duration: 8,
      highlights: ['🇧🇩 Built for Bangladesh', '📱 Mobile & Web', '🔒 Privacy-First'],
      impact: 'Empowering 165M citizens with transparency tools',
      component: () => (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🏛️</div>
          <h2 className="text-3xl font-bold mb-4">CivicLens</h2>
          <p className="text-xl text-gray-600 mb-6">
            Anti-Corruption Platform for Bangladesh
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            <DemoStatCard title="Total Users" value="1,247" icon={Users} color="text-blue-500" />
            <DemoStatCard title="Reports Filed" value="156" icon={AlertTriangle} color="text-red-500" />
            <DemoStatCard title="Transparency Score" value="89%" icon={TrendingUp} color="text-green-500" />
            <DemoStatCard title="Risk Prevented" value="65%" icon={Shield} color="text-purple-500" />
          </div>
        </div>
      )
    },
    {
      id: 'procurelens',
      title: 'ProcureLens - Procurement Risk Detection',
      description: 'AI-powered analysis of government tenders to detect corruption risks',
      module: 'ProcureLens',
      duration: 12,
      highlights: ['🎯 8 Risk Factors', '🤖 AI Analysis', '📊 85% Accuracy'],
      impact: '₹2,500 Crore in tenders analyzed, 23% flagged as high-risk',
      component: ProcureLensDemo
    },
    {
      id: 'feecheck',
      title: 'FeeCheck - Service Overcharge Detection',
      description: 'Citizens report overcharges for government services with geographic analysis',
      module: 'FeeCheck',
      duration: 10,
      highlights: ['💰 Official Fees', '📍 Geographic Heatmap', '👥 Crowd-sourced'],
      impact: '856 service fee reports, 75% average overcharge detected',
      component: FeeCheckDemo
    },
    {
      id: 'rti',
      title: 'RTI Copilot - Right to Information Assistant',
      description: 'Streamlined RTI request process with deadline tracking and outcome repository',
      module: 'RTI Copilot',
      duration: 10,
      highlights: ['📝 Request Wizard', '⏰ Deadline Tracking', '📊 Outcome Analytics'],
      impact: '298 RTI requests filed, 72% success rate, 26 days avg response',
      component: RTICopilotDemo
    },
    {
      id: 'fairline',
      title: 'FairLine - Bribe Solicitation Logger',
      description: 'Secure, anonymous bribe reporting with tamper-evident hash-chain technology',
      module: 'FairLine',
      duration: 12,
      highlights: ['🔐 Anonymous', '🔗 Hash-Chain', '🛡️ Tamper-Evident'],
      impact: '156 bribe logs recorded, 100% chain integrity maintained',
      component: FairLineDemo
    },
    {
      id: 'permitpath',
      title: 'PermitPath - Delay Detection System',
      description: 'Track permit processing delays and compare against crowd-sourced benchmarks',
      module: 'PermitPath',
      duration: 10,
      highlights: ['📋 Permit Tracking', '📈 Statistical Analysis', '⚡ Auto-Alerts'],
      impact: '432 permit applications tracked, 35% delays detected and resolved',
      component: PermitPathDemo
    },
    {
      id: 'wardwallet',
      title: 'WardWallet - Budget Transparency',
      description: 'Public budget tracking with geo-tagged photo verification and cost analysis',
      module: 'WardWallet',
      duration: 12,
      highlights: ['💸 Budget Tracking', '📸 Photo Verification', '🏗️ Project Monitoring'],
      impact: '₹560 Crore in public projects monitored, 24 citizen verifications',
      component: WardWalletDemo
    },
    {
      id: 'impact',
      title: 'Real-World Impact',
      description: 'Measurable results in transparency and accountability across Bangladesh',
      module: 'Impact',
      duration: 10,
      highlights: ['📊 Data-Driven', '🎯 Measurable Results', '🌟 Citizen Empowerment'],
      impact: 'Platform deployed across 6 districts, 65% reduction in corruption risk',
      component: () => (
        <div className="py-8">
          <h3 className="text-2xl font-bold text-center mb-8">Platform Impact</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-6 text-center">
                <TrendingUp className="h-8 w-8 text-blue-600 mx-auto mb-3" />
                <div className="text-3xl font-bold text-blue-600">65%</div>
                <div className="text-sm text-blue-800">Corruption Risk Reduced</div>
              </CardContent>
            </Card>
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-6 text-center">
                <Eye className="h-8 w-8 text-green-600 mx-auto mb-3" />
                <div className="text-3xl font-bold text-green-600">₹560Cr</div>
                <div className="text-sm text-green-800">Budget Transparency</div>
              </CardContent>
            </Card>
            <Card className="bg-purple-50 border-purple-200">
              <CardContent className="p-6 text-center">
                <Users className="h-8 w-8 text-purple-600 mx-auto mb-3" />
                <div className="text-3xl font-bold text-purple-600">1,247</div>
                <div className="text-sm text-purple-800">Active Citizens</div>
              </CardContent>
            </Card>
          </div>
          
          <div className="mt-8 text-center">
            <h4 className="text-lg font-semibold mb-4">Technology Stack</h4>
            <div className="flex flex-wrap justify-center gap-3">
              <Badge className="bg-gray-100 text-gray-800">React Native</Badge>
              <Badge className="bg-gray-100 text-gray-800">Next.js</Badge>
              <Badge className="bg-gray-100 text-gray-800">Convex</Badge>
              <Badge className="bg-gray-100 text-gray-800">SQLite</Badge>
              <Badge className="bg-gray-100 text-gray-800">TypeScript</Badge>
              <Badge className="bg-gray-100 text-gray-800">Tailwind CSS</Badge>
            </div>
          </div>
        </div>
      )
    }
  ];

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        setProgress(prev => {
          const newProgress = prev + (100 / (demoSteps[currentStep].duration * 10));
          if (newProgress >= 100) {
            if (currentStep < demoSteps.length - 1) {
              setCurrentStep(prev => prev + 1);
              return 0;
            } else {
              setIsPlaying(false);
              return 100;
            }
          }
          return newProgress;
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isPlaying, currentStep, demoSteps]);

  const handlePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const handleNext = () => {
    if (currentStep < demoSteps.length - 1) {
      setCurrentStep(prev => prev + 1);
      setProgress(0);
    }
  };

  const handleReset = () => {
    setCurrentStep(0);
    setProgress(0);
    setIsPlaying(false);
  };

  const currentStepData = demoSteps[currentStep];
  const StepComponent = currentStepData.component;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-2xl font-bold text-gray-900">
                🏛️ CivicLens Demo
              </div>
              <Badge className="bg-green-100 text-green-800">
                Interactive Presentation
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-gray-600" />
              <Monitor className="h-5 w-5 text-gray-600" />
              <Globe className="h-5 w-5 text-gray-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {/* Progress Bar */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">{currentStepData.title}</h2>
              <Badge className="bg-blue-100 text-blue-800">
                Step {currentStep + 1} of {demoSteps.length}
              </Badge>
            </div>
            <Progress value={progress} className="mb-4" />
            <div className="flex items-center gap-4">
              <Button onClick={handlePlay} variant="default" size="sm">
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                {isPlaying ? 'Pause' : 'Play'}
              </Button>
              <Button onClick={handleNext} variant="outline" size="sm" disabled={currentStep >= demoSteps.length - 1}>
                <SkipForward className="h-4 w-4" />
                Next
              </Button>
              <Button onClick={handleReset} variant="outline" size="sm">
                <RotateCcw className="h-4 w-4" />
                Reset
              </Button>
              <div className="ml-auto text-sm text-gray-600">
                {Math.round(progress)}% Complete
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Demo Area */}
          <div className="lg:col-span-2">
            <Card className="h-full">
              <CardContent className="p-6">
                <StepComponent isActive={true} />
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Current Step Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  {currentStepData.module}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  {currentStepData.description}
                </p>
                
                <div className="space-y-3">
                  <div>
                    <h4 className="font-medium mb-2">Key Features</h4>
                    <ul className="space-y-1">
                      {currentStepData.highlights.map((highlight, index) => (
                        <li key={index} className="text-sm text-gray-600">
                          {highlight}
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <h4 className="font-medium text-blue-800 mb-1">Impact</h4>
                    <p className="text-sm text-blue-700">{currentStepData.impact}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Navigation */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Demo Navigation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {demoSteps.map((step, index) => (
                    <Button
                      key={step.id}
                      variant={index === currentStep ? "default" : "outline"}
                      size="sm"
                      className="w-full justify-start text-left"
                      onClick={() => {
                        setCurrentStep(index);
                        setProgress(0);
                        setIsPlaying(false);
                      }}
                    >
                      <div className="flex items-center gap-2">
                        {index < currentStep && <CheckCircle className="h-4 w-4 text-green-500" />}
                        {index === currentStep && <ArrowRight className="h-4 w-4" />}
                        <span className="truncate">{step.module}</span>
                      </div>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start">
                  <Download className="h-4 w-4 mr-2" />
                  Download Demo Data
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Star className="h-4 w-4 mr-2" />
                  View Full Platform
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Monitor className="h-4 w-4 mr-2" />
                  Technical Documentation
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* All Modules Preview */}
        <div className="mt-8">
          <h3 className="text-xl font-bold mb-4">All 6 Modules Overview</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <ProcureLensDemo isActive={currentStep === 1} />
            <FeeCheckDemo isActive={currentStep === 2} />
            <RTICopilotDemo isActive={currentStep === 3} />
            <FairLineDemo isActive={currentStep === 4} />
            <PermitPathDemo isActive={currentStep === 5} />
            <WardWalletDemo isActive={currentStep === 6} />
          </div>
        </div>
      </div>
    </div>
  );
}