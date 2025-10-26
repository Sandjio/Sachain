// import { useState } from 'react';
// import { Button } from '@/components/ui/button';
// import { Badge } from '@/components/ui/badge';
// import { Progress } from '@/components/ui/progress';
// import { ConfirmDeleteModal } from './modals/ConfirmDeleteModal';


// import {
//   MoreVertical,
//   Edit,
//   Trash2,
//   Eye,
//   Users,
//   Clock,
//   CheckCircle,
//   TrendingUp,
//   Zap,
//   DollarSign,
//   Target,
//   Sparkles,
// } from 'lucide-react';
// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuItem,
//   DropdownMenuSeparator,
//   DropdownMenuTrigger,
// } from '@/components/ui/dropdown-menu';
// import { useDeleteProject } from '@/features/project/hook/useDeleteProject';

// interface Project {
//   projectId: string;
//   name: string;
//   status: 'active' | 'draft' | 'live';
//   category: string;
//   description: string;
//   targetFundingGoal: number; 
//   pricePerStock: number; 
//   stockSupply: number; 
//   soldShares: number;
//   totalRaised?: number; 
//   investorCount?: number; 
//   coverImageUrl?: string;
//   createdAt: string;
// }

// interface ProjectCardProps {
//   project: Project;
//   onViewDetails?: (projectId: string) => void;
//   onEdit?: (projectId: string) => void;
//   onDeleteSuccess?: () => void;
// }

// const statusConfig = {
//   active: {
//     label: 'Active',
//     variant: 'default' as const,
//     bgColor: 'bg-emerald-500/10 border-emerald-500/20',
//     textColor: 'text-emerald-700',
//     glowColor: 'shadow-emerald-500/20',
//     icon: CheckCircle,
//   },
//   draft: {
//     label: 'Draft',
//     variant: 'secondary' as const,
//     bgColor: 'bg-amber-500/10 border-amber-500/20',
//     textColor: 'text-amber-700',
//     glowColor: 'shadow-amber-500/20',
//     icon: Edit,
//   },
//   live: {
//     label: 'Live',
//     variant: 'default' as const,
//     bgColor: 'bg-blue-500/10 border-blue-500/20',
//     textColor: 'text-blue-700',
//     glowColor: 'shadow-blue-500/20',
//     icon: Eye,
//   },
//   pending: {
//     label: 'Pending',
//     variant: 'secondary' as const,
//     bgColor: 'bg-purple-500/10 border-purple-500/20',
//     textColor: 'text-purple-700',
//     glowColor: 'shadow-purple-500/20',
//     icon: Clock,
//   },
// };

// function decodeHtmlEntities(str: string): string {
//   const txt = document.createElement("textarea");
//   txt.innerHTML = str;
//   return txt.value;
// }


// export function ProjectCard({
//   project,
//   onViewDetails,
//   onEdit,
//   onDeleteSuccess,
// }: ProjectCardProps) {
//   const [isImageLoading, setIsImageLoading] = useState(true);
//   const [isModalOpen, setIsModalOpen] = useState(false);
//   const [error, setError] = useState<string | null>(null);
//   const { isDeleting, deleteProjectById } = useDeleteProject(() => {
//     setIsModalOpen(false);
//     onDeleteSuccess?.();
//   });

//   const status = statusConfig[project.status] ?? statusConfig.draft;
//   const StatusIcon = status.icon;

//   // Progress calculations with safe fallback
//   const totalShares = project.stockSupply || 0;
//   const soldShares = project.soldShares || 0;
//   const totalRaised = project.totalRaised ?? 0;
//   const targetAmount = project.targetFundingGoal || 0;
//   const investorCount = project.investorCount ?? 0;
//   const pricePerStock = project.pricePerStock || 0;

//   const progressPercentage =
//     totalShares > 0 ? (soldShares / totalShares) * 100 : 0;
//   const raisedPercentage =
//     targetAmount > 0 ? (totalRaised / targetAmount) * 100 : 0;

  
//   const formatHBARs = (amount: number) => {
//     return new Intl.NumberFormat('en-US', {
//       minimumFractionDigits: 0,
//       maximumFractionDigits: 2,
//     }).format(amount);
//   };

//   const formatNumber = (num: number) => {
//     if (num >= 1_000_000) {
//       return (num / 1_000_000).toFixed(1) + 'M';
//     }
//     if (num >= 1000) {
//       return (num / 1000).toFixed(1) + 'K';
//     }
//     return num.toString();
//   };

//   // Event handlers
//   const handleView = () => onViewDetails?.(project.projectId);
//   const handleEdit = () => onEdit?.(project.projectId);
//   const openModal = () => setIsModalOpen(true);
//   const closeModal = () => setIsModalOpen(false);
//   const confirmDelete = () => {
//     deleteProjectById(project.projectId).catch((err) => {
//       setError(err.message || 'Failed to delete project');
//     });
//   };


  


//   return (
//     <div className="group relative overflow-hidden">
//       {/* Main Card */}
//       <div className="relative bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 hover:border-primary/30 transition-all duration-500 hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-2">
//         {/* Gradient Background Effect */}
//         <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

//         {/* Hero Image Section */}
//         <div className="relative h-56 w-full overflow-hidden rounded-t-2xl">
//           {/* Loading State */}
//           {isImageLoading && (
//             <div className="absolute inset-0 bg-gradient-to-br from-gray-100 via-gray-50 to-gray-100 animate-pulse flex items-center justify-center">
//               <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-accent/20 rounded-2xl flex items-center justify-center">
//                 <Sparkles className="w-8 h-8 text-primary/40 animate-pulse" />
//               </div>
//             </div>
//           )}

//           {/* Image or Placeholder */}
//           {project.coverImageUrl ? (
           

//             <img
//   src={decodeHtmlEntities(project.coverImageUrl!)}
//   alt={project.name}
//   className={`w-full h-full object-cover transition-all duration-700 group-hover:scale-110 ${
//     isImageLoading ? "opacity-0" : "opacity-100"
//   }`}
//   onLoad={() => setIsImageLoading(false)}
//   onError={() => setIsImageLoading(false)}
// />
//           ) : (
//             <div className="flex h-full items-center justify-center bg-gradient-to-br from-primary/10 via-primary/5 to-accent/10">
//               <div className="text-center space-y-3">
//                 <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto">
//                   <TrendingUp className="w-8 h-8 text-primary/60" />
//                 </div>
//                 <p className="text-primary/70 font-medium">Project Preview</p>
//               </div>
//             </div>
//           )}

//           {/* Gradient Overlay */}
//           <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

//           {/* Floating Elements */}
//           <div className="absolute inset-0">
//             {/* Status Badge */}
//             <div className="absolute top-4 left-4">
//               <Badge
//                 className={`${status.bgColor} ${status.textColor} border backdrop-blur-sm flex items-center gap-2 px-3 py-1.5 font-semibold shadow-lg ${status.glowColor}`}
//               >
//                 <StatusIcon className="h-3.5 w-3.5" />
//                 {status.label}
//               </Badge>
//             </div>

//             {/* Category Badge */}
//             <div className="absolute top-4 right-4">
//               <Badge className="bg-white/10 text-white border-white/20 backdrop-blur-sm px-3 py-1.5">
//                 {project.category}
//               </Badge>
//             </div>

//             {/* Quick Stats Overlay */}
//             <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
//               <div className="text-white">
//                 <div className="text-2xl font-bold">
//                   {formatNumber(investorCount)}
//                 </div>
//                 <div className="text-xs text-white/80 flex items-center gap-1">
//                   <Users className="w-3 h-3" />
//                   Investors
//                 </div>
//               </div>
//               <div className="text-white text-right">
//                 <div className="text-2xl font-bold">
//                   {raisedPercentage.toFixed(0)}%
//                 </div>
//                 <div className="text-xs text-white/80">Funded</div>
//               </div>
//             </div>
//           </div>
//         </div>

//         {/* Content Section */}
//         <div className="relative p-6 space-y-5">
//           {/* Project Title & Description */}
//           <div className="space-y-3">
//             <h3 className="font-bold text-xl text-gray-900 line-clamp-1 group-hover:text-primary transition-colors duration-300">
//               {project.name}
//             </h3>
//             <p className="text-gray-600 text-sm line-clamp-2 leading-relaxed">
//               {project.description}
//             </p>
//           </div>

//           {/* Enhanced Progress Section */}
//           <div className="space-y-4 p-4 bg-gradient-to-r from-gray-50/80 to-gray-50/40 rounded-xl border border-gray-100/80">
//             <div className="flex justify-between items-center">
//               <div className="flex items-center gap-2">
//                 <Target className="w-4 h-4 text-primary" />
//                 <span className="text-sm font-medium text-gray-700">
//                   Funding Progress
//                 </span>
//               </div>
//               <div className="flex items-center gap-1">
//                 <TrendingUp className="w-4 h-4 text-emerald-500" />
//                 <span className="font-bold text-primary text-lg">
//                   {raisedPercentage.toFixed(1)}%
//                 </span>
//               </div>
//             </div>

//             <div className="relative">
//               <Progress
//                 value={raisedPercentage}
//                 className="h-3 bg-gray-200/60 rounded-full overflow-hidden"
//               />
//               <div
//                 className="absolute top-0 left-0 h-3 bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-1000 ease-out shadow-lg"
//                 style={{ width: `${raisedPercentage}%` }}
//               />
//               {raisedPercentage > 0 && (
//                 <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-accent/20 rounded-full animate-pulse" />
//               )}
//             </div>

//             <div className="flex justify-between text-sm">
//               <span className="text-gray-600 flex items-center gap-1">
//                 <DollarSign className="w-3 h-3" />
//                 {formatHBARs(totalRaised)} HBAR raised
//               </span>
//               <span className="text-gray-500 font-medium">
//                 {formatHBARs(targetAmount)} HBAR goal
//               </span>
//             </div>
//           </div>

//           {/* Enhanced Stats Grid */}
//           <div className="grid grid-cols-2 gap-4">
//             <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl p-4 border border-primary/10 group-hover:border-primary/20 transition-colors duration-300">
//               <div className="text-center space-y-2">
//                 <div className="text-sm text-primary/70 font-medium">
//                   Shares Sold
//                 </div>
//                 <div className="text-xl font-bold text-primary">
//                   {formatNumber(soldShares)}
//                   <span className="text-sm text-gray-500">
//                     /{formatNumber(totalShares)}
//                   </span>
//                 </div>
//                 <div className="text-xs text-primary/60 bg-primary/10 rounded-full px-2 py-1">
//                   {progressPercentage.toFixed(1)}% sold
//                 </div>
//               </div>
//             </div>

//             <div className="bg-gradient-to-br from-accent/5 to-accent/10 rounded-xl p-4 border border-accent/10 group-hover:border-accent/20 transition-colors duration-300">
//               <div className="text-center space-y-2">
//                 <div className="text-sm text-accent/70 font-medium">
//                   Price per Share
//                 </div>
//                 <div className="text-xl font-bold text-accent flex items-center justify-center gap-1">
//                   <DollarSign className="w-4 h-4" />
//                   {formatHBARs(pricePerStock)}
//                 </div>
//                 <div className="text-xs text-accent/60 bg-accent/10 rounded-full px-2 py-1">
//                   HBAR
//                 </div>
//               </div>
//             </div>
//           </div>

          
//           <div className="flex gap-3 pt-2">
//             <Button
//               variant="outline"
//               size="sm"
//               onClick={handleView}
//               className="flex-1 border-primary/30 text-primary hover:bg-primary hover:text-white transition-all duration-300 hover:shadow-lg hover:shadow-primary/25 hover:-translate-y-0.5"
//             >
//               <Eye className="h-4 w-4 mr-2" />
//               View Details
//             </Button>
//             <Button
//               variant="outline"
//               size="sm"
//               className="text-red-600 hover:text-white hover:bg-red-500 hover:border-red-500 flex-1 transition-all duration-300 hover:shadow-lg hover:shadow-red-500/25 hover:-translate-y-0.5"
//               onClick={confirmDelete}
//               disabled={
//                 isDeleting ||
//                 project.status === 'active' ||
//                 project.status === 'live'
//               }
//               title={
//                 project.status === 'active' || project.status === 'live'
//                   ? 'Active or live projects cannot be deleted'
//                   : ''
//               }
//             >
//               <Trash2 className="h-4 w-4 mr-2" />
//               {isDeleting ? 'Deleting...' : 'Delete'}
//             </Button>
//           </div>
//         </div>

       
//         <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-accent/10 to-transparent rounded-2xl" />
//         <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-primary/10 to-transparent rounded-2xl" />
//       </div>

//       {/* Delete confirmation modal */}
//       <ConfirmDeleteModal
//         isOpen={isModalOpen}
//         title={`Delete "${project.name}"?`}
//         description="This action cannot be undone. All project data will be permanently removed."
//         onConfirm={confirmDelete}
//         onCancel={closeModal}
//         loading={isDeleting}
//       />

//       {/* Error display */}
//       {error && (
//         <div className="absolute -bottom-16 left-0 right-0 bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg shadow-lg animate-in slide-in-from-bottom-2">
//           <div className="flex items-center gap-2">
//             <Zap className="w-4 h-4" />
//             {error}
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }


// import { useState, useMemo, useCallback } from 'react';
// import { Button } from '@/components/ui/button';
// import { Badge } from '@/components/ui/badge';
// import { ConfirmDeleteModal } from './modals/ConfirmDeleteModal';
// import {
//   Edit,
//   Trash2,
//   Eye,
//   Users,
//   CheckCircle,
//   TrendingUp,
//   Zap,
//   DollarSign,
//   Target,
//   Building2,
// } from 'lucide-react';
// import { useDeleteProject } from '@/features/project/hook/useDeleteProject';

// interface Project {
//   projectId: string;
//   name: string;
//   status: 'active' | 'draft' | 'live';
//   category: string;
//   description: string;
//   targetFundingGoal: number;
//   pricePerStock: number;
//   stockSupply: number;
//   soldShares: number;
//   totalRaised?: number;
//   investorCount?: number;
//   coverImageUrl?: string;
//   createdAt: string;
// }

// interface ProjectCardProps {
//   project: Project;
//   onViewDetails?: (projectId: string) => void;
//   onEdit?: (projectId: string) => void;
//   onDeleteSuccess?: () => void;
// }

// const statusConfig = {
//   active: {
//     label: 'Active',
//     className: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20',
//     icon: CheckCircle,
//   },
//   draft: {
//     label: 'Draft',
//     className: 'bg-amber-500/10 text-amber-700 border-amber-500/20',
//     icon: Edit,
//   },
//   live: {
//     label: 'Live',
//     className: 'bg-green-500/10 text-green-700 border-green-500/20',
//     icon: Eye,
//   },
// };

// function decodeHtmlEntities(str: string): string {
//   const txt = document.createElement('textarea');
//   txt.innerHTML = str;
//   return txt.value;
// }

// export function ProjectCard({
//   project,
//   onViewDetails,
//   onEdit,
//   onDeleteSuccess,
// }: ProjectCardProps) {
//   const [isImageLoading, setIsImageLoading] = useState(true);
//   const [isModalOpen, setIsModalOpen] = useState(false);
//   const [error, setError] = useState<string | null>(null);
//   const { isDeleting, deleteProjectById } = useDeleteProject(() => {
//     setIsModalOpen(false);
//     onDeleteSuccess?.();
//   });

//   const status = statusConfig[project.status] ?? statusConfig.draft;
//   const StatusIcon = status.icon;

//   // Safe calculations
//   const totalShares = project.stockSupply || 0;
//   const soldShares = project.soldShares || 0;
//   const totalRaised = project.totalRaised ?? 0;
//   const targetAmount = project.targetFundingGoal || 0;
//   const investorCount = project.investorCount ?? 0;
//   const pricePerStock = project.pricePerStock || 0;

//   const progressPercentage = totalShares > 0 ? (soldShares / totalShares) * 100 : 0;
//   const raisedPercentage = targetAmount > 0 ? (totalRaised / targetAmount) * 100 : 0;

//   const formatHBARs = (amount: number) => {
//     return new Intl.NumberFormat('en-US', {
//       minimumFractionDigits: 0,
//       maximumFractionDigits: 2,
//     }).format(amount);
//   };

//   const formatNumber = (num: number) => {
//     if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
//     if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
//     return num.toString();
//   };

//   const handleView = () => onViewDetails?.(project.projectId);
//   const handleEdit = () => onEdit?.(project.projectId);
//   const closeModal = () => setIsModalOpen(false);
//   const confirmDelete = () => {
//     deleteProjectById(project.projectId).catch((err) => {
//       setError(err.message || 'Failed to delete project');
//     });
//   };

//   return (
//     <div className="group relative">
//       {/* Main Card */}
//       <div className="bg-white rounded-xl border border-gray-200 hover:border-[#90A5FB]/50 transition-all duration-300 hover:shadow-xl overflow-hidden">
//         {/* Image Section with Overlay Info */}
//         <div className="relative h-48 overflow-hidden bg-gradient-to-br from-[#123962]/5 to-[#90A5FB]/10">
//           {/* Image */}
//           {project.coverImageUrl ? (
//             <img
//               src={decodeHtmlEntities(project.coverImageUrl)}
//               alt={project.name}
//               className={`w-full h-full object-cover transition-all duration-500 group-hover:scale-105 ${
//                 isImageLoading ? 'opacity-0' : 'opacity-100'
//               }`}
//               onLoad={() => setIsImageLoading(false)}
//               onError={() => setIsImageLoading(false)}
//             />
//           ) : (
//             <div className="flex h-full items-center justify-center">
//               <Building2 className="w-16 h-16 text-[#123962]/20" />
//             </div>
//           )}

//           {/* Clean gradient overlay */}
//           <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

//           {/* Top badges */}
//           <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2">
//             <Badge className={`${status.className} backdrop-blur-sm flex items-center gap-1.5 px-2.5 py-1 shadow-lg`}>
//               <StatusIcon className="h-3 w-3" />
//               {status.label}
//             </Badge>
//             <Badge className="bg-white/90 text-gray-700 border-0 px-2.5 py-1 shadow-lg backdrop-blur-sm">
//               {project.category}
//             </Badge>
//           </div>

//           {/* Bottom stats - simplified */}
//           <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between text-white">
//             <div>
//               <div className="text-2xl font-bold">{formatNumber(investorCount)}</div>
//               <div className="text-xs text-white/90">Investors</div>
//             </div>
//             <div className="text-right">
//               <div className="text-2xl font-bold">{raisedPercentage.toFixed(0)}%</div>
//               <div className="text-xs text-white/90">Funded</div>
//             </div>
//           </div>
//         </div>

//         {/* Content Section */}
//         <div className="p-5 space-y-4">
//           {/* Title & Description */}
//           <div className="space-y-2">
//             <h3 className="font-bold text-lg text-gray-900 line-clamp-1 group-hover:text-[#123962] transition-colors">
//               {project.name}
//             </h3>
//             <p className="text-gray-600 text-sm line-clamp-2 leading-relaxed">
//               {project.description}
//             </p>
//           </div>

//           {/* Financial Metrics Grid - Clean 2x2 */}
//           <div className="grid grid-cols-2 gap-3">
//             {/* Funding Goal */}
//             <div className="p-3 bg-gradient-to-br from-[#90A5FB]/5 to-transparent rounded-lg border border-gray-100">
//               <div className="text-xs text-gray-600 mb-1">Funding Goal</div>
//               <div className="font-bold text-gray-900">{formatHBARs(targetAmount)}</div>
//               <div className="text-xs text-gray-500 mt-0.5">HBAR</div>
//             </div>

//             {/* Amount Raised */}
//             <div className="p-3 bg-gradient-to-br from-[#90A5FB]/5 to-transparent rounded-lg border border-gray-100">
//               <div className="text-xs text-gray-600 mb-1">Raised</div>
//               <div className="font-bold text-[#90A5FB]">{formatHBARs(totalRaised)}</div>
//               <div className="text-xs text-gray-500 mt-0.5">HBAR</div>
//             </div>

//             {/* Price per Share */}
//             <div className="p-3 bg-gradient-to-br from-[#123962]/5 to-transparent rounded-lg border border-gray-100">
//               <div className="text-xs text-gray-600 mb-1">Share Price</div>
//               <div className="font-bold text-gray-900">{formatHBARs(pricePerStock)}</div>
//               <div className="text-xs text-gray-500 mt-0.5">HBAR</div>
//             </div>

//             {/* Shares Available */}
//             <div className="p-3 bg-gradient-to-br from-[#123962]/5 to-transparent rounded-lg border border-gray-100">
//               <div className="text-xs text-gray-600 mb-1">Shares</div>
//               <div className="font-bold text-gray-900">{formatNumber(soldShares)}/{formatNumber(totalShares)}</div>
//               <div className="text-xs text-gray-500 mt-0.5">{progressPercentage.toFixed(0)}% sold</div>
//             </div>
//           </div>

//           {/* Progress Bar Section - Compact */}
//           <div className="space-y-2 pt-2">
//             <div className="flex items-center justify-between text-sm">
//               <div className="flex items-center gap-1.5 text-gray-600">
//                 <Target className="w-3.5 h-3.5" />
//                 <span className="text-xs">Progress</span>
//               </div>
//               <div className="flex items-center gap-1 text-[#123962] font-bold">
//                 <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
//                 <span className="text-sm">{raisedPercentage.toFixed(1)}%</span>
//               </div>
//             </div>

//             {/* Progress Bar */}
//             <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
//               <div
//                 className="bg-gradient-to-r from-[#90A5FB] to-[#123962] h-2 rounded-full transition-all duration-1000"
//                 style={{ width: `${Math.min(raisedPercentage, 100)}%` }}
//               />
//             </div>
//           </div>

//           {/* Action Buttons */}
//           <div className="flex gap-2 pt-2">
//             <Button
//               variant="outline"
//               size="sm"
//               onClick={handleView}
//               // className="flex-1 border-[#90A5FB]/30 text-[#123962] hover:bg-[#90A5FB]/10 hover:border-[#90A5FB]/50"
//               className=" flex-1 sm:w-auto bg-gradient-to-r from-[#123962] to-[#90A5FB] hover:from-[#0d2640] hover:to-[#7088e8] text-white border-0 shadow-lg shadow-[#90A5FB]/30 transition-all hover:scale-105 active:scale-95"

//             >
//               <Eye className="h-4 w-4 mr-1.5" />
//               View
//             </Button>
//             <Button
//               variant="outline"
//               size="sm"
//               onClick={confirmDelete}
//               disabled={isDeleting || project.status === 'active' || project.status === 'live'}
//               className="border-red-200 text-red-600 bg-red-50 disabled:opacity-50 cursor-allowed hover:bg-red-100 hover:border-red-300 hover:text-red-600 flex-1 "
//               title={
//                 project.status === 'active' || project.status === 'live'
//                   ? 'Active or live projects cannot be deleted'
//                   : ''
//               }
//             >
//               <Trash2 className="h-4 w-4 mr-1.5" />
//               {isDeleting ? 'Deleting...' : 'Delete'}
//             </Button>
//           </div>
//         </div>
//       </div>

//       {/* Delete confirmation modal */}
//       <ConfirmDeleteModal
//         isOpen={isModalOpen}
//         title={`Delete "${project.name}"?`}
//         description="This action cannot be undone. All project data will be permanently removed."
//         onConfirm={confirmDelete}
//         onCancel={closeModal}
//         loading={isDeleting}
//       />

//       {/* Error display */}
//       {error && (
//         <div className="absolute -bottom-14 left-0 right-0 bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg shadow-lg animate-in slide-in-from-bottom-2 z-10">
//           <div className="flex items-center gap-2">
//             <Zap className="w-4 h-4" />
//             {error}
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }



//refactor 

import { useState, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ConfirmDeleteModal } from './modals/ConfirmDeleteModal';
import {
  Edit,
  Trash2,
  Eye,
  Users,
  CheckCircle,
  TrendingUp,
  Zap,
  DollarSign,
  Target,
  Building2,
} from 'lucide-react';
import { useDeleteProject } from '@/features/project/hook/useDeleteProject';

// Move helpers outside component to avoid redeclaration
function decodeHtmlEntities(str: string): string {
  const txt = document.createElement('textarea');
  txt.innerHTML = str;
  return txt.value;
}

function formatHBARs(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatNumber(num: number): string {
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

const statusConfig = {
  active: {
    label: 'Active',
    className: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20',
    icon: CheckCircle,
  },
  draft: {
    label: 'Draft',
    className: 'bg-amber-500/10 text-amber-700 border-amber-500/20',
    icon: Edit,
  },
  live: {
    label: 'Live',
    className: 'bg-green-500/10 text-green-700 border-green-500/20',
    icon: Eye,
  },
};

interface Project {
  projectId: string;
  name: string;
  status: 'active' | 'draft' | 'live';
  category: string;
  description: string;
  targetFundingGoal: number;
  pricePerStock: number;
  stockSupply: number;
  soldShares: number;
  totalRaised?: number;
  investorCount?: number;
  coverImageUrl?: string;
  createdAt: string;
}

interface ProjectCardProps {
  project: Project;
  onViewDetails?: (projectId: string) => void;
  onEdit?: (projectId: string) => void;
  onDeleteSuccess?: () => void;
}

export function ProjectCard({
  project,
  onViewDetails,
  onEdit,
  onDeleteSuccess,
}: ProjectCardProps) {
  const [isImageLoading, setIsImageLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isDeleting, deleteProjectById } = useDeleteProject(() => {
    setIsModalOpen(false);
    onDeleteSuccess?.();
  });

  // Memoize status and icon
  const status = useMemo(() => statusConfig[project.status] ?? statusConfig.draft, [project.status]);
  const StatusIcon = status.icon;

  // Memoize numeric values
  const totalShares = useMemo(() => project.stockSupply || 0, [project.stockSupply]);
  const soldShares = useMemo(() => project.soldShares || 0, [project.soldShares]);
  const totalRaised = useMemo(() => project.totalRaised ?? 0, [project.totalRaised]);
  const targetAmount = useMemo(() => project.targetFundingGoal || 0, [project.targetFundingGoal]);
  const investorCount = useMemo(() => project.investorCount ?? 0, [project.investorCount]);
  const pricePerStock = useMemo(() => project.pricePerStock || 0, [project.pricePerStock]);

  const progressPercentage = useMemo(() => (totalShares > 0 ? (soldShares / totalShares) * 100 : 0), [soldShares, totalShares]);
  const raisedPercentage = useMemo(() => (targetAmount > 0 ? (totalRaised / targetAmount) * 100 : 0), [totalRaised, targetAmount]);

  // Memoize event handlers
  const handleView = useCallback(() => onViewDetails?.(project.projectId), [onViewDetails, project.projectId]);
  const handleEdit = useCallback(() => onEdit?.(project.projectId), [onEdit, project.projectId]);
  const closeModal = useCallback(() => setIsModalOpen(false), []);
  const confirmDelete = useCallback(() => {
    deleteProjectById(project.projectId).catch((err) => {
      setError(err.message || 'Failed to delete project');
    });
  }, [deleteProjectById, project.projectId]);

  return (
    <div className="group relative">
      <div className="bg-white rounded-xl border border-gray-200 hover:border-[#90A5FB]/50 transition-all duration-300 hover:shadow-xl overflow-hidden">
        <div className="relative h-48 overflow-hidden bg-gradient-to-br from-[#123962]/5 to-[#90A5FB]/10">
          {project.coverImageUrl ? (
            <img
              src={decodeHtmlEntities(project.coverImageUrl)}
              alt={project.name}
              className={`w-full h-full object-cover transition-all duration-500 group-hover:scale-105 ${
                isImageLoading ? 'opacity-0' : 'opacity-100'
              }`}
              onLoad={() => setIsImageLoading(false)}
              onError={() => setIsImageLoading(false)}
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <Building2 className="w-16 h-16 text-[#123962]/20" />
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

          <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2">
            <Badge className={`${status.className} backdrop-blur-sm flex items-center gap-1.5 px-2.5 py-1 shadow-lg`}>
              <StatusIcon className="h-3 w-3" />
              {status.label}
            </Badge>
            <Badge className="bg-white/90 text-gray-700 border-0 px-2.5 py-1 shadow-lg backdrop-blur-sm">
              {project.category}
            </Badge>
          </div>

          <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between text-white">
            <div>
              <div className="text-2xl font-bold">{formatNumber(investorCount)}</div>
              <div className="text-xs text-white/90">Investors</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">{raisedPercentage.toFixed(0)}%</div>
              <div className="text-xs text-white/90">Funded</div>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-4">
          <div className="space-y-2">
            <h3 className="font-bold text-lg text-gray-900 line-clamp-1 group-hover:text-[#123962] transition-colors">
              {project.name}
            </h3>
            <p className="text-gray-600 text-sm line-clamp-2 leading-relaxed">
              {project.description}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-gradient-to-br from-[#90A5FB]/5 to-transparent rounded-lg border border-gray-100">
              <div className="text-xs text-gray-600 mb-1">Funding Goal</div>
              <div className="font-bold text-gray-900">{formatHBARs(targetAmount)}</div>
              <div className="text-xs text-gray-500 mt-0.5">HBAR</div>
            </div>
            <div className="p-3 bg-gradient-to-br from-[#90A5FB]/5 to-transparent rounded-lg border border-gray-100">
              <div className="text-xs text-gray-600 mb-1">Raised</div>
              <div className="font-bold text-[#90A5FB]">{formatHBARs(totalRaised)}</div>
              <div className="text-xs text-gray-500 mt-0.5">HBAR</div>
            </div>
            <div className="p-3 bg-gradient-to-br from-[#123962]/5 to-transparent rounded-lg border border-gray-100">
              <div className="text-xs text-gray-600 mb-1">Share Price</div>
              <div className="font-bold text-gray-900">{formatHBARs(pricePerStock)}</div>
              <div className="text-xs text-gray-500 mt-0.5">HBAR</div>
            </div>
            <div className="p-3 bg-gradient-to-br from-[#123962]/5 to-transparent rounded-lg border border-gray-100">
              <div className="text-xs text-gray-600 mb-1">Shares</div>
              <div className="font-bold text-gray-900">{formatNumber(soldShares)}/{formatNumber(totalShares)}</div>
              <div className="text-xs text-gray-500 mt-0.5">{progressPercentage.toFixed(0)}% sold</div>
            </div>
          </div>
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-1.5 text-gray-600">
                <Target className="w-3.5 h-3.5" />
                <span className="text-xs">Progress</span>
              </div>
              <div className="flex items-center gap-1 text-[#123962] font-bold">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-sm">{raisedPercentage.toFixed(1)}%</span>
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-[#90A5FB] to-[#123962] h-2 rounded-full transition-all duration-1000"
                style={{ width: `${Math.min(raisedPercentage, 100)}%` }}
              />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleView}
              className="flex-1 sm:w-auto bg-gradient-to-r from-[#123962] to-[#90A5FB] hover:from-[#0d2640] hover:to-[#7088e8] text-white border-0 shadow-lg shadow-[#90A5FB]/30 transition-all hover:scale-105 active:scale-95"
            >
              <Eye className="h-4 w-4 mr-1.5" />
              View
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={confirmDelete}
              disabled={isDeleting || project.status === 'active' || project.status === 'live'}
              className="border-red-200 text-red-600 bg-red-50 disabled:opacity-50 cursor-allowed hover:bg-red-100 hover:border-red-300 hover:text-red-600 flex-1 "
              title={
                project.status === 'active' || project.status === 'live'
                  ? 'Active or live projects cannot be deleted'
                  : ''
              }
            >
              <Trash2 className="h-4 w-4 mr-1.5" />
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>
      </div>
      <ConfirmDeleteModal
        isOpen={isModalOpen}
        title={`Delete "${project.name}"?`}
        description="This action cannot be undone. All project data will be permanently removed."
        onConfirm={confirmDelete}
        onCancel={closeModal}
        loading={isDeleting}
      />
      {error && (
        <div className="absolute -bottom-14 left-0 right-0 bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg shadow-lg animate-in slide-in-from-bottom-2 z-10">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4" />
            {error}
          </div>
        </div>
      )}
    </div>
  );
}
