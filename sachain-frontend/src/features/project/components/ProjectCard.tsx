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
  Sparkles,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useDeleteProject } from '@/features/project/hook/useDeleteProject';

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

  const status = statusConfig[project.status] ?? statusConfig.draft;
  const StatusIcon = status.icon;

  // Progress calculations with safe fallback
  const totalShares = project.stockSupply || 0;
  const soldShares = project.soldShares || 0;
  const totalRaised = project.totalRaised ?? 0;
  const targetAmount = project.targetFundingGoal || 0;
  const investorCount = project.investorCount ?? 0;
  const pricePerStock = project.pricePerStock || 0;

  const progressPercentage =
    totalShares > 0 ? (soldShares / totalShares) * 100 : 0;
  const raisedPercentage =
    targetAmount > 0 ? (totalRaised / targetAmount) * 100 : 0;

  
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
      setError(err.message || 'Failed to delete project');
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
                <div className="text-2xl font-bold">
                  {formatNumber(investorCount)}
                </div>
                <div className="text-xs text-white/80 flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  Investors
                </div>
              </div>
              <div className="text-white text-right">
                <div className="text-2xl font-bold">
                  {raisedPercentage.toFixed(0)}%
                </div>
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
                <span className="text-sm font-medium text-gray-700">
                  Funding Progress
                </span>
              </div>
              <div className="flex items-center gap-1">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                <span className="font-bold text-primary text-lg">
                  {raisedPercentage.toFixed(1)}%
                </span>
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
              <span className="text-gray-500 font-medium">
                {formatHBARs(targetAmount)} HBAR goal
              </span>
            </div>
          </div>

          {/* Enhanced Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl p-4 border border-primary/10 group-hover:border-primary/20 transition-colors duration-300">
              <div className="text-center space-y-2">
                <div className="text-sm text-primary/70 font-medium">
                  Shares Sold
                </div>
                <div className="text-xl font-bold text-primary">
                  {formatNumber(soldShares)}
                  <span className="text-sm text-gray-500">
                    /{formatNumber(totalShares)}
                  </span>
                </div>
                <div className="text-xs text-primary/60 bg-primary/10 rounded-full px-2 py-1">
                  {progressPercentage.toFixed(1)}% sold
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-accent/5 to-accent/10 rounded-xl p-4 border border-accent/10 group-hover:border-accent/20 transition-colors duration-300">
              <div className="text-center space-y-2">
                <div className="text-sm text-accent/70 font-medium">
                  Price per Share
                </div>
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
              disabled={
                isDeleting ||
                project.status === 'active' ||
                project.status === 'live'
              }
              title={
                project.status === 'active' || project.status === 'live'
                  ? 'Active or live projects cannot be deleted'
                  : ''
              }
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>

       
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
