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
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message || 'Failed to load project');
        } else {
          setError('Failed to load project');
        }
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
          description="This action cannot be undone and will permanently remove this project's data."
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
