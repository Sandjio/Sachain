import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  TrendingUp,
  DollarSign,
  Users,
  BarChart3,
  Target,
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowUpRight,
  Sparkles,
  MessageSquare,
  FileCheck,
  Wallet,
  Calendar,
  Activity,
  Building2,
  ArrowDownLeft,
  ArrowUpRight as ArrowUpRightIcon,
  Coins,
  CreditCard,
  Plus,
} from 'lucide-react';

// Mock data built into the component for easy demo
const mockMetrics = {
  totalProjects: 3,
  activeProjects: 2,
  completedProjects: 0,
  totalRaised: 4500000,
  totalInvestors: 2139,
  averageRaise: 1500000,
  successRate: 67,
  walletBalance: 125000,
  monthlyGrowth: 23.5,
};

const mockActivities = [
  {
    id: '1',
    type: 'investment' as const,
    title: 'New Investment Received',
    description: 'DeFi Yield Farming Protocol received $50,000 investment',
    timestamp: '2 hours ago',
    status: 'success' as const,
  },
  {
    id: '2',
    type: 'milestone' as const,
    title: 'Funding Milestone Reached',
    description: 'AI-Powered Trading Bot reached 60% funding goal',
    timestamp: '5 hours ago',
    status: 'success' as const,
  },
  {
    id: '3',
    type: 'project_update' as const,
    title: 'Project Updated',
    description: 'DeFi Yield Farming Protocol documentation updated',
    timestamp: '1 day ago',
    status: 'info' as const,
  },
];

// Wallet mock data with transactions and token holdings (Hedera-based)
const mockWalletData = {
  balance: 125750.5,
  walletAddress: '0.0.1234567',
  network: 'Hedera Mainnet',
  recentTransactions: [
    {
      id: '1',
      type: 'received' as const,
      amount: 50000,
      token: 'HBAR',
      from: 'DeFi Protocol',
      timestamp: '2 hours ago',
      hash: '0.0.123456@1234567890.123456789',
    },
    {
      id: '2',
      type: 'sent' as const,
      amount: 25000,
      token: 'HBAR',
      to: 'Smart Contract',
      timestamp: '1 day ago',
      hash: '0.0.234567@1234567891.234567890',
    },
    {
      id: '3',
      type: 'received' as const,
      amount: 15000,
      token: 'HBAR',
      from: 'Investor Wallet',
      timestamp: '2 days ago',
      hash: '0.0.345678@1234567892.345678901',
    },
  ],
  tokenHoldings: [
    {
      id: '1',
      name: 'HBAR',
      amount: 95000,
      value: 95000,
      change: '+3.2%',
      positive: true,
    },
    {
      id: '2',
      name: 'USDC',
      amount: 18500,
      value: 18500,
      change: '+1.5%',
      positive: true,
    },
    {
      id: '3',
      name: 'HSCS',
      amount: 12250,
      value: 12250.5,
      change: '+0.8%',
      positive: true,
    },
  ],
};

interface StartupDashboardHomeLightProps {
  onCreateProject?: () => void;
  onViewProjects?: () => void;
}

export default function StartupDashboardHome({
  onCreateProject,
  onViewProjects,
}: StartupDashboardHomeLightProps) {
  // Use mock data by default
  const metrics = mockMetrics;
  const recentActivities = mockActivities;
  const walletData = mockWalletData;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toLocaleString();
  };

  const getTransactionIcon = (type: string) => {
    return type === 'received' ? ArrowDownLeft : ArrowUpRightIcon;
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'investment':
        return DollarSign;
      case 'project_update':
        return Building2;
      case 'message':
        return MessageSquare;
      case 'milestone':
        return Target;
      default:
        return Activity;
    }
  };

  const statsData = [
    {
      icon: DollarSign,
      value: formatCurrency(metrics.totalRaised),
      label: 'Total Raised',
      subtitle: `From ${metrics.totalProjects} projects`,
      bgColor: 'bg-gradient-to-r from-[#123962]/5 to-[#90A5FB]/10',
      iconBg: 'bg-[#123962]/10',
      color: 'text-[#123962]',
      badge: `+${metrics.monthlyGrowth.toFixed(1)}%`,
    },
    {
      icon: Users,
      value: formatNumber(metrics.totalInvestors),
      label: 'Total Investors',
      subtitle: 'Across all projects',
      bgColor: 'bg-gradient-to-r from-[#90A5FB]/10 to-[#123962]/5',
      iconBg: 'bg-[#90A5FB]/10',
      color: 'text-[#90A5FB]',
      badge: 'Active',
    },
    {
      icon: Building2,
      value: metrics.totalProjects,
      label: 'Total Projects',
      subtitle: `${metrics.activeProjects} active`,
      bgColor: 'bg-gradient-to-r from-[#123962]/5 to-[#90A5FB]/10',
      iconBg: 'bg-[#123962]/10',
      color: 'text-[#123962]',
      badge: `${metrics.activeProjects}/${metrics.totalProjects}`,
    },
    {
      icon: Target,
      value: formatCurrency(metrics.averageRaise),
      label: 'Avg. Raise',
      subtitle: 'Success rate',
      bgColor: 'bg-gradient-to-r from-[#90A5FB]/10 to-[#123962]/5',
      iconBg: 'bg-[#90A5FB]/10',
      color: 'text-[#90A5FB]',
      badge: `${metrics.successRate}%`,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Welcome Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-gradient-to-br from-[#90A5FB] to-[#123962] shadow-lg">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-xl sm:text-3xl font-semibold bg-gradient-to-r from-[#123962] via-[#90A5FB] to-[#123962] bg-clip-text text-transparent">
                Dashboard Overview
              </h1>
            </div>
          </div>

          <div className="flex gap-3">
            <p className="p-1 bg-gradient-to-r from-[#123962] to-[#90A5FB] hover:from-[#0d2640] hover:to-[#7088e8] text-white border-0 rounded-lg shadow-lg shadow-[#90A5FB]/30 transition-all hover:scale-105 active:scale-95">
              Track your projects and investments on Hedera
            </p>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statsData.map((stat, index) => {
            const IconComponent = stat.icon;
            return (
              <Card
                key={index}
                className={`${stat.bgColor} border-0 shadow-sm hover:shadow-md transition-shadow duration-200`}
              >
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-3">
                    <div className={`p-2 rounded-lg ${stat.iconBg}`}>
                      <IconComponent className={`h-5 w-5 ${stat.color}`} />
                    </div>
                    <Badge className={`${stat.iconBg} ${stat.color} border-0`}>
                      {stat.badge}
                    </Badge>
                  </div>
                  <div className="space-y-0">
                    <p className={`text-2xl font-bold ${stat.color}`}>
                      {stat.value}
                    </p>
                    <p className="text-sm font-medium text-gray-700 mt-1">
                      {stat.label}
                    </p>
                    <p className="text-sm text-gray-600 mt-0.5">
                      {stat.subtitle}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Performance Indicators */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-gradient-to-r from-[#90A5FB]/10 to-[#90A5FB]/5 border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-[#90A5FB]/20 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-[#90A5FB]" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900">
                      Portfolio Growth
                    </span>
                    <Badge className="bg-[#90A5FB]/20 text-[#123962] border-[#90A5FB]/30">
                      This Month
                    </Badge>
                  </div>
                  <div className="w-full bg-white rounded-full h-2 shadow-inner">
                    <div
                      className="bg-gradient-to-r from-[#90A5FB] to-[#123962] h-2 rounded-full transition-all duration-1000"
                      style={{
                        width: `${Math.min(100, Math.abs(metrics.monthlyGrowth))}%`,
                      }}
                    />
                  </div>
                  <p className="text-sm text-[#123962] mt-1 font-medium">
                    {metrics.monthlyGrowth > 0 ? '+' : ''}
                    {metrics.monthlyGrowth.toFixed(1)}% growth
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-[#123962]/10 to-[#123962]/5 border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-[#123962]/20 rounded-lg">
                  <Target className="h-6 w-6 text-[#123962]" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900">
                      Success Rate
                    </span>
                    <Badge className="bg-[#123962]/20 text-[#123962] border-[#123962]/30">
                      Excellent
                    </Badge>
                  </div>
                  <div className="w-full bg-white rounded-full h-2 shadow-inner">
                    <div
                      className="bg-gradient-to-r from-[#123962] to-[#90A5FB] h-2 rounded-full transition-all duration-1000"
                      style={{ width: `${metrics.successRate}%` }}
                    />
                  </div>
                  <p className="text-sm text-[#123962] mt-1 font-medium">
                    {metrics.successRate}% successful projects
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Project Status Overview */}
        <Card className="bg-white border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <div className="p-2 bg-gradient-to-br from-[#90A5FB]/10 to-[#123962]/10 rounded-lg">
                <BarChart3 className="h-5 w-5 text-[#123962]" />
              </div>
              <span>Project Status</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-gradient-to-br from-[#90A5FB]/5 to-transparent hover:from-[#90A5FB]/10 transition-colors border border-[#90A5FB]/20">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-[#90A5FB]/20 rounded-lg">
                    <Activity className="h-5 w-5 text-[#90A5FB]" />
                  </div>
                  <span className="font-semibold text-gray-900">Active</span>
                </div>
                <p className="text-3xl font-bold text-[#90A5FB]">
                  {metrics.activeProjects}
                </p>
                <p className="text-sm text-gray-600 mt-1">Currently running</p>
              </div>

              <div className="p-4 rounded-lg bg-gradient-to-br from-[#123962]/5 to-transparent hover:from-[#123962]/10 transition-colors border border-[#123962]/20">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-[#123962]/20 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-[#123962]" />
                  </div>
                  <span className="font-semibold text-gray-900">Completed</span>
                </div>
                <p className="text-3xl font-bold text-[#123962]">
                  {metrics.completedProjects}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  Successfully funded
                </p>
              </div>

              <div className="p-4 rounded-lg bg-gradient-to-br from-[#90A5FB]/5 to-transparent hover:from-[#90A5FB]/10 transition-colors border border-[#90A5FB]/20">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-[#90A5FB]/20 rounded-lg">
                    <Building2 className="h-5 w-5 text-[#90A5FB]" />
                  </div>
                  <span className="font-semibold text-gray-900">Total</span>
                </div>
                <p className="text-3xl font-bold text-[#90A5FB]">
                  {metrics.totalProjects}
                </p>
                <p className="text-sm text-gray-600 mt-1">All projects</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity & Wallet Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <Card className="bg-white border-0 shadow-sm">
            <CardHeader className="border-b pb-4">
              <CardTitle className="flex items-center gap-2">
                <div className="p-2 bg-gradient-to-br from-[#123962]/10 to-[#90A5FB]/10 rounded-lg">
                  <Activity className="h-5 w-5 text-[#123962]" />
                </div>
                <span>Recent Activity</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-3">
                {recentActivities.slice(0, 5).map((activity) => {
                  const IconComponent = getActivityIcon(activity.type);
                  return (
                    <div
                      key={activity.id}
                      className="flex items-start gap-3 p-3 bg-gradient-to-r from-gray-50 to-transparent rounded-lg border border-gray-100 hover:border-[#90A5FB]/30 hover:shadow-sm transition-all group"
                    >
                      <div className="w-10 h-10 bg-gradient-to-br from-[#90A5FB]/10 to-[#123962]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                        <IconComponent className="h-5 w-5 text-[#123962]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-900 font-medium text-sm">
                          {activity.title}
                        </p>
                        <p className="text-gray-600 text-xs mt-0.5">
                          {activity.description}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <Clock className="h-3 w-3 text-gray-400" />
                          <p className="text-gray-500 text-xs">
                            {activity.timestamp}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Wallet Information */}
          <Card className="bg-gradient-to-br from-[#123962] to-[#90A5FB] text-white border-0 shadow-lg">
            <CardHeader className="border-b border-white/20 pb-4">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg">
                    <Wallet className="h-5 w-5 text-white" />
                  </div>
                  <span>Wallet Overview</span>
                </div>
                {/* <Badge className="bg-white/20 text-white border-white/30">
                  Connected
                </Badge> */}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {/* Top Row: Balance & Network Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="p-4 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
                  <p className="text-white/80 text-xs">Total Balance</p>
                  <p className="text-2xl font-bold text-white mt-1">
                    {formatCurrency(walletData.balance)}
                  </p>
                </div>
                <div className="p-4 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
                  <p className="text-white/80 text-xs">Wallet Address</p>
                  <p className="text-sm font-mono text-white mt-1">
                    {walletData.walletAddress}
                  </p>
                  <Badge className="bg-emerald-400/20 text-emerald-100 border-emerald-300/30 text-xs mt-2">
                    {walletData.network}
                  </Badge>
                </div>
              </div>

              {/* Middle Row: Token Holdings */}
              <div className="mb-4">
                <p className="text-white/90 font-medium text-sm mb-2">
                  Token Holdings
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {walletData.tokenHoldings.map((token) => (
                    <div
                      key={token.id}
                      className="text-center p-2 flex flex-row justify-between  bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 hover:bg-white/15 transition-colors"
                    >
                      <p className="font-semibold text-white text-sm">
                        {token.name}
                      </p>
                      <p className="text-white/80 text-xs mt-1">
                        {formatNumber(token.value)}
                      </p>
                      <p
                        className={`text-xs mt-1 ${token.positive ? 'text-emerald-200' : 'text-red-200'}`}
                      >
                        {token.change}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom Row: Recent Transaction */}
              <div>
                <p className="text-white/90 font-medium text-sm mb-2">
                  Latest Transaction
                </p>
                {walletData.recentTransactions.slice(0, 1).map((tx) => {
                  const TxIcon = getTransactionIcon(tx.type);
                  const isReceived = tx.type === 'received';

                  return (
                    <div
                      key={tx.id}
                      className="flex items-center gap-3 p-3 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20"
                    >
                      <div
                        className={`w-9 h-9 ${isReceived ? 'bg-emerald-400/20' : 'bg-blue-400/20'} rounded-lg flex items-center justify-center flex-shrink-0`}
                      >
                        <TxIcon
                          className={`h-4 w-4 ${isReceived ? 'text-emerald-200' : 'text-blue-200'}`}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-white text-sm">
                          {isReceived ? 'Received' : 'Sent'} {tx.token}
                        </p>
                        <p className="text-white/70 text-xs">{tx.timestamp}</p>
                      </div>
                      <p
                        className={`font-bold text-sm ${isReceived ? 'text-emerald-200' : 'text-blue-200'}`}
                      >
                        {isReceived ? '+' : '-'}
                        {formatCurrency(tx.amount)}
                      </p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
