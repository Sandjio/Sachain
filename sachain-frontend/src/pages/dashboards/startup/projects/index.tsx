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
// } from 'lucide-react';
// import { Progress } from '@/components/ui/progress'; // Your progress bar component library or custom component

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

// export default function ProjectPage({ onCreateProject }: { onCreateProject: () => void }) {
//   const [currentView, setCurrentView] = useState<'list' | 'details' | 'edit'>('list');
//   const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
//   const [showSaveSuccess, setShowSaveSuccess] = useState(false);
//   const [refreshKey, setRefreshKey] = useState(0);

//   const { projects, fetchProjects, loading, error } = useProjectStore();

//   useEffect(() => {
//     fetchProjects();
//   }, [fetchProjects]);

//   // Aggregate real average funding achievement across projects for progress bar
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

//   // Static example stats for cards (keep all as is except avgFunding replaced by live progress)
//   const projectStats = {
//     totalProjects: projects.length,
//     activeProjects: projects.filter((p) => p.status === 'active').length,
//     totalRaised: projects.reduce((acc, p) => acc + (p.currentFunding || 0), 0),
//     totalInvestors: 847, // maybe dynamic if you have this data
//     avgFunding: averageFundingAchievement,
//     successRate: 89,
//   };

//   const refreshProjects = () => setRefreshKey((k) => k + 1);

//   // Navigation handlers omitted for brevity: handleViewDetails, handleEditProject, handleBackToList, etc.

//   return (
//     <div className="min-h-screen bg-background">
//       {currentView === 'list' && (
//         <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
//           {/* Header Section */}
//           <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
//             <div>
//               <h1 className="text-xl sm:text-2xl font-semibold text-foreground mb-1 sm:mb-2">
//                 Project Portfolio Management
//               </h1>
//               <p className="text-sm sm:text-base text-muted-foreground">
//                 Monitor and manage your investment projects
//               </p>
//             </div>

//             <Button onClick={onCreateProject} className="h-9 sm:h-10 px-4 sm:px-6 w-full sm:w-auto">
//               <Plus className="h-4 w-4 mr-2" />
//               New Project
//             </Button>
//           </div>

//           {/* Stats Overview Cards */}
//           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
//             {[
//               {
//                 icon: <Briefcase className="h-4 w-4 sm:h-5 sm:w-5" />,
//                 value: projectStats.totalProjects,
//                 label: 'Total Projects',
//                 subtitle: 'All time',
//               },
//               {
//                 icon: <Activity className="h-4 w-4 sm:h-5 sm:w-5" />,
//                 value: projectStats.activeProjects,
//                 label: 'Active Projects',
//                 subtitle: 'Currently funded',
//               },
//               {
//                 icon: <DollarSign className="h-4 w-4 sm:h-5 sm:w-5" />,
//                 value: formatCurrency(projectStats.totalRaised),
//                 label: 'Total Raised',
//                 subtitle: 'Cumulative funding',
//               },
//               {
//                 icon: <Users className="h-4 w-4 sm:h-5 sm:w-5" />,
//                 value: formatHBARs(projectStats.totalInvestors),
//                 label: 'Investors',
//                 subtitle: 'Total participants',
//               },
//             ].map(({ icon, value, label, subtitle }, idx) => (
//               <Card key={idx} className="border border-border">
//                 <CardHeader className="pb-2 p-4 sm:p-6">
//                   <div className="flex items-center gap-2 sm:gap-3">
//                     <div className="p-1.5 bg-muted rounded-md flex-shrink-0">{icon}</div>
//                     <div className="flex-1 min-w-0">
//                       <p className="text-lg sm:text-2xl font-semibold truncate">{value}</p>
//                     </div>
//                   </div>
//                 </CardHeader>
//                 <CardContent className="pt-0 p-4 sm:p-6">
//                   <div>
//                     <p className="font-medium text-xs sm:text-sm">{label}</p>
//                     <p className="text-xs text-muted-foreground">{subtitle}</p>
//                   </div>
//                 </CardContent>
//               </Card>
//             ))}
//           </div>

//           {/* Additional Metrics with Funding Progress Bar */}
//           <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6 sm:mb-8">
//             <Card className="border border-border">
//               <CardHeader className="p-4 sm:p-6">
//                 <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
//                   <TrendingUp className="h-4 w-4" />
//                   Performance Metrics
//                 </CardTitle>
//               </CardHeader>
//               <CardContent className="p-4 sm:p-6 pt-0">
//                 <div className="space-y-3">
//                   {/* Funding Goal Achievement with Progress Bar */}
//                   <div>
//                     <div className="flex justify-between items-center mb-1">
//                       <span className="text-xs sm:text-sm text-muted-foreground">
//                         Average Funding Goal Achievement
//                       </span>
//                       <span className="font-medium text-sm">
//                         {projectStats.avgFunding.toFixed(1)}%
//                       </span>
//                     </div>
//                     <Progress value={Math.min(100, projectStats.avgFunding)} className="h-3 rounded-lg" />
//                   </div>

//                   <div className="flex justify-between items-center">
//                     <span className="text-xs sm:text-sm text-muted-foreground">Project Success Rate</span>
//                     <span className="font-medium text-sm">{projectStats.successRate}%</span>
//                   </div>
//                   <div className="flex justify-between items-center">
//                     <span className="text-xs sm:text-sm text-muted-foreground">Average Project Duration</span>
//                     <span className="font-medium text-sm">8.3 months</span>
//                   </div>
//                 </div>
//               </CardContent>
//             </Card>

//             <Card className="border border-border">
//               <CardHeader className="p-4 sm:p-6">
//                 <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
//                   <Calendar className="h-4 w-4" />
//                   Recent Activity
//                 </CardTitle>
//               </CardHeader>
//               <CardContent className="p-4 sm:p-6 pt-0">
//                 <div className="space-y-3">
//                   <div className="flex justify-between items-center">
//                     <span className="text-xs sm:text-sm text-muted-foreground">Projects launched this month</span>
//                     <span className="font-medium text-sm">3</span>
//                   </div>
//                   <div className="flex justify-between items-center">
//                     <span className="text-xs sm:text-sm text-muted-foreground">Pending approvals</span>
//                     <span className="font-medium text-sm">7</span>
//                   </div>
//                   <div className="flex justify-between items-center">
//                     <span className="text-xs sm:text-sm text-muted-foreground">Funding deadline this week</span>
//                     <span className="font-medium text-sm">2</span>
//                   </div>
//                 </div>
//               </CardContent>
//             </Card>
//           </div>

//           <Separator className="mb-4 sm:mb-6" />

//           {/* Project List Section */}
//           <div>
//             <StartupProjectList onViewDetails={(id) => {}} onEditProject={(id) => {}} refreshProjects={refreshProjects}
//             key={refreshKey} />
//           </div>
//         </div>
//       )}

//       {/* Project Details View */}
//       {currentView === 'details' && selectedProjectId && (
//         <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
//           <div className="mb-4 sm:mb-6">
//             <Button variant="outline" onClick={() => setCurrentView('list')} className="h-9 w-full sm:w-auto">
//               <ArrowLeft className="h-4 w-4 mr-2" />
//               Back to Projects
//             </Button>
//           </div>

//           <Card className="border border-border">
//             <ProjectDetailView projectId={selectedProjectId} onBack={() => setCurrentView('list')} onEdit={handleEditProject} />
//           </Card>
//         </div>
//       )}

//       {/* Project Edit Form */}
//       {currentView === 'edit' && selectedProjectId && (
//         <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
//           <div className="mb-4 sm:mb-6">
//             <Button variant="outline" onClick={() => setCurrentView('details')} className="h-9 w-full sm:w-auto">
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
//               <ProjectEditForm projectId={selectedProjectId} onCancel={() => setCurrentView('details')} onSaveSuccess={() => { setShowSaveSuccess(true); fetchProjects(); setCurrentView('details'); }} />
//             </CardContent>
//           </Card>
//         </div>
//       )}

//       {/* Save Success Modal */}
//       <SaveSuccessModal isOpen={showSaveSuccess} onClose={() => setShowSaveSuccess(false)} />
//     </div>
//   );
// }





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

// export default function ProjectPageStunning({
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

//   // Aggregate real average funding achievement across projects for progress bar
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

//   // Project stats from real data
//   const projectStats = {
//     totalProjects: projects.length,
//     activeProjects: projects.filter((p) => p.status === 'active').length,
//     totalRaised: projects.reduce((acc, p) => acc + (p.currentFunding || 0), 0),
//     totalInvestors: 847, // maybe dynamic if you have this data
//     avgFunding: averageFundingAchievement,
//     successRate: 89,
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
//         <div className="max-w mx-auto px-4 sm:px-6 py-6 sm:py-12">
//           <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary/95 to-accent p-8 sm:p-12 text-white shadow-2xl mb-8">
//             {/* <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNnoiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLW9wYWNpdHk9Ii4wNSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9nPjwvc3ZnPg==')] opacity-20" /> */}

//             <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/5 rounded-full blur-3xl" />
//             <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-accent/20 rounded-full blur-2xl" />
//             <div className="absolute top-1/2 right-1/4 w-2 h-2 bg-white/40 rounded-full animate-pulse" />
//             <div className="absolute top-1/3 right-1/3 w-1 h-1 bg-white/30 rounded-full animate-pulse" />

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

//           {/* Enhanced Stats Overview Cards with Gradients */}
//           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
//             {/* Total Projects Card */}
//             <Card className="border-0 shadow-xl bg-gradient-to-br from-blue-500 to-blue-600 hover:shadow-2xl hover:scale-105 transition-all duration-300 group relative overflow-hidden">
//               <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
//               <CardContent className="p-6 relative">
//                 <div className="flex items-center justify-between mb-4">
//                   <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/30 shadow-lg group-hover:scale-110 transition-transform">
//                     <Briefcase className="h-7 w-7 text-white" />
//                   </div>
//                   <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm text-xs">
//                     All time
//                   </Badge>
//                 </div>
//                 <div className="space-y-1.5">
//                   <p className="text-blue-100 text-sm">Total Projects</p>
//                   <p className="text-4xl font-bold text-white">
//                     {projectStats.totalProjects}
//                   </p>
//                   <p className="text-blue-100 text-sm">In portfolio</p>
//                 </div>
//               </CardContent>
//             </Card>

//             {/* Active Projects Card */}
//             <Card className="border-0 shadow-xl bg-gradient-to-br from-emerald-500 to-emerald-600 hover:shadow-2xl hover:scale-105 transition-all duration-300 group relative overflow-hidden">
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

//             {/* Total Raised Card */}
//             <Card className="border-0 shadow-xl bg-gradient-to-br from-purple-500 to-purple-600 hover:shadow-2xl hover:scale-105 transition-all duration-300 group relative overflow-hidden">
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
//                   <p className="text-purple-100 text-sm">Total Raised</p>
//                   <p className="text-4xl font-bold text-white">
//                     {formatCurrency(projectStats.totalRaised)}
//                   </p>
//                   <p className="text-purple-100 text-sm">Cumulative funding</p>
//                 </div>
//               </CardContent>
//             </Card>

//             {/* Investors Card */}
//             <Card className="border-0 shadow-xl bg-gradient-to-br from-accent to-primary hover:shadow-2xl hover:scale-105 transition-all duration-300 group relative overflow-hidden">
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
//                   <p className="text-blue-100 text-sm">Total Investors</p>
//                   <p className="text-4xl font-bold text-white">
//                     {formatHBARs(projectStats.totalInvestors)}
//                   </p>
//                   <p className="text-blue-100 text-sm">Participants</p>
//                 </div>
//               </CardContent>
//             </Card>
//           </div>

//           {/* Enhanced Performance Metrics & Activity */}
//           <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
//             {/* Performance Metrics Card */}
//             <Card className="border-0 shadow-xl bg-gradient-to-br from-primary via-primary to-primary/90 text-white hover:shadow-2xl transition-shadow relative overflow-hidden">
//               <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNnoiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLW9wYWNpdHk9Ii4wNSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9nPjwvc3ZnPg==')] opacity-20" />
//               <CardHeader className="relative pb-4">
//                 <CardTitle className="flex items-center gap-3">
//                   <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/30">
//                     <TrendingUp className="h-5 w-5 text-white" />
//                   </div>
//                   Performance Metrics
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
//             <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm hover:shadow-2xl transition-shadow">
//               <CardHeader className="border-b border-gray-100/50 pb-4">
//                 <CardTitle className="flex items-center gap-3">
//                   <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center">
//                     <Calendar className="h-5 w-5 text-white" />
//                   </div>
//                   Recent Activity
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

//                 <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-amber-50/80 to-white rounded-xl border border-amber-100/50 hover:border-amber-200 hover:shadow-md transition-all group">
//                   <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
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
//                   <Badge className="bg-amber-500 text-white text-xs">7</Badge>
//                 </div>

//                 <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-blue-50/80 to-white rounded-xl border border-blue-100/50 hover:border-blue-200 hover:shadow-md transition-all group">
//                   <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
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
//                   <Badge className="bg-blue-500 text-white text-xs">2</Badge>
//                 </div>
//               </CardContent>
//             </Card>
//           </div>

//           <Separator className="mb-8" />

//           {/* Project List Section with Enhanced Header */}

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
//                     <div className="h-32 bg-gray-200 rounded-xl"></div>
//                   </div>
//                 ))}
//               </div>
//             ) : projects.length === 0 ? (
//               // Empty state
//               <div className="text-center py-6">
//                 <div className="w-20 h-20 mx-auto bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
//                   <Rocket className="h-10 w-10 text-gray-400" />
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
//               // Projects exist - show the list
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
  Rocket,
  Zap,
  ArrowUpRight,
  Sparkles,
  Clock,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';

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

export default function ProjectPageStunning({
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

  // Project stats from real data
  const projectStats = {
    totalProjects: projects.length,
    activeProjects: projects.filter((p) => p.status === 'active').length,
    totalRaised: projects.reduce((acc, p) => acc + (p.currentFunding || 0), 0),
    totalInvestors: 847, // maybe dynamic if you have this data
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

  const handleSaveSuccess = () => {
    setShowSaveSuccess(true);
    fetchProjects();
    setCurrentView('details');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100/80">
      {currentView === 'list' && (
        <div className="max-w mx-auto px-4 sm:px-6 py-6 sm:py-12">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary/90 to-white p-8 sm:p-12 text-white shadow-2xl mb-8">

            
            <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div className="space-y-1 flex-1 ">
                <div>
                  <h1 className="text-3xl sm:text-4xl font-bold mb-1 flex items-center gap-2">
                    <Rocket className="h-8 w-8" />
                    Project Management
                  </h1>
                  <p className="text-white/90 text-base sm:text-lg max-w-2xl">
                    Monitor and manage your investment projects on Hedera
                    network
                  </p>
                </div>
              </div>

              <Button
                onClick={onCreateProject}
                size="lg"
                className="bg-white text-primary hover:bg-white/90 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 group"
              >
                <Plus className="h-5 w-5 mr-2 group-hover:rotate-90 transition-transform duration-300" />
                New Project
                <Sparkles className="h-5 w-5 ml-2 group-hover:scale-110 transition-transform" />
              </Button>
            </div>
          </div>

          {/* Enhanced Stats Overview Cards with Gradients */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
            {/* Total Projects Card */}
            <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-[#0d2a47] hover:shadow-2xl hover:scale-105 transition-all duration-300 group relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardContent className="p-6 relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/30 shadow-lg group-hover:scale-110 transition-transform">
                    <Briefcase className="h-7 w-7 text-white" />
                  </div>
                  <Badge className="bg-white/10 text-white border-white/30 backdrop-blur-sm text-xs">
                    All time
                  </Badge>
                </div>
                <div className="space-y-1.5">
                  <p className="text-white/80 text-sm">Total Projects</p>
                  <p className="text-4xl font-bold text-white">
                    {projectStats.totalProjects}
                  </p>
                  <p className="text-white/70 text-sm">In portfolio</p>
                </div>
              </CardContent>
            </Card>

            {/* Active Projects Card */}
            <Card className="border-0 shadow-xl bg-gradient-to-br from-chart-1 to-chart-1 hover:shadow-2xl hover:scale-105 transition-all duration-300 group relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardContent className="p-6 relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/30 shadow-lg group-hover:scale-110 transition-transform">
                    <Activity className="h-7 w-7 text-white" />
                  </div>
                  <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm text-xs">
                    <Zap className="h-3 w-3 mr-1" />
                    Live
                  </Badge>
                </div>
                <div className="space-y-1.5">
                  <p className="text-emerald-100 text-sm">Active Projects</p>
                  <p className="text-4xl font-bold text-white">
                    {projectStats.activeProjects}
                  </p>
                  <p className="text-emerald-100 text-sm">Currently funded</p>
                </div>
              </CardContent>
            </Card>

            {/* Total Raised Card */}
            <Card className="border-0 shadow-xl bg-gradient-to-br from-accent to-primary/50 hover:shadow-2xl hover:scale-105 transition-all duration-300 group relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardContent className="p-6 relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/30 shadow-lg group-hover:scale-110 transition-transform">
                    <DollarSign className="h-7 w-7 text-white" />
                  </div>
                  <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm text-xs">
                    <ArrowUpRight className="h-3 w-3 mr-1" />
                    +12%
                  </Badge>
                </div>
                <div className="space-y-1.5">
                  <p className="text-white/80 text-sm">Total Raised</p>
                  <p className="text-4xl font-bold text-white">
                    {formatCurrency(projectStats.totalRaised)}
                  </p>
                  <p className="text-white/70 text-sm">Cumulative funding</p>
                </div>
              </CardContent>
            </Card>

            {/* Investors Card */}
            <Card className="border-0 shadow-xl bg-gradient-to-br from-[#5a7bc4] to-primary hover:shadow-2xl hover:scale-105 transition-all duration-300 group relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardContent className="p-6 relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/30 shadow-lg group-hover:scale-110 transition-transform">
                    <Users className="h-7 w-7 text-white" />
                  </div>
                  <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm text-xs">
                    Active
                  </Badge>
                </div>
                <div className="space-y-1.5">
                  <p className="text-white/80 text-sm">Total Investors</p>
                  <p className="text-4xl font-bold text-white">
                    {formatHBARs(projectStats.totalInvestors)}
                  </p>
                  <p className="text-white/70 text-sm">Participants</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Enhanced Performance Metrics & Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Performance Metrics Card */}
            <Card className="border-0 shadow-xl bg-gradient-to-br from-primary via-primary to-primary/90 text-white hover:shadow-2xl transition-shadow relative overflow-hidden">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNnoiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLW9wYWNpdHk9Ii4wNSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9nPjwvc3ZnPg==')] opacity-20" />
              <CardHeader className="relative pb-4">
                <CardTitle className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/30">
                    <TrendingUp className="h-5 w-5 text-white" />
                  </div>
                  <h1 className="text-2xl font-semibold">Performance Metrics</h1>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 relative">
                {/* Funding Goal Achievement with Progress Bar */}
                <div className="p-5 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-white/90 text-sm font-medium">
                      Average Funding Goal Achievement
                    </span>
                    <span className="text-xl font-bold text-emerald-300">
                      {projectStats.avgFunding.toFixed(1)}%
                    </span>
                  </div>
                  <Progress
                    value={Math.min(100, projectStats.avgFunding)}
                    className="h-3 rounded-lg"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 hover:bg-white/15 transition-colors">
                    <p className="text-3xl font-bold text-white">
                      {projectStats.successRate}%
                    </p>
                    <p className="text-white/80 text-sm mt-1">
                      Project Success Rate
                    </p>
                  </div>
                  <div className="text-center p-4 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 hover:bg-white/15 transition-colors">
                    <p className="text-3xl font-bold text-white">8.3</p>
                    <p className="text-white/80 text-sm mt-1">
                      Average Project Duration
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity Card */}
            <Card className="border-0 shadow-xl bg-muted/80 backdrop-blur-sm hover:shadow-2xl transition-shadow">
              <CardHeader className="border-b border-gray-100/50 pb-4">
                <CardTitle className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-accent to-[#7a8fe8] rounded-xl flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-white" />
                  </div>
                 <h2 className='text-2xl font-semibold'>Recent Activities</h2>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                {/* Activity Items */}
                <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-emerald-50/80 to-white rounded-xl border border-emerald-100/50 hover:border-emerald-200 hover:shadow-md transition-all group">
                  <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                    <CheckCircle2 className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm">
                      Projects launched this month
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="h-3 w-3 text-gray-400" />
                      <p className="text-gray-500 text-xs">3 projects</p>
                    </div>
                  </div>
                  <Badge className="bg-emerald-500 text-white text-xs">3</Badge>
                </div>

                <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-accent/10 to-white rounded-xl border border-accent/20 hover:border-accent/40 hover:shadow-md transition-all group">
                  <div className="w-10 h-10 bg-gradient-to-br from-accent to-[#7a8fe8] rounded-xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                    <Clock className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm">
                      Pending approvals
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="h-3 w-3 text-gray-400" />
                      <p className="text-gray-500 text-xs">Awaiting review</p>
                    </div>
                  </div>
                  <Badge className="bg-accent text-white text-xs">7</Badge>
                </div>

                <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-primary/5 to-white rounded-xl border border-primary/15 hover:border-primary/30 hover:shadow-md transition-all group">
                  <div className="w-10 h-10 bg-gradient-to-br from-primary to-[#0d2a47] rounded-xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                    <AlertCircle className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm">
                      Funding deadline this week
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="h-3 w-3 text-gray-400" />
                      <p className="text-gray-500 text-xs">
                        2 projects ending soon
                      </p>
                    </div>
                  </div>
                  <Badge className="bg-primary text-white text-xs">2</Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          <Separator className="mb-8" />

          {/* Project List Section with Enhanced Header */}

          <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-lg p-6 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              {projectStats.activeProjects > 0 && (
                <Badge className="bg-primary/10 text-primary border-primary/20 px-2 py-1">
                  {projectStats.activeProjects} active
                </Badge>
              )}
            </div>

            {/* Conditional rendering based on projects length */}
            {loading ? (
              // Loading skeleton
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-32 bg-primary/10 rounded-xl"></div>
                  </div>
                ))}
              </div>
            ) : projects.length === 0 ? (
              // Empty state
              <div className="text-center py-6">
                <div className="w-20 h-20 mx-auto bg-gradient-to-br from-primary/10 to-accent/20 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                  <Rocket className="h-10 w-10 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  No Projects Yet
                </h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  Get started by creating your first project. Launch innovative
                  ideas and connect with investors on the Hedera network.
                </p>
                <Button
                  onClick={onCreateProject}
                  className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Create Your First Project
                  <Sparkles className="h-4 w-4 ml-2" />
                </Button>
              </div>
            ) : (
              // Projects exist - show the list
              <StartupProjectList
                onViewDetails={handleViewDetails}
                onEditProject={handleEditProject}
                refreshProjects={refreshProjects}
                key={refreshKey}
              />
            )}
          </div>
        </div>
      )}

      {/* Project Details View */}
      {currentView === 'details' && selectedProjectId && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-12">
          <div className="mb-6">
            <Button
              variant="outline"
              onClick={handleBackToList}
              className="bg-white/80 backdrop-blur-sm hover:bg-white border-gray-200/50 hover:border-primary/30"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Projects
            </Button>
          </div>

          <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
            <ProjectDetailView
              projectId={selectedProjectId}
              onBack={handleBackToList}
              onEdit={handleEditProject}
            />
          </Card>
        </div>
      )}

      {/* Project Edit Form */}
      {currentView === 'edit' && selectedProjectId && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-12">
          <div className="mb-6">
            <Button
              variant="outline"
              onClick={handleBackToDetails}
              className="bg-white/80 backdrop-blur-sm hover:bg-white border-gray-200/50 hover:border-primary/30"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Details
            </Button>
          </div>

          <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
            <CardHeader className="p-6 border-b border-gray-100/50">
              <CardTitle className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-accent to-primary rounded-xl flex items-center justify-center shadow-lg">
                  <Edit3 className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl">Edit Project</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <ProjectEditForm
                projectId={selectedProjectId}
                onCancel={handleBackToDetails}
                onSaveSuccess={handleSaveSuccess}
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
