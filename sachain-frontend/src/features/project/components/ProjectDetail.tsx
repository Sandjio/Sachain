// import React, { useState, useEffect } from 'react';
// import { Button } from '@/components/ui/button';
// import { Badge } from '@/components/ui/badge';
// import { Progress } from '@/components/ui/progress';
// import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// import { Separator } from '@/components/ui/separator';
// import { getProjectById } from '@/features/project/core/api';
// import { useDeleteProject } from '@/features/project/hook/useDeleteProject';
// import { ConfirmDeleteModal } from './modals/ConfirmDeleteModal';
// import { DeleteSuccessModal } from './modals/DeleteSuccess';
// import { TokenizationFlow } from './TokenizationFlow';
// import { useWalletStore } from '@/features/wallet/store/walletStore';
// import {
//   ArrowLeft,
//   Edit3,
//   Trash2,
//   Share2,
//   Bookmark,
//   TrendingUp,
//   Users,
//   Clock,
//   DollarSign,
//   Target,
//   Calendar,
//   Hash,
//   Rocket,
//   Zap,
//   Star,
//   Globe,
//   Award,
// } from 'lucide-react';

// interface Project {
//   projectId: string;
//   name: string;
//   status: 'draft' | 'live';
//   category: string;
//   description: string;
//   targetFundingGoal: number;
//   pricePerStock: number;
//   stockSupply: number;
//   coverImageUrl?: string;
//   createdAt: string;
//   tokenSymbol: string;
//   tokenSupply: number;
//   tokenPrice: number;
//   equityOffered: string;
//   fundingTarget: number;
// }

// interface ProjectDetailViewProps {
//   projectId: string;
//   onBack: () => void;
//   onEdit: (projectId: string) => void;
// }

// const statusConfig = {
//   active: {
//     label: 'Active Project',
//     className:
//       'bg-emerald-500/90 text-white border-emerald-400/20 backdrop-blur-sm',
//     icon: <Rocket size={16} />,
//   },
//   draft: {
//     label: 'Draft',
//     className:
//       'bg-amber-500/90 text-white border-amber-400/20 backdrop-blur-sm',
//     icon: <Edit3 size={16} />,
//   },
//   live: {
//     label: 'Live',
//     className:
//       'bg-green-500/90 text-white border-green-400/20 backdrop-blur-sm',
//     icon: <Rocket size={16} />,
//   },
// };

// export function ProjectDetailView({
//   projectId,
//   onBack,
//   onEdit,
// }: ProjectDetailViewProps) {
//   const [project, setProject] = useState<Project | null>(null);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);
//   const [isModalOpen, setIsModalOpen] = useState(false);
//   const [showSuccess, setShowSuccess] = useState(false);
//   const [errorMsg, setErrorMsg] = useState<string | null>(null);

//   // State for toggling view between details and tokenization
//   const [view, setView] = useState<'details' | 'tokenization'>('details');

//   const { isDeleting, deleteProjectById } = useDeleteProject(() => {
//     setIsModalOpen(false);
//     setShowSuccess(true);
//     setTimeout(() => onBack(), 2000);
//   });

//   const walletAddress = useWalletStore((state) => state.walletAddress);

//   const confirmDelete = () => {
//     if (!project) return;
//     deleteProjectById(project.projectId).catch((err) => {
//       setErrorMsg(err.message || 'Failed to delete project');
//     });
//   };

//   useEffect(() => {
//     const fetchProject = async () => {
//       try {
//         setLoading(true);
//         setError(null);
//         const projectData = await getProjectById(projectId);
//         const normalizedProject = projectData.project || projectData;
//         setProject(normalizedProject);
//       } catch (err: any) {
//         setError(err.message);
//       } finally {
//         setLoading(false);
//       }
//     };
//     fetchProject();
//   }, [projectId]);

//   if (loading) {
//     return (
//       <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
//         <div className="max-w-7xl mx-auto p-8">
//           <Button
//             variant="ghost"
//             onClick={onBack}
//             className="mb-8 hover:bg-primary/10 text-primary"
//             size="lg"
//           >
//             <ArrowLeft size={20} className="mr-2" />
//             Back to Projects
//           </Button>

//           <div className="flex items-center justify-center min-h-[400px]">
//             <div className="text-center space-y-4">
//               <div className="relative">
//                 <div className="w-16 h-16 bg-gradient-to-r from-primary to-accent rounded-full mx-auto animate-pulse"></div>
//                 <div className="absolute inset-0 w-16 h-16 bg-gradient-to-r from-primary to-accent rounded-full mx-auto animate-ping opacity-20"></div>
//               </div>
//               <div className="space-y-2">
//                 <h3 className="text-lg font-semibold text-gray-900">
//                   Loading Project Details
//                 </h3>
//                 <p className="text-gray-600">
//                   Please wait while we fetch your project...
//                 </p>
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>
//     );
//   }

//   if (error || !project) {
//     return (
//       <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
//         <div className="max-w-7xl mx-auto p-8">
//           <Button
//             variant="ghost"
//             onClick={onBack}
//             className="mb-8 hover:bg-primary/10 text-primary"
//             size="lg"
//           >
//             <ArrowLeft size={20} className="mr-2" />
//             Back to Projects
//           </Button>

//           <div className="flex items-center justify-center min-h-[400px]">
//             <Card className="max-w-md w-full border-destructive/20">
//               <CardContent className="text-center p-8">
//                 <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
//                   <Zap size={32} className="text-destructive" />
//                 </div>
//                 <h3 className="text-lg font-semibold text-gray-900 mb-2">
//                   Something went wrong
//                 </h3>
//                 <p className="text-gray-600 mb-4">
//                   {error || 'Project not found'}
//                 </p>
//                 <Button onClick={onBack} variant="outline">
//                   Go Back
//                 </Button>
//               </CardContent>
//             </Card>
//           </div>
//         </div>
//       </div>
//     );
//   }

//   const statusInfo = statusConfig[project.status];

//   // Replace these mocks with your actual data or logic if available
//   const progressPercent = 0;
//   const raisedAmount = 0;
//   const investorCount = 0;

//   if (view === 'tokenization') {
//     return (
//       <div className="max-w-3xl mx-auto p-6">
//         <TokenizationFlow
//           project={project}
//           walletAddress={walletAddress}
//           onBack={() => setView('details')}
//           onMintSuccess={() => {
//             alert(
//               'Minting succeeded! Implement your redirect or state update.'
//             );
//           }}
//         />
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
//       <div className="max-w-7xl mx-auto p-8">
//         {/* Header */}
//         <div className="flex items-center justify-between mb-8">
//           <Button
//             variant="ghost"
//             onClick={onBack}
//             className="hover:bg-primary/10 text-primary"
//             size="lg"
//           >
//             <ArrowLeft size={20} className="mr-2" />
//             Back to Projects
//           </Button>

//           <div className="flex items-center gap-3">
//             <Button variant="outline" size="sm">
//               <Share2 size={16} className="mr-2" />
//               Share
//             </Button>
//             <Button variant="outline" size="sm">
//               <Bookmark size={16} className="mr-2" />
//               Save
//             </Button>
//           </div>
//         </div>
//         {/* Hero Section */}
//         <div className="relative overflow-hidden rounded-3xl mb-8">
//           <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/90 to-accent"></div>
//           <div className="absolute inset-0 opacity-20">
//             <div
//               className="w-full h-full bg-white/5"
//               style={{
//                 backgroundImage: `radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.1) 1px, transparent 1px)`,
//                 backgroundSize: '30px 30px',
//               }}
//             />
//           </div>

//           <div className="relative p-12 text-white">
//             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
//               <div className="space-y-6">
//                 <div className="flex items-center gap-3">
//                   <Badge
//                     className={`${statusInfo.className} text-sm px-4 py-2`}
//                   >
//                     {statusInfo.icon}
//                     <span className="ml-2">{statusInfo.label}</span>
//                   </Badge>
//                   <Badge
//                     variant="outline"
//                     className="text-white border-white/30 bg-white/10 backdrop-blur-sm"
//                   >
//                     {project.category}
//                   </Badge>
//                 </div>

//                 <div className="space-y-4">
//                   <h1 className="text-4xl lg:text-5xl font-bold leading-tight">
//                     {project.name}
//                   </h1>
//                   <p className="text-lg text-white/90 leading-relaxed max-w-2xl">
//                     {project.description}
//                   </p>
//                 </div>
//                 {/* Key Metrics */}
//                 <div className="grid grid-cols-3 gap-6 pt-4">
//                   <div className="text-center">
//                     <div className="flex items-center justify-center mb-2">
//                       <DollarSign size={24} className="text-white/80" />
//                     </div>
//                     <div className="text-2xl font-bold">
//                       ${raisedAmount.toLocaleString()}
//                     </div>
//                     <div className="text-sm text-white/70">Raised</div>
//                   </div>
//                   <div className="text-center">
//                     <div className="flex items-center justify-center mb-2">
//                       <Users size={24} className="text-white/80" />
//                     </div>
//                     <div className="text-2xl font-bold">{investorCount}</div>
//                     <div className="text-sm text-white/70">Investors</div>
//                   </div>
//                   <div className="text-center">
//                     <div className="flex items-center justify-center mb-2">
//                       <Target size={24} className="text-white/80" />
//                     </div>
//                     <div className="text-2xl font-bold">{progressPercent}%</div>
//                     <div className="text-sm text-white/70">Complete</div>
//                   </div>
//                 </div>
//               </div>
//               {/* Project Image */}
//               <div className="relative">
//                 {project.coverImageUrl ? (
//                   <div className="relative group">
//                     <img
//                       src={project.coverImageUrl}
//                       alt={project.name}
//                       className="w-full h-80 object-cover rounded-2xl shadow-2xl group-hover:scale-105 transition-transform duration-500"
//                     />
//                     <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-2xl"></div>
//                   </div>
//                 ) : (
//                   <div className="w-full h-80 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/20">
//                     <div className="text-center">
//                       <Globe size={48} className="mx-auto mb-4 text-white/60" />
//                       <p className="text-white/80">Project Preview</p>
//                     </div>
//                   </div>
//                 )}
//               </div>
//             </div>
//           </div>
//         </div>
//         {/* Progress Section for Live Projects */}
//         {project.status === 'live' && (
//           <Card className="mb-8 border-0 shadow-lg bg-gradient-to-r from-emerald-50 to-blue-50">
//             <CardContent className="p-8">
//               <div className="space-y-6">
//                 <div className="flex items-center justify-between">
//                   <h3 className="text-xl font-semibold text-gray-900">
//                     Funding Progress
//                   </h3>
//                   <div className="flex items-center gap-2 text-emerald-600">
//                     <TrendingUp size={20} />
//                     <span className="font-semibold">On Track</span>
//                   </div>
//                 </div>

//                 <Progress value={progressPercent} className="h-4" />

//                 <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-center">
//                   <div className="space-y-2">
//                     <div className="text-2xl font-bold text-gray-900">
//                       ${project.targetFundingGoal.toLocaleString()}
//                     </div>
//                     <div className="text-sm text-gray-600">Funding Goal</div>
//                   </div>
//                   <div className="space-y-2">
//                     <div className="text-2xl font-bold text-emerald-600">
//                       ${raisedAmount.toLocaleString()}
//                     </div>
//                     <div className="text-sm text-gray-600">Total Raised</div>
//                   </div>
//                   <div className="space-y-2">
//                     <div className="text-2xl font-bold text-blue-600">
//                       {project.stockSupply.toLocaleString()}
//                     </div>
//                     <div className="text-sm text-gray-600">Total Shares</div>
//                   </div>
//                   <div className="space-y-2">
//                     <div className="text-2xl font-bold text-purple-600">
//                       ${project.pricePerStock}
//                     </div>
//                     <div className="text-sm text-gray-600">Price per Share</div>
//                   </div>
//                 </div>
//               </div>
//             </CardContent>
//           </Card>
//         )}
//         {/* Content Grid */}
//         <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
//           {/* Project Information */}
//           <div className="lg:col-span-2 space-y-6">
//             <Card className="border-0 shadow-lg">
//               <CardHeader className="pb-4">
//                 <CardTitle className="flex items-center gap-2">
//                   <Star size={20} className="text-amber-500" />
//                   Project Overview
//                 </CardTitle>
//               </CardHeader>
//               <CardContent className="space-y-6">
//                 <div className="prose prose-lg max-w-none">
//                   <p className="text-gray-700 leading-relaxed">
//                     {project.description}
//                   </p>
//                 </div>

//                 <Separator />

//                 <div className="grid grid-cols-2 gap-6">
//                   <div className="space-y-3">
//                     <div className="flex items-center gap-2 text-gray-600">
//                       <Hash size={16} />
//                       <span className="text-sm font-medium">Project ID</span>
//                     </div>
//                     <p className="font-mono text-sm text-gray-500 bg-gray-50 px-3 py-2 rounded-lg">
//                       {project.projectId}
//                     </p>
//                   </div>
//                   <div className="space-y-3">
//                     <div className="flex items-center gap-2 text-gray-600">
//                       <Calendar size={16} />
//                       <span className="text-sm font-medium">Created Date</span>
//                     </div>
//                     <p className="text-gray-900">
//                       {new Date(project.createdAt).toLocaleDateString('en-US', {
//                         year: 'numeric',
//                         month: 'long',
//                         day: 'numeric',
//                       })}
//                     </p>
//                   </div>
//                 </div>
//               </CardContent>
//             </Card>
//           </div>
//           {/* Action Panel */}
//           <div className="space-y-6">
//             <Card className="border-0 shadow-lg bg-gradient-to-br from-primary/5 to-accent/5">
//               <CardHeader>
//                 <CardTitle className="flex items-center gap-2">
//                   <Award size={20} className="text-primary" />
//                   Quick Actions
//                 </CardTitle>
//               </CardHeader>
//               <CardContent className="space-y-4">
//                 <Button
//                   onClick={() => {
//                     onEdit(project.projectId);
//                   }}
//                   className="w-full bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white border-0 transition-all duration-200 hover:shadow-lg hover:shadow-primary/25"
//                   size="lg"
//                 >
//                   <Edit3 size={18} className="mr-2" />
//                   Edit Project
//                 </Button>
//                 {project.status === 'draft' && (
//                   <Button
//                     onClick={() => setView('tokenization')}
//                     size="lg"
//                     variant="outline"
//                     className="w-full hover:bg-primary/5 hover:border-primary/30"
//                   >
//                     <Rocket size={18} className="mr-2" />
//                     Tokenize & Go Live
//                   </Button>
//                 )}
//                 {project.status !== 'draft' && (
//                   <Button
//                     variant="outline"
//                     className="w-full hover:bg-primary/5 hover:border-primary/30"
//                     size="lg"
//                   >
//                     <Clock size={18} className="mr-2" />
//                     Unpublish Project
//                   </Button>
//                 )}
//                 <Separator />
//                 <Button
//                   variant="outline"
//                   className="w-full text-destructive hover:text-destructive hover:bg-destructive/5 hover:border-destructive/30"
//                   onClick={() => setIsModalOpen(true)}
//                   disabled={isDeleting}
//                   size="lg"
//                 >
//                   <Trash2 size={18} className="mr-2" />
//                   {isDeleting ? 'Deleting...' : 'Delete Project'}
//                 </Button>
//               </CardContent>
//             </Card>
//             {/* Financial Summary */}
//             <Card className="border-0 shadow-lg">
//               <CardHeader>
//                 <CardTitle className="flex items-center gap-2">
//                   <DollarSign size={20} className="text-emerald-600" />
//                   Financial Summary
//                 </CardTitle>
//               </CardHeader>
//               <CardContent className="space-y-4">
//                 <div className="space-y-3">
//                   <div className="flex justify-between items-center">
//                     <span className="text-gray-600">Funding Goal</span>
//                     <span className="font-semibold text-gray-900">
//                       ${project.targetFundingGoal?.toLocaleString() ?? 'N/A'}
//                     </span>
//                   </div>
//                   <div className="flex justify-between items-center">
//                     <span className="text-gray-600">Price per Share</span>
//                     <span className="font-semibold text-gray-900">
//                       ${project.pricePerStock}
//                     </span>
//                   </div>
//                   <div className="flex justify-between items-center">
//                     <span className="text-gray-600">Total Shares</span>
//                     <span className="font-semibold text-gray-900">
//                       {project.stockSupply.toLocaleString()}
//                     </span>
//                   </div>
//                   <Separator />
//                   <div className="flex justify-between items-center text-lg">
//                     <span className="font-medium text-gray-900">
//                       Market Cap
//                     </span>
//                     <span className="font-bold text-primary">
//                       $
//                       {(
//                         project.stockSupply * project.pricePerStock
//                       ).toLocaleString()}
//                     </span>
//                   </div>
//                 </div>
//               </CardContent>
//             </Card>
//           </div>
//         </div>
//         {/* Modals */}
//         <ConfirmDeleteModal
//           isOpen={isModalOpen}
//           title={`Delete "${project?.name}"?`}
//           description="This action cannot be undone. All project data will be permanently removed from the platform."
//           onConfirm={confirmDelete}
//           onCancel={() => setIsModalOpen(false)}
//           loading={isDeleting}
//         />

//         <DeleteSuccessModal
//           isOpen={showSuccess}
//           onClose={() => setShowSuccess(false)}
//         />

//         {/* Error display */}
//         {errorMsg && (
//           <div className="fixed bottom-4 right-4 bg-destructive/10 border border-destructive/20 text-destructive p-4 rounded-lg shadow-lg max-w-md">
//             <div className="flex items-center gap-2">
//               <Zap size={16} />
//               <span className="font-medium">Error</span>
//             </div>
//             <p className="text-sm mt-1">{errorMsg}</p>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { getProjectById } from '@/features/project/core/api';
import { useDeleteProject } from '@/features/project/hook/useDeleteProject';
import { ConfirmDeleteModal } from './modals/ConfirmDeleteModal';
import { DeleteSuccessModal } from './modals/DeleteSuccess';
import { TokenizationFlow } from './TokenizationFlow';
import { useWalletStore } from '@/features/wallet/store/walletStore';
import {
  ArrowLeft,
  Edit3,
  Trash2,
  Share2,
  Bookmark,
  TrendingUp,
  Users,
  Clock,
  DollarSign,
  Target,
  Calendar,
  Hash,
  Rocket,
  Zap,
  Building2,
  BarChart3,
  TrendingDown,
} from 'lucide-react';

interface Project {
  projectId: string;
  name: string;
  status: 'draft' | 'live';
  category: string;
  description: string;
  targetFundingGoal: number;
  pricePerStock: number;
  stockSupply: number;
  coverImageUrl?: string;
  createdAt: string;
  tokenSymbol: string;
  tokenSupply: number;
  tokenPrice: number;
  equityOffered: string;
  fundingTarget: number;
}

interface ProjectDetailViewProps {
  projectId: string;
  onBack: () => void;
  onEdit: (projectId: string) => void;
}

const statusConfig = {
  active: {
    label: 'Active',
    className: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20',
    icon: <Rocket size={14} />,
  },
  draft: {
    label: 'Draft',
    className: 'bg-amber-500/10 text-amber-700 border-amber-500/20',
    icon: <Edit3 size={14} />,
  },
  live: {
    label: 'Live',
    className: 'bg-green-500/10 text-green-700 border-green-500/20',
    icon: <Rocket size={14} />,
  },
};

function decodeHtmlEntities(str: string): string {
  const txt = document.createElement('textarea');
  txt.innerHTML = str;
  return txt.value;
}

export function ProjectDetailView({
  projectId,
  onBack,
  onEdit,
}: ProjectDetailViewProps) {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [view, setView] = useState<'details' | 'tokenization'>('details');

  const { isDeleting, deleteProjectById } = useDeleteProject(() => {
    setIsModalOpen(false);
    setShowSuccess(true);
    setTimeout(() => onBack(), 2000);
  });

  const walletAddress = useWalletStore((state) => state.walletAddress);

  const confirmDelete = () => {
    if (!project) return;
    deleteProjectById(project.projectId).catch((err) => {
      setErrorMsg(err.message || 'Failed to delete project');
    });
  };

  useEffect(() => {
    const fetchProject = async () => {
      try {
        setLoading(true);
        setError(null);
        const projectData = await getProjectById(projectId);
        const normalizedProject = projectData.project || projectData;
        setProject(normalizedProject);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchProject();
  }, [projectId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30">
        <div className="max-w-7xl mx-auto p-4 sm:p-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center space-y-4">
              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-r from-[#123962] to-[#90A5FB] rounded-full mx-auto animate-pulse"></div>
                <div className="absolute inset-0 w-16 h-16 bg-gradient-to-r from-[#123962] to-[#90A5FB] rounded-full mx-auto animate-ping opacity-20"></div>
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-gray-900">
                  Loading Project Details
                </h3>
                <p className="text-gray-600">
                  Please wait while we fetch your project...
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30">
        <div className="max-w-7xl mx-auto p-4 sm:p-8">
          <Button variant="ghost" onClick={onBack} className="mb-6">
            <ArrowLeft size={20} className="mr-2" />
            Back to Projects
          </Button>
          <div className="flex items-center justify-center min-h-[400px]">
            <Card className="max-w-md w-full border-red-200 bg-white shadow-sm">
              <CardContent className="text-center p-8">
                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Zap size={32} className="text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Something went wrong
                </h3>
                <p className="text-gray-600 mb-4">
                  {error || 'Project not found'}
                </p>
                <Button onClick={onBack} variant="outline">
                  Go Back
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  const statusInfo = statusConfig[project.status];
  const progressPercent = 0;
  const raisedAmount = 0;
  const investorCount = 0;

  if (view === 'tokenization') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 p-4 sm:p-6">
        <div className="max-w-3xl mx-auto">
          <TokenizationFlow
            project={project}
            walletAddress={walletAddress}
            onBack={() => setView('details')}
            onMintSuccess={() => {
              alert(
                'Minting succeeded! Implement your redirect or state update.'
              );
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30">
      <div className="max-w-7xl mx-auto p-4 sm:p-8">
        {/* Compact Header with Actions */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
           {project.status === 'draft' && (
                <Button
                  onClick={() => setView('tokenization')}
                  variant="ghost"
                  className="border-[primary] text-[#123962] hover:bg-[#90A5FB]/10"
                >
                  <Rocket size={16} className="mr-2" />
                  Tokenize & Go Live
                </Button>
              )}

            <div className="flex flex-wrap items-center gap-2">
              <Button
                onClick={() => onEdit(project.projectId)}
                className="bg-gradient-to-r from-[#123962] to-[#90A5FB] hover:from-[#0d2640] hover:to-[#7088e8] text-white shadow-lg shadow-[#90A5FB]/30"
              >
                <Edit3 size={16} className="mr-2" />
                Edit Project
              </Button>

              {project.status === 'draft' && (
                <Button
                  onClick={() => setView('tokenization')}
                  variant="ghost"
                  className="border-[primary] text-[#123962] hover:bg-[#90A5FB]/10"
                >
                  <Rocket size={16} className="mr-2" />
                  Tokenize & Go Live
                </Button>
              )}

              <Button
                variant="outline"
                size="icon"
                className="border-gray-200 hover:bg-gray-50"
              >
                <Share2 size={16} />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="border-gray-200 hover:bg-gray-50"
              >
                <Bookmark size={16} />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="text-red-600 border-red-200 hover:bg-red-50"
                onClick={() => setIsModalOpen(true)}
                disabled={isDeleting}
              >
                <Trash2 size={16} />
              </Button>
            </div>
          </div>
        </div>

        {/* Project Header Card */}
        <Card className="mb-6 border-0 shadow-lg bg-white overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-0">
            {/* Left: Project Image */}
            <div className="lg:col-span-1 relative">
              {project.coverImageUrl ? (
                <img
                  src={decodeHtmlEntities(project.coverImageUrl)}
                  alt={project.name}
                  className="w-full h-64 lg:h-full object-cover"
                />
              ) : (
                <div className="w-full h-64 lg:h-full bg-gradient-to-br from-[#123962]/10 to-[#90A5FB]/20 flex items-center justify-center">
                  <Building2 size={64} className="text-[#123962]/30" />
                </div>
              )}
              <div className="absolute top-4 left-4">
                <Badge className={`${statusInfo.className} backdrop-blur-sm`}>
                  {statusInfo.icon}
                  <span className="ml-1.5">{statusInfo.label}</span>
                </Badge>
              </div>
            </div>

            {/* Right: Project Info & Key Metrics */}
            <div className="lg:col-span-2 p-6 sm:p-8">
              <div className="space-y-6">
                {/* Title & Category */}
                <div className="space-y-3">
                  <Badge
                    variant="outline"
                    className="border-[#90A5FB]/30 text-[#123962]"
                  >
                    {project.category}
                  </Badge>
                  <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">
                    {project.name}
                  </h1>
                  <p className="text-gray-600 leading-relaxed">
                    {project.description}
                  </p>
                </div>

                {/* Key Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-gradient-to-br from-[#90A5FB]/10 to-transparent rounded-lg border border-[#90A5FB]/20">
                    <DollarSign className="h-5 w-5 text-[#123962] mx-auto mb-2" />
                    <div className="text-xl font-bold text-gray-900">
                      ${project.targetFundingGoal.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">Goal</div>
                  </div>

                  <div className="text-center p-4 bg-gradient-to-br from-[#90A5FB]/10 to-transparent rounded-lg border border-[#90A5FB]/20">
                    <Target className="h-5 w-5 text-[#123962] mx-auto mb-2" />
                    <div className="text-xl font-bold text-[#90A5FB]">
                      ${raisedAmount.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">Raised</div>
                  </div>

                  <div className="text-center p-4 bg-gradient-to-br from-[#90A5FB]/10 to-transparent rounded-lg border border-[#90A5FB]/20">
                    <Users className="h-5 w-5 text-[#123962] mx-auto mb-2" />
                    <div className="text-xl font-bold text-gray-900">
                      {investorCount}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">Investors</div>
                  </div>

                  <div className="text-center p-4 bg-gradient-to-br from-[#90A5FB]/10 to-transparent rounded-lg border border-[#90A5FB]/20">
                    <BarChart3 className="h-5 w-5 text-[#123962] mx-auto mb-2" />
                    <div className="text-xl font-bold text-gray-900">
                      {progressPercent}%
                    </div>
                    <div className="text-xs text-gray-600 mt-1">Progress</div>
                  </div>
                </div>

                {/* Live Project Progress Bar */}
                {project.status === 'live' && (
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Funding Progress</span>
                      <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20">
                        <TrendingUp size={12} className="mr-1" />
                        On Track
                      </Badge>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className="bg-gradient-to-r from-[#90A5FB] to-[#123962] h-2.5 rounded-full transition-all duration-1000"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Project Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Financial Overview */}
            <Card className="border-0 shadow-sm bg-white">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <div className="p-2 bg-gradient-to-br from-[#90A5FB]/10 to-[#123962]/10 rounded-lg">
                    <DollarSign size={20} className="text-[#123962]" />
                  </div>
                  <span>Financial Overview</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div className="p-4 bg-gradient-to-r from-gray-50 to-transparent rounded-lg border border-gray-100">
                    <p className="text-xs text-gray-600 mb-1">
                      Price per Share
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      ${project.pricePerStock}
                    </p>
                  </div>
                  <div className="p-4 bg-gradient-to-r from-gray-50 to-transparent rounded-lg border border-gray-100">
                    <p className="text-xs text-gray-600 mb-1">Total Shares</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {project.stockSupply.toLocaleString()}
                    </p>
                  </div>
                  <div className="p-4 bg-gradient-to-br from-[#123962]/5 to-[#90A5FB]/10 rounded-lg border border-[#90A5FB]/20 sm:col-span-1 col-span-2">
                    <p className="text-xs text-gray-600 mb-1">Market Cap</p>
                    <p className="text-2xl font-bold text-[#123962]">
                      $
                      {(
                        project.stockSupply * project.pricePerStock
                      ).toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Project Information */}
            <Card className="border-0 shadow-sm bg-white">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <div className="p-2 bg-gradient-to-br from-[#90A5FB]/10 to-[#123962]/10 rounded-lg">
                    <Building2 size={20} className="text-[#123962]" />
                  </div>
                  <span>Project Details</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">
                    Description
                  </h3>
                  <p className="text-gray-700 leading-relaxed">
                    {project.description}
                  </p>
                </div>

                <Separator />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-gray-600 text-sm">
                      <Hash size={14} />
                      <span>Project ID</span>
                    </div>
                    <p className="font-mono text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded-lg break-all">
                      {project.projectId}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-gray-600 text-sm">
                      <Calendar size={14} />
                      <span>Created</span>
                    </div>
                    <p className="text-sm text-gray-900 font-medium bg-gray-50 px-3 py-2 rounded-lg">
                      {new Date(project.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Actions & Status */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <Card className="border-0 shadow-sm bg-gradient-to-br from-[#123962] to-[#90A5FB] text-white">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-white">
                  <BarChart3 size={20} />
                  <span>Performance</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
                  <div className="flex items-center gap-2">
                    <TrendingUp size={16} className="text-emerald-300" />
                    <span className="text-sm">Funding Rate</span>
                  </div>
                  <span className="font-bold">{progressPercent}%</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
                  <div className="flex items-center gap-2">
                    <Users size={16} className="text-blue-300" />
                    <span className="text-sm">Backers</span>
                  </div>
                  <span className="font-bold">{investorCount}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
                  <div className="flex items-center gap-2">
                    <Clock size={16} className="text-amber-300" />
                    <span className="text-sm">Status</span>
                  </div>
                  <span className="font-bold capitalize">{project.status}</span>
                </div>
              </CardContent>
            </Card>

            {/* Additional Actions */}
            {project.status !== 'draft' && (
              <Card className="border-0 shadow-sm bg-white">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Manage Project</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full justify-start border-gray-200 hover:bg-gray-50"
                  >
                    <Clock size={16} className="mr-2" />
                    Pause Project
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start border-gray-200 hover:bg-gray-50"
                  >
                    <TrendingDown size={16} className="mr-2" />
                    View Analytics
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Modals */}
        <ConfirmDeleteModal
          isOpen={isModalOpen}
          title={`Delete "${project?.name}"?`}
          description="This action cannot be undone. All project data will be permanently removed from the platform."
          onConfirm={confirmDelete}
          onCancel={() => setIsModalOpen(false)}
          loading={isDeleting}
        />

        <DeleteSuccessModal
          isOpen={showSuccess}
          onClose={() => setShowSuccess(false)}
        />

        {/* Error Toast */}
        {errorMsg && (
          <div className="fixed bottom-4 right-4 bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg shadow-lg max-w-md animate-in slide-in-from-bottom">
            <div className="flex items-center gap-2">
              <Zap size={16} />
              <span className="font-medium">Error</span>
            </div>
            <p className="text-sm mt-1">{errorMsg}</p>
          </div>
        )}
      </div>
    </div>
  );
}

//version2

// import React, { useState, useEffect } from "react";
// import { Button } from "@/components/ui/button";
// import { Badge } from "@/components/ui/badge";
// import { Progress } from "@/components/ui/progress";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Separator } from "@/components/ui/separator";
// import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// import { getProjectById } from "@/features/project/core/api";
// import { useDeleteProject } from "@/features/project/hook/useDeleteProject";
// import { ConfirmDeleteModal } from "./modals/ConfirmDeleteModal";
// import { DeleteSuccessModal } from "./modals/DeleteSuccess";
// import { TokenizationFlow } from "./TokenizationFlow";
// import { useWalletStore } from "@/features/wallet/store/walletStore";
// import {
//   ArrowLeft,
//   Edit3,
//   Trash2,
//   Users,
//   Clock,
//   DollarSign,
//   Target,
//   Calendar,
//   Rocket,
//   Zap,
//   Globe,
//   Coins,
//   FileText,
//   Download,
//   Eye,
//   MapPin,
//   X,
// } from "lucide-react";

// interface Project {
//   projectId: string;
//   name: string;
//   status: "active" | "draft" | "live" | "pending";
//   category: string;
//   description: string;
//   targetFundingGoal: number;
//   pricePerShare: number;
//   stockSupply: number;
//   soldShares: number;
//   totalRaised?: number;
//   investorCount?: number;
//   coverImageUrl?: string;
//   createdAt: string;
//   tokenSymbol: string;
//   tokenSupply: number;
//   tokenPrice: number;
//   equityOffered: string;
//   fundingTarget: number;
//   investors?: { name: string; avatar?: string; amount: number }[];
//   documents?: { name: string; size: string; type: string }[];
// }

// interface ProjectDetailProps {
//   projectId: string;
//   onBack: () => void;
//   onEdit: (projectId: string) => void;
//   onDelete: (projectId: string) => void;
//   onTokenize?: (project: Project) => void;
// }

// const statusConfig = {
//   live: {
//     label: "Live",
//     className: "bg-green-600 text-white",
//     icon: Rocket,
//   },
//   draft: {
//     label: "Draft",
//     className: "bg-yellow-500 text-white",
//     icon: Edit3,
//   },
//   active: {
//     label: "Active",
//     className: "bg-blue-600 text-white",
//     icon: Users,
//   },
//   pending: {
//     label: "Pending",
//     className: "bg-purple-600 text-white",
//     icon: Clock,
//   },
// };

// export function ProjectDetailView({
//   projectId,
//   onBack,
//   onEdit,
//   onDelete,
//   onTokenize,
// }: ProjectDetailProps) {
//   const [project, setProject] = useState<Project | null>(null);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);
//   const [activeTab, setActiveTab] = useState("overview");
//   const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
//   const [showDeleteSuccess, setShowDeleteSuccess] = useState(false);
//   const [errorMsg, setErrorMsg] = useState<string | null>(null);
//   const [view, setView] = useState<"details" | "tokenization">("details");

//   const { isDeleting, deleteProjectById } = useDeleteProject(() => {
//     setShowDeleteConfirm(false);
//     setShowDeleteSuccess(true);
//     setTimeout(() => onBack(), 2000);
//   });

//   const walletAddress = useWalletStore((state) => state.walletAddress);

//   useEffect(() => {
//     async function fetchProject() {
//       setLoading(true);
//       setError(null);
//       try {
//         const data = await getProjectById(projectId);
//         const normalized = data.project || data;
//         setProject(normalized);
//       } catch (err: any) {
//         setError(err.message || "Failed to load project");
//       } finally {
//         setLoading(false);
//       }
//     }
//     fetchProject();
//   }, [projectId]);

//   const confirmDelete = () => {
//     if (project) {
//       deleteProjectById(project.projectId).catch((err) => {
//         setErrorMsg(err.message || "Failed to delete project");
//       });
//     }
//   };

//   const formatHBAR = (amount: number) =>
//     new Intl.NumberFormat("en-US", {
//       minimumFractionDigits: 0,
//       maximumFractionDigits: 2,
//     }).format(amount);

//   const formatNumber = (value: number) => {
//     if (value >= 1_000_000) {
//       return (value / 1_000_000).toFixed(1) + "M";
//     }
//     if (value >= 1_000) {
//       return (value / 1_000).toFixed(1) + "K";
//     }
//     return value.toString();
//   };

//   if (loading) {
//     return (
//       <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
//         <div className="max-w-7xl mx-auto p-8">
//           <Button onClick={onBack} variant="ghost" size="lg" className="mb-8">
//             <ArrowLeft className="mr-2" /> Back
//           </Button>
//           <div className="flex items-center justify-center min-h-[400px]">
//             <div className="text-center">
//               <div className="w-16 h-16 rounded-full bg-gradient-to-r from-primary to-accent animate-pulse mx-auto relative">
//                 <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary to-accent opacity-20 animate-ping"></div>
//               </div>
//               <h3 className="mt-4 text-lg font-semibold">
//                 Loading Project Details...
//               </h3>
//               <p className="text-gray-600">Please wait.</p>
//             </div>
//           </div>
//         </div>
//       </div>
//     );
//   }

//   if (error || !project) {
//     return (
//       <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
//         <div className="max-w-7xl mx-auto p-8">
//           <Button onClick={onBack} variant="ghost" size="lg" className="mb-8">
//             <ArrowLeft className="mr-2" /> Back
//           </Button>
//           <div className="flex items-center justify-center min-h-[400px]">
//             <Card className="max-w-md w-full border border-red-300">
//               <CardContent className="text-center">
//                 <Zap size={32} className="text-red-600 mx-auto mb-4" />
//                 <h3 className="text-lg font-semibold text-red-700 mb-2">
//                   Error
//                 </h3>
//                 <p className="text-red-600">{error || "Project not found"}</p>
//                 <Button onClick={onBack} className="mt-4">
//                   Go Back
//                 </Button>
//               </CardContent>
//             </Card>
//           </div>
//         </div>
//       </div>
//     );
//   }

//   const status = statusConfig[project.status] || statusConfig.draft;
//   const StatusIcon = status.icon;

//   const totalShares = project.stockSupply ?? 0;
//   const soldShares = project.soldShares ?? 0;
//   const totalRaised = project.totalRaised ?? 0;
//   const targetAmount = project.targetFundingGoal ?? 0;
//   const investorCount = project.investorCount ?? 0;

//   const raisedPercent = targetAmount ? (totalRaised / targetAmount) * 100 : 0;

//   return (
//     <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-md overflow-auto">
//       <div className="relative max-w-7xl mx-auto bg-white rounded-xl shadow-xl mt-12">
//         {/* Header */}
//         <div className="flex items-center justify-between p-6 border-b border-gray-200">
//           <Button onClick={onBack} variant="ghost" size="lg">
//             <ArrowLeft className="mr-2" /> Back
//           </Button>
//           <Button
//             variant="outline"
//             size="md"
//             onClick={() =>
//               setView(view === "details" ? "tokenization" : "details")
//             }
//           >
//             {view === "details" ? "Tokenization" : "Details"}
//           </Button>
//         </div>

//         {view === "tokenization" ? (
//           <TokenizationFlow
//             project={project}
//             walletAddress={walletAddress}
//             onBack={() => setView("details")}
//             onMintSuccess={() => alert("Minting successful!")}
//           />
//         ) : (
//           <>
//             {/* Hero */}
//             <div className="relative h-64 w-full rounded-t-xl overflow-hidden">
//               {project.coverImageUrl ? (
//                 <img
//                   src={project.coverImageUrl}
//                   alt={project.name}
//                   className="object-cover w-full h-full"
//                 />
//               ) : (
//                 <div className="flex justify-center items-center w-full h-full bg-gray-100">
//                   <Globe size={48} className="text-gray-400" />
//                   <span className="ml-2 text-gray-500">No Image Available</span>
//                 </div>
//               )}
//               <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent" />
//               <div className="absolute bottom-6 left-6 text-white">
//                 <Badge
//                   className={`${status.className} px-4 py-2 flex items-center space-x-2`}
//                 >
//                   <StatusIcon size={14} />
//                   <span>{status.label}</span>
//                 </Badge>
//                 <h1 className="mt-2 text-3xl font-bold">{project.name}</h1>
//                 <div className="flex items-center space-x-4 text-sm">
//                   <div className="flex items-center space-x-1">
//                     <MapPin />
//                     <span>To be updated</span>
//                   </div>
//                   <div className="flex items-center space-x-1">
//                     <Calendar />
//                     <span>
//                       {new Date(project.createdAt).toLocaleDateString()}
//                     </span>
//                   </div>
//                   <Badge>{project.category}</Badge>
//                 </div>
//               </div>
//               {/* Close Button */}
//               <Button
//                 variant="ghost"
//                 onClick={onBack}
//                 size="sm"
//                 className="absolute top-4 right-4 bg-black/30 backdrop-blur-sm text-white rounded-full"
//               >
//                 <X />
//               </Button>
//             </div>

//             {/* Content */}
//             <div className="flex max-h-[75vh] overflow-hidden">
//               {/* Main */}
//               <div className="flex-1 p-6 overflow-y-auto">
//                 <Tabs value={activeTab} onValueChange={setActiveTab}>
//                   <TabsList className="border-b border-gray-300">
//                     <TabsTrigger value="overview">Overview</TabsTrigger>
//                     <TabsTrigger value="financials">Financials</TabsTrigger>
//                     <TabsTrigger value="team">Team & Docs</TabsTrigger>
//                     <TabsTrigger value="updates">Updates</TabsTrigger>
//                   </TabsList>

//                   <TabsContent value="overview" className="space-y-6 py-4">
//                     <Card>
//                       <CardHeader>
//                         <CardTitle>About this project</CardTitle>
//                       </CardHeader>
//                       <CardContent>
//                         <p>{project.description}</p>
//                       </CardContent>
//                     </Card>
//                   </TabsContent>

//                   <TabsContent value="financials" className="space-y-6 py-4">
//                     <Card>
//                       <CardHeader>
//                         <CardTitle>Funding Progress</CardTitle>
//                       </CardHeader>
//                       <CardContent>
//                         <div className="mb-3 flex justify-between">
//                           <span>Progress</span>
//                           <span>{raisedPercent.toFixed(2)}%</span>
//                         </div>
//                         <Progress value={raisedPercent} />
//                         <div className="grid grid-cols-3 gap-6 text-center mt-4">
//                           <div>
//                             <p className="text-sm">Raised</p>
//                             <p className="text-lg font-semibold">
//                               {formatHBAR(totalRaised)} HBAR
//                             </p>
//                           </div>
//                           <div>
//                             <p className="text-sm">Goal</p>
//                             <p className="text-lg font-semibold">
//                               {formatHBAR(targetAmount)} HBAR
//                             </p>
//                           </div>
//                           <div>
//                             <p className="text-sm">Investors</p>
//                             <p className="text-lg font-semibold">
//                               {investorCount}
//                             </p>
//                           </div>
//                         </div>
//                       </CardContent>
//                     </Card>
//                   </TabsContent>

//                   <TabsContent value="team" className="space-y-6 py-4">
//                     <Card>
//                       <CardHeader>
//                         <CardTitle>Investors</CardTitle>
//                       </CardHeader>
//                       <CardContent>
//                         {!(project?.investors?.length ?? 0) ? (
//                           <p>No investors yet</p>
//                         ) : (
//                           <ul>
//                             {project.investors?.map(
//                               ({ name, avatar, amount }, idx) => (
//                                 <li
//                                   key={idx}
//                                   className="flex items-center justify-between border-b py-2"
//                                 >
//                                   <div className="flex items-center space-x-3">
//                                     <Avatar>
//                                       <AvatarImage src={avatar} alt={name} />
//                                       <AvatarFallback>{name[0]}</AvatarFallback>
//                                     </Avatar>
//                                     <span>{name}</span>
//                                   </div>
//                                   <span>{formatHBAR(amount)} HBAR</span>
//                                 </li>
//                               )
//                             )}
//                           </ul>
//                         )}
//                       </CardContent>
//                     </Card>

//                     <Card>
//                       <CardHeader>
//                         <CardTitle>Documents</CardTitle>
//                       </CardHeader>
//                       <CardContent>
//                         {!(project?.documents?.length ?? 0) ? (
//                           <p>No documents available</p>
//                         ) : (
//                           <ul>
//                             {project.documents?.map(
//                               ({ name, size }, idx) => (
//                                 <li
//                                   key={idx}
//                                   className="flex items-center justify-between border-b py-2"
//                                 >
//                                   <div className="flex items-center space-x-3">
//                                     <FileText />
//                                     <span>{name}</span>
//                                     <small className="text-gray-500">
//                                       {size}
//                                     </small>
//                                   </div>
//                                   <Button
//                                     variant="outline"
//                                     size="sm"
//                                     onClick={(e) => e.preventDefault()}
//                                   >
//                                     <Download className="mr-1" />
//                                     Download
//                                   </Button>
//                                 </li>
//                               )
//                             )}
//                           </ul>
//                         )}
//                       </CardContent>
//                     </Card>
//                   </TabsContent>

//                   <TabsContent value="updates" className="space-y-6 py-4">
//                     <Card>
//                       <CardHeader>
//                         <CardTitle>Updates</CardTitle>
//                       </CardHeader>
//                       <CardContent>
//                         <div className="text-center">
//                           <Eye
//                             size={48}
//                             className="text-gray-400 mx-auto mb-4"
//                           />
//                           <p>No updates yet</p>
//                           <p className="text-gray-500">
//                             Updates will be shown here.
//                           </p>
//                         </div>
//                       </CardContent>
//                     </Card>
//                   </TabsContent>
//                 </Tabs>
//               </div>

//               {/* Sidebar */}
//               <aside className="w-80 bg-white border-l border-gray-300 p-6 overflow-y-auto">
//                 <div className="space-y-6">
//                   {/* Actions */}
//                   <div>
//                     <h3 className="text-lg font-semibold mb-4">Actions</h3>
//                     <Button
//                       onClick={() => onEdit(project.projectId)}
//                       className="mb-3 w-full flex items-center gap-2"
//                     >
//                       <Edit3 size={16} />
//                       Edit Project
//                     </Button>
//                     {project.status === "draft" && onTokenize && (
//                       <Button
//                         onClick={() => onTokenize(project)}
//                         className="mb-3 w-full flex items-center gap-2"
//                       >
//                         <Coins size={16} />
//                         Tokenize &amp; Live
//                       </Button>
//                     )}
//                     {project.status !== "draft" && (
//                       <Button className="mb-3 w-full flex items-center gap-2">
//                         <Clock size={16} />
//                         Unpublish Project
//                       </Button>
//                     )}
//                     <Separator />
//                     <Button
//                       variant="destructive"
//                       onClick={() => setShowDeleteConfirm(true)}
//                       className="w-full flex items-center gap-2"
//                       disabled={isDeleting}
//                     >
//                       <Trash2 size={16} />
//                       {isDeleting ? "Deleting..." : "Delete Project"}
//                     </Button>
//                   </div>

//                   {/* Summary */}
//                   <div>
//                     <h3 className="text-lg font-semibold mb-4">Summary</h3>
//                     <div className="text-sm space-y-2 text-gray-700">
//                       <div className="flex justify-between">
//                         <span>Status</span>
//                         <Badge
//                           className={`${status.className} flex items-center gap-1`}
//                         >
//                           <StatusIcon size={14} /> {status.label}
//                         </Badge>
//                       </div>
//                       <div className="flex justify-between">
//                         <span>Created</span>
//                         <span>
//                           {new Date(project.createdAt).toLocaleDateString()}
//                         </span>
//                       </div>
//                       <div className="flex justify-between">
//                         <span>Category</span>
//                         <span>{project.category}</span>
//                       </div>
//                       <div className="flex justify-between">
//                         <span>Investors</span>
//                         <span>{investorCount}</span>
//                       </div>
//                     </div>
//                   </div>
//                 </div>
//               </aside>
//             </div>

//             {/* Confirm Delete Modal */}
//             <ConfirmDeleteModal
//               isOpen={showDeleteConfirm}
//               onConfirm={confirmDelete}
//               onCancel={() => setShowDeleteConfirm(false)}
//               loading={isDeleting}
//               title={`Delete "${project.name}"?`}
//               description="This action cannot be undone and will permanently remove this project."
//             />

//             {/* Delete Success Modal */}
//             <DeleteSuccessModal
//               isOpen={showDeleteSuccess}
//               onClose={() => setShowDeleteSuccess(false)}
//             />

//             {/* Error toast */}
//             {errorMsg && (
//               <div className="fixed bottom-4 right-4 z-50 max-w-md bg-red-100 border border-red-400 p-4 rounded shadow text-red-700">
//                 <div className="flex items-center space-x-2">
//                   <Zap size={16} />
//                   <span className="font-semibold">Error</span>
//                 </div>
//                 <p>{errorMsg}</p>
//               </div>
//             )}
//           </>
//         )}
//       </div>
//     </div>
//   );
// }
