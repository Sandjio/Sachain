// import { useState } from 'react';
// import { Button } from '@/components/ui/button';
// import { Badge } from '@/components/ui/badge';
// import { Card, CardContent } from '@/components/ui/card';
// import {
//   Plus,
//   BarChart3,
//   Activity,
//   Users,
//   TrendingUp,
//   Target,
//   ArrowLeft,
//   Rocket,
//   Edit3,
//   DollarSign,
//   Sparkles,
// } from 'lucide-react';

// import { StartupProjectList } from '@/features/project/components/StartupProjectList';
// import { ProjectDetailView } from '@/features/project/components/ProjectDetail';
// import { ProjectEditForm } from '@/features/project/components/ProjectEditForm';
// import { SaveSuccessModal } from '@/features/project/components/modals/SaveSuccessModal';

// interface ProjectPageProps {
//   onCreateProject: () => void;
// }

// export default function ProjectPage({ onCreateProject }: ProjectPageProps) {
//   const [currentView, setCurrentView] = useState<'list' | 'details' | 'edit'>(
//     'list'
//   );
//   const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
//     null
//   );
//   const [showSaveSuccess, setShowSaveSuccess] = useState(false);
//   const [refreshKey, setRefreshKey] = useState(0);

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
//     setCurrentView('details');
//     refreshProjects();
//   };

//   const projectStats = {
//     totalProjects: 10,
//     activeProjects: 7,
//     totalRaised: 3500000,
//     totalInvestors: 2350,
//     avgFunding: 85,
//     successRate: 92,
//   };

//   const formatHBARs = (amount: number) => {
//     if (amount >= 1_000_000) return (amount / 1_000_000).toFixed(1) + 'M';
//     if (amount >= 1_000) return (amount / 1_000).toFixed(1) + 'K';
//     return amount.toLocaleString();
//   };

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100/80 space-y-6">
//       {currentView === 'list' && (
//         <>
//           <div className="relative overflow-hidden">
//             <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-accent/5" />
//             <div
//               className="absolute inset-0 opacity-30"
//               style={{
//                 backgroundImage: `radial-gradient(circle at 25% 25%, rgba(18, 57, 98, 0.1) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(144, 165, 251, 0.1) 0%, transparent 50%)`,
//               }}
//             />

//             <div className="relative max-w-7xl mx-auto px-6 py-12 lg:py-16">
//               <div className="text-center space-y-6 mb-12 flex flex-row items-center justify-between gap-3">
//                 <h2 className="text-4xl lg:text-4xl font-bold bg-gradient-to-r from-primary via-primary to-accent bg-clip-text text-transparent leading-tight">
//                   Projets en Cours...
//                 </h2>

//                 <div className="flex justify-center pt-4">
//                   <Button
//                     onClick={onCreateProject}
//                     className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white px-8 py-4 h-auto text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
//                   >
//                     <Plus className="h-5 w-5 mr-3" />
//                     Nouveau Projet
//                     <Sparkles className="h-4 w-4 ml-2" />
//                   </Button>
//                 </div>
//               </div>

//               {/* Stats Overview */}
//               <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
//                 {[
//                   {
//                     icon: <BarChart3 className="h-6 w-6 text-primary" />,
//                     value: projectStats.totalProjects,
//                     label: 'Total Projets',
//                     bg: 'bg-primary/10',
//                     text: 'text-primary',
//                   },
//                   {
//                     icon: <Activity className="h-6 w-6 text-emerald-600" />,
//                     value: projectStats.activeProjects,
//                     label: 'Actifs',
//                     bg: 'bg-emerald-100',
//                     text: 'text-emerald-600',
//                   },
//                   {
//                     icon: <DollarSign className="h-6 w-6 text-accent" />,
//                     value: formatHBARs(projectStats.totalRaised),
//                     label: 'HBAR Levés',
//                     bg: 'bg-accent/10',
//                     text: 'text-accent',
//                   },
//                   {
//                     icon: <Users className="h-6 w-6 text-purple-600" />,
//                     value: formatHBARs(projectStats.totalInvestors),
//                     label: 'Investisseurs',
//                     bg: 'bg-purple-100',
//                     text: 'text-purple-600',
//                   },
//                 ].map(({ icon, value, label, bg, text }, idx) => (
//                   <Card
//                     key={idx}
//                     className={`border-0 shadow-lg ${bg} backdrop-blur-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1`}
//                   >
//                     <CardContent className="p-2 text-center">
//                       <div
//                         className={`w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-3 ${bg}`}
//                       >
//                         {icon}
//                       </div>
//                       <div className="space-y-1">
//                         <p className={`text-2xl font-bold ${text}`}>{value}</p>
//                         <p className="text-sm text-gray-600">{label}</p>
//                       </div>
//                     </CardContent>
//                   </Card>
//                 ))}
//               </div>
//             </div>
//           </div>

//           {/* Project List Section */}
//           <div className="max-w-7xl mx-auto px-6 pb-16">
//             <div className="flex items-center gap-3 mb-8">
//               {/* <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
//                 <Rocket className="h-4 w-4 text-primary" />
//               </div>
//               <h2 className="text-2xl font-bold text-gray-900">All Projects</h2> */}
//               <div className="flex-1" />
//               <Badge className="bg-primary/10 text-primary border-primary/20 px-3 py-1">
//                 <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
//                   <Rocket className="h-4 w-4 text-primary" />
//                 </div>
//                 <h2 className="text-2xl font-bold text-gray-900">
//                   All Projects
//                 </h2>
//               </Badge>
//             </div>
//             <StartupProjectList
//               onViewDetails={handleViewDetails}
//               onEditProject={handleEditProject}
//               refreshProjects={refreshProjects}
//               key={refreshKey}
//             />
//           </div>
//         </>
//       )}

//       {/* Project Details View */}
//       {currentView === 'details' && selectedProjectId && (
//         <div className="max-w-7xl mx-auto">
//           <div className="mb-6">
//             <Button
//               variant="outline"
//               onClick={handleBackToList}
//               className="bg-white border-gray-200 hover:bg-gray-50"
//             >
//               <ArrowLeft className="h-4 w-4 mr-2" />
//               Back to Projects
//             </Button>
//           </div>

//           <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
//             <ProjectDetailView
//               projectId={selectedProjectId}
//               onBack={handleBackToList}
//               onEdit={handleEditProject}
//             />
//           </div>
//         </div>
//       )}

//       {/* Project Edit Form */}
//       {currentView === 'edit' && selectedProjectId && (
//         <div className="max-w-4xl mx-auto">
//           <div className="mb-6">
//             <Button
//               variant="outline"
//               onClick={handleBackToDetails}
//               className="bg-white border-gray-200 hover:bg-gray-50"
//             >
//               <ArrowLeft className="h-4 w-4 mr-2" />
//               Back to Details
//             </Button>
//           </div>

//           <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
//             <div className="flex items-center gap-3 mb-6">
//               <div className="p-2 bg-accent/10 rounded-lg">
//                 <Edit3 className="h-5 w-5 text-accent" />
//               </div>
//               <h2 className="text-2xl font-bold text-gray-900">Edit Project</h2>
//             </div>

//             <ProjectEditForm
//               projectId={selectedProjectId}
//               onCancel={handleBackToDetails}
//               onSaveSuccess={handleSaveSuccess}
//             />
//           </div>
//         </div>
//       )}

//       {/* Save Success Modal */}
//       <SaveSuccessModal
//         isOpen={showSaveSuccess}
//         onClose={() => setShowSaveSuccess(false)}
//       />
//     </div>
//   );
// }






// import { useState } from 'react';
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
// } from 'lucide-react';

// import { StartupProjectList } from '@/features/project/components/StartupProjectList';
// import { ProjectDetailView } from '@/features/project/components/ProjectDetail';
// import { ProjectEditForm } from '@/features/project/components/ProjectEditForm';
// import { SaveSuccessModal } from '@/features/project/components/modals/SaveSuccessModal';

// interface ProjectPageProps {
//   onCreateProject: () => void;
// }

// export default function ProjectPage({ onCreateProject }: ProjectPageProps) {
//   const [currentView, setCurrentView] = useState<'list' | 'details' | 'edit'>(
//     'list'
//   );
//   const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
//     null
//   );
//   const [showSaveSuccess, setShowSaveSuccess] = useState(false);
//   const [refreshKey, setRefreshKey] = useState(0);

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
//     setCurrentView('details');
//     refreshProjects();
//   };

//   const projectStats = {
//     totalProjects: 24,
//     activeProjects: 18,
//     totalRaised: 12500000,
//     totalInvestors: 847,
//     avgFunding: 78,
//     successRate: 89,
//   };

//   const formatHBARs = (amount: number) => {
//     if (amount >= 1_000_000) return (amount / 1_000_000).toFixed(1) + 'M';
//     if (amount >= 1_000) return (amount / 1_000).toFixed(1) + 'K';
//     return amount.toLocaleString();
//   };

//   const formatCurrency = (amount: number) => {
//     return new Intl.NumberFormat('en-US', {
//       style: 'currency',
//       currency: 'USD',
//       minimumFractionDigits: 0,
//     }).format(amount);
//   };

//   return (
//     <div className="min-h-screen bg-background">
//       {currentView === 'list' && (
//         <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
//           {/* Header Section */}
//           <div className="mb-6 sm:mb-8">
//             <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
//               <div>
//                 <h1 className="text-xl sm:text-2xl font-semibold text-foreground mb-1 sm:mb-2">
//                   Project Portfolio Management
//                 </h1>
//                 <p className="text-sm sm:text-base text-muted-foreground">
//                   Monitor and manage your investment projects
//                 </p>
//               </div>
              
//               <Button
//                 onClick={onCreateProject}
//                 className="h-9 sm:h-10 px-4 sm:px-6 w-full sm:w-auto"
//               >
//                 <Plus className="h-4 w-4 mr-2" />
//                 New Project
//               </Button>
//             </div>

//             {/* Stats Overview */}
//             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
//               {[
//                 {
//                   icon: <Briefcase className="h-4 w-4 sm:h-5 sm:w-5" />,
//                   value: projectStats.totalProjects,
//                   label: 'Total Projects',
//                   subtitle: 'All time',
//                 },
//                 {
//                   icon: <Activity className="h-4 w-4 sm:h-5 sm:w-5" />,
//                   value: projectStats.activeProjects,
//                   label: 'Active Projects',
//                   subtitle: 'Currently funded',
//                 },
//                 {
//                   icon: <DollarSign className="h-4 w-4 sm:h-5 sm:w-5" />,
//                   value: formatCurrency(projectStats.totalRaised),
//                   label: 'Total Raised',
//                   subtitle: 'Cumulative funding',
//                 },
//                 {
//                   icon: <Users className="h-4 w-4 sm:h-5 sm:w-5" />,
//                   value: formatHBARs(projectStats.totalInvestors),
//                   label: 'Investors',
//                   subtitle: 'Total participants',
//                 },
//               ].map(({ icon, value, label, subtitle }, idx) => (
//                 <Card key={idx} className="border border-border">
//                   <CardHeader className="pb-2 p-4 sm:p-6">
//                     <div className="flex items-center gap-2 sm:gap-3">
//                       <div className="p-1.5 bg-muted rounded-md flex-shrink-0">
//                         {icon}
//                       </div>
//                       <div className="flex-1 min-w-0">
//                         <p className="text-lg sm:text-2xl font-semibold truncate">{value}</p>
//                       </div>
//                     </div>
//                   </CardHeader>
//                   <CardContent className="pt-0 p-4 sm:p-6">
//                     <div>
//                       <p className="font-medium text-xs sm:text-sm">{label}</p>
//                       <p className="text-xs text-muted-foreground">{subtitle}</p>
//                     </div>
//                   </CardContent>
//                 </Card>
//               ))}
//             </div>

//             {/* Additional Metrics */}
//             <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6 sm:mb-8">
//               <Card className="border border-border">
//                 <CardHeader className="p-4 sm:p-6">
//                   <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
//                     <TrendingUp className="h-4 w-4" />
//                     Performance Metrics
//                   </CardTitle>
//                 </CardHeader>
//                 <CardContent className="p-4 sm:p-6 pt-0">
//                   <div className="space-y-3">
//                     <div className="flex justify-between items-center">
//                       <span className="text-xs sm:text-sm text-muted-foreground">Average Funding Goal Achievement</span>
//                       <span className="font-medium text-sm">{projectStats.avgFunding}%</span>
//                     </div>
//                     <div className="flex justify-between items-center">
//                       <span className="text-xs sm:text-sm text-muted-foreground">Project Success Rate</span>
//                       <span className="font-medium text-sm">{projectStats.successRate}%</span>
//                     </div>
//                     <div className="flex justify-between items-center">
//                       <span className="text-xs sm:text-sm text-muted-foreground">Average Project Duration</span>
//                       <span className="font-medium text-sm">8.3 months</span>
//                     </div>
//                   </div>
//                 </CardContent>
//               </Card>

//               <Card className="border border-border">
//                 <CardHeader className="p-4 sm:p-6">
//                   <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
//                     <Calendar className="h-4 w-4" />
//                     Recent Activity
//                   </CardTitle>
//                 </CardHeader>
//                 <CardContent className="p-4 sm:p-6 pt-0">
//                   <div className="space-y-3">
//                     <div className="flex justify-between items-center">
//                       <span className="text-xs sm:text-sm text-muted-foreground">Projects launched this month</span>
//                       <span className="font-medium text-sm">3</span>
//                     </div>
//                     <div className="flex justify-between items-center">
//                       <span className="text-xs sm:text-sm text-muted-foreground">Pending approvals</span>
//                       <span className="font-medium text-sm">7</span>
//                     </div>
//                     <div className="flex justify-between items-center">
//                       <span className="text-xs sm:text-sm text-muted-foreground">Funding deadline this week</span>
//                       <span className="font-medium text-sm">2</span>
//                     </div>
//                   </div>
//                 </CardContent>
//               </Card>
//             </div>
//           </div>

//           <Separator className="mb-4 sm:mb-6" />

//           {/* Project List Section */}
//           <div>
            

//             <StartupProjectList
//               onViewDetails={handleViewDetails}
//               onEditProject={handleEditProject}
//               refreshProjects={refreshProjects}
//               key={refreshKey}
//             />
//           </div>
//         </div>
//       )}

//       {/* Project Details View */}
//       {currentView === 'details' && selectedProjectId && (
//         <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
//           <div className="mb-4 sm:mb-6">
//             <Button
//               variant="outline"
//               onClick={handleBackToList}
//               className="h-9 w-full sm:w-auto"
//             >
//               <ArrowLeft className="h-4 w-4 mr-2" />
//               Back to Projects
//             </Button>
//           </div>

//           <Card className="border border-border">
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
//         <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
//           <div className="mb-4 sm:mb-6">
//             <Button
//               variant="outline"
//               onClick={handleBackToDetails}
//               className="h-9 w-full sm:w-auto"
//             >
//               <ArrowLeft className="h-4 w-4 mr-2" />
//               Back to Details
//             </Button>
//           </div>

//           <Card className="border border-border">
//             <CardHeader className="p-4 sm:p-6">
//               <CardTitle className="flex flex-col sm:flex-row sm:items-center gap-3">
//                 <div className="p-2 bg-muted rounded-lg w-fit">
//                   <Edit3 className="h-4 w-4" />
//                 </div>
//                 <span className="text-lg sm:text-xl">Edit Project</span>
//               </CardTitle>
//             </CardHeader>
//             <CardContent className="p-4 sm:p-6">
//               <ProjectEditForm
//                 projectId={selectedProjectId}
//                 onCancel={handleBackToDetails}
//                 onSaveSuccess={handleSaveSuccess}
//               />
//             </CardContent>
//           </Card>
//         </div>
//       )}

//       {/* Save Success Modal */}
//       <SaveSuccessModal
//         isOpen={showSaveSuccess}
//         onClose={() => setShowSaveSuccess(false)}
//       />
//     </div>
//   );
// }




import React, { useEffect, useState } from 'react';
import { useProjectStore } from '@/features/project/store/projectStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
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
} from 'lucide-react';
import { Progress } from '@/components/ui/progress'; // Your progress bar component library or custom component

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

export default function ProjectPage({ onCreateProject }: { onCreateProject: () => void }) {
  const [currentView, setCurrentView] = useState<'list' | 'details' | 'edit'>('list');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
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

  // Static example stats for cards (keep all as is except avgFunding replaced by live progress)
  const projectStats = {
    totalProjects: projects.length,
    activeProjects: projects.filter((p) => p.status === 'active').length,
    totalRaised: projects.reduce((acc, p) => acc + (p.currentFunding || 0), 0),
    totalInvestors: 847, // maybe dynamic if you have this data
    avgFunding: averageFundingAchievement,
    successRate: 89,
  };

  const refreshProjects = () => setRefreshKey((k) => k + 1);

  // Navigation handlers omitted for brevity: handleViewDetails, handleEditProject, handleBackToList, etc.

  return (
    <div className="min-h-screen bg-background">
      {currentView === 'list' && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
          {/* Header Section */}
          <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold text-foreground mb-1 sm:mb-2">
                Project Portfolio Management
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                Monitor and manage your investment projects
              </p>
            </div>

            <Button onClick={onCreateProject} className="h-9 sm:h-10 px-4 sm:px-6 w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              New Project
            </Button>
          </div>

          {/* Stats Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
            {[
              {
                icon: <Briefcase className="h-4 w-4 sm:h-5 sm:w-5" />,
                value: projectStats.totalProjects,
                label: 'Total Projects',
                subtitle: 'All time',
              },
              {
                icon: <Activity className="h-4 w-4 sm:h-5 sm:w-5" />,
                value: projectStats.activeProjects,
                label: 'Active Projects',
                subtitle: 'Currently funded',
              },
              {
                icon: <DollarSign className="h-4 w-4 sm:h-5 sm:w-5" />,
                value: formatCurrency(projectStats.totalRaised),
                label: 'Total Raised',
                subtitle: 'Cumulative funding',
              },
              {
                icon: <Users className="h-4 w-4 sm:h-5 sm:w-5" />,
                value: formatHBARs(projectStats.totalInvestors),
                label: 'Investors',
                subtitle: 'Total participants',
              },
            ].map(({ icon, value, label, subtitle }, idx) => (
              <Card key={idx} className="border border-border">
                <CardHeader className="pb-2 p-4 sm:p-6">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="p-1.5 bg-muted rounded-md flex-shrink-0">{icon}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-lg sm:text-2xl font-semibold truncate">{value}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 p-4 sm:p-6">
                  <div>
                    <p className="font-medium text-xs sm:text-sm">{label}</p>
                    <p className="text-xs text-muted-foreground">{subtitle}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Additional Metrics with Funding Progress Bar */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6 sm:mb-8">
            <Card className="border border-border">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                  <TrendingUp className="h-4 w-4" />
                  Performance Metrics
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0">
                <div className="space-y-3">
                  {/* Funding Goal Achievement with Progress Bar */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs sm:text-sm text-muted-foreground">
                        Average Funding Goal Achievement
                      </span>
                      <span className="font-medium text-sm">
                        {projectStats.avgFunding.toFixed(1)}%
                      </span>
                    </div>
                    <Progress value={Math.min(100, projectStats.avgFunding)} className="h-3 rounded-lg" />
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-xs sm:text-sm text-muted-foreground">Project Success Rate</span>
                    <span className="font-medium text-sm">{projectStats.successRate}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs sm:text-sm text-muted-foreground">Average Project Duration</span>
                    <span className="font-medium text-sm">8.3 months</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-border">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                  <Calendar className="h-4 w-4" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs sm:text-sm text-muted-foreground">Projects launched this month</span>
                    <span className="font-medium text-sm">3</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs sm:text-sm text-muted-foreground">Pending approvals</span>
                    <span className="font-medium text-sm">7</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs sm:text-sm text-muted-foreground">Funding deadline this week</span>
                    <span className="font-medium text-sm">2</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Separator className="mb-4 sm:mb-6" />

          {/* Project List Section */}
          <div>
            <StartupProjectList onViewDetails={(id) => {}} onEditProject={(id) => {}} refreshProjects={refreshKey} />
          </div>
        </div>
      )}

      {/* Project Details View */}
      {currentView === 'details' && selectedProjectId && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
          <div className="mb-4 sm:mb-6">
            <Button variant="outline" onClick={() => setCurrentView('list')} className="h-9 w-full sm:w-auto">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Projects
            </Button>
          </div>

          <Card className="border border-border">
            <ProjectDetailView projectId={selectedProjectId} onBack={() => setCurrentView('list')} onEdit={handleEditProject} />
          </Card>
        </div>
      )}

      {/* Project Edit Form */}
      {currentView === 'edit' && selectedProjectId && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
          <div className="mb-4 sm:mb-6">
            <Button variant="outline" onClick={() => setCurrentView('details')} className="h-9 w-full sm:w-auto">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Details
            </Button>
          </div>

          <Card className="border border-border">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="p-2 bg-muted rounded-lg w-fit">
                  <Edit3 className="h-4 w-4" />
                </div>
                <span className="text-lg sm:text-xl">Edit Project</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <ProjectEditForm projectId={selectedProjectId} onCancel={() => setCurrentView('details')} onSaveSuccess={() => { setShowSaveSuccess(true); fetchProjects(); setCurrentView('details'); }} />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Save Success Modal */}
      <SaveSuccessModal isOpen={showSaveSuccess} onClose={() => setShowSaveSuccess(false)} />
    </div>
  );
}
