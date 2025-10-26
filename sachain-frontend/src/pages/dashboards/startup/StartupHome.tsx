// import { useState } from 'react';
// import { Button } from '@/components/ui/button';
// import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// import { Badge } from '@/components/ui/badge';
// import { Progress } from '@/components/ui/progress';
// import { Separator } from '@/components/ui/separator';
// import {
//   TrendingUp,
//   DollarSign,
//   Users,
//   Eye,
//   Plus,
//   BarChart3,
//   Target,
//   Clock,
//   CheckCircle,
//   AlertCircle,
//   Building2,
//   Wallet,
//   Calendar,
//   Activity,
//   FileText,
//   Settings,
//   MessageSquare,
//   Bell,
// } from 'lucide-react';

// interface ProjectMetrics {
//   totalProjects: number;
//   activeProjects: number;
//   completedProjects: number;
//   totalRaised: number;
//   totalInvestors: number;
//   averageRaise: number;
//   successRate: number;
//   walletBalance: number;
//   monthlyGrowth: number;
// }

// interface RecentActivity {
//   id: string;
//   type: 'investment' | 'project_update' | 'message' | 'milestone';
//   title: string;
//   description: string;
//   timestamp: string;
//   status: 'success' | 'pending' | 'info';
// }

// interface UpcomingTask {
//   id: string;
//   title: string;
//   description: string;
//   dueDate: string;
//   priority: 'high' | 'medium' | 'low';
//   type: 'report' | 'documentation' | 'meeting' | 'review';
// }

// interface StartupDashboardHomeProps {
//   onCreateProject?: () => void;
//   onViewProjects?: () => void;
//   metrics?: ProjectMetrics;
//   recentActivities?: RecentActivity[];
//   upcomingTasks?: UpcomingTask[];
//   loading?: boolean;
// }

// export default function StartupDashboardHome({
//   onCreateProject,
//   onViewProjects,
//   metrics,
//   recentActivities = [],
//   upcomingTasks = [],
//   loading = false,
// }: StartupDashboardHomeProps) {
//   const formatCurrency = (amount: number) => {
//     return new Intl.NumberFormat('en-US', {
//       style: 'currency',
//       currency: 'USD',
//       minimumFractionDigits: 0,
//       maximumFractionDigits: 0,
//     }).format(amount);
//   };

//   const formatNumber = (num: number) => {
//     if (num >= 1000000) {
//       return (num / 1000000).toFixed(1) + 'M';
//     }
//     if (num >= 1000) {
//       return (num / 1000).toFixed(1) + 'K';
//     }
//     return num.toLocaleString();
//   };

//   const getPriorityColor = (priority: string) => {
//     switch (priority) {
//       case 'high':
//         return 'text-red-600 bg-red-50 border-red-200';
//       case 'medium':
//         return 'text-amber-600 bg-amber-50 border-amber-200';
//       case 'low':
//         return 'text-blue-600 bg-blue-50 border-blue-200';
//       default:
//         return 'text-gray-600 bg-gray-50 border-gray-200';
//     }
//   };

//   const getActivityIcon = (type: string) => {
//     switch (type) {
//       case 'investment':
//         return DollarSign;
//       case 'project_update':
//         return Building2;
//       case 'message':
//         return MessageSquare;
//       case 'milestone':
//         return Target;
//       default:
//         return Activity;
//     }
//   };

//   if (loading) {
//     return (
//       <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
//         <div className="animate-pulse space-y-4 sm:space-y-6">
//           <div className="h-6 sm:h-8 bg-muted rounded w-1/2 sm:w-1/3"></div>
//           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
//             {[...Array(4)].map((_, i) => (
//               <div key={i} className="h-28 sm:h-32 bg-muted rounded"></div>
//             ))}
//           </div>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8 space-y-6 sm:space-y-8">
//       {/* Header Section */}
//       <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
//         <div>
//           <h1 className="text-xl sm:text-2xl font-semibold text-foreground mb-1">
//             Dashboard Overview
//           </h1>
//           <p className="text-sm sm:text-base text-muted-foreground">
//             Monitor your project portfolio and track key metrics
//           </p>
//         </div>

//         <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
//           <Button variant="outline" className="h-9 w-full sm:w-auto">
//             <Settings className="h-4 w-4 mr-2" />
//             Settings
//           </Button>
//           <Button onClick={onCreateProject} className="h-9 w-full sm:w-auto">
//             <Plus className="h-4 w-4 mr-2" />
//             New Project
//           </Button>
//         </div>
//       </div>

//       {/* Key Metrics */}
//       {metrics && (
//         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
//           <Card className="border border-border">
//             <CardHeader className="pb-2 p-4 sm:p-6">
//               <div className="flex items-center justify-between">
//                 <div className="p-1.5 sm:p-2 bg-muted rounded-lg">
//                   <DollarSign className="h-4 w-4" />
//                 </div>
//                 <Badge variant="secondary" className="text-xs">
//                   +{metrics.monthlyGrowth?.toFixed(1)}%
//                 </Badge>
//               </div>
//             </CardHeader>
//             <CardContent className="pt-0 p-4 sm:p-6">
//               <div className="space-y-1">
//                 <p className="text-lg sm:text-2xl font-semibold">
//                   {formatCurrency(metrics.totalRaised)}
//                 </p>
//                 <p className="text-xs sm:text-sm text-muted-foreground">
//                   Total Raised
//                 </p>
//               </div>
//             </CardContent>
//           </Card>

//           <Card className="border border-border">
//             <CardHeader className="pb-2 p-4 sm:p-6">
//               <div className="flex items-center justify-between">
//                 <div className="p-1.5 sm:p-2 bg-muted rounded-lg">
//                   <Building2 className="h-4 w-4" />
//                 </div>
//                 <Badge variant="secondary" className="text-xs">
//                   {metrics.activeProjects}/{metrics.totalProjects}
//                 </Badge>
//               </div>
//             </CardHeader>
//             <CardContent className="pt-0 p-4 sm:p-6">
//               <div className="space-y-1">
//                 <p className="text-lg sm:text-2xl font-semibold">
//                   {metrics.totalProjects}
//                 </p>
//                 <p className="text-xs sm:text-sm text-muted-foreground">
//                   Total Projects
//                 </p>
//               </div>
//             </CardContent>
//           </Card>

//           <Card className="border border-border">
//             <CardHeader className="pb-2 p-4 sm:p-6">
//               <div className="flex items-center justify-between">
//                 <div className="p-1.5 sm:p-2 bg-muted rounded-lg">
//                   <Users className="h-4 w-4" />
//                 </div>
//                 <Badge variant="secondary" className="text-xs">
//                   Active
//                 </Badge>
//               </div>
//             </CardHeader>
//             <CardContent className="pt-0 p-4 sm:p-6">
//               <div className="space-y-1">
//                 <p className="text-lg sm:text-2xl font-semibold">
//                   {formatNumber(metrics.totalInvestors)}
//                 </p>
//                 <p className="text-xs sm:text-sm text-muted-foreground">
//                   Investors
//                 </p>
//               </div>
//             </CardContent>
//           </Card>

//           <Card className="border border-border">
//             <CardHeader className="pb-2 p-4 sm:p-6">
//               <div className="flex items-center justify-between">
//                 <div className="p-1.5 sm:p-2 bg-muted rounded-lg">
//                   <Target className="h-4 w-4" />
//                 </div>
//                 <Badge variant="secondary" className="text-xs">
//                   {metrics.successRate}%
//                 </Badge>
//               </div>
//             </CardHeader>
//             <CardContent className="pt-0 p-4 sm:p-6">
//               <div className="space-y-1">
//                 <p className="text-lg sm:text-2xl font-semibold">
//                   {formatCurrency(metrics.averageRaise)}
//                 </p>
//                 <p className="text-xs sm:text-sm text-muted-foreground">
//                   Avg. Raise
//                 </p>
//               </div>
//             </CardContent>
//           </Card>
//         </div>
//       )}

//       {/* Main Content Grid */}
//       <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
//         {/* Quick Actions */}
//         <Card className="border border-border">
//           <CardHeader className="p-4 sm:p-6">
//             <CardTitle className="text-sm sm:text-base">
//               Quick Actions
//             </CardTitle>
//           </CardHeader>
//           <CardContent className="space-y-3 p-4 sm:p-6 pt-0">
//             <Button
//               onClick={onCreateProject}
//               className="w-full justify-start h-9 sm:h-10"
//             >
//               <Plus className="h-4 w-4 mr-3" />
//               Create New Project
//             </Button>
//             <Button
//               onClick={onViewProjects}
//               variant="outline"
//               className="w-full justify-start h-9 sm:h-10"
//             >
//               <Eye className="h-4 w-4 mr-3" />
//               View All Projects
//             </Button>
//             <Button
//               variant="outline"
//               className="w-full justify-start h-9 sm:h-10"
//             >
//               <BarChart3 className="h-4 w-4 mr-3" />
//               Analytics
//             </Button>
//             <Button
//               variant="outline"
//               className="w-full justify-start h-9 sm:h-10"
//             >
//               <MessageSquare className="h-4 w-4 mr-3" />
//               Messages
//             </Button>
//           </CardContent>
//         </Card>

//         {/* Recent Activity */}
//         <div className="lg:col-span-2">
//           <Card className="border border-border">
//             <CardHeader className="p-4 sm:p-6">
//               <CardTitle className="text-sm sm:text-base flex items-center gap-2">
//                 <Activity className="h-4 w-4" />
//                 Recent Activity
//               </CardTitle>
//             </CardHeader>
//             <CardContent className="p-4 sm:p-6 pt-0">
//               {recentActivities.length > 0 ? (
//                 <div className="space-y-3">
//                   {recentActivities.slice(0, 5).map((activity) => {
//                     const IconComponent = getActivityIcon(activity.type);
//                     return (
//                       <div
//                         key={activity.id}
//                         className="flex items-start gap-3 p-3 border border-border rounded-lg"
//                       >
//                         <div className="p-1.5 sm:p-2 bg-muted rounded-lg flex-shrink-0">
//                           <IconComponent className="h-3 w-3 sm:h-4 sm:w-4" />
//                         </div>
//                         <div className="flex-1 min-w-0">
//                           <p className="text-xs sm:text-sm font-medium">
//                             {activity.title}
//                           </p>
//                           <p className="text-xs text-muted-foreground">
//                             {activity.description}
//                           </p>
//                           <p className="text-xs text-muted-foreground mt-1">
//                             {activity.timestamp}
//                           </p>
//                         </div>
//                       </div>
//                     );
//                   })}
//                 </div>
//               ) : (
//                 <div className="text-center py-6">
//                   <Activity className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground mx-auto mb-2" />
//                   <p className="text-sm text-muted-foreground">
//                     No recent activity
//                   </p>
//                 </div>
//               )}
//             </CardContent>
//           </Card>
//         </div>
//       </div>

//       {/* Bottom Section */}
//       <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
//         {/* Performance Summary */}
//         {metrics && (
//           <Card className="border border-border">
//             <CardHeader className="p-4 sm:p-6">
//               <CardTitle className="text-sm sm:text-base flex items-center gap-2">
//                 <TrendingUp className="h-4 w-4" />
//                 Performance Summary
//               </CardTitle>
//             </CardHeader>
//             <CardContent className="space-y-4 p-4 sm:p-6 pt-0">
//               <div className="grid grid-cols-2 gap-3 sm:gap-4">
//                 <div className="text-center p-2 sm:p-3 bg-muted/50 rounded-lg">
//                   <p className="text-base sm:text-lg font-semibold">
//                     {metrics.activeProjects}
//                   </p>
//                   <p className="text-xs text-muted-foreground">Active</p>
//                 </div>
//                 <div className="text-center p-2 sm:p-3 bg-muted/50 rounded-lg">
//                   <p className="text-base sm:text-lg font-semibold">
//                     {metrics.successRate}%
//                   </p>
//                   <p className="text-xs text-muted-foreground">Success Rate</p>
//                 </div>
//               </div>

//               <div className="space-y-2">
//                 <div className="flex justify-between text-xs sm:text-sm">
//                   <span>Portfolio Growth</span>
//                   <span className="font-medium">
//                     {metrics.monthlyGrowth > 0 ? '+' : ''}
//                     {metrics.monthlyGrowth?.toFixed(1)}%
//                   </span>
//                 </div>
//                 <Progress
//                   value={Math.abs(metrics.monthlyGrowth)}
//                   className="h-2"
//                 />
//               </div>
//             </CardContent>
//           </Card>
//         )}

//         {/* Upcoming Tasks */}
//         <Card className="border border-border">
//           <CardHeader className="p-4 sm:p-6">
//             <CardTitle className="text-sm sm:text-base flex items-center gap-2">
//               <Calendar className="h-4 w-4" />
//               Upcoming Tasks
//             </CardTitle>
//           </CardHeader>
//           <CardContent className="p-4 sm:p-6 pt-0">
//             {upcomingTasks.length > 0 ? (
//               <div className="space-y-3">
//                 {upcomingTasks.slice(0, 4).map((task) => (
//                   <div
//                     key={task.id}
//                     className="flex items-center gap-3 p-2 sm:p-3 border border-border rounded-lg"
//                   >
//                     <div className="p-1 sm:p-1.5 bg-muted rounded-md flex-shrink-0">
//                       <Clock className="h-3 w-3" />
//                     </div>
//                     <div className="flex-1 min-w-0">
//                       <p className="text-xs sm:text-sm font-medium truncate">
//                         {task.title}
//                       </p>
//                       <p className="text-xs text-muted-foreground">
//                         {task.dueDate}
//                       </p>
//                     </div>
//                     <Badge
//                       variant="outline"
//                       className={`text-xs flex-shrink-0 ${getPriorityColor(task.priority)}`}
//                     >
//                       {task.priority}
//                     </Badge>
//                   </div>
//                 ))}
//               </div>
//             ) : (
//               <div className="text-center py-6">
//                 <Calendar className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground mx-auto mb-2" />
//                 <p className="text-sm text-muted-foreground">
//                   No upcoming tasks
//                 </p>
//               </div>
//             )}
//           </CardContent>
//         </Card>
//       </div>
//     </div>
//   );
// }





// import { Button } from '@/components/ui/button';
// import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// import { Badge } from '@/components/ui/badge';
// import { Progress } from '@/components/ui/progress';
// import { 
//   TrendingUp, 
//   DollarSign, 
//   Users, 
//   BarChart3, 
//   Target, 
//   Clock, 
//   CheckCircle, 
//   AlertCircle,
//   ArrowUpRight,
//   Sparkles,
//   Bell,
//   MessageSquare,
//   FileCheck,
//   Wallet,
//   Calendar,
//   Activity,
//   Building2
// } from 'lucide-react';

// interface ProjectMetrics {
//   totalProjects: number;
//   activeProjects: number;
//   completedProjects: number;
//   totalRaised: number;
//   totalInvestors: number;
//   averageRaise: number;
//   successRate: number;
//   walletBalance: number;
//   monthlyGrowth: number;
// }

// interface RecentActivity {
//   id: string;
//   type: 'investment' | 'project_update' | 'message' | 'milestone';
//   title: string;
//   description: string;
//   timestamp: string;
//   status: 'success' | 'pending' | 'info';
// }

// interface UpcomingTask {
//   id: string;
//   title: string;
//   description: string;
//   dueDate: string;
//   priority: 'high' | 'medium' | 'low';
//   type: 'report' | 'documentation' | 'meeting' | 'review';
// }

// interface StartupDashboardHomeProps {
//   onCreateProject?: () => void;
//   onViewProjects?: () => void;
//   metrics?: ProjectMetrics;
//   recentActivities?: RecentActivity[];
//   upcomingTasks?: UpcomingTask[];
//   loading?: boolean;
// }

// export default function StartupDashboardHomeNew({
//   onCreateProject,
//   onViewProjects,
//   metrics,
//   recentActivities = [],
//   upcomingTasks = [],
//   loading = false,
// }: StartupDashboardHomeProps) {
//   const formatCurrency = (amount: number) => {
//     return new Intl.NumberFormat('en-US', {
//       style: 'currency',
//       currency: 'USD',
//       minimumFractionDigits: 0,
//       maximumFractionDigits: 0,
//     }).format(amount);
//   };

//   const formatNumber = (num: number) => {
//     if (num >= 1000000) {
//       return (num / 1000000).toFixed(1) + 'M';
//     }
//     if (num >= 1000) {
//       return (num / 1000).toFixed(1) + 'K';
//     }
//     return num.toLocaleString();
//   };

//   const getPriorityColor = (priority: string) => {
//     switch (priority) {
//       case 'high':
//         return 'bg-red-500 text-white shadow-sm';
//       case 'medium':
//         return 'bg-amber-500 text-white shadow-sm';
//       case 'low':
//         return 'bg-blue-500 text-white shadow-sm';
//       default:
//         return 'bg-gray-500 text-white shadow-sm';
//     }
//   };

//   const getActivityIcon = (type: string) => {
//     switch (type) {
//       case 'investment':
//         return DollarSign;
//       case 'project_update':
//         return Building2;
//       case 'message':
//         return MessageSquare;
//       case 'milestone':
//         return Target;
//       default:
//         return Activity;
//     }
//   };

//   if (loading) {
//     return (
//       <div className="space-y-8">
//         <div className="animate-pulse space-y-6">
//           <div className="h-48 bg-muted rounded-3xl"></div>
//           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
//             {[...Array(4)].map((_, i) => (
//               <div key={i} className="h-40 bg-muted rounded-2xl"></div>
//             ))}
//           </div>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="space-y-8">
//       {/* Welcome Header */}
//       <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary/90 to-accent p-10 text-white shadow-2xl">
//         <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNnoiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLW9wYWNpdHk9Ii4wNSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9nPjwvc3ZnPg==')] opacity-20" />
//         <div className="relative">
//           <div className="flex items-center justify-between">
//             <div className="space-y-3">
//               <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-1.5 border border-white/30">
//                 <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
//                 <span className="text-white/95">Dashboard Active</span>
//               </div>
//               <h1 className="text-4xl font-bold">Welcome back! 👋</h1>
//               <p className="text-white/90 text-lg max-w-2xl">Track your projects, manage investments, and grow your startup ecosystem with real-time insights.</p>
//             </div>
//             {metrics && (
//               <div className="hidden lg:flex items-center gap-6">
//                 <div className="text-right space-y-1">
//                   <p className="text-white/70">Growth This Month</p>
//                   <div className="flex items-center gap-2">
//                     <TrendingUp className="h-5 w-5 text-emerald-300" />
//                     <p className="text-3xl font-bold">+{metrics.monthlyGrowth.toFixed(1)}%</p>
//                   </div>
//                 </div>
//                 <div className="w-16 h-16 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/20">
//                   <BarChart3 className="h-8 w-8" />
//                 </div>
//               </div>
//             )}
//           </div>
//         </div>
        
//         {/* Floating decorative elements */}
//         <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/5 rounded-full blur-3xl" />
//         <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-accent/20 rounded-full blur-2xl" />
//         <div className="absolute top-1/2 right-1/4 w-2 h-2 bg-white/40 rounded-full" />
//         <div className="absolute top-1/3 right-1/3 w-1 h-1 bg-white/30 rounded-full" />
//       </div>

//       {/* Key Metrics Grid */}
//       {metrics && (
//         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
//           {/* Total Raised */}
//           <Card className="border-0 shadow-xl bg-gradient-to-br from-emerald-500 to-emerald-600 hover:shadow-2xl hover:scale-105 transition-all duration-300 group relative overflow-hidden">
//             <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
//             <CardContent className="p-6 relative">
//               <div className="flex items-center justify-between mb-4">
//                 <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/30 shadow-lg">
//                   <DollarSign className="h-7 w-7 text-white" />
//                 </div>
//                 <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm">
//                   <ArrowUpRight className="h-3 w-3 mr-1" />
//                   +{metrics.monthlyGrowth.toFixed(1)}%
//                 </Badge>
//               </div>
//               <div className="space-y-1.5">
//                 <p className="text-emerald-100">Total Raised</p>
//                 <p className="text-3xl font-bold text-white">{formatCurrency(metrics.totalRaised)}</p>
//                 <p className="text-emerald-100">From {metrics.totalProjects} projects</p>
//               </div>
//             </CardContent>
//           </Card>

//           {/* Total Investors */}
//           <Card className="border-0 shadow-xl bg-gradient-to-br from-blue-500 to-blue-600 hover:shadow-2xl hover:scale-105 transition-all duration-300 group relative overflow-hidden">
//             <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
//             <CardContent className="p-6 relative">
//               <div className="flex items-center justify-between mb-4">
//                 <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/30 shadow-lg">
//                   <Users className="h-7 w-7 text-white" />
//                 </div>
//                 <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm">
//                   Active
//                 </Badge>
//               </div>
//               <div className="space-y-1.5">
//                 <p className="text-blue-100">Total Investors</p>
//                 <p className="text-3xl font-bold text-white">{formatNumber(metrics.totalInvestors)}</p>
//                 <p className="text-blue-100">Across all projects</p>
//               </div>
//             </CardContent>
//           </Card>

//           {/* Active Projects */}
//           <Card className="border-0 shadow-xl bg-gradient-to-br from-accent to-purple-500 hover:shadow-2xl hover:scale-105 transition-all duration-300 group relative overflow-hidden">
//             <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
//             <CardContent className="p-6 relative">
//               <div className="flex items-center justify-between mb-4">
//                 <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/30 shadow-lg">
//                   <Building2 className="h-7 w-7 text-white" />
//                 </div>
//                 <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm">
//                   {metrics.activeProjects}/{metrics.totalProjects}
//                 </Badge>
//               </div>
//               <div className="space-y-1.5">
//                 <p className="text-purple-100">Total Projects</p>
//                 <p className="text-3xl font-bold text-white">{metrics.totalProjects}</p>
//                 <p className="text-purple-100">{metrics.activeProjects} active</p>
//               </div>
//             </CardContent>
//           </Card>

//           {/* Average Raise */}
//           <Card className="border-0 shadow-xl bg-gradient-to-br from-primary to-primary/80 hover:shadow-2xl hover:scale-105 transition-all duration-300 group relative overflow-hidden">
//             <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
//             <CardContent className="p-6 relative">
//               <div className="flex items-center justify-between mb-4">
//                 <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/30 shadow-lg">
//                   <Target className="h-7 w-7 text-white" />
//                 </div>
//                 <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm">
//                   {metrics.successRate}%
//                 </Badge>
//               </div>
//               <div className="space-y-1.5">
//                 <p className="text-blue-100">Avg. Raise</p>
//                 <p className="text-3xl font-bold text-white">{formatCurrency(metrics.averageRaise)}</p>
//                 <p className="text-blue-100">Success rate</p>
//               </div>
//             </CardContent>
//           </Card>
//         </div>
//       )}

//       {/* Recent Activity */}
//       <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm hover:shadow-2xl transition-shadow">
//         <CardHeader className="border-b border-gray-100/50 pb-4">
//           <CardTitle className="flex items-center gap-3">
//             <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center">
//               <Activity className="h-5 w-5 text-white" />
//             </div>
//             Recent Activity
//           </CardTitle>
//         </CardHeader>
//         <CardContent className="pt-6">
//           {recentActivities.length > 0 ? (
//             <div className="space-y-3">
//               {recentActivities.slice(0, 5).map((activity) => {
//                 const IconComponent = getActivityIcon(activity.type);
//                 return (
//                   <div key={activity.id} className="flex items-start gap-4 p-4 bg-gradient-to-r from-gray-50/80 via-white to-gray-50/50 rounded-xl border border-gray-100/50 hover:border-primary/20 hover:shadow-md transition-all group">
//                     <div className="w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
//                       <IconComponent className="h-5 w-5 text-primary" />
//                     </div>
//                     <div className="flex-1 min-w-0">
//                       <p className="text-gray-900 font-medium">{activity.title}</p>
//                       <p className="text-gray-600 mt-0.5">{activity.description}</p>
//                       <div className="flex items-center gap-2 mt-1">
//                         <Clock className="h-3 w-3 text-gray-400" />
//                         <p className="text-gray-500">{activity.timestamp}</p>
//                       </div>
//                     </div>
//                   </div>
//                 );
//               })}
//             </div>
//           ) : (
//             <div className="text-center py-12">
//               <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-40" />
//               <p className="text-muted-foreground">No recent activity</p>
//             </div>
//           )}
//         </CardContent>
//       </Card>

//       {/* Performance Insights & Upcoming Tasks */}
//       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
//         {/* Performance Insights */}
//         {metrics && (
//           <Card className="border-0 shadow-xl bg-gradient-to-br from-primary via-primary to-primary/90 text-white hover:shadow-2xl transition-shadow relative overflow-hidden">
//             <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNnoiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLW9wYWNpdHk9Ii4wNSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9nPjwvc3ZnPg==')] opacity-20" />
//             <CardHeader className="relative">
//               <CardTitle className="flex items-center gap-3">
//                 <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/30">
//                   <TrendingUp className="h-5 w-5 text-white" />
//                 </div>
//                 Performance Summary
//               </CardTitle>
//             </CardHeader>
//             <CardContent className="space-y-6 relative">
//               <div className="grid grid-cols-2 gap-4">
//                 <div className="text-center p-5 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 hover:bg-white/20 transition-colors">
//                   <p className="text-3xl font-bold text-white">{metrics.successRate}%</p>
//                   <p className="text-white/80 mt-1">Success Rate</p>
//                 </div>
//                 <div className="text-center p-5 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 hover:bg-white/20 transition-colors">
//                   <p className="text-3xl font-bold text-white">{formatNumber(metrics.averageRaise)}</p>
//                   <p className="text-white/80 mt-1">Avg. Raise</p>
//                 </div>
//               </div>
              
//               <div className="space-y-3 p-4 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20">
//                 <div className="flex justify-between items-center">
//                   <span className="text-white/90">Portfolio Growth</span>
//                   <span className="font-bold text-emerald-300">
//                     {metrics.monthlyGrowth > 0 ? '+' : ''}{metrics.monthlyGrowth.toFixed(1)}%
//                   </span>
//                 </div>
//                 <div className="h-3 bg-white/20 rounded-full overflow-hidden">
//                   <div 
//                     className="h-full bg-gradient-to-r from-emerald-400 to-emerald-300 rounded-full transition-all duration-1000"
//                     style={{ width: `${Math.abs(metrics.monthlyGrowth)}%` }}
//                   />
//                 </div>
//               </div>

//               <div className="grid grid-cols-3 gap-3">
//                 <div className="text-center p-3 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
//                   <p className="font-semibold text-white">Active</p>
//                   <p className="text-emerald-300 mt-1">{metrics.activeProjects}</p>
//                 </div>
//                 <div className="text-center p-3 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
//                   <p className="font-semibold text-white">Completed</p>
//                   <p className="text-blue-200 mt-1">{metrics.completedProjects}</p>
//                 </div>
//                 <div className="text-center p-3 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
//                   <p className="font-semibold text-white">Total</p>
//                   <p className="text-purple-200 mt-1">{metrics.totalProjects}</p>
//                 </div>
//               </div>
//             </CardContent>
//           </Card>
//         )}

//         {/* Upcoming Tasks */}
//         <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm hover:shadow-2xl transition-shadow">
//           <CardHeader className="border-b border-gray-100/50 pb-4">
//             <CardTitle className="flex items-center gap-3">
//               <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
//                 <Calendar className="h-5 w-5 text-white" />
//               </div>
//               Upcoming Tasks
//             </CardTitle>
//           </CardHeader>
//           <CardContent className="pt-6">
//             {upcomingTasks.length > 0 ? (
//               <div className="space-y-3">
//                 {upcomingTasks.slice(0, 4).map((task) => {
//                   const getTaskIcon = () => {
//                     switch (task.type) {
//                       case 'report': return FileCheck;
//                       case 'meeting': return MessageSquare;
//                       default: return Clock;
//                     }
//                   };
//                   const TaskIcon = getTaskIcon();
//                   const priorityColors = {
//                     high: 'from-red-50/80 to-white border-red-200/50 hover:border-red-300',
//                     medium: 'from-amber-50/80 to-white border-amber-200/50 hover:border-amber-300',
//                     low: 'from-blue-50/80 to-white border-blue-200/50 hover:border-blue-300'
//                   };
//                   const iconColors = {
//                     high: 'from-red-500 to-red-600',
//                     medium: 'from-amber-500 to-amber-600',
//                     low: 'from-blue-500 to-blue-600'
//                   };

//                   return (
//                     <div 
//                       key={task.id} 
//                       className={`flex items-center gap-4 p-4 bg-gradient-to-r ${priorityColors[task.priority]} rounded-xl border hover:shadow-md transition-all group`}
//                     >
//                       <div className={`w-12 h-12 bg-gradient-to-br ${iconColors[task.priority]} rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
//                         <TaskIcon className="h-6 w-6 text-white" />
//                       </div>
//                       <div className="flex-1 min-w-0">
//                         <p className="font-medium text-gray-900 truncate">{task.title}</p>
//                         <p className="text-gray-600 mt-0.5">{task.dueDate}</p>
//                       </div>
//                       <Badge className={getPriorityColor(task.priority)}>
//                         {task.priority}
//                       </Badge>
//                     </div>
//                   );
//                 })}
//               </div>
//             ) : (
//               <div className="text-center py-12">
//                 <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-40" />
//                 <p className="text-muted-foreground">No upcoming tasks</p>
//               </div>
//             )}
//           </CardContent>
//         </Card>
//       </div>
//     </div>
//   );
// }


// import { Button } from '@/components/ui/button';
// import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// import { Badge } from '@/components/ui/badge';
// import { Progress } from '@/components/ui/progress';
// import { 
//   TrendingUp, 
//   DollarSign, 
//   Users, 
//   BarChart3, 
//   Target, 
//   Clock, 
//   CheckCircle, 
//   AlertCircle,
//   ArrowUpRight,
//   Sparkles,
//   // Bell,
//   MessageSquare,
//   FileCheck,
//   Wallet,
//   Calendar,
//   Activity,
//   Building2,
//   ArrowDownLeft,
//   ArrowUpRight as ArrowUpRightIcon,
//   Coins,
//   CreditCard
// } from 'lucide-react';

// // Mock data built into the component for easy demo
// const mockMetrics = {
//   totalProjects: 3,
//   activeProjects: 2,
//   completedProjects: 0,
//   totalRaised: 4500000,
//   totalInvestors: 2139,
//   averageRaise: 1500000,
//   successRate: 67,
//   walletBalance: 125000,
//   monthlyGrowth: 23.5,
// };

// const mockActivities = [
//   {
//     id: '1',
//     type: 'investment' as const,
//     title: 'New Investment Received',
//     description: 'DeFi Yield Farming Protocol received $50,000 investment',
//     timestamp: '2 hours ago',
//     status: 'success' as const,
//   },
//   {
//     id: '2',
//     type: 'milestone' as const,
//     title: 'Funding Milestone Reached',
//     description: 'AI-Powered Trading Bot reached 60% funding goal',
//     timestamp: '5 hours ago',
//     status: 'success' as const,
//   },
//   {
//     id: '3',
//     type: 'project_update' as const,
//     title: 'Project Updated',
//     description: 'DeFi Yield Farming Protocol documentation updated',
//     timestamp: '1 day ago',
//     status: 'info' as const,
//   },
// ];

// // Wallet mock data with transactions and token holdings (Hedera-based)
// const mockWalletData = {
//   balance: 125750.50,
//   walletAddress: '0.0.1234567',
//   network: 'Hedera Mainnet',
//   recentTransactions: [
//     {
//       id: '1',
//       type: 'received' as const,
//       amount: 50000,
//       token: 'HBAR',
//       from: 'DeFi Protocol',
//       timestamp: '2 hours ago',
//       hash: '0.0.123456@1234567890.123456789',
//     },
//     {
//       id: '2',
//       type: 'sent' as const,
//       amount: 25000,
//       token: 'HBAR',
//       to: 'Smart Contract',
//       timestamp: '1 day ago',
//       hash: '0.0.234567@1234567891.234567890',
//     },
//     {
//       id: '3',
//       type: 'received' as const,
//       amount: 15000,
//       token: 'HBAR',
//       from: 'Investor Wallet',
//       timestamp: '2 days ago',
//       hash: '0.0.345678@1234567892.345678901',
//     },
//   ],
//   tokenHoldings: [
//     {
//       id: '1',
//       name: 'HBAR',
//       amount: 95000,
//       value: 95000,
//       change: '+3.2%',
//       positive: true,
//     },
//     {
//       id: '2',
//       name: 'USDC',
//       amount: 18500,
//       value: 18500,
//       change: '+1.5%',
//       positive: true,
//     },
//     {
//       id: '3',
//       name: 'HSCS',
//       amount: 12250,
//       value: 12250.50,
//       change: '+0.8%',
//       positive: true,
//     },
//   ],
// };

// interface StartupDashboardHomeWithDataProps {
//   onCreateProject?: () => void;
//   onViewProjects?: () => void;
// }

// export default function StartupDashboardHomeWithData({
//   onCreateProject,
//   onViewProjects,
// }: StartupDashboardHomeWithDataProps) {
//   // Use mock data by default
//   const metrics = mockMetrics;
//   const recentActivities = mockActivities;
//   const walletData = mockWalletData;

//   const formatCurrency = (amount: number) => {
//     return new Intl.NumberFormat('en-US', {
//       style: 'currency',
//       currency: 'USD',
//       minimumFractionDigits: 0,
//       maximumFractionDigits: 0,
//     }).format(amount);
//   };

//   const formatNumber = (num: number) => {
//     if (num >= 1000000) {
//       return (num / 1000000).toFixed(1) + 'M';
//     }
//     if (num >= 1000) {
//       return (num / 1000).toFixed(1) + 'K';
//     }
//     return num.toLocaleString();
//   };

//   const getTransactionIcon = (type: string) => {
//     return type === 'received' ? ArrowDownLeft : ArrowUpRightIcon;
//   };

//   const getActivityIcon = (type: string) => {
//     switch (type) {
//       case 'investment':
//         return DollarSign;
//       case 'project_update':
//         return Building2;
//       case 'message':
//         return MessageSquare;
//       case 'milestone':
//         return Target;
//       default:
//         return Activity;
//     }
//   };

//   return (
//     <div className="space-y-8">
//       {/* Welcome Header */}
     

//       {/* Key Metrics Grid */}
//       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
//         {/* Total Raised */}
//         <Card className="border-0 shadow-xl bg-gradient-to-br from-chart-1 to-primary hover:shadow-2xl hover:scale-105 transition-all duration-300 group relative overflow-hidden">
//           <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
//           <CardContent className="p-6 relative">
//             <div className="flex items-center justify-between mb-4">
//               <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/30 shadow-lg">
//                 <DollarSign className="h-7 w-7 text-white" />
//               </div>
//               <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm">
//                 <ArrowUpRight className="h-3 w-3 mr-1" />
//                 +{metrics.monthlyGrowth.toFixed(1)}%
//               </Badge>
//             </div>
//             <div className="space-y-1.5">
//               <p className="text-emerald-100">Total Raised</p>
//               <p className="text-3xl font-bold text-white">{formatCurrency(metrics.totalRaised)}</p>
//               <p className="text-emerald-100">From {metrics.totalProjects} projects</p>
//             </div>
//           </CardContent>
//         </Card>

//         {/* Total Investors */}
//         <Card className="border-0 shadow-xl bg-gradient-to-br from-primary to-muted hover:shadow-2xl hover:scale-105 transition-all duration-300 group relative overflow-hidden">
//           <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
//           <CardContent className="p-6 relative">
//             <div className="flex items-center justify-between mb-4">
//               <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/30 shadow-lg">
//                 <Users className="h-7 w-7 text-white" />
//               </div>
//               <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm">
//                 Active
//               </Badge>
//             </div>
//             <div className="space-y-1.5">
//               <p className="text-blue-100">Total Investors</p>
//               <p className="text-3xl font-bold text-white">{formatNumber(metrics.totalInvestors)}</p>
//               <p className="text-blue-100">Across all projects</p>
//             </div>
//           </CardContent>
//         </Card>

//         {/* Active Projects */}
//         <Card className="border-0 shadow-xl bg-gradient-to-br from-accent to-chart-1 hover:shadow-2xl hover:scale-105 transition-all duration-300 group relative overflow-hidden">
//           <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
//           <CardContent className="p-6 relative">
//             <div className="flex items-center justify-between mb-4">
//               <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/30 shadow-lg">
//                 <Building2 className="h-7 w-7 text-white" />
//               </div>
//               <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm">
//                 {metrics.activeProjects}/{metrics.totalProjects}
//               </Badge>
//             </div>
//             <div className="space-y-1.5">
//               <p className="text-purple-100">Total Projects</p>
//               <p className="text-3xl font-bold text-white">{metrics.totalProjects}</p>
//               <p className="text-purple-100">{metrics.activeProjects} active</p>
//             </div>
//           </CardContent>
//         </Card>

//         {/* Average Raise */}
//         <Card className="border-0 shadow-xl bg-gradient-to-br from-primary to-primary/30 hover:shadow-2xl hover:scale-105 transition-all duration-300 group relative overflow-hidden">
//           <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
//           <CardContent className="p-6 relative">
//             <div className="flex items-center justify-between mb-4">
//               <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/30 shadow-lg">
//                 <Target className="h-7 w-7 text-white" />
//               </div>
//               <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm">
//                 {metrics.successRate}%
//               </Badge>
//             </div>
//             <div className="space-y-1.5">
//               <p className="text-blue-100">Avg. Raise</p>
//               <p className="text-3xl font-bold text-white">{formatCurrency(metrics.averageRaise)}</p>
//               <p className="text-blue-100">Success rate</p>
//             </div>
//           </CardContent>
//         </Card>
//       </div>

//       {/* Recent Activity */}
//       <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm hover:shadow-2xl transition-shadow">
//         <CardHeader className="border-b border-gray-100/50 pb-2">
//           <CardTitle className="flex items-center gap-3">
//             <div className="w-15 h-15 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center">
//               <Activity className="h-10 w-10 text-white" />
//             </div>
//             Recent Activity
//           </CardTitle>
//         </CardHeader>
//         <CardContent className="pt-2">
//           <div className="space-y-2">
//             {recentActivities.slice(0, 5).map((activity) => {
//               const IconComponent = getActivityIcon(activity.type);
//               return (
//                 <div key={activity.id} className="flex items-start gap-4 p-4 bg-gradient-to-r from-gray-50/80 via-white to-gray-50/50 rounded-xl border border-gray-100/50 hover:border-primary/20 hover:shadow-md transition-all group">
//                   <div className="w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
//                     <IconComponent className="h-5 w-5 text-primary" />
//                   </div>
//                   <div className="flex-1 min-w-0">
//                     <p className="text-gray-900 font-medium">{activity.title}</p>
//                     <p className="text-gray-600 mt-0.5">{activity.description}</p>
//                     <div className="flex items-center gap-2 mt-1">
//                       <Clock className="h-3 w-3 text-gray-400" />
//                       <p className="text-gray-500">{activity.timestamp}</p>
//                     </div>
//                   </div>
//                 </div>
//               );
//             })}
//           </div>
//         </CardContent>
//       </Card>

//       {/* Performance Insights & Upcoming Tasks */}
//       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
//         {/* Performance Insights */}
//         <Card className="border-0 shadow-xl bg-gradient-to-br from-primary via-primary to-primary/90 text-white hover:shadow-2xl transition-shadow relative overflow-hidden">
//           <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNnoiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLW9wYWNpdHk9Ii4wNSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9nPjwvc3ZnPg==')] opacity-20" />
//           <CardHeader className="relative">
//             <CardTitle className="flex items-center gap-3">
//               <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/30">
//                 <TrendingUp className="h-5 w-5 text-white" />
//               </div>
//               Performance Summary
//             </CardTitle>
//           </CardHeader>
//           <CardContent className="space-y-6 relative">
//             <div className="grid grid-cols-2 gap-4">
//               <div className="text-center p-5 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 hover:bg-white/20 transition-colors">
//                 <p className="text-3xl font-bold text-white">{metrics.successRate}%</p>
//                 <p className="text-white/80 mt-1">Success Rate</p>
//               </div>
//               <div className="text-center p-5 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 hover:bg-white/20 transition-colors">
//                 <p className="text-3xl font-bold text-white">{formatNumber(metrics.averageRaise)}</p>
//                 <p className="text-white/80 mt-1">Avg. Raise</p>
//               </div>
//             </div>
            
//             <div className="space-y-3 p-4 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20">
//               <div className="flex justify-between items-center">
//                 <span className="text-white/90">Portfolio Growth</span>
//                 <span className="font-bold text-emerald-300">
//                   {metrics.monthlyGrowth > 0 ? '+' : ''}{metrics.monthlyGrowth.toFixed(1)}%
//                 </span>
//               </div>
//               <div className="h-3 bg-white/20 rounded-full overflow-hidden">
//                 <div 
//                   className="h-full bg-gradient-to-r from-emerald-400 to-emerald-300 rounded-full transition-all duration-1000"
//                   style={{ width: `${Math.abs(metrics.monthlyGrowth)}%` }}
//                 />
//               </div>
//             </div>

//             <div className="grid grid-cols-3 gap-3">
//               <div className="text-center p-3 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
//                 <p className="font-semibold text-white">Active</p>
//                 <p className="text-emerald-300 mt-1">{metrics.activeProjects}</p>
//               </div>
//               <div className="text-center p-3 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
//                 <p className="font-semibold text-white">Completed</p>
//                 <p className="text-blue-200 mt-1">{metrics.completedProjects}</p>
//               </div>
//               <div className="text-center p-3 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
//                 <p className="font-semibold text-white">Total</p>
//                 <p className="text-purple-200 mt-1">{metrics.totalProjects}</p>
//               </div>
//             </div>
//           </CardContent>
//         </Card>

//         {/* Wallet Information */}
//         <Card className="border-0 shadow-xl bg-gradient-to-br from-chart-1 via-chart-1 to-chart-1 text-white hover:shadow-2xl transition-shadow relative overflow-hidden">
//           <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNnoiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLW9wYWNpdHk9Ii4wNSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9nPjwvc3ZnPg==')] opacity-20" />
//           <CardHeader className="relative border-b border-white/20 pb-4">
//             <CardTitle className="flex items-center justify-between">
//               <div className="flex items-center gap-3">
//                 <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/30">
//                   <Wallet className="h-5 w-5 text-white" />
//                 </div>
//                 Wallet Overview
//               </div>
//               <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm">
//                 Connected
//               </Badge>
//             </CardTitle>
//           </CardHeader>
//           <CardContent className="pt-6 space-y-6 relative">
//             {/* Wallet Balance */}
//             <div className="p-5 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20">
//               <p className="text-white/80">Total Balance</p>
//               <p className="text-4xl font-bold text-white mt-2">{formatCurrency(walletData.balance)}</p>
//               <div className="flex items-center justify-between mt-3">
//                 <p className="text-white/70 text-sm">{walletData.walletAddress}</p>
//                 <Badge className="bg-emerald-400/20 text-emerald-100 border-emerald-300/30">
//                   {walletData.network}
//                 </Badge>
//               </div>
//             </div>

//             {/* Recent Transactions */}
//             <div className="space-y-3">
//               <p className="text-white/90 font-medium">Recent Transactions</p>
//               {walletData.recentTransactions.map((tx) => {
//                 const TxIcon = getTransactionIcon(tx.type);
//                 const isReceived = tx.type === 'received';
                
//                 return (
//                   <div 
//                     key={tx.id} 
//                     className="flex items-center gap-3 p-3 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 hover:bg-white/15 transition-all group"
//                   >
//                     <div className={`w-10 h-10 ${isReceived ? 'bg-emerald-400/20' : 'bg-blue-400/20'} rounded-xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform`}>
//                       <TxIcon className={`h-5 w-5 ${isReceived ? 'text-emerald-200' : 'text-blue-200'}`} />
//                     </div>
//                     <div className="flex-1 min-w-0">
//                       <p className="font-medium text-white">{isReceived ? 'Received' : 'Sent'} {tx.token}</p>
//                       <p className="text-white/70 text-sm">{tx.timestamp}</p>
//                     </div>
//                     <p className={`font-bold ${isReceived ? 'text-emerald-200' : 'text-blue-200'}`}>
//                       {isReceived ? '+' : '-'}{formatCurrency(tx.amount)}
//                     </p>
//                   </div>
//                 );
//               })}
//             </div>

//             {/* Token Holdings */}
//             <div className="space-y-3">
//               <p className="text-white/90 font-medium">Token Holdings</p>
//               <div className="grid grid-cols-3 gap-2">
//                 {walletData.tokenHoldings.map((token) => (
//                   <div 
//                     key={token.id} 
//                     className="text-center p-3 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 hover:bg-white/15 transition-colors"
//                   >
//                     <p className="font-semibold text-white">{token.name}</p>
//                     <p className="text-white/80 text-sm mt-1">{formatNumber(token.value)}</p>
//                     <p className={`text-xs mt-1 ${token.positive ? 'text-emerald-200' : 'text-red-200'}`}>
//                       {token.change}
//                     </p>
//                   </div>
//                 ))}
//               </div>
//             </div>
//           </CardContent>
//         </Card>
//       </div>
//     </div>
//   );
// }







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
  Plus
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
  balance: 125750.50,
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
      value: 12250.50,
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
          
            <p
              className="p-1 bg-gradient-to-r from-[#123962] to-[#90A5FB] hover:from-[#0d2640] hover:to-[#7088e8] text-white border-0 rounded-lg shadow-lg shadow-[#90A5FB]/30 transition-all hover:scale-105 active:scale-95"
            >
              
              Track your projects and investments on Hedera
            </p>
           
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statsData.map((stat, index) => {
            const IconComponent = stat.icon;
            return (
              <Card key={index} className={`${stat.bgColor} border-0 shadow-sm hover:shadow-md transition-shadow duration-200`}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-3">
                    <div className={`p-2 rounded-lg ${stat.iconBg}`}>
                      <IconComponent className={`h-5 w-5 ${stat.color}`} />
                    </div>
                    <Badge className={`${stat.iconBg} ${stat.color} border-0`}>
                      {stat.badge}
                    </Badge>
                  </div>
                  <div className='space-y-0'>
                    <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                    <p className="text-sm font-medium text-gray-700 mt-1">{stat.label}</p>
                    <p className="text-sm text-gray-600 mt-0.5">{stat.subtitle}</p>
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
                    <span className="font-medium text-gray-900">Portfolio Growth</span>
                    <Badge className="bg-[#90A5FB]/20 text-[#123962] border-[#90A5FB]/30">
                      This Month
                    </Badge>
                  </div>
                  <div className="w-full bg-white rounded-full h-2 shadow-inner">
                    <div 
                      className="bg-gradient-to-r from-[#90A5FB] to-[#123962] h-2 rounded-full transition-all duration-1000"
                      style={{ width: `${Math.min(100, Math.abs(metrics.monthlyGrowth))}%` }}
                    />
                  </div>
                  <p className="text-sm text-[#123962] mt-1 font-medium">
                    {metrics.monthlyGrowth > 0 ? '+' : ''}{metrics.monthlyGrowth.toFixed(1)}% growth
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
                    <span className="font-medium text-gray-900">Success Rate</span>
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
                  <p className="text-sm text-[#123962] mt-1 font-medium">{metrics.successRate}% successful projects</p>
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
                <p className="text-3xl font-bold text-[#90A5FB]">{metrics.activeProjects}</p>
                <p className="text-sm text-gray-600 mt-1">Currently running</p>
              </div>
              
              <div className="p-4 rounded-lg bg-gradient-to-br from-[#123962]/5 to-transparent hover:from-[#123962]/10 transition-colors border border-[#123962]/20">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-[#123962]/20 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-[#123962]" />
                  </div>
                  <span className="font-semibold text-gray-900">Completed</span>
                </div>
                <p className="text-3xl font-bold text-[#123962]">{metrics.completedProjects}</p>
                <p className="text-sm text-gray-600 mt-1">Successfully funded</p>
              </div>
              
              <div className="p-4 rounded-lg bg-gradient-to-br from-[#90A5FB]/5 to-transparent hover:from-[#90A5FB]/10 transition-colors border border-[#90A5FB]/20">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-[#90A5FB]/20 rounded-lg">
                    <Building2 className="h-5 w-5 text-[#90A5FB]" />
                  </div>
                  <span className="font-semibold text-gray-900">Total</span>
                </div>
                <p className="text-3xl font-bold text-[#90A5FB]">{metrics.totalProjects}</p>
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
                    <div key={activity.id} className="flex items-start gap-3 p-3 bg-gradient-to-r from-gray-50 to-transparent rounded-lg border border-gray-100 hover:border-[#90A5FB]/30 hover:shadow-sm transition-all group">
                      <div className="w-10 h-10 bg-gradient-to-br from-[#90A5FB]/10 to-[#123962]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                        <IconComponent className="h-5 w-5 text-[#123962]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-900 font-medium text-sm">{activity.title}</p>
                        <p className="text-gray-600 text-xs mt-0.5">{activity.description}</p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <Clock className="h-3 w-3 text-gray-400" />
                          <p className="text-gray-500 text-xs">{activity.timestamp}</p>
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
                  <p className="text-2xl font-bold text-white mt-1">{formatCurrency(walletData.balance)}</p>
                </div>
                <div className="p-4 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
                  <p className="text-white/80 text-xs">Wallet Address</p>
                  <p className="text-sm font-mono text-white mt-1">{walletData.walletAddress}</p>
                  <Badge className="bg-emerald-400/20 text-emerald-100 border-emerald-300/30 text-xs mt-2">
                    {walletData.network}
                  </Badge>
                </div>
              </div>

              {/* Middle Row: Token Holdings */}
              <div className="mb-4">
                <p className="text-white/90 font-medium text-sm mb-2">Token Holdings</p>
                <div className="grid grid-cols-3 gap-2">
                  {walletData.tokenHoldings.map((token) => (
                    <div 
                      key={token.id} 
                      className="text-center p-2 flex flex-row justify-between  bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 hover:bg-white/15 transition-colors"
                    >
                      <p className="font-semibold text-white text-sm">{token.name}</p>
                      <p className="text-white/80 text-xs mt-1">{formatNumber(token.value)}</p>
                      <p className={`text-xs mt-1 ${token.positive ? 'text-emerald-200' : 'text-red-200'}`}>
                        {token.change}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom Row: Recent Transaction */}
              <div>
                <p className="text-white/90 font-medium text-sm mb-2">Latest Transaction</p>
                {walletData.recentTransactions.slice(0, 1).map((tx) => {
                  const TxIcon = getTransactionIcon(tx.type);
                  const isReceived = tx.type === 'received';
                  
                  return (
                    <div 
                      key={tx.id} 
                      className="flex items-center gap-3 p-3 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20"
                    >
                      <div className={`w-9 h-9 ${isReceived ? 'bg-emerald-400/20' : 'bg-blue-400/20'} rounded-lg flex items-center justify-center flex-shrink-0`}>
                        <TxIcon className={`h-4 w-4 ${isReceived ? 'text-emerald-200' : 'text-blue-200'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-white text-sm">{isReceived ? 'Received' : 'Sent'} {tx.token}</p>
                        <p className="text-white/70 text-xs">{tx.timestamp}</p>
                      </div>
                      <p className={`font-bold text-sm ${isReceived ? 'text-emerald-200' : 'text-blue-200'}`}>
                        {isReceived ? '+' : '-'}{formatCurrency(tx.amount)}
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
