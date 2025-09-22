import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ImageWithFallback } from '../../../components/figma/ImageWithFallback';
import { 
  TrendingUp, 
  DollarSign, 
  PieChart, 
  ArrowUpRight,
  Calendar,
  CheckCircle,
  Star,
  BarChart3,
  Activity,
  Wallet,
  Plus,
  Eye
} from 'lucide-react';
import { useInvestorProjects } from '@/features/project/hook/useInvestorProjects';

// Types for our real data
interface Investment {
  id: string;
  projectId: string;
  projectName: string;
  category: string;
  tokensOwned: number;
  amountInvested: number;
  currentValue: number;
  pricePerToken: number;
  status: 'active' | 'completed';
  investmentDate: string;
  image?: string;
}

interface PortfolioSummary {
  totalInvested: number;
  currentValue: number;
  totalReturn: number;
  totalReturnPercentage: number;
  activeInvestments: number;
  totalTokens: number;
}

export function InvestorDashboard({ 
  onNavigate 
}: { 
  onNavigate?: (view: 'portfolio' | 'explore' | 'analytics') => void 
}) {
  const { projects: liveProjects } = useInvestorProjects();
  
  // Mock user data - TODO: Replace with real API calls
  const [portfolioSummary] = useState<PortfolioSummary>({
    totalInvested: 0,
    currentValue: 0,
    totalReturn: 0,
    totalReturnPercentage: 0,
    activeInvestments: 0,
    totalTokens: 0
  });

  const [userInvestments] = useState<Investment[]>([]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Get featured projects (first 3 live projects)
  const featuredProjects = liveProjects.slice(0, 3);

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Investment Dashboard</h1>
        <p className="text-gray-600">Track your portfolio and discover new investment opportunities.</p>
      </div>

      {/* Portfolio Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Invested</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(portfolioSummary.totalInvested)}
                </p>
                <p className="text-xs text-gray-500">USD</p>
              </div>
              <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Current Value</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(portfolioSummary.currentValue)}
                </p>
                <p className="text-xs text-green-600 flex items-center">
                  <ArrowUpRight className="h-3 w-3 mr-1" />
                  {formatPercentage(portfolioSummary.totalReturnPercentage)}
                </p>
              </div>
              <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Return</p>
                <p className="text-2xl font-bold text-green-600">
                  {portfolioSummary.totalReturn >= 0 ? '+' : ''}{formatCurrency(portfolioSummary.totalReturn)}
                </p>
                <p className="text-xs text-gray-500">USD</p>
              </div>
              <div className="h-12 w-12 bg-[#90A5FB]/10 rounded-lg flex items-center justify-center">
                <BarChart3 className="h-6 w-6 text-[#90A5FB]" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Investments</p>
                <p className="text-2xl font-bold text-gray-900">{portfolioSummary.activeInvestments}</p>
                <p className="text-xs text-gray-500">Projects</p>
              </div>
              <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <PieChart className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-8">
          {/* My Investments */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>My Investments</CardTitle>
                <Button variant="outline" size="sm" onClick={() => onNavigate?.('portfolio')}>
                  <Eye className="h-4 w-4 mr-2" />
                  View All
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {userInvestments.length === 0 ? (
                <div className="text-center py-8">
                  <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
                    <PieChart className="h-full w-full" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No investments yet</h3>
                  <p className="text-gray-600 mb-4">Start building your portfolio by exploring available projects.</p>
                  <Button 
                    className="bg-[#123962] hover:bg-[#90A5FB] text-white"
                    onClick={() => onNavigate?.('explore')}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Explore Projects
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {userInvestments.map((investment) => (
                    <div key={investment.id} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                      <ImageWithFallback 
                        src={investment.image || '/placeholder-project.jpg'}
                        alt={investment.projectName}
                        className="w-16 h-16 rounded-lg object-cover"
                      />
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold text-gray-900">{investment.projectName}</h3>
                            <p className="text-sm text-gray-600 capitalize">{investment.category}</p>
                            <p className="text-xs text-gray-500">{investment.tokensOwned} tokens</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-gray-900">{formatCurrency(investment.currentValue)}</p>
                            <p className={`text-sm ${
                              investment.currentValue >= investment.amountInvested ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {formatPercentage(((investment.currentValue - investment.amountInvested) / investment.amountInvested) * 100)}
                            </p>
                            <Badge className={getStatusColor(investment.status)}>
                              {investment.status}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Featured Investment Opportunities */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Featured Investment Opportunities</CardTitle>
                <Button variant="outline" size="sm" onClick={() => onNavigate?.('explore')}>
                  <Eye className="h-4 w-4 mr-2" />
                  View All
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {featuredProjects.length === 0 ? (
                <div className="text-center py-8">
                  <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
                    <Star className="h-full w-full" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No projects available</h3>
                  <p className="text-gray-600">Check back later for new investment opportunities.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {featuredProjects.map((project) => (
                    <div key={project.projectId} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                      <ImageWithFallback 
                        src={project.coverImageUrl || '/placeholder-project.jpg'}
                        alt={project.name}
                        className="w-full h-32 object-cover rounded-lg mb-3"
                      />
                      <h3 className="font-semibold text-gray-900 mb-1">{project.name}</h3>
                      <p className="text-sm text-gray-600 capitalize mb-2">{project.category}</p>
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-green-600">
                          {formatCurrency(project.pricePerStock)}/token
                        </span>
                        <Badge className="bg-green-100 text-green-800">Live</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-8">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                className="w-full bg-[#123962] hover:bg-[#90A5FB] text-white"
                onClick={() => onNavigate?.('explore')}
              >
                <Plus className="h-4 w-4 mr-2" />
                Explore New Projects
              </Button>
              <Button variant="outline" className="w-full" onClick={() => onNavigate?.('portfolio')}>
                <PieChart className="h-4 w-4 mr-2" />
                View Portfolio
              </Button>
              <Button variant="outline" className="w-full" onClick={() => onNavigate?.('analytics')}>
                <BarChart3 className="h-4 w-4 mr-2" />
                View Analytics
              </Button>
            </CardContent>
          </Card>

          {/* Market Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Market Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Available Projects</span>
                  <span className="font-medium">{liveProjects.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Categories</span>
                  <span className="font-medium">
                    {[...new Set(liveProjects.map(p => p.category))].length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Avg. Token Price</span>
                  <span className="font-medium">
                    {liveProjects.length > 0 
                      ? formatCurrency(liveProjects.reduce((sum, p) => sum + p.pricePerStock, 0) / liveProjects.length)
                      : '$0'
                    }
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Wallet Status */}
          <Card>
            <CardHeader>
              <CardTitle>Wallet Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center">
                    <Wallet className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-green-900">Wallet Connected</p>
                    <p className="text-sm text-green-700">Ready to invest</p>
                  </div>
                </div>
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}