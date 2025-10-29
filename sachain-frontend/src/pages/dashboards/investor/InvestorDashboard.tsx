import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ImageWithFallback } from '@/components/figma/ImageWithFallback';
import {
  TrendingUp,
  DollarSign,
  PieChart,
  ArrowUpRight,
  CheckCircle,
  Star,
  BarChart3,
  Wallet,
  Plus,
  Eye,
  Sparkles,
  Target,
  TrendingDown,
  Activity,
  Zap,
  Building2,
} from 'lucide-react';
import { useInvestorProjects } from '@/features/project/hook/useInvestorProjects';
import { useWalletStore } from '@/features/wallet/store/walletStore';
import { useHederaBalance } from '@/features/project/hook/useHederaVerification';

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
  onNavigate,
}: {
  onNavigate?: (view: 'portfolio' | 'explore' | 'analytics') => void;
}) {
  const { projects: liveProjects } = useInvestorProjects();

  // Mock user data - TODO: Replace with real API calls
  const [portfolioSummary] = useState<PortfolioSummary>({
    totalInvested: 0,
    currentValue: 0,
    totalReturn: 0,
    totalReturnPercentage: 0,
    activeInvestments: 0,
    totalTokens: 0,
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
      case 'active':
        return 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20';
      case 'completed':
        return 'bg-blue-500/10 text-blue-700 border-blue-500/20';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Get featured projects (first 3 live projects)
  const featuredProjects = liveProjects.slice(0, 3);

  const walletAddress = useWalletStore((state) => state.walletAddress);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const { balance, tokens, loading, error } = useHederaBalance(
    walletAddress,
    refreshTrigger
  );

  return (
    <div className="space-y-8 pb-8">
      {/* Welcome Section with Gradient Title */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-[#90A5FB] to-[#123962] shadow-lg">
            <BarChart3 className="h-5 w-5 text-white" />
          </div>
        </div>
        <h1 className="text-3xl sm:text-4xl font-semibold bg-gradient-to-r from-[#123962] via-[#90A5FB] to-[#123962] bg-clip-text text-transparent mb-3">
          Investment Dashboard
        </h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Track your portfolio and discover new investment opportunities on
          Hedera network
        </p>
      </div>

      {/* Portfolio Overview Cards - Light Aesthetic */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Invested Card */}
        <Card className="bg-white border border-gray-200 hover:border-[#90A5FB]/50 rounded-xl shadow-sm hover:shadow-lg transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-[#123962]/10 rounded-xl flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-[#123962]" />
              </div>
              <Badge className="bg-blue-500/10 text-blue-700 border-blue-500/20 text-xs">
                USD
              </Badge>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Invested</p>
              <p className="text-2xl font-semibold text-gray-900">
                {formatCurrency(portfolioSummary.totalInvested)}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Current Value Card */}
        <Card className="bg-white border border-gray-200 hover:border-[#90A5FB]/50 rounded-xl shadow-sm hover:shadow-lg transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-emerald-600" />
              </div>
              <div className="flex items-center gap-1 text-xs text-emerald-600">
                <ArrowUpRight className="h-3 w-3" />
                <span>
                  {formatPercentage(portfolioSummary.totalReturnPercentage)}
                </span>
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Current Value</p>
              <p className="text-2xl font-semibold text-gray-900">
                {formatCurrency(portfolioSummary.currentValue)}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Total Return Card */}
        <Card className="bg-white border border-gray-200 hover:border-[#90A5FB]/50 rounded-xl shadow-sm hover:shadow-lg transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-[#90A5FB]/10 rounded-xl flex items-center justify-center">
                <BarChart3 className="h-6 w-6 text-[#90A5FB]" />
              </div>
              <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20 text-xs">
                Profit
              </Badge>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Return</p>
              <p className="text-2xl font-semibold text-emerald-600">
                {portfolioSummary.totalReturn >= 0 ? '+' : ''}
                {formatCurrency(portfolioSummary.totalReturn)}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Active Investments Card */}
        <Card className="bg-white border border-gray-200 hover:border-[#90A5FB]/50 rounded-xl shadow-sm hover:shadow-lg transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center">
                <PieChart className="h-6 w-6 text-purple-600" />
              </div>
              <Badge className="bg-purple-500/10 text-purple-700 border-purple-500/20 text-xs">
                Live
              </Badge>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Active Investments</p>
              <p className="text-2xl font-semibold text-gray-900">
                {portfolioSummary.activeInvestments}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-8">
          {/* My Investments - Light Aesthetic */}
          <Card className="bg-white border border-gray-200 rounded-xl shadow-sm">
            <CardHeader className="border-b border-gray-100 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#123962]/10 rounded-lg flex items-center justify-center">
                    <PieChart className="h-5 w-5 text-[#123962]" />
                  </div>
                  <CardTitle className="bg-gradient-to-r from-[#123962] to-[#90A5FB] bg-clip-text text-transparent">
                    My Investments
                  </CardTitle>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onNavigate?.('portfolio')}
                  className="border-gray-200 hover:border-[#90A5FB] hover:bg-[#90A5FB]/5"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View All
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {userInvestments.length === 0 ? (
                <div className="text-center py-12">
                  <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl flex items-center justify-center mb-4">
                    <PieChart className="h-8 w-8 text-[#90A5FB]" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    No investments yet
                  </h3>
                  <p className="text-gray-600 mb-6 max-w-sm mx-auto">
                    Start building your portfolio by exploring available
                    projects on the Hedera network.
                  </p>
                  <Button
                    className="bg-gradient-to-r from-[#123962] to-[#90A5FB] hover:from-[#123962]/90 hover:to-[#90A5FB]/90 text-white shadow-lg hover:shadow-xl transition-all duration-300"
                    onClick={() => onNavigate?.('explore')}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Explore Projects
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {userInvestments.map((investment) => (
                    <div
                      key={investment.id}
                      className="flex items-center space-x-4 p-4 bg-gradient-to-br from-blue-50/50 to-indigo-50/30 border border-blue-100 rounded-xl hover:shadow-md transition-shadow"
                    >
                      <ImageWithFallback
                        src={investment.image || '/placeholder-project.jpg'}
                        alt={investment.projectName}
                        className="w-16 h-16 rounded-lg object-cover"
                      />
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold text-gray-900">
                              {investment.projectName}
                            </h3>
                            <p className="text-sm text-gray-600 capitalize">
                              {investment.category}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {investment.tokensOwned} tokens
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-gray-900">
                              {formatCurrency(investment.currentValue)}
                            </p>
                            <p
                              className={`text-sm ${
                                investment.currentValue >=
                                investment.amountInvested
                                  ? 'text-emerald-600'
                                  : 'text-red-600'
                              }`}
                            >
                              {formatPercentage(
                                ((investment.currentValue -
                                  investment.amountInvested) /
                                  investment.amountInvested) *
                                  100
                              )}
                            </p>
                            <Badge
                              className={getStatusColor(investment.status)}
                            >
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

          {/* Featured Investment Opportunities - Light Aesthetic */}
          <Card className="bg-white border border-gray-200 rounded-xl shadow-sm">
            <CardHeader className="border-b border-gray-100 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-500/10 rounded-lg flex items-center justify-center">
                    <Star className="h-5 w-5 text-amber-600" />
                  </div>
                  <CardTitle className="bg-gradient-to-r from-[#123962] to-[#90A5FB] bg-clip-text text-transparent">
                    Featured Opportunities
                  </CardTitle>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onNavigate?.('explore')}
                  className="border-gray-200 hover:border-[#90A5FB] hover:bg-[#90A5FB]/5"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View All
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {featuredProjects.length === 0 ? (
                <div className="text-center py-12">
                  <div className="mx-auto w-16 h-16 bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl flex items-center justify-center mb-4">
                    <Star className="h-8 w-8 text-amber-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    No projects available
                  </h3>
                  <p className="text-gray-600">
                    Check back later for new investment opportunities.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {featuredProjects.map((project) => (
                    <Card
                      key={project.projectId}
                      className="bg-white border border-gray-200 hover:border-[#90A5FB]/50 rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden"
                    >
                      <div className="relative">
                        <ImageWithFallback
                          src={
                            project.coverImageUrl || '/placeholder-project.jpg'
                          }
                          alt={project.name}
                          className="w-full h-32 object-cover"
                        />
                        <Badge className="absolute top-2 right-2 bg-emerald-500/10 text-emerald-700 border-emerald-500/20 backdrop-blur-sm">
                          <Activity className="h-3 w-3 mr-1" />
                          Live
                        </Badge>
                      </div>
                      <CardContent className="p-4">
                        <h3 className="font-semibold text-gray-900 mb-1 truncate">
                          {project.name}
                        </h3>
                        <p className="text-sm text-gray-600 capitalize mb-3">
                          {project.category}
                        </p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-4 w-4 text-emerald-600" />
                            <span className="font-semibold text-emerald-600">
                              {formatCurrency(project.pricePerStock)}
                            </span>
                          </div>
                          <span className="text-xs text-gray-500">
                            per token
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Quick Actions - Light Aesthetic */}
          <Card className="bg-white border border-gray-200 rounded-xl shadow-sm">
            <CardHeader className="border-b border-gray-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#90A5FB]/10 rounded-lg flex items-center justify-center">
                  <Zap className="h-5 w-5 text-[#90A5FB]" />
                </div>
                <CardTitle className="bg-gradient-to-r from-[#123962] to-[#90A5FB] bg-clip-text text-transparent">
                  Quick Actions
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 pt-6">
              <Button
                className="w-full bg-gradient-to-r from-[#123962] to-[#90A5FB] hover:from-[#123962]/90 hover:to-[#90A5FB]/90 text-white shadow-lg hover:shadow-xl transition-all duration-300"
                onClick={() => onNavigate?.('explore')}
              >
                <Plus className="h-4 w-4 mr-2" />
                Explore New Projects
              </Button>
              <Button
                variant="outline"
                className="w-full border-gray-200 hover:border-[#90A5FB] hover:bg-[#90A5FB]/5"
                onClick={() => onNavigate?.('portfolio')}
              >
                <PieChart className="h-4 w-4 mr-2" />
                View Portfolio
              </Button>
              <Button
                variant="outline"
                className="w-full border-gray-200 hover:border-[#90A5FB] hover:bg-[#90A5FB]/5"
                onClick={() => onNavigate?.('analytics')}
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                View Analytics
              </Button>
            </CardContent>
          </Card>

          {/* Market Overview - Light Aesthetic */}
          <Card className="bg-gradient-to-br from-blue-50/50 to-indigo-50/30 border border-blue-100 rounded-xl shadow-sm">
            <CardHeader className="border-b border-blue-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#123962]/10 rounded-lg flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-[#123962]" />
                </div>
                <CardTitle className="bg-gradient-to-r from-[#123962] to-[#90A5FB] bg-clip-text text-transparent">
                  Market Overview
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-white/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-[#90A5FB]" />
                    <span className="text-sm text-gray-700">
                      Available Projects
                    </span>
                  </div>
                  <Badge className="bg-[#123962]/10 text-[#123962] border-[#123962]/20">
                    {liveProjects.length}
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-white/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-purple-600" />
                    <span className="text-sm text-gray-700">Categories</span>
                  </div>
                  <Badge className="bg-purple-500/10 text-purple-700 border-purple-500/20">
                    {[...new Set(liveProjects.map((p) => p.category))].length}
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-white/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-emerald-600" />
                    <span className="text-sm text-gray-700">
                      Avg. Token Price
                    </span>
                  </div>
                  <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20">
                    {liveProjects.length > 0
                      ? formatCurrency(
                          liveProjects.reduce(
                            (sum, p) => sum + p.pricePerStock,
                            0
                          ) / liveProjects.length
                        )
                      : '$0'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Wallet Status - Light Aesthetic */}
          <Card className="bg-gradient-to-br from-emerald-50/50 to-green-50/30 border border-emerald-200 rounded-xl shadow-sm">
            <CardHeader className="border-b border-emerald-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center">
                  <Wallet className="h-5 w-5 text-emerald-600" />
                </div>
                <CardTitle className="bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
                  Wallet Status
                </CardTitle>
              </div>
            </CardHeader>
            {/* <CardContent className="pt-6">
              <div className="flex items-center justify-between p-4 bg-white/60 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 bg-emerald-500/10 rounded-full flex items-center justify-center">
                    <CheckCircle className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-emerald-900">Connected</p>
                    <p className="text-sm text-emerald-700">Ready to invest</p>
                  </div>
                </div>
                <Sparkles className="h-5 w-5 text-emerald-600" />
              </div>
            </CardContent> */}

            <CardContent>
              {!walletAddress && <p>Please connect your wallet.</p>}

              {walletAddress && (
                <div>
                  <div className="flex items-center gap-2">
                    <Wallet />
                    <span>Address: {walletAddress}</span>
                  </div>

                  {loading && <p>Loading balance...</p>}

                  {error && <p className="text-red-600">Error: {error}</p>}

                  {!loading && !error && (
                    <p>
                      HBAR Balance:{' '}
                      {balance !== null ? balance.toFixed(6) : 'N/A'} ℏ
                    </p>
                  )}

                  <button onClick={() => setRefreshTrigger((t) => t + 1)}>
                    Refresh Balance
                  </button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default InvestorDashboard;