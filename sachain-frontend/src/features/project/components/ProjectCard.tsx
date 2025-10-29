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
  const status = useMemo(
    () => statusConfig[project.status] ?? statusConfig.draft,
    [project.status]
  );
  const StatusIcon = status.icon;

  // Memoize numeric values
  const totalShares = useMemo(
    () => project.stockSupply || 0,
    [project.stockSupply]
  );
  const soldShares = useMemo(
    () => project.soldShares || 0,
    [project.soldShares]
  );
  const totalRaised = useMemo(
    () => project.totalRaised ?? 0,
    [project.totalRaised]
  );
  const targetAmount = useMemo(
    () => project.targetFundingGoal || 0,
    [project.targetFundingGoal]
  );
  const investorCount = useMemo(
    () => project.investorCount ?? 0,
    [project.investorCount]
  );
  const pricePerStock = useMemo(
    () => project.pricePerStock || 0,
    [project.pricePerStock]
  );

  const progressPercentage = useMemo(
    () => (totalShares > 0 ? (soldShares / totalShares) * 100 : 0),
    [soldShares, totalShares]
  );
  const raisedPercentage = useMemo(
    () => (targetAmount > 0 ? (totalRaised / targetAmount) * 100 : 0),
    [totalRaised, targetAmount]
  );

  // Memoize event handlers
  const handleView = useCallback(
    () => onViewDetails?.(project.projectId),
    [onViewDetails, project.projectId]
  );
  const handleEdit = useCallback(
    () => onEdit?.(project.projectId),
    [onEdit, project.projectId]
  );
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
            <Badge
              className={`${status.className} backdrop-blur-sm flex items-center gap-1.5 px-2.5 py-1 shadow-lg`}
            >
              <StatusIcon className="h-3 w-3" />
              {status.label}
            </Badge>
            <Badge className="bg-white/90 text-gray-700 border-0 px-2.5 py-1 shadow-lg backdrop-blur-sm">
              {project.category}
            </Badge>
          </div>

          <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between text-white">
            <div>
              <div className="text-2xl font-bold">
                {formatNumber(investorCount)}
              </div>
              <div className="text-xs text-white/90">Investors</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">
                {raisedPercentage.toFixed(0)}%
              </div>
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
              <div className="font-bold text-gray-900">
                {formatHBARs(targetAmount)}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">HBAR</div>
            </div>
            <div className="p-3 bg-gradient-to-br from-[#90A5FB]/5 to-transparent rounded-lg border border-gray-100">
              <div className="text-xs text-gray-600 mb-1">Raised</div>
              <div className="font-bold text-[#90A5FB]">
                {formatHBARs(totalRaised)}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">HBAR</div>
            </div>
            <div className="p-3 bg-gradient-to-br from-[#123962]/5 to-transparent rounded-lg border border-gray-100">
              <div className="text-xs text-gray-600 mb-1">Share Price</div>
              <div className="font-bold text-gray-900">
                {formatHBARs(pricePerStock)}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">HBAR</div>
            </div>
            <div className="p-3 bg-gradient-to-br from-[#123962]/5 to-transparent rounded-lg border border-gray-100">
              <div className="text-xs text-gray-600 mb-1">Shares</div>
              <div className="font-bold text-gray-900">
                {formatNumber(soldShares)}/{formatNumber(totalShares)}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">
                {progressPercentage.toFixed(0)}% sold
              </div>
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
              disabled={
                isDeleting ||
                project.status === 'active' ||
                project.status === 'live'
              }
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
