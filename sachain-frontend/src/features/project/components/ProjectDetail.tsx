import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { getProjectById } from '@/features/project/core/api';
import { useDeleteProject } from '@/features/project/hook/useDeleteProject';
import { ConfirmDeleteModal } from './modals/ConfirmDeleteModal';
import { DeleteSuccessModal } from './modals/DeleteSuccess';
import ConnectWalletDialog from '@/features/wallet/components/ConnectWalletDialog';

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
}

interface ProjectDetailViewProps {
  projectId: string;
  onBack: () => void; // callback to go back to projects list
  onEdit: (projectId: string) => void; // optional callback to edit project
}

const statusColors = {
  live: 'bg-green-500 text-white',
  draft: 'bg-yellow-500 text-white',
};

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
  const { isDeleting, deleteProjectById } = useDeleteProject(() => {
    setIsModalOpen(false);
    setShowSuccess(true);
    onBack();
  });
  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);
  const confirmDelete = () => {
    if (!project) return;
    deleteProjectById(project.projectId).catch((err) => {
      setErrorMsg(err.message || 'Failed to delete project');
    });
  };

  const [isDialogOpen, setDialogOpen] = useState(false);

  const openTokenizationDialog = () => {
    setDialogOpen(true);
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
      <div>
        <button
          onClick={onBack}
          className="mb-4 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
        >
          Back to Projects
        </button>
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading project details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div>
        <button
          onClick={onBack}
          className="mb-4 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
        >
          Back to Projects
        </button>
        <div className="text-center p-8">
          <p className="text-red-600">Error: {error || 'Project not found'}</p>
        </div>
      </div>
    );
  }

  const statusClass = statusColors[project.status] || 'bg-gray-500 text-white';

  return (
    <div className="max-w-4xl mx-auto">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="mb-6 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
      >
        Back to Projects
      </button>

      {/* Project Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {project.name}
              </h1>
              <p className="text-gray-600 mt-1">Project Details</p>
            </div>
            <span
              className={`rounded-full px-4 py-2 text-sm font-semibold uppercase tracking-wide ${statusClass}`}
            >
              {project.status}
            </span>
          </div>

          {/* Cover Image */}
          {project.coverImageUrl && (
            <div className="mb-6">
              <img
                src={project.coverImageUrl}
                alt={project.name}
                className="w-full h-64 object-cover rounded-lg"
              />
            </div>
          )}
        </div>
      </div>

      {/* Project Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Basic Info */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Basic Information
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Category
              </label>
              <p className="text-gray-900 capitalize">
                {project.category?.replace('_', ' ') ?? 'Unknown category'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Created Date
              </label>
              <p className="text-gray-900">
                {new Date(project.createdAt).toLocaleDateString()}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Project ID
              </label>
              <p className="text-gray-500 text-sm font-mono">
                {project.projectId}
              </p>
            </div>
          </div>
        </div>

        {/* Financial Info */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Financial Details
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Funding Goal
              </label>
              <p className="text-2xl font-bold text-gray-900">
                ${project.targetFundingGoal?.toLocaleString() ?? 'N/A'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Price Per Stock
              </label>
              <p className="text-xl font-semibold text-gray-900">
                ${project.pricePerStock}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Stock Supply
              </label>
              <p className="text-xl font-semibold text-gray-900">
                {project.stockSupply} shares
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Description
        </h2>
        <p className="text-gray-700 leading-relaxed">{project.description}</p>
      </div>

      {/* Action Buttons */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex gap-4">
          <Button
            className="bg-[#123962] hover:bg-[#90A5FB] text-white"
            onClick={() => {
              console.log('Project in detail view:', project);
              console.log(
                'Edit button clicked for project:',
                project.projectId
              );
              onEdit(project.projectId);
            }}
          >
            Edit Project
          </Button>

          {project.status === 'draft' && (
            <Button onClick={openTokenizationDialog}>Tokenize & Go Live</Button>
          )}

          <Button
            variant="outline"
            className="text-red-600 hover:text-red-700 hover:border-red-300"
            onClick={openModal}
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete Project'}
          </Button>
        </div>
      </div>

      <ConfirmDeleteModal
        isOpen={isModalOpen}
        title={`Delete \"${project?.name}\"?`}
        description="This action cannot be undone."
        onConfirm={confirmDelete}
        onCancel={closeModal}
        loading={isDeleting}
      />
      <DeleteSuccessModal
        isOpen={showSuccess}
        onClose={() => setShowSuccess(false)}
      />
      {errorMsg && <div className="text-red-600 text-sm mt-2">{errorMsg}</div>}

      <ConnectWalletDialog open={isDialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
