// ProjectCard.tsx - Updated to follow your callback pattern
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { ConfirmDeleteModal } from './modals/ConfirmDeleteModal';
import { useDeleteProject } from "@/features/project/hook/useDeleteProject";

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

interface ProjectCardProps {
  project: Project;
  onViewDetails?: (projectId: string) => void;
  onEdit?: (projectId: string) => void;
}

const statusColors = {
  live: "bg-green-500 text-white",
  draft: "bg-yellow-500 text-white",
};

export function ProjectCard({ project, onViewDetails, onDeleteSuccess }: ProjectCardProps & { onDeleteSuccess?: () => void }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isDeleting, deleteProjectById } = useDeleteProject(() => {
    setIsModalOpen(false);
    onDeleteSuccess?.();
  });

  const statusClass = statusColors[project.status] || "bg-gray-500 text-white";
  
  const displayData = {
    title: project.name || "Untitled Project",
    goal: `$${(project.targetFundingGoal || 0).toLocaleString()}`,
    raised: "$0",
    investors: 0,
    daysLeft: "30",
    progressPercent: 0,
    image: project.coverImageUrl,
  };
  

  const handleViewDetails = () => {
    onViewDetails?.(project.projectId);
  };

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);
  const confirmDelete = () => {
    deleteProjectById(project.projectId).catch((err) => {
      setError(err.message || "Failed to delete project");
    });
  };

  const goalNumber = project.targetFundingGoal || 0;
  const raisedNumber = 0;
  const remainingToGoal = `$${(goalNumber - raisedNumber).toLocaleString()}`;

  return (
    <div className="bg-white rounded-xl border border-gray-200 cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all">
      <div className="relative h-48 bg-gray-100 flex flex-col justify-center items-center text-gray-500 text-sm font-medium rounded-t-xl">
        <span className={`absolute top-4 right-4 rounded-full px-4 py-1 text-xs font-semibold uppercase tracking-wide ${statusClass}`}>
          {project.status}
        </span>
        
        {displayData.image ? (
          <img src={displayData.image} alt={displayData.title} className="object-cover w-full h-full rounded-t-xl" />
        ) : (
          <div className="whitespace-pre-line text-center">
            {`Project Image Placeholder\n${displayData.title}`}
          </div>
        )}
      </div>
      
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900 leading-tight">
              {displayData.title}
            </h3>
            <p className="text-xs uppercase tracking-wide text-gray-500">
              {project.category}
            </p>
          </div>
          <button
            className="bg-transparent border-none text-2xl text-gray-500 hover:bg-gray-100 rounded-full p-1 transition"
            aria-label="Project actions"
          >
            ⋯
          </button>
        </div>
        
        <p className="text-sm text-gray-600 mb-5 line-clamp-2">
          {project.description}
        </p>
        
        <div className="grid grid-cols-3 gap-4 mb-5 text-center">
          <Metric label="Raised" value={displayData.raised} />
          <Metric label="Investors" value={displayData.investors} />
          <Metric label="Days Left" value={displayData.daysLeft} />
        </div>
        
        {project.status !== "draft" && (
          <div className="mb-5">
            <div className="h-2 w-full rounded bg-gray-200 overflow-hidden">
              <div 
                className="h-full bg-green-500 rounded transition-all" 
                style={{ width: `${displayData.progressPercent}%` }} 
              />
            </div>
            <div className="flex justify-between text-xs text-gray-600 mt-1">
              <span>
                {displayData.progressPercent}% of {displayData.goal} goal
              </span>
              <span>{remainingToGoal} to go</span>
            </div>
          </div>
        )}
        
        <div className="flex gap-3">
          <Button 
            variant="default" 
            className="flex-1"
            onClick={handleViewDetails}
          >
            View Details
          </Button>
          <Button 
            variant="outline" 
            className="text-red-600 hover:text-red-700 hover:border-red-300"
            onClick={openModal}
            disabled={isDeleting}
          >
            {isDeleting ? "..." : "Delete"}
          </Button>
          <ConfirmDeleteModal
            isOpen={isModalOpen}
            title={`Delete \"${project.name}\"?`}
            description="This action cannot be undone."
            onConfirm={confirmDelete}
            onCancel={() => setIsModalOpen(false)}
            loading={isDeleting}
          />
          {/* Optionally, show error UI here */}
          {error && (
            <div className="text-red-600 text-sm mt-2">{error}</div>
          )}
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div className="text-base font-bold text-gray-900">{value}</div>
      <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
    </div>
  );
}