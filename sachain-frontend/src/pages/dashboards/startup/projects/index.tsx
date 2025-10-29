import React, { useEffect, useState } from 'react';
import { useProjectStore } from '@/features/project/store/projectStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import {
  Plus,
  BarChart3,
  Activity,
  Users,
  TrendingUp,
  Target,
  ArrowLeft,
  Building2,
  Edit3,
  DollarSign,
  Calendar,
  Briefcase,
  Sparkles,
  Zap,
} from 'lucide-react';

import { StartupProjectList } from '@/features/project/components/StartupProjectList';
import { ProjectDetailView } from '@/features/project/components/ProjectDetail';
import { ProjectEditForm } from '@/features/project/components/ProjectEditForm';
import { SaveSuccessModal } from '@/features/project/components/modals/SaveSuccessModal';

// Currency formatter utility
const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(amount);

const formatHBARs = (amount: number) => {
  if (amount >= 1_000_000) return (amount / 1_000_000).toFixed(1) + 'M';
  if (amount >= 1_000) return (amount / 1_000).toFixed(1) + 'K';
  return amount.toLocaleString();
};

export default function ProjectPage({
  onCreateProject,
}: {
  onCreateProject: () => void;
}) {
  const [currentView, setCurrentView] = useState<'list' | 'details' | 'edit'>(
    'list'
  );
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null
  );
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const { projects, fetchProjects, loading, error } = useProjectStore();

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Aggregate real average funding achievement across projects for progress bar
  const averageFundingAchievement = (() => {
    if (!projects.length) return 0;
    let totalPercent = 0;
    let count = 0;
    projects.forEach(({ fundingGoal, currentFunding }) => {
      if (fundingGoal > 0) {
        totalPercent += (currentFunding / fundingGoal) * 100;
        count++;
      }
    });
    return count > 0 ? totalPercent / count : 0;
  })();

  const projectStats = {
    totalProjects: projects.length,
    activeProjects: projects.filter((p) => p.status === 'active').length,
    totalRaised: projects.reduce((acc, p) => acc + (p.currentFunding || 0), 0),
    totalInvestors: 17, // maybe dynamic if you have this data
    avgFunding: averageFundingAchievement,
    successRate: 89,
  };

  const refreshProjects = () => setRefreshKey((k) => k + 1);

  const handleViewDetails = (projectId: string) => {
    setSelectedProjectId(projectId);
    setCurrentView('details');
  };

  const handleEditProject = (projectId: string) => {
    setSelectedProjectId(projectId);
    setCurrentView('edit');
  };

  const handleBackToList = () => {
    setSelectedProjectId(null);
    setCurrentView('list');
  };

  const handleBackToDetails = () => {
    setCurrentView('details');
  };

  const statsData = [
    {
      icon: Briefcase,
      value: projectStats.totalProjects,
      label: 'Total Projects',
      bgColor: 'bg-gradient-to-r from-[#123962]/5 to-[#90A5FB]/10',
      iconBg: 'bg-[#123962]/10',
      color: 'text-[#123962]',
    },
    {
      icon: Activity,
      value: projectStats.activeProjects,
      label: 'Active Projects',
      bgColor: 'bg-gradient-to-r from-[#90A5FB]/10 to-[#123962]/5',
      iconBg: 'bg-[#90A5FB]/10',
      color: 'text-[#90A5FB]',
    },
    {
      icon: DollarSign,
      value: formatCurrency(projectStats.totalRaised),
      label: 'Total Raised',
      bgColor: 'bg-gradient-to-r from-[#123962]/5 to-[#90A5FB]/10',
      iconBg: 'bg-[#123962]/10',
      color: 'text-[#123962]',
    },
    {
      icon: Users,
      value: formatHBARs(projectStats.totalInvestors),
      label: 'Investors',
      bgColor: 'bg-gradient-to-r from-[#90A5FB]/10 to-[#123962]/5',
      iconBg: 'bg-[#90A5FB]/10',
      color: 'text-[#90A5FB]',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30">
      {currentView === 'list' && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
          {/* Header Section */}
          <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-gradient-to-br from-[#90A5FB] to-[#123962] shadow-lg">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <h1 className="text-xl sm:text-3xl font-semibold bg-gradient-to-r from-[#123962] via-[#90A5FB] to-[#123962] bg-clip-text text-transparent">
                  Project Portfolio Management
                </h1>
              </div>
              <p className="text-sm sm:text-base text-gray-600 ml-14">
                Monitor and manage your investment projects on Hedera
              </p>
            </div>

            <Button
              onClick={onCreateProject}
              className="h-9 sm:h-11 px-4 sm:px-8 w-full sm:w-auto bg-gradient-to-r from-[#123962] to-[#90A5FB] hover:from-[#0d2640] hover:to-[#7088e8] text-white border-0 shadow-lg shadow-[#90A5FB]/30 transition-all hover:scale-105 active:scale-95"
            >
              <Plus className="h-4 w-4 mr-2" />
              <span>New Project</span>
            </Button>
          </div>

          {/* Stats Overview Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 sm:mb-8">
            {statsData.map((stat, index) => {
              const IconComponent = stat.icon;
              return (
                <Card
                  key={index}
                  className={`${stat.bgColor} border-0 shadow-sm hover:shadow-md transition-shadow duration-200`}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${stat.iconBg}`}>
                        <IconComponent className={`h-5 w-5 ${stat.color}`} />
                      </div>
                      <div>
                        <p className={`text-2xl font-bold ${stat.color}`}>
                          {stat.value}
                        </p>
                        <p className="text-sm text-gray-600">{stat.label}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Performance Indicators */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 sm:mb-8">
            <Card className="bg-gradient-to-r from-[#90A5FB]/10 to-[#90A5FB]/5 border-0 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-[#90A5FB]/20 rounded-lg">
                    <TrendingUp className="h-6 w-6 text-[#90A5FB]" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-900">
                        Average Funding Rate
                      </span>
                      <Badge className="bg-[#90A5FB]/20 text-[#123962] border-[#90A5FB]/30">
                        Good
                      </Badge>
                    </div>
                    <div className="w-full bg-white rounded-full h-2 shadow-inner">
                      <div
                        className="bg-gradient-to-r from-[#90A5FB] to-[#123962] h-2 rounded-full transition-all duration-1000"
                        style={{
                          width: `${Math.min(100, projectStats.avgFunding)}%`,
                        }}
                      />
                    </div>
                    <p className="text-sm text-[#123962] mt-1">
                      {projectStats.avgFunding.toFixed(1)}% on average
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
                        style={{ width: `${projectStats.successRate}%` }}
                      />
                    </div>
                    <p className="text-sm text-[#123962] mt-1">
                      {projectStats.successRate}% successful projects
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity Card */}
          <Card className="bg-white border-0 shadow-sm mb-6 sm:mb-8">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <div className="p-2 bg-gradient-to-br from-[#90A5FB]/10 to-[#123962]/10 rounded-lg">
                  <Calendar className="h-5 w-5 text-[#123962]" />
                </div>
                <span>Recent Activity</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-gradient-to-br from-[#90A5FB]/5 to-transparent hover:from-[#90A5FB]/10 transition-colors">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">
                      Projects launched this month
                    </span>
                    <span className="font-semibold text-[#123962]">3</span>
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-gradient-to-br from-[#123962]/5 to-transparent hover:from-[#123962]/10 transition-colors">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">
                      Pending approvals
                    </span>
                    <span className="font-semibold text-[#90A5FB]">7</span>
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-gradient-to-br from-[#90A5FB]/5 to-transparent hover:from-[#90A5FB]/10 transition-colors">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">
                      Funding deadline this week
                    </span>
                    <span className="font-semibold text-[#123962]">2</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Separator className="mb-4 sm:mb-6" />

          {/* Project List Section */}
          <div>
            <StartupProjectList
              onViewDetails={handleViewDetails}
              onEditProject={handleEditProject}
              refreshProjects={refreshProjects}
              key={refreshKey}
            />
          </div>
        </div>
      )}

      {/* Project Details View */}
      {currentView === 'details' && selectedProjectId && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
          <div className="mb-4 sm:mb-6">
            <Button
              variant="outline"
              onClick={() => setCurrentView('list')}
              className="h-9 sm:h-11 px-4 sm:px-8 w-full sm:w-auto bg-gradient-to-r from-[#123962] to-[#90A5FB] hover:from-[#0d2640] hover:to-[#7088e8] text-white border-0 shadow-lg shadow-[#90A5FB]/30 transition-all hover:scale-105 active:scale-95"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Projects
            </Button>
          </div>

          <Card className="bg-white border-0 shadow-sm">
            <ProjectDetailView
              projectId={selectedProjectId}
              onBack={() => setCurrentView('list')}
              onEdit={handleEditProject}
            />
          </Card>
        </div>
      )}

      {/* Project Edit Form */}
      {currentView === 'edit' && selectedProjectId && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
          <div className="mb-4 sm:mb-6">
            <Button
              variant="outline"
              onClick={() => setCurrentView('details')}
              className="h-9 w-full sm:w-auto border-[#90A5FB]/30 text-[#123962] hover:bg-[#90A5FB]/10 hover:border-[#90A5FB]/50 transition-all"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Details
            </Button>
          </div>

          <Card className="bg-white border-0 shadow-sm">
            <CardHeader className="p-4 sm:p-6 border-b">
              <CardTitle className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-[#90A5FB] to-[#123962] rounded-lg w-fit shadow-lg">
                  <Edit3 className="h-4 w-4 text-white" />
                </div>
                <span className="text-lg sm:text-xl text-gray-900">
                  Edit Project
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <ProjectEditForm
                projectId={selectedProjectId}
                onCancel={() => setCurrentView('details')}
                onSaveSuccess={() => {
                  setShowSaveSuccess(true);
                  fetchProjects();
                  setCurrentView('details');
                }}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Save Success Modal */}
      <SaveSuccessModal
        isOpen={showSaveSuccess}
        onClose={() => setShowSaveSuccess(false)}
      />
    </div>
  );
}

// import React, { useEffect, useState } from 'react';
// import { useProjectStore } from '@/features/project/store/projectStore';
// import { Button } from '@/components/ui/button';
// import { Badge } from '@/components/ui/badge';
// import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// import { Separator } from '@/components/ui/separator';
// import {
//   Plus,
//   BarChart3,
//   Activity,
//   Users,
//   TrendingUp,
//   Target,
//   ArrowLeft,
//   Building2,
//   Edit3,
//   DollarSign,
//   Calendar,
//   Briefcase,
//   Rocket,
//   Zap,
//   ArrowUpRight,
//   Sparkles,
//   Clock,
//   CheckCircle2,
//   AlertCircle,
// } from 'lucide-react';
// import { Progress } from '@/components/ui/progress';

// import { StartupProjectList } from '@/features/project/components/StartupProjectList';
// import { ProjectDetailView } from '@/features/project/components/ProjectDetail';
// import { ProjectEditForm } from '@/features/project/components/ProjectEditForm';
// import { SaveSuccessModal } from '@/features/project/components/modals/SaveSuccessModal';

// // Currency formatter utility
// const formatCurrency = (amount: number) =>
//   new Intl.NumberFormat('en-US', {
//     style: 'currency',
//     currency: 'USD',
//     minimumFractionDigits: 0,
//   }).format(amount);

// const formatHBARs = (amount: number) => {
//   if (amount >= 1_000_000) return (amount / 1_000_000).toFixed(1) + 'M';
//   if (amount >= 1_000) return (amount / 1_000).toFixed(1) + 'K';
//   return amount.toLocaleString();
// };

// export default function ProjectPage({
//   onCreateProject,
// }: {
//   onCreateProject: () => void;
// }) {
//   const [currentView, setCurrentView] = useState<'list' | 'details' | 'edit'>(
//     'list'
//   );
//   const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
//     null
//   );
//   const [showSaveSuccess, setShowSaveSuccess] = useState(false);
//   const [refreshKey, setRefreshKey] = useState(0);

//   const { projects, fetchProjects, loading, error } = useProjectStore();

//   useEffect(() => {
//     fetchProjects();
//   }, [fetchProjects]);

//   const averageFundingAchievement = (() => {
//     if (!projects.length) return 0;
//     let totalPercent = 0;
//     let count = 0;
//     projects.forEach(({ fundingGoal, currentFunding }) => {
//       if (fundingGoal > 0) {
//         totalPercent += (currentFunding / fundingGoal) * 100;
//         count++;
//       }
//     });
//     return count > 0 ? totalPercent / count : 0;
//   })();

//   const projectStats = {
//     totalProjects: projects.length,
//     activeProjects: projects.filter((p) => p.status === 'active').length,
//     totalRaised: projects.reduce((acc, p) => acc + (p.currentFunding || 0), 0),
//     totalInvestors: 107, // maybe dynamic if you have this data
//     avgFunding: averageFundingAchievement,
//     successRate: 70,
//   };

//   const refreshProjects = () => setRefreshKey((k) => k + 1);

//   const handleViewDetails = (projectId: string) => {
//     setSelectedProjectId(projectId);
//     setCurrentView('details');
//   };

//   const handleEditProject = (projectId: string) => {
//     setSelectedProjectId(projectId);
//     setCurrentView('edit');
//   };

//   const handleBackToList = () => {
//     setSelectedProjectId(null);
//     setCurrentView('list');
//   };

//   const handleBackToDetails = () => {
//     setCurrentView('details');
//   };

//   const handleSaveSuccess = () => {
//     setShowSaveSuccess(true);
//     fetchProjects();
//     setCurrentView('details');
//   };

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100/80">
//       {currentView === 'list' && (
//         <div className="max-w mx-auto px-4 sm:px-6 py-6 sm:py-8">
//           <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary/90 to-white p-8 sm:p-12 text-white shadow-2xl mb-8">

//             <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-6">
//               <div className="space-y-1 flex-1 ">
//                 <div>
//                   <h1 className="text-3xl sm:text-4xl font-bold mb-1 flex items-center gap-2">
//                     <Rocket className="h-8 w-8" />
//                     Project Management
//                   </h1>
//                   <p className="text-white/90 text-base sm:text-lg max-w-2xl">
//                     Monitor and manage your investment projects on Hedera
//                     network
//                   </p>
//                 </div>
//               </div>

//               <Button
//                 onClick={onCreateProject}
//                 size="lg"
//                 className="bg-white text-primary hover:bg-white/90 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 group"
//               >
//                 <Plus className="h-5 w-5 mr-2 group-hover:rotate-90 transition-transform duration-300" />
//                 New Project
//                 <Sparkles className="h-5 w-5 ml-2 group-hover:scale-110 transition-transform" />
//               </Button>
//             </div>
//           </div>

//           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
//             {/* Total Projects Card */}
//             <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-[#0d2a47] hover:shadow-2xl hover:scale-105 transition-all duration-300 group relative overflow-hidden">
//               <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
//               <CardContent className="p-6 relative">
//                 <div className="flex items-center justify-between mb-4">
//                   <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/30 shadow-lg group-hover:scale-110 transition-transform">
//                     <Briefcase className="h-7 w-7 text-white" />
//                   </div>
//                   <Badge className="bg-white/10 text-white border-white/30 backdrop-blur-sm text-xs">
//                     All time
//                   </Badge>
//                 </div>
//                 <div className="space-y-1.5">
//                   <p className="text-white/80 text-sm">Total Projects</p>
//                   <p className="text-4xl font-bold text-white">
//                     {projectStats.totalProjects}
//                   </p>
//                   <p className="text-white/70 text-sm">In portfolio</p>
//                 </div>
//               </CardContent>
//             </Card>

//             {/* Active Projects Card */}
//             <Card className="border-0 shadow-xl bg-gradient-to-br from-chart-1 to-chart-1 hover:shadow-2xl hover:scale-105 transition-all duration-300 group relative overflow-hidden">
//               <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
//               <CardContent className="p-6 relative">
//                 <div className="flex items-center justify-between mb-4">
//                   <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/30 shadow-lg group-hover:scale-110 transition-transform">
//                     <Activity className="h-7 w-7 text-white" />
//                   </div>
//                   <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm text-xs">
//                     <Zap className="h-3 w-3 mr-1" />
//                     Live
//                   </Badge>
//                 </div>
//                 <div className="space-y-1.5">
//                   <p className="text-emerald-100 text-sm">Active Projects</p>
//                   <p className="text-4xl font-bold text-white">
//                     {projectStats.activeProjects}
//                   </p>
//                   <p className="text-emerald-100 text-sm">Currently funded</p>
//                 </div>
//               </CardContent>
//             </Card>

//             <Card className="border-0 shadow-xl bg-gradient-to-br from-accent to-primary/50 hover:shadow-2xl hover:scale-105 transition-all duration-300 group relative overflow-hidden">
//               <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
//               <CardContent className="p-6 relative">
//                 <div className="flex items-center justify-between mb-4">
//                   <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/30 shadow-lg group-hover:scale-110 transition-transform">
//                     <DollarSign className="h-7 w-7 text-white" />
//                   </div>
//                   <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm text-xs">
//                     <ArrowUpRight className="h-3 w-3 mr-1" />
//                     +12%
//                   </Badge>
//                 </div>
//                 <div className="space-y-1.5">
//                   <p className="text-white/80 text-sm">Total Raised</p>
//                   <p className="text-4xl font-bold text-white">
//                     {formatCurrency(projectStats.totalRaised)}
//                   </p>
//                   <p className="text-white/70 text-sm">Cumulative funding</p>
//                 </div>
//               </CardContent>
//             </Card>

//             <Card className="border-0 shadow-xl bg-gradient-to-br from-[#5a7bc4] to-primary hover:shadow-2xl hover:scale-105 transition-all duration-300 group relative overflow-hidden">
//               <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
//               <CardContent className="p-6 relative">
//                 <div className="flex items-center justify-between mb-4">
//                   <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/30 shadow-lg group-hover:scale-110 transition-transform">
//                     <Users className="h-7 w-7 text-white" />
//                   </div>
//                   <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm text-xs">
//                     Active
//                   </Badge>
//                 </div>
//                 <div className="space-y-1.5">
//                   <p className="text-white/80 text-sm">Total Investors</p>
//                   <p className="text-4xl font-bold text-white">
//                     {formatHBARs(projectStats.totalInvestors)}
//                   </p>
//                   <p className="text-white/70 text-sm">Participants</p>
//                 </div>
//               </CardContent>
//             </Card>
//           </div>

//           <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
//             {/* Performance Metrics Card */}
//             <Card className="border-0 shadow-xl bg-gradient-to-br from-primary via-primary to-primary/90 text-white hover:shadow-2xl transition-shadow relative overflow-hidden">
//               <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNnoiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLW9wYWNpdHk9Ii4wNSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9nPjwvc3ZnPg==')] opacity-20" />
//               <CardHeader className="relative pb-4">
//                 <CardTitle className="flex items-center gap-3">
//                   <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/30">
//                     <TrendingUp className="h-5 w-5 text-white" />
//                   </div>
//                   <h1 className="text-2xl font-semibold">Performance Metrics</h1>
//                 </CardTitle>
//               </CardHeader>
//               <CardContent className="space-y-6 relative">

//                 {/* Funding Goal Achievement with Progress Bar */}
//                 <div className="p-5 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20">
//                   <div className="flex justify-between items-center mb-3">
//                     <span className="text-white/90 text-sm font-medium">
//                       Average Funding Goal Achievement
//                     </span>
//                     <span className="text-xl font-bold text-emerald-300">
//                       {projectStats.avgFunding.toFixed(1)}%
//                     </span>
//                   </div>
//                   <Progress
//                     value={Math.min(100, projectStats.avgFunding)}
//                     className="h-3 rounded-lg"
//                   />
//                 </div>

//                 <div className="grid grid-cols-2 gap-4">
//                   <div className="text-center p-4 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 hover:bg-white/15 transition-colors">
//                     <p className="text-3xl font-bold text-white">
//                       {projectStats.successRate}%
//                     </p>
//                     <p className="text-white/80 text-sm mt-1">
//                       Project Success Rate
//                     </p>
//                   </div>
//                   <div className="text-center p-4 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 hover:bg-white/15 transition-colors">
//                     <p className="text-3xl font-bold text-white">8.3</p>
//                     <p className="text-white/80 text-sm mt-1">
//                       Average Project Duration
//                     </p>
//                   </div>
//                 </div>
//               </CardContent>
//             </Card>

//             {/* Recent Activity Card */}
//             <Card className="border-0 shadow-xl bg-muted/80 backdrop-blur-sm hover:shadow-2xl transition-shadow">
//               <CardHeader className="border-b border-gray-100/50 pb-4">
//                 <CardTitle className="flex items-center gap-3">
//                   <div className="w-10 h-10 bg-gradient-to-br from-accent to-[#7a8fe8] rounded-xl flex items-center justify-center">
//                     <Calendar className="h-5 w-5 text-white" />
//                   </div>
//                  <h2 className='text-2xl font-semibold'>Recent Activities</h2>
//                 </CardTitle>
//               </CardHeader>
//               <CardContent className="pt-6 space-y-4">

//                 {/* Activity Items */}
//                 <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-emerald-50/80 to-white rounded-xl border border-emerald-100/50 hover:border-emerald-200 hover:shadow-md transition-all group">
//                   <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
//                     <CheckCircle2 className="h-5 w-5 text-white" />
//                   </div>
//                   <div className="flex-1 min-w-0">
//                     <p className="font-medium text-gray-900 text-sm">
//                       Projects launched this month
//                     </p>
//                     <div className="flex items-center gap-2 mt-1">
//                       <Clock className="h-3 w-3 text-gray-400" />
//                       <p className="text-gray-500 text-xs">3 projects</p>
//                     </div>
//                   </div>
//                   <Badge className="bg-emerald-500 text-white text-xs">3</Badge>
//                 </div>

//                 <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-accent/10 to-white rounded-xl border border-accent/20 hover:border-accent/40 hover:shadow-md transition-all group">
//                   <div className="w-10 h-10 bg-gradient-to-br from-accent to-[#7a8fe8] rounded-xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
//                     <Clock className="h-5 w-5 text-white" />
//                   </div>
//                   <div className="flex-1 min-w-0">
//                     <p className="font-medium text-gray-900 text-sm">
//                       Pending approvals
//                     </p>
//                     <div className="flex items-center gap-2 mt-1">
//                       <Clock className="h-3 w-3 text-gray-400" />
//                       <p className="text-gray-500 text-xs">Awaiting review</p>
//                     </div>
//                   </div>
//                   <Badge className="bg-accent text-white text-xs">7</Badge>
//                 </div>

//                 <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-primary/5 to-white rounded-xl border border-primary/15 hover:border-primary/30 hover:shadow-md transition-all group">
//                   <div className="w-10 h-10 bg-gradient-to-br from-primary to-[#0d2a47] rounded-xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
//                     <AlertCircle className="h-5 w-5 text-white" />
//                   </div>
//                   <div className="flex-1 min-w-0">
//                     <p className="font-medium text-gray-900 text-sm">
//                       Funding deadline this week
//                     </p>
//                     <div className="flex items-center gap-2 mt-1">
//                       <Clock className="h-3 w-3 text-gray-400" />
//                       <p className="text-gray-500 text-xs">
//                         2 projects ending soon
//                       </p>
//                     </div>
//                   </div>
//                   <Badge className="bg-primary text-white text-xs">2</Badge>
//                 </div>
//               </CardContent>
//             </Card>
//           </div>

//           <Separator className="mb-8" />

//           <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-lg p-6 sm:p-6">
//             <div className="flex items-center justify-between mb-4">
//               {projectStats.activeProjects > 0 && (
//                 <Badge className="bg-primary/10 text-primary border-primary/20 px-2 py-1">
//                   {projectStats.activeProjects} active
//                 </Badge>
//               )}
//             </div>

//             {/* Conditional rendering based on projects length */}
//             {loading ? (
//               // Loading skeleton
//               <div className="space-y-4">
//                 {[...Array(3)].map((_, i) => (
//                   <div key={i} className="animate-pulse">
//                     <div className="h-32 bg-primary/10 rounded-xl"></div>
//                   </div>
//                 ))}
//               </div>
//             ) : projects.length === 0 ? (
//               <div className="text-center py-6">
//                 <div className="w-20 h-20 mx-auto bg-gradient-to-br from-primary/10 to-accent/20 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
//                   <Rocket className="h-10 w-10 text-primary" />
//                 </div>
//                 <h3 className="text-xl font-semibold text-gray-900 mb-2">
//                   No Projects Yet
//                 </h3>
//                 <p className="text-gray-600 mb-6 max-w-md mx-auto">
//                   Get started by creating your first project. Launch innovative
//                   ideas and connect with investors on the Hedera network.
//                 </p>
//                 <Button
//                   onClick={onCreateProject}
//                   className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
//                 >
//                   <Plus className="h-5 w-5 mr-2" />
//                   Create Your First Project
//                   <Sparkles className="h-4 w-4 ml-2" />
//                 </Button>
//               </div>
//             ) : (
//               <StartupProjectList
//                 onViewDetails={handleViewDetails}
//                 onEditProject={handleEditProject}
//                 refreshProjects={refreshProjects}
//                 key={refreshKey}
//               />
//             )}
//           </div>
//         </div>
//       )}

//       {/* Project Details View */}
//       {currentView === 'details' && selectedProjectId && (
//         <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-12">
//           <div className="mb-6">
//             <Button
//               variant="outline"
//               onClick={handleBackToList}
//               className="bg-white/80 backdrop-blur-sm hover:bg-white border-gray-200/50 hover:border-primary/30"
//             >
//               <ArrowLeft className="h-4 w-4 mr-2" />
//               Back to Projects
//             </Button>
//           </div>

//           <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
//             <ProjectDetailView
//               projectId={selectedProjectId}
//               onBack={handleBackToList}
//               onEdit={handleEditProject}
//             />
//           </Card>
//         </div>
//       )}

//       {/* Project Edit Form */}
//       {currentView === 'edit' && selectedProjectId && (
//         <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-12">
//           <div className="mb-6">
//             <Button
//               variant="outline"
//               onClick={handleBackToDetails}
//               className="bg-white/80 backdrop-blur-sm hover:bg-white border-gray-200/50 hover:border-primary/30"
//             >
//               <ArrowLeft className="h-4 w-4 mr-2" />
//               Back to Details
//             </Button>
//           </div>

//           <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
//             <CardHeader className="p-6 border-b border-gray-100/50">
//               <CardTitle className="flex items-center gap-3">
//                 <div className="w-10 h-10 bg-gradient-to-br from-accent to-primary rounded-xl flex items-center justify-center shadow-lg">
//                   <Edit3 className="h-5 w-5 text-white" />
//                 </div>
//                 <span className="text-xl">Edit Project</span>
//               </CardTitle>
//             </CardHeader>
//             <CardContent className="p-6">
//               <ProjectEditForm
//                 projectId={selectedProjectId}
//                 onCancel={handleBackToDetails}
//                 onSaveSuccess={handleSaveSuccess}
//               />
//             </CardContent>
//           </Card>
//         </div>
//       )}

//       <SaveSuccessModal
//         isOpen={showSaveSuccess}
//         onClose={() => setShowSaveSuccess(false)}
//       />
//     </div>
//   );
// }
