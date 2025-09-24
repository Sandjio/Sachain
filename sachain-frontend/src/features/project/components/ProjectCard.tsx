// // ProjectCard.tsx - Updated to follow your callback pattern
// import { Button } from '@/components/ui/button';
// import { useState } from 'react';
// import { ConfirmDeleteModal } from './modals/ConfirmDeleteModal';
// import { useDeleteProject } from "@/features/project/hook/useDeleteProject";

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
// }

// interface ProjectCardProps {
//   project: Project;
//   onViewDetails?: (projectId: string) => void;
//   onEdit?: (projectId: string) => void;
// }

// const statusColors = {
//   live: "bg-green-500 text-white",
//   draft: "bg-yellow-500 text-white",
// };

// export function ProjectCard({ project, onViewDetails, onDeleteSuccess }: ProjectCardProps & { onDeleteSuccess?: () => void }) {
//   const [isModalOpen, setIsModalOpen] = useState(false);
//   const [error, setError] = useState<string | null>(null);
//   const { isDeleting, deleteProjectById } = useDeleteProject(() => {
//     setIsModalOpen(false);
//     onDeleteSuccess?.();
//   });

//   const statusClass = statusColors[project.status] || "bg-gray-500 text-white";
  
//   const displayData = {
//     title: project.name || "Untitled Project",
//     goal: `$${(project.targetFundingGoal || 0).toLocaleString()}`,
//     raised: "$0",
//     investors: 0,
//     daysLeft: "30",
//     progressPercent: 0,
//     image: project.coverImageUrl,
//   };
  

//   const handleViewDetails = () => {
//     onViewDetails?.(project.projectId);
//   };

//   const openModal = () => setIsModalOpen(true);
//   const closeModal = () => setIsModalOpen(false);
//   const confirmDelete = () => {
//     deleteProjectById(project.projectId).catch((err) => {
//       setError(err.message || "Failed to delete project");
//     });
//   };

//   const goalNumber = project.targetFundingGoal || 0;
//   const raisedNumber = 0;
//   const remainingToGoal = `$${(goalNumber - raisedNumber).toLocaleString()}`;

//   return (
//     <div className="bg-white rounded-xl border border-gray-200 cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all">
//       <div className="relative h-48 bg-gray-100 flex flex-col justify-center items-center text-gray-500 text-sm font-medium rounded-t-xl">
//         <span className={`absolute top-4 right-4 rounded-full px-4 py-1 text-xs font-semibold uppercase tracking-wide ${statusClass}`}>
//           {project.status}
//         </span>
        
//         {displayData.image ? (
//           <img src={displayData.image} alt={displayData.title} className="object-cover w-full h-full rounded-t-xl" />
//         ) : (
//           <div className="whitespace-pre-line text-center">
//             {`Project Image Placeholder\n${displayData.title}`}
//           </div>
//         )}
//       </div>
      
//       <div className="p-6">
//         <div className="flex justify-between items-start mb-4">
//           <div>
//             <h3 className="text-lg font-bold text-gray-900 leading-tight">
//               {displayData.title}
//             </h3>
//             <p className="text-xs uppercase tracking-wide text-gray-500">
//               {project.category}
//             </p>
//           </div>
//           <button
//             className="bg-transparent border-none text-2xl text-gray-500 hover:bg-gray-100 rounded-full p-1 transition"
//             aria-label="Project actions"
//           >
//             ⋯
//           </button>
//         </div>
        
//         <p className="text-sm text-gray-600 mb-5 line-clamp-2">
//           {project.description}
//         </p>
        
//         <div className="grid grid-cols-3 gap-4 mb-5 text-center">
//           <Metric label="Raised" value={displayData.raised} />
//           <Metric label="Investors" value={displayData.investors} />
//           <Metric label="Days Left" value={displayData.daysLeft} />
//         </div>
        
//         {project.status !== "draft" && (
//           <div className="mb-5">
//             <div className="h-2 w-full rounded bg-gray-200 overflow-hidden">
//               <div 
//                 className="h-full bg-green-500 rounded transition-all" 
//                 style={{ width: `${displayData.progressPercent}%` }} 
//               />
//             </div>
//             <div className="flex justify-between text-xs text-gray-600 mt-1">
//               <span>
//                 {displayData.progressPercent}% of {displayData.goal} goal
//               </span>
//               <span>{remainingToGoal} to go</span>
//             </div>
//           </div>
//         )}
        
//         <div className="flex gap-3">
//           <Button 
//             variant="default" 
//             className="flex-1"
//             onClick={handleViewDetails}
//           >
//             View Details
//           </Button>
//           <Button 
//             variant="outline" 
//             className="text-red-600 hover:text-red-700 hover:border-red-300"
//             onClick={openModal}
//             disabled={isDeleting}
//           >
//             {isDeleting ? "..." : "Delete"}
//           </Button>
//           <ConfirmDeleteModal
//             isOpen={isModalOpen}
//             title={`Delete \"${project.name}\"?`}
//             description="This action cannot be undone."
//             onConfirm={confirmDelete}
//             onCancel={() => setIsModalOpen(false)}
//             loading={isDeleting}
//           />
//           {error && (
//             <div className="text-red-600 text-sm mt-2">{error}</div>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }

// function Metric({ label, value }: { label: string; value: string | number }) {
//   return (
//     <div>
//       <div className="text-base font-bold text-gray-900">{value}</div>
//       <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
//     </div>
//   );
// }




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
//   CheckCircle
// } from 'lucide-react';
// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuItem,
//   DropdownMenuSeparator,
//   DropdownMenuTrigger,
// } from '@/components/ui/dropdown-menu';
// import { useDeleteProject } from "@/features/project/hook/useDeleteProject";

// interface Project {
//   projectId: string;
//   name: string;
//   status: 'active' | 'draft' | 'live';
//   category: string;
//   description: string;
//   targetFundingGoal: number; // corresponds to targetAmount
//   pricePerStock: number; // corresponds to sharePrice
//   stockSupply: number; // corresponds to totalShares
//   soldShares: number;
//   totalRaised?: number; // optionally add if available
//   investorCount?: number; // optionally add if available
//   coverImageUrl?: string; // corresponds to image
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
//     bgColor: 'bg-green-100',
//     textColor: 'text-green-800',
//     icon: CheckCircle,
//   },
//   draft: {
//     label: 'Draft',
//     variant: 'secondary' as const,
//     bgColor: 'bg-gray-100',
//     textColor: 'text-gray-800',
//     icon: Edit,
//   },
//   live: {
//     label: 'Live',
//     variant: 'default' as const,
//     bgColor: 'bg-blue-100',
//     textColor: 'text-blue-800',
//     icon: Eye,
//   },
//   pending: {
//     label: 'Pending',
//     variant: 'secondary' as const,
//     bgColor: 'bg-yellow-100',
//     textColor: 'text-yellow-800',
//     icon: Clock,
//   },
// };

// export function ProjectCard({ project, onViewDetails, onEdit, onDeleteSuccess }: ProjectCardProps) {
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

//   const progressPercentage = totalShares > 0 ? (soldShares / totalShares) * 100 : 0;
//   const raisedPercentage = targetAmount > 0 ? (totalRaised / targetAmount) * 100 : 0;

//   // Formatting helpers
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
//       setError(err.message || "Failed to delete project");
//     });
//   };

//   return (
//     <div className="group hover:shadow-lg transition-all duration-300 border border-gray-200 hover:border-[#90A5FB]/50 bg-white rounded-xl">
//       <div className="relative h-48 w-full overflow-hidden rounded-t-xl">
//         {isImageLoading && (
//           <div className="absolute inset-0 bg-gray-100 animate-pulse flex items-center justify-center">
//             <div className="w-16 h-16 bg-gray-200 rounded-lg"></div>
//           </div>
//         )}
//         {project.coverImageUrl ? (
//           <img
//             src={project.coverImageUrl}
//             alt={project.name}
//             className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 ${
//               isImageLoading ? 'opacity-0' : 'opacity-100'
//             }`}
//             onLoad={() => setIsImageLoading(false)}
//             onError={() => setIsImageLoading(false)}
//           />
//         ) : (
//           <div className="flex h-full items-center justify-center rounded-t-xl bg-gray-100 text-gray-500">
//             No Image
//           </div>
//         )}

//         {/* Status Badge */}
//         <div className="absolute top-3 left-3">
//           <Badge
//             variant={status.variant}
//             className={`${status.bgColor} ${status.textColor} border-0 flex items-center gap-1`}
//           >
//             <StatusIcon className="h-3 w-3" />
//             {status.label}
//           </Badge>
//         </div>

//         {/* Category Badge */}
//         <div className="absolute bottom-3 left-3">
//           <Badge variant="outline" className="bg-white/90 backdrop-blur-sm">
//             {project.category}
//           </Badge>
//         </div>
//       </div>

//       <div className="p-6 space-y-4">
//         {/* Project Name and Description */}
//         <div>
//           <h3 className="font-semibold text-lg text-gray-900 mb-2 line-clamp-1">
//             {project.name}
//           </h3>
//           <p className="text-gray-600 text-sm line-clamp-2 leading-relaxed">
//             {project.description}
//           </p>
//         </div>

//         {/* Progress Section */}
//         <div className="space-y-3">
//           <div className="flex justify-between items-center text-sm">
//             <span className="text-gray-600">Funding Progress</span>
//             <span className="font-medium text-[#123962]">{raisedPercentage.toFixed(1)}%</span>
//           </div>
//           <Progress
//             value={raisedPercentage}
//             className="h-2 bg-gray-100"
//             style={{ '--progress-background': '#90A5FB' } as React.CSSProperties}
//           />
//           <div className="flex justify-between text-sm">
//             <span className="text-gray-500">{formatHBARs(totalRaised)} HBAR raised</span>
//             <span className="text-gray-500">{formatHBARs(targetAmount)} HBAR goal</span>
//           </div>
//         </div>

//         {/* Shares & Investors Section */}
//         <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100">
//           <div className="text-center">
//             <div className="text-sm text-gray-500 mb-1">Shares Sold</div>
//             <div className="font-semibold text-[#123962]">
//               {formatNumber(soldShares)}/{formatNumber(totalShares)}
//             </div>
//             <div className="text-xs text-gray-400">{progressPercentage.toFixed(1)}% sold</div>
//           </div>

//           <div className="text-center border-l border-gray-100 pl-4">
//             <div className="text-sm text-gray-500 mb-1">Investors</div>
//             <div className="font-semibold text-[#123962] flex items-center justify-center gap-1">
//               <Users className="h-4 w-4" />
//               {formatNumber(investorCount)}
//             </div>
//             <div className="text-xs text-gray-400">{formatHBARs(pricePerStock)} HBAR/share</div>
//           </div>
//         </div>

//         {/* Action Buttons */}
//         <div className="flex gap-2 pt-2">
//           <Button
//             variant="outline"
//             size="sm"
//             onClick={handleView}
//             className="flex-1 border-[#90A5FB] text-[#123962] hover:bg-[#90A5FB]/10"
//           >
//             <Eye className="h-4 w-4 mr-2" />
//             View
//           </Button>
//           <Button
//             variant="outline"
//             size="sm"
//             className="text-red-600 hover:text-red-700 hover:border-red-300 flex-1"
//             onClick={confirmDelete}
//             disabled={isDeleting || project.status === 'active' || project.status === 'live'}
//             title={project.status === 'active' || project.status === 'live' ? 'Active or live projects cannot be deleted' : ''}
//           >
//             <Trash2 className="h-4 w-4 mr-2" />
//             {isDeleting ? 'Deleting...' : 'Delete'}
//           </Button>
//         </div>
//       </div>

//       {/* Delete Modal triggered by your existing logic, you can add a delete button similarly if needed */}
//     </div>
//   );
// }







import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ConfirmDeleteModal } from './modals/ConfirmDeleteModal';
import { 
  MoreVertical, 
  Edit, 
  Trash2, 
  Eye, 
  Users, 
  Clock,
  CheckCircle,
  TrendingUp,
  Zap,
  DollarSign,
  Target,
  Sparkles
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
 import { useDeleteProject } from "@/features/project/hook/useDeleteProject";

interface Project {
  projectId: string;
  name: string;
  status: 'active' | 'draft' | 'live';
  category: string;
  description: string;
  targetFundingGoal: number; // corresponds to targetAmount
  pricePerStock: number; // corresponds to sharePrice
  stockSupply: number; // corresponds to totalShares
  soldShares: number;
  totalRaised?: number; // optionally add if available
  investorCount?: number; // optionally add if available
  coverImageUrl?: string; // corresponds to image
  createdAt: string;
}

interface ProjectCardProps {
  project: Project;
  onViewDetails?: (projectId: string) => void;
  onEdit?: (projectId: string) => void;
  onDeleteSuccess?: () => void;
}

const statusConfig = {
  active: {
    label: 'Active',
    variant: 'default' as const,
    bgColor: 'bg-emerald-500/10 border-emerald-500/20',
    textColor: 'text-emerald-700',
    glowColor: 'shadow-emerald-500/20',
    icon: CheckCircle,
  },
  draft: {
    label: 'Draft',
    variant: 'secondary' as const,
    bgColor: 'bg-amber-500/10 border-amber-500/20',
    textColor: 'text-amber-700',
    glowColor: 'shadow-amber-500/20',
    icon: Edit,
  },
  live: {
    label: 'Live',
    variant: 'default' as const,
    bgColor: 'bg-blue-500/10 border-blue-500/20',
    textColor: 'text-blue-700',
    glowColor: 'shadow-blue-500/20',
    icon: Eye,
  },
  pending: {
    label: 'Pending',
    variant: 'secondary' as const,
    bgColor: 'bg-purple-500/10 border-purple-500/20',
    textColor: 'text-purple-700',
    glowColor: 'shadow-purple-500/20',
    icon: Clock,
  },
};

export function ProjectCard({ project, onViewDetails, onEdit, onDeleteSuccess }: ProjectCardProps) {
  const [isImageLoading, setIsImageLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isDeleting, deleteProjectById } = useDeleteProject(() => {
    setIsModalOpen(false);
    onDeleteSuccess?.();
  });

  const status = statusConfig[project.status] ?? statusConfig.draft;
  const StatusIcon = status.icon;

  // Progress calculations with safe fallback
  const totalShares = project.stockSupply || 0;
  const soldShares = project.soldShares || 0;
  const totalRaised = project.totalRaised ?? 0;
  const targetAmount = project.targetFundingGoal || 0;
  const investorCount = project.investorCount ?? 0;
  const pricePerStock = project.pricePerStock || 0;

  const progressPercentage = totalShares > 0 ? (soldShares / totalShares) * 100 : 0;
  const raisedPercentage = targetAmount > 0 ? (totalRaised / targetAmount) * 100 : 0;

  // Formatting helpers
  const formatHBARs = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  };
  
  const formatNumber = (num: number) => {
    if (num >= 1_000_000) {
      return (num / 1_000_000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  // Event handlers
  const handleView = () => onViewDetails?.(project.projectId);
  const handleEdit = () => onEdit?.(project.projectId);
  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);
  const confirmDelete = () => {
    deleteProjectById(project.projectId).catch((err) => {
      setError(err.message || "Failed to delete project");
    });
  };

  return (
    <div className="group relative overflow-hidden">
      {/* Main Card */}
      <div className="relative bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 hover:border-primary/30 transition-all duration-500 hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-2">
        
        {/* Gradient Background Effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        {/* Hero Image Section */}
        <div className="relative h-56 w-full overflow-hidden rounded-t-2xl">
          {/* Loading State */}
          {isImageLoading && (
            <div className="absolute inset-0 bg-gradient-to-br from-gray-100 via-gray-50 to-gray-100 animate-pulse flex items-center justify-center">
              <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-accent/20 rounded-2xl flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-primary/40 animate-pulse" />
              </div>
            </div>
          )}
          
          {/* Image or Placeholder */}
          {project.coverImageUrl ? (
            <img
              src={project.coverImageUrl}
              alt={project.name}
              className={`w-full h-full object-cover transition-all duration-700 group-hover:scale-110 ${
                isImageLoading ? 'opacity-0' : 'opacity-100'
              }`}
              onLoad={() => setIsImageLoading(false)}
              onError={() => setIsImageLoading(false)}
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-gradient-to-br from-primary/10 via-primary/5 to-accent/10">
              <div className="text-center space-y-3">
                <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto">
                  <TrendingUp className="w-8 h-8 text-primary/60" />
                </div>
                <p className="text-primary/70 font-medium">Project Preview</p>
              </div>
            </div>
          )}

          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
          
          {/* Floating Elements */}
          <div className="absolute inset-0">
            {/* Status Badge */}
            <div className="absolute top-4 left-4">
              <Badge
                className={`${status.bgColor} ${status.textColor} border backdrop-blur-sm flex items-center gap-2 px-3 py-1.5 font-semibold shadow-lg ${status.glowColor}`}
              >
                <StatusIcon className="h-3.5 w-3.5" />
                {status.label}
              </Badge>
            </div>

            {/* Category Badge */}
            <div className="absolute top-4 right-4">
              <Badge className="bg-white/10 text-white border-white/20 backdrop-blur-sm px-3 py-1.5">
                {project.category}
              </Badge>
            </div>

            {/* Quick Stats Overlay */}
            <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
              <div className="text-white">
                <div className="text-2xl font-bold">{formatNumber(investorCount)}</div>
                <div className="text-xs text-white/80 flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  Investors
                </div>
              </div>
              <div className="text-white text-right">
                <div className="text-2xl font-bold">{raisedPercentage.toFixed(0)}%</div>
                <div className="text-xs text-white/80">Funded</div>
              </div>
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="relative p-6 space-y-5">
          {/* Project Title & Description */}
          <div className="space-y-3">
            <h3 className="font-bold text-xl text-gray-900 line-clamp-1 group-hover:text-primary transition-colors duration-300">
              {project.name}
            </h3>
            <p className="text-gray-600 text-sm line-clamp-2 leading-relaxed">
              {project.description}
            </p>
          </div>

          {/* Enhanced Progress Section */}
          <div className="space-y-4 p-4 bg-gradient-to-r from-gray-50/80 to-gray-50/40 rounded-xl border border-gray-100/80">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-gray-700">Funding Progress</span>
              </div>
              <div className="flex items-center gap-1">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                <span className="font-bold text-primary text-lg">{raisedPercentage.toFixed(1)}%</span>
              </div>
            </div>
            
            <div className="relative">
              <Progress
                value={raisedPercentage}
                className="h-3 bg-gray-200/60 rounded-full overflow-hidden"
              />
              <div 
                className="absolute top-0 left-0 h-3 bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-1000 ease-out shadow-lg"
                style={{ width: `${raisedPercentage}%` }}
              />
              {raisedPercentage > 0 && (
                <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-accent/20 rounded-full animate-pulse" />
              )}
            </div>
            
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 flex items-center gap-1">
                <DollarSign className="w-3 h-3" />
                {formatHBARs(totalRaised)} HBAR raised
              </span>
              <span className="text-gray-500 font-medium">{formatHBARs(targetAmount)} HBAR goal</span>
            </div>
          </div>

          {/* Enhanced Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl p-4 border border-primary/10 group-hover:border-primary/20 transition-colors duration-300">
              <div className="text-center space-y-2">
                <div className="text-sm text-primary/70 font-medium">Shares Sold</div>
                <div className="text-xl font-bold text-primary">
                  {formatNumber(soldShares)}<span className="text-sm text-gray-500">/{formatNumber(totalShares)}</span>
                </div>
                <div className="text-xs text-primary/60 bg-primary/10 rounded-full px-2 py-1">
                  {progressPercentage.toFixed(1)}% sold
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-accent/5 to-accent/10 rounded-xl p-4 border border-accent/10 group-hover:border-accent/20 transition-colors duration-300">
              <div className="text-center space-y-2">
                <div className="text-sm text-accent/70 font-medium">Price per Share</div>
                <div className="text-xl font-bold text-accent flex items-center justify-center gap-1">
                  <DollarSign className="w-4 h-4" />
                  {formatHBARs(pricePerStock)}
                </div>
                <div className="text-xs text-accent/60 bg-accent/10 rounded-full px-2 py-1">
                  HBAR
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleView}
              className="flex-1 border-primary/30 text-primary hover:bg-primary hover:text-white transition-all duration-300 hover:shadow-lg hover:shadow-primary/25 hover:-translate-y-0.5"
            >
              <Eye className="h-4 w-4 mr-2" />
              View Details
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-red-600 hover:text-white hover:bg-red-500 hover:border-red-500 flex-1 transition-all duration-300 hover:shadow-lg hover:shadow-red-500/25 hover:-translate-y-0.5"
              onClick={confirmDelete}
              disabled={isDeleting || project.status === 'active' || project.status === 'live'}
              title={project.status === 'active' || project.status === 'live' ? 'Active or live projects cannot be deleted' : ''}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>

        {/* Subtle corner accent */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-accent/10 to-transparent rounded-2xl" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-primary/10 to-transparent rounded-2xl" />
      </div>

      {/* Delete confirmation modal */}
      <ConfirmDeleteModal
        isOpen={isModalOpen}
        title={`Delete "${project.name}"?`}
        description="This action cannot be undone. All project data will be permanently removed."
        onConfirm={confirmDelete}
        onCancel={closeModal}
        loading={isDeleting}
      />
      
      {/* Error display */}
      {error && (
        <div className="absolute -bottom-16 left-0 right-0 bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg shadow-lg animate-in slide-in-from-bottom-2">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4" />
            {error}
          </div>
        </div>
      )}
    </div>
  );
}