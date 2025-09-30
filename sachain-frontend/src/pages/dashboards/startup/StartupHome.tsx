import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
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
  Building2,
  Wallet,
  Calendar,
  Activity,
  FileText,
  Settings,
  MessageSquare,
  Bell,
} from 'lucide-react';

interface ProjectMetrics {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  totalRaised: number;
  totalInvestors: number;
  averageRaise: number;
  successRate: number;
  walletBalance: number;
  monthlyGrowth: number;
}

interface RecentActivity {
  id: string;
  type: 'investment' | 'project_update' | 'message' | 'milestone';
  title: string;
  description: string;
  timestamp: string;
  status: 'success' | 'pending' | 'info';
}

interface UpcomingTask {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  priority: 'high' | 'medium' | 'low';
  type: 'report' | 'documentation' | 'meeting' | 'review';
}

interface StartupDashboardHomeProps {
  onCreateProject?: () => void;
  onViewProjects?: () => void;
  metrics?: ProjectMetrics;
  recentActivities?: RecentActivity[];
  upcomingTasks?: UpcomingTask[];
  loading?: boolean;
}

export default function StartupDashboardHome({
  onCreateProject,
  onViewProjects,
  metrics,
  recentActivities = [],
  upcomingTasks = [],
  loading = false,
}: StartupDashboardHomeProps) {
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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'medium':
        return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'low':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
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

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
        <div className="animate-pulse space-y-4 sm:space-y-6">
          <div className="h-6 sm:h-8 bg-muted rounded w-1/2 sm:w-1/3"></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-28 sm:h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8 space-y-6 sm:space-y-8">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground mb-1">
            Dashboard Overview
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Monitor your project portfolio and track key metrics
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
          <Button variant="outline" className="h-9 w-full sm:w-auto">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
          <Button onClick={onCreateProject} className="h-9 w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            New Project
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      {metrics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card className="border border-border">
            <CardHeader className="pb-2 p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="p-1.5 sm:p-2 bg-muted rounded-lg">
                  <DollarSign className="h-4 w-4" />
                </div>
                <Badge variant="secondary" className="text-xs">
                  +{metrics.monthlyGrowth?.toFixed(1)}%
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0 p-4 sm:p-6">
              <div className="space-y-1">
                <p className="text-lg sm:text-2xl font-semibold">
                  {formatCurrency(metrics.totalRaised)}
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Total Raised
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border">
            <CardHeader className="pb-2 p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="p-1.5 sm:p-2 bg-muted rounded-lg">
                  <Building2 className="h-4 w-4" />
                </div>
                <Badge variant="secondary" className="text-xs">
                  {metrics.activeProjects}/{metrics.totalProjects}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0 p-4 sm:p-6">
              <div className="space-y-1">
                <p className="text-lg sm:text-2xl font-semibold">
                  {metrics.totalProjects}
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Total Projects
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border">
            <CardHeader className="pb-2 p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="p-1.5 sm:p-2 bg-muted rounded-lg">
                  <Users className="h-4 w-4" />
                </div>
                <Badge variant="secondary" className="text-xs">
                  Active
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0 p-4 sm:p-6">
              <div className="space-y-1">
                <p className="text-lg sm:text-2xl font-semibold">
                  {formatNumber(metrics.totalInvestors)}
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Investors
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border">
            <CardHeader className="pb-2 p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="p-1.5 sm:p-2 bg-muted rounded-lg">
                  <Target className="h-4 w-4" />
                </div>
                <Badge variant="secondary" className="text-xs">
                  {metrics.successRate}%
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0 p-4 sm:p-6">
              <div className="space-y-1">
                <p className="text-lg sm:text-2xl font-semibold">
                  {formatCurrency(metrics.averageRaise)}
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Avg. Raise
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Quick Actions */}
        <Card className="border border-border">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-sm sm:text-base">
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-4 sm:p-6 pt-0">
            <Button
              onClick={onCreateProject}
              className="w-full justify-start h-9 sm:h-10"
            >
              <Plus className="h-4 w-4 mr-3" />
              Create New Project
            </Button>
            <Button
              onClick={onViewProjects}
              variant="outline"
              className="w-full justify-start h-9 sm:h-10"
            >
              <Eye className="h-4 w-4 mr-3" />
              View All Projects
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start h-9 sm:h-10"
            >
              <BarChart3 className="h-4 w-4 mr-3" />
              Analytics
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start h-9 sm:h-10"
            >
              <MessageSquare className="h-4 w-4 mr-3" />
              Messages
            </Button>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <Card className="border border-border">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              {recentActivities.length > 0 ? (
                <div className="space-y-3">
                  {recentActivities.slice(0, 5).map((activity) => {
                    const IconComponent = getActivityIcon(activity.type);
                    return (
                      <div
                        key={activity.id}
                        className="flex items-start gap-3 p-3 border border-border rounded-lg"
                      >
                        <div className="p-1.5 sm:p-2 bg-muted rounded-lg flex-shrink-0">
                          <IconComponent className="h-3 w-3 sm:h-4 sm:w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs sm:text-sm font-medium">
                            {activity.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {activity.description}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {activity.timestamp}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-6">
                  <Activity className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No recent activity
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Performance Summary */}
        {metrics && (
          <Card className="border border-border">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Performance Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-4 sm:p-6 pt-0">
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div className="text-center p-2 sm:p-3 bg-muted/50 rounded-lg">
                  <p className="text-base sm:text-lg font-semibold">
                    {metrics.activeProjects}
                  </p>
                  <p className="text-xs text-muted-foreground">Active</p>
                </div>
                <div className="text-center p-2 sm:p-3 bg-muted/50 rounded-lg">
                  <p className="text-base sm:text-lg font-semibold">
                    {metrics.successRate}%
                  </p>
                  <p className="text-xs text-muted-foreground">Success Rate</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs sm:text-sm">
                  <span>Portfolio Growth</span>
                  <span className="font-medium">
                    {metrics.monthlyGrowth > 0 ? '+' : ''}
                    {metrics.monthlyGrowth?.toFixed(1)}%
                  </span>
                </div>
                <Progress
                  value={Math.abs(metrics.monthlyGrowth)}
                  className="h-2"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Upcoming Tasks */}
        <Card className="border border-border">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-sm sm:text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Upcoming Tasks
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            {upcomingTasks.length > 0 ? (
              <div className="space-y-3">
                {upcomingTasks.slice(0, 4).map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 p-2 sm:p-3 border border-border rounded-lg"
                  >
                    <div className="p-1 sm:p-1.5 bg-muted rounded-md flex-shrink-0">
                      <Clock className="h-3 w-3" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-medium truncate">
                        {task.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {task.dueDate}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-xs flex-shrink-0 ${getPriorityColor(task.priority)}`}
                    >
                      {task.priority}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <Calendar className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  No upcoming tasks
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
