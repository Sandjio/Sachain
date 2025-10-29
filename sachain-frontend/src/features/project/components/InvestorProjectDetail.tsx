import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ImageWithFallback } from '@/components/figma/ImageWithFallback';
import {
  ArrowLeft,
  ArrowRight,
  Star,
  DollarSign,
  Users,
  TrendingUp,
  Target,
  Activity,
  BarChart3,
  Calendar,
  MapPin,
  Clock,
  Award,
  Shield,
  FileText,
  CheckCircle,
  Sparkles,
  Zap,
  Building2,
  TrendingDown,
  Info,
  Share2,
} from 'lucide-react';

export interface APIProject {
  projectId: string;
  name: string;
  description: string;
  category: string;
  status: string;
  targetFundingGoal: number;
  pricePerStock: number;
  stockSupply: number;
  coverImageUrl?: string;
  createdAt: string;
}

interface InvestorProjectDetailProps {
  project: APIProject;
  onBack?: () => void;
  onInvestComplete?: (amount: number, shares: number) => void;
}

export function InvestorProjectDetail({
  project,
  onBack,
  onInvestComplete,
}: InvestorProjectDetailProps) {
  const [investmentAmount, setInvestmentAmount] = useState<string>('');
  const [shareQuantity, setShareQuantity] = useState<string>('1');

  // Transform project data
  const projectData = {
    id: project.projectId,
    name: project.name,
    description: project.description,
    category: project.category,
    status: project.status,
    sharePrice: project.pricePerStock,
    totalShares: project.stockSupply,
    soldShares: 0,
    targetAmount: project.targetFundingGoal,
    totalRaised: 0,
    image: project.coverImageUrl || '/placeholder-project.jpg',
    location: 'Remote',
    investorCount: 0,
    expectedROI: '15-25%',
    duration: '12-24 months',
    riskLevel: 'Medium',
    minInvestment: project.pricePerStock,
    launchDate: project.createdAt,
    featured: false,

    // Additional details
    timeline: 'Q2 2025 - Q4 2026',
    industry: project.category,
    fundingStage: 'Series A',

    // Mock team data
    team: [
      { name: 'John Doe', role: 'CEO & Founder', image: '/team1.jpg' },
      { name: 'Jane Smith', role: 'CTO', image: '/team2.jpg' },
      { name: 'Mike Johnson', role: 'CFO', image: '/team3.jpg' },
    ],

    // Mock documents
    documents: [
      { name: 'Business Plan', type: 'PDF', size: '2.5 MB' },
      { name: 'Financial Projections', type: 'XLSX', size: '1.2 MB' },
      { name: 'Pitch Deck', type: 'PDF', size: '5.8 MB' },
    ],

    // Mock milestones
    milestones: [
      { title: 'Product Development', status: 'completed', date: 'Q1 2025' },
      { title: 'Beta Launch', status: 'in-progress', date: 'Q2 2025' },
      { title: 'Market Expansion', status: 'upcoming', date: 'Q3 2025' },
      { title: 'Profitability', status: 'upcoming', date: 'Q4 2025' },
    ],
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const calculateFundingProgress = () => {
    if (projectData.totalShares === 0) return 0;
    return Math.round((projectData.soldShares / projectData.totalShares) * 100);
  };

  const handleShareQuantityChange = (value: string) => {
    setShareQuantity(value);
    const qty = parseInt(value) || 0;
    setInvestmentAmount((qty * projectData.sharePrice).toString());
  };

  const handleInvestmentAmountChange = (value: string) => {
    setInvestmentAmount(value);
    const amount = parseFloat(value) || 0;
    const shares = Math.floor(amount / projectData.sharePrice);
    setShareQuantity(shares.toString());
  };

  const handleInvest = () => {
    const amount = parseFloat(investmentAmount) || 0;
    const shares = parseInt(shareQuantity) || 0;
    if (amount > 0 && shares > 0) {
      onInvestComplete?.(amount, shares);
    }
  };

  const getRiskConfig = (risk: string) => {
    switch (risk.toLowerCase()) {
      case 'low':
        return {
          className: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20',
          label: 'Low Risk',
        };
      case 'medium':
        return {
          className: 'bg-amber-500/10 text-amber-700 border-amber-500/20',
          label: 'Medium Risk',
        };
      case 'high':
        return {
          className: 'bg-red-500/10 text-red-700 border-red-500/20',
          label: 'High Risk',
        };
      default:
        return {
          className: 'bg-gray-100 text-gray-800',
          label: 'Risk',
        };
    }
  };

  const riskConfig = getRiskConfig(projectData.riskLevel);
  const fundingProgress = calculateFundingProgress();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50/30 to-indigo-50/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Back Button */}
        <Button
          variant="outline"
          onClick={onBack}
          className="border-gray-200 hover:border-[#90A5FB] hover:bg-[#90A5FB]/5"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Projects
        </Button>

        {/* Hero Section with Cover Image */}
        <Card className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="relative h-64 sm:h-80">
            <ImageWithFallback
              src={projectData.image}
              alt={projectData.name}
              className="w-full h-full object-cover"
            />
            {/* Badges Overlay */}
            <div className="absolute top-4 left-4 flex gap-2">
              {projectData.featured && (
                <Badge className="bg-gradient-to-r from-[#123962] to-[#90A5FB] text-white shadow-lg backdrop-blur-sm">
                  <Star className="h-3 w-3 mr-1 fill-white" />
                  Featured
                </Badge>
              )}
              <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20 backdrop-blur-sm">
                <Activity className="h-3 w-3 mr-1" />
                Live
              </Badge>
            </div>
            <div className="absolute top-4 right-4">
              <Badge className={`${riskConfig.className} backdrop-blur-sm`}>
                <Shield className="h-3 w-3 mr-1" />
                {riskConfig.label}
              </Badge>
            </div>
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

            {/* Project Title Over Image */}
            <div className="absolute bottom-6 left-6 right-6">
              <h1 className="text-3xl sm:text-4xl font-semibold text-white mb-2 drop-shadow-lg">
                {projectData.name}
              </h1>
              <div className="flex flex-wrap items-center gap-3 text-white/90">
                <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-md">
                  {projectData.category}
                </Badge>
                <span className="flex items-center gap-1 text-sm">
                  <MapPin className="h-4 w-4" />
                  {projectData.location}
                </span>
                <span className="flex items-center gap-1 text-sm">
                  <Calendar className="h-4 w-4" />
                  {new Date(projectData.launchDate).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Project Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Card className="bg-white border border-gray-200 rounded-xl shadow-sm">
                <CardContent className="p-4">
                  <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center mb-3">
                    <TrendingUp className="h-5 w-5 text-emerald-600" />
                  </div>
                  <p className="text-xs text-gray-600 mb-1">Expected ROI</p>
                  <p className="font-semibold text-emerald-600">
                    {projectData.expectedROI}
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white border border-gray-200 rounded-xl shadow-sm">
                <CardContent className="p-4">
                  <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center mb-3">
                    <Clock className="h-5 w-5 text-blue-600" />
                  </div>
                  <p className="text-xs text-gray-600 mb-1">Duration</p>
                  <p className="font-semibold text-gray-900">
                    {projectData.duration}
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white border border-gray-200 rounded-xl shadow-sm">
                <CardContent className="p-4">
                  <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center mb-3">
                    <Users className="h-5 w-5 text-purple-600" />
                  </div>
                  <p className="text-xs text-gray-600 mb-1">Investors</p>
                  <p className="font-semibold text-gray-900">
                    {projectData.investorCount}
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-white border border-gray-200 rounded-xl shadow-sm">
                <CardContent className="p-4">
                  <div className="w-10 h-10 bg-amber-500/10 rounded-lg flex items-center justify-center mb-3">
                    <Award className="h-5 w-5 text-amber-600" />
                  </div>
                  <p className="text-xs text-gray-600 mb-1">Stage</p>
                  <p className="font-semibold text-gray-900">
                    {projectData.fundingStage}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Tabs for Detailed Information */}
            <Card className="bg-white border border-gray-200 rounded-xl shadow-sm">
              <CardContent className="p-6">
                <Tabs defaultValue="overview" className="w-full">
                  <TabsList className="w-full grid grid-cols-4 mb-6">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="milestones">Milestones</TabsTrigger>
                    <TabsTrigger value="team">Team</TabsTrigger>
                    <TabsTrigger value="documents">Documents</TabsTrigger>
                  </TabsList>

                  {/* Overview Tab */}
                  <TabsContent value="overview" className="space-y-6">
                    <div>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-[#123962]/10 rounded-lg flex items-center justify-center">
                          <FileText className="h-5 w-5 text-[#123962]" />
                        </div>
                        <h3 className="text-lg font-semibold bg-gradient-to-r from-[#123962] to-[#90A5FB] bg-clip-text text-transparent">
                          Project Description
                        </h3>
                      </div>
                      <p className="text-gray-700 leading-relaxed">
                        {projectData.description}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                      <div className="p-4 bg-gradient-to-br from-blue-50/50 to-indigo-50/30 border border-blue-100 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Building2 className="h-4 w-4 text-blue-600" />
                          <span className="text-sm text-gray-600">
                            Industry
                          </span>
                        </div>
                        <p className="font-semibold text-gray-900 capitalize">
                          {projectData.industry}
                        </p>
                      </div>
                      <div className="p-4 bg-gradient-to-br from-purple-50/50 to-violet-50/30 border border-purple-100 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Calendar className="h-4 w-4 text-purple-600" />
                          <span className="text-sm text-gray-600">
                            Timeline
                          </span>
                        </div>
                        <p className="font-semibold text-gray-900">
                          {projectData.timeline}
                        </p>
                      </div>
                    </div>
                  </TabsContent>

                  {/* Milestones Tab */}
                  <TabsContent value="milestones" className="space-y-4">
                    {projectData.milestones.map((milestone, index) => (
                      <div
                        key={index}
                        className="p-4 bg-gradient-to-br from-blue-50/50 to-indigo-50/30 border border-blue-100 rounded-lg"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                milestone.status === 'completed'
                                  ? 'bg-emerald-500/10'
                                  : milestone.status === 'in-progress'
                                    ? 'bg-blue-500/10'
                                    : 'bg-gray-100'
                              }`}
                            >
                              {milestone.status === 'completed' ? (
                                <CheckCircle className="h-4 w-4 text-emerald-600" />
                              ) : milestone.status === 'in-progress' ? (
                                <Activity className="h-4 w-4 text-blue-600" />
                              ) : (
                                <Clock className="h-4 w-4 text-gray-500" />
                              )}
                            </div>
                            <div>
                              <h4 className="font-semibold text-gray-900">
                                {milestone.title}
                              </h4>
                              <p className="text-sm text-gray-600">
                                {milestone.date}
                              </p>
                            </div>
                          </div>
                          <Badge
                            className={
                              milestone.status === 'completed'
                                ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20'
                                : milestone.status === 'in-progress'
                                  ? 'bg-blue-500/10 text-blue-700 border-blue-500/20'
                                  : 'bg-gray-100 text-gray-700'
                            }
                          >
                            {milestone.status === 'completed'
                              ? 'Completed'
                              : milestone.status === 'in-progress'
                                ? 'In Progress'
                                : 'Upcoming'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </TabsContent>

                  {/* Team Tab */}
                  <TabsContent value="team" className="space-y-4">
                    {projectData.team.map((member, index) => (
                      <div
                        key={index}
                        className="p-4 bg-gradient-to-br from-purple-50/50 to-violet-50/30 border border-purple-100 rounded-lg"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 bg-gradient-to-br from-[#123962] to-[#90A5FB] rounded-full flex items-center justify-center">
                            <Users className="h-8 w-8 text-white" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900">
                              {member.name}
                            </h4>
                            <p className="text-sm text-gray-600">
                              {member.role}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </TabsContent>

                  {/* Documents Tab */}
                  <TabsContent value="documents" className="space-y-4">
                    {projectData.documents.map((doc, index) => (
                      <div
                        key={index}
                        className="p-4 bg-gradient-to-br from-amber-50/50 to-orange-50/30 border border-amber-100 rounded-lg"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-amber-500/10 rounded-lg flex items-center justify-center">
                              <FileText className="h-5 w-5 text-amber-600" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-gray-900">
                                {doc.name}
                              </h4>
                              <p className="text-sm text-gray-600">
                                {doc.type} • {doc.size}
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-gray-200 hover:border-[#90A5FB] hover:bg-[#90A5FB]/5"
                          >
                            Download
                          </Button>
                        </div>
                      </div>
                    ))}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Investment Card */}
          <div className="space-y-6">
            {/* Funding Progress Card */}
            <Card className="bg-white border border-gray-200 rounded-xl shadow-sm sticky top-4">
              <CardHeader className="border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#123962]/10 rounded-lg flex items-center justify-center">
                    <Target className="h-5 w-5 text-[#123962]" />
                  </div>
                  <CardTitle className="bg-gradient-to-r from-[#123962] to-[#90A5FB] bg-clip-text text-transparent">
                    Funding Progress
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {/* Progress Bar */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm text-gray-600">Progress</span>
                    <Badge className="bg-[#90A5FB]/10 text-[#90A5FB] border-[#90A5FB]/20">
                      {fundingProgress}%
                    </Badge>
                  </div>
                  <Progress value={fundingProgress} className="h-3 mb-2" />
                  <div className="flex justify-between text-xs text-gray-600">
                    <span className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3 text-emerald-600" />
                      {formatCurrency(projectData.totalRaised)}
                    </span>
                    <span className="text-gray-500">
                      Goal: {formatCurrency(projectData.targetAmount)}
                    </span>
                  </div>
                </div>

                {/* Key Metrics */}
                <div className="space-y-3">
                  <div className="p-3 bg-gradient-to-br from-emerald-50/50 to-green-50/30 border border-emerald-100 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-emerald-600" />
                        <span className="text-sm text-gray-600">
                          Share Price
                        </span>
                      </div>
                      <p className="font-semibold text-emerald-600">
                        {formatCurrency(projectData.sharePrice)}
                      </p>
                    </div>
                  </div>

                  <div className="p-3 bg-gradient-to-br from-blue-50/50 to-indigo-50/30 border border-blue-100 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-blue-600" />
                        <span className="text-sm text-gray-600">Available</span>
                      </div>
                      <p className="font-semibold text-gray-900">
                        {projectData.totalShares}
                      </p>
                    </div>
                  </div>

                  <div className="p-3 bg-gradient-to-br from-purple-50/50 to-violet-50/30 border border-purple-100 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-purple-600" />
                        <span className="text-sm text-gray-600">
                          Min. Investment
                        </span>
                      </div>
                      <p className="font-semibold text-gray-900">
                        {formatCurrency(projectData.minInvestment)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Investment Form */}
                <div className="space-y-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-[#123962] to-[#90A5FB] rounded-lg flex items-center justify-center">
                      <Zap className="h-4 w-4 text-white" />
                    </div>
                    <h4 className="font-semibold text-gray-900">Invest Now</h4>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <Label
                        htmlFor="shares"
                        className="text-sm text-gray-700 mb-1.5 block"
                      >
                        Number of Shares
                      </Label>
                      <Input
                        id="shares"
                        type="number"
                        min="1"
                        value={shareQuantity}
                        onChange={(e) =>
                          handleShareQuantityChange(e.target.value)
                        }
                        className="border-gray-200 focus:border-[#90A5FB] focus:ring-[#90A5FB]/20"
                        placeholder="Enter shares"
                      />
                    </div>

                    <div>
                      <Label
                        htmlFor="amount"
                        className="text-sm text-gray-700 mb-1.5 block"
                      >
                        Investment Amount (USD)
                      </Label>
                      <Input
                        id="amount"
                        type="number"
                        min="0"
                        step="0.01"
                        value={investmentAmount}
                        onChange={(e) =>
                          handleInvestmentAmountChange(e.target.value)
                        }
                        className="border-gray-200 focus:border-[#90A5FB] focus:ring-[#90A5FB]/20"
                        placeholder="Enter amount"
                      />
                    </div>
                  </div>

                  <div className="p-3 bg-gradient-to-br from-blue-50/50 to-indigo-50/30 border border-blue-100 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Info className="h-4 w-4 text-blue-600" />
                      <span className="text-xs text-gray-600">
                        Investment Summary
                      </span>
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Shares:</span>
                        <span className="font-semibold text-gray-900">
                          {shareQuantity || 0}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total:</span>
                        <span className="font-semibold text-emerald-600">
                          {formatCurrency(parseFloat(investmentAmount) || 0)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <Button
                    className="w-full bg-gradient-to-r from-[#123962] to-[#90A5FB] hover:from-[#123962]/90 hover:to-[#90A5FB]/90 text-white shadow-lg hover:shadow-xl transition-all duration-300"
                    onClick={handleInvest}
                    disabled={
                      !investmentAmount ||
                      parseFloat(investmentAmount) < projectData.minInvestment
                    }
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Confirm Investment
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full border-gray-200 hover:border-[#90A5FB] hover:bg-[#90A5FB]/5"
                  >
                    <Share2 className="h-4 w-4 mr-2" />
                    Share Project
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
