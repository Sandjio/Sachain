import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  TrendingUp,
  DollarSign,
  Users,
  Eye,
  Plus,
  BarChart3,
  Target,
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Zap,
  Bell,
  MessageSquare,
  FileCheck,
  Wallet,
  Calendar,
  Activity,
} from 'lucide-react';

// Mock project data - you'll replace this with real data from your API
// Mock data for dashboard metrics
const dashboardMetrics = {
  totalProjects: 3,
  totalRaised: 4500000,
  totalInvestors: 2139,
  averageRaise: 1500000,
  successRate: 67,
  activeProjects: 2,
  walletBalance: 125000,
  kycStatus: 'verified',
  monthlyGrowth: 23.5,
  lastMonthRaised: 890000,
};

const recentActivities = [
  {
    type: 'investment',
    message: 'New investment of 50,000 HBAR in DeFi Yield Farming Protocol',
    time: '2 hours ago',
    icon: DollarSign,
    color: 'text-emerald-600',
  },

  {
    type: 'message',
    message: '3 new investor messages received',
    time: '1 day ago',
    icon: MessageSquare,
    color: 'text-purple-600',
  },
  {
    type: 'kyc',
    message: 'KYC verification completed successfully',
    time: '2 days ago',
    icon: CheckCircle,
    color: 'text-green-600',
  },
];

interface StartupDashboardHomeProps {
  onCreateProject?: () => void;
  onViewProjects?: () => void;
}

export default function StartupDashboardHome({
  onCreateProject,
  onViewProjects,
}: StartupDashboardHomeProps) {
  // Removed selectedProject and isDetailViewOpen state, no longer needed

  const formatHBARs = (amount: number) => {
    if (amount >= 1000000) {
      return (amount / 1000000).toFixed(1) + 'M';
    }
    if (amount >= 1000) {
      return (amount / 1000).toFixed(1) + 'K';
    }
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary/90 to-accent p-8 text-white">
        <div className="absolute inset-0 bg-gradient-to-r from-black/20 to-transparent" />
        <div className="relative">
          <div className="flex items-center justify-between">
            <div className="space-y-8">
              <h1 className="text-3xl font-bold">Welcome back! 👋</h1>
              <p className="text-white/90 text-lg">
                Track your projects, manage investments, and grow your startup
                ecosystem.
              </p>
            </div>
            <div className="hidden lg:flex items-center gap-4">
              <div className="text-right">
                <p className="text-white/80 text-sm">This Month</p>
                <p className="text-2xl font-bold">
                  +{dashboardMetrics.monthlyGrowth}%
                </p>
              </div>
              <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <TrendingUp className="h-6 w-6" />
              </div>
            </div>
          </div>
        </div>

        {/* Floating elements */}
        <div className="absolute top-4 right-4 w-20 h-20 bg-white/5 rounded-full" />
        <div className="absolute bottom-4 left-4 w-12 h-12 bg-accent/20 rounded-full" />
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Raised */}
        <Card className="border-0 shadow-lg bg-gradient-to-br from-emerald-50/80 to-emerald-100/50 hover:shadow-xl transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-emerald-600" />
              </div>
              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                <ArrowUpRight className="h-3 w-3 mr-1" />
                +12%
              </Badge>
            </div>
            <div className="space-y-1">
              <p className="text-emerald-600 text-sm font-medium">
                Total Raised
              </p>
              <p className="text-2xl font-bold text-emerald-900">
                {formatHBARs(dashboardMetrics.totalRaised)} HBAR
              </p>
              <p className="text-xs text-emerald-600">
                +{formatHBARs(dashboardMetrics.lastMonthRaised)} this month
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Total Investors */}
        <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50/80 to-blue-100/50 hover:shadow-xl transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                <ArrowUpRight className="h-3 w-3 mr-1" />
                +8%
              </Badge>
            </div>
            <div className="space-y-1">
              <p className="text-blue-600 text-sm font-medium">
                Total Investors
              </p>
              <p className="text-2xl font-bold text-blue-900">
                {formatHBARs(dashboardMetrics.totalInvestors)}
              </p>
              <p className="text-xs text-blue-600">Across all projects</p>
            </div>
          </CardContent>
        </Card>

        {/* Active Projects */}
        <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50/80 to-purple-100/50 hover:shadow-xl transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <BarChart3 className="h-6 w-6 text-purple-600" />
              </div>
              <Badge className="bg-purple-100 text-purple-700 border-purple-200">
                {dashboardMetrics.activeProjects}/
                {dashboardMetrics.totalProjects}
              </Badge>
            </div>
            <div className="space-y-1">
              <p className="text-purple-600 text-sm font-medium">
                Active Projects
              </p>
              <p className="text-2xl font-bold text-purple-900">
                {dashboardMetrics.activeProjects}
              </p>
              <p className="text-xs text-purple-600">
                {dashboardMetrics.successRate}% success rate
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Wallet Balance */}
        <Card className="border-0 shadow-lg bg-gradient-to-br from-amber-50/80 to-amber-100/50 hover:shadow-xl transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                <Wallet className="h-6 w-6 text-amber-600" />
              </div>
              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                <CheckCircle className="h-3 w-3 mr-1" />
                Verified
              </Badge>
            </div>
            <div className="space-y-1">
              <p className="text-amber-600 text-sm font-medium">
                Wallet Balance
              </p>
              <p className="text-2xl font-bold text-amber-900">
                {formatHBARs(dashboardMetrics.walletBalance)} HBAR
              </p>
              <p className="text-xs text-amber-600">
                KYC {dashboardMetrics.kycStatus}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Quick Actions */}
        <div className="lg:col-span-1">
          <Card className="border-0 shadow-lg bg-gradient-to-br from-gray-50/80 to-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                onClick={onCreateProject}
                className="w-full bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white h-12 justify-start"
              >
                <Plus className="h-4 w-4 mr-3" />
                Create New Project
              </Button>
              <Button
                onClick={onViewProjects}
                variant="outline"
                className="w-full h-12 justify-start hover:bg-primary/5 hover:border-primary/30"
              >
                <Eye className="h-4 w-4 mr-3" />
                View All Projects
              </Button>
              <Button
                variant="outline"
                className="w-full h-12 justify-start hover:bg-accent/5 hover:border-accent/30"
              >
                <BarChart3 className="h-4 w-4 mr-3" />
                Analytics Dashboard
              </Button>
              <Button
                variant="outline"
                className="w-full h-12 justify-start hover:bg-emerald-500/5 hover:border-emerald-500/30"
              >
                <MessageSquare className="h-4 w-4 mr-3" />
                Investor Messages
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivities.map((activity, index) => {
                  const IconComponent = activity.icon;
                  return (
                    <div
                      key={index}
                      className="flex items-start gap-4 p-4 bg-gradient-to-r from-gray-50/50 to-white rounded-xl border border-gray-100/50"
                    >
                      <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                        <IconComponent
                          className={`h-5 w-5 ${activity.color}`}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-900 font-medium text-sm">
                          {activity.message}
                        </p>
                        <p className="text-gray-500 text-xs mt-1">
                          {activity.time}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Performance Insights & Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Performance Insights */}
        <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50/80 to-indigo-50/80">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              Performance Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-white/60 rounded-xl">
                <p className="text-2xl font-bold text-blue-600">67%</p>
                <p className="text-sm text-gray-600">Success Rate</p>
              </div>
              <div className="text-center p-4 bg-white/60 rounded-xl">
                <p className="text-2xl font-bold text-emerald-600">1.5M</p>
                <p className="text-sm text-gray-600">Avg. Raise</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Monthly Growth</span>
                <span className="font-bold text-emerald-600">
                  +{dashboardMetrics.monthlyGrowth}%
                </span>
              </div>
              <Progress
                value={dashboardMetrics.monthlyGrowth}
                className="h-2"
              />
            </div>

            <div className="grid grid-cols-3 gap-3 text-center text-xs">
              <div>
                <p className="font-semibold text-gray-900">Active</p>
                <p className="text-emerald-600">
                  {dashboardMetrics.activeProjects}
                </p>
              </div>
              <div>
                <p className="font-semibold text-gray-900">Draft</p>
                <p className="text-amber-600">1</p>
              </div>
              <div>
                <p className="font-semibold text-gray-900">Total</p>
                <p className="text-gray-600">
                  {dashboardMetrics.totalProjects}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notifications & Alerts */}
        <Card className="border-0 shadow-lg bg-gradient-to-br from-amber-50/80 to-orange-50/80">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-amber-600" />
              Notifications & Alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3 p-3 bg-white/60 rounded-xl border border-amber-100">
              <div className="w-2 h-2 bg-emerald-500 rounded-full mt-2 flex-shrink-0" />
              <div>
                <p className="font-medium text-sm text-gray-900">
                  KYC Verification Complete
                </p>
                <p className="text-xs text-gray-600">
                  Your account is now fully verified
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-white/60 rounded-xl border border-blue-100">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
              <div>
                <p className="font-medium text-sm text-gray-900">
                  Funding Milestone Reached
                </p>
                <p className="text-xs text-gray-600">
                  AI Trading Bot reached 60% funding
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-white/60 rounded-xl border border-purple-100">
              <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0" />
              <div>
                <p className="font-medium text-sm text-gray-900">
                  New Investor Messages
                </p>
                <p className="text-xs text-gray-600">
                  3 unread messages from investors
                </p>
              </div>
            </div>

            <Button variant="outline" className="w-full mt-4 hover:bg-amber-50">
              View All Notifications
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Tasks & Calendar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Upcoming Tasks */}
        <div className="lg:col-span-2">
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Upcoming Tasks & Deadlines
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-red-50/50 to-white rounded-xl border border-red-100">
                <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                  <Clock className="h-5 w-5 text-red-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">
                    Submit Q4 Financial Report
                  </p>
                  <p className="text-sm text-red-600">Due in 3 days</p>
                </div>
                <Badge className="bg-red-100 text-red-700 border-red-200">
                  High
                </Badge>
              </div>

              <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-amber-50/50 to-white rounded-xl border border-amber-100">
                <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                  <FileCheck className="h-5 w-5 text-amber-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">
                    Update Project Documentation
                  </p>
                  <p className="text-sm text-amber-600">Due next week</p>
                </div>
                <Badge className="bg-amber-100 text-amber-700 border-amber-200">
                  Medium
                </Badge>
              </div>

              <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-blue-50/50 to-white rounded-xl border border-blue-100">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <MessageSquare className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">
                    Schedule Investor Calls
                  </p>
                  <p className="text-sm text-blue-600">This month</p>
                </div>
                <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                  Low
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Stats Summary */}
      </div>

      {/* Project Overview */}
    </div>
  );
}
