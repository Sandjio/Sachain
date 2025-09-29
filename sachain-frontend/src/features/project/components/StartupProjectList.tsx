import React, { useEffect, useState } from 'react';
import { useProjects } from '../hook/useProjects';
import { ProjectCard } from './ProjectCard';
import { DeleteSuccessModal } from './modals/DeleteSuccess';

interface StartupProjectListProps {
  onViewDetails?: (projectId: string) => void;
  onEditProject?: (projectId: string) => void;
  refreshProjects?: () => void;
}

export function StartupProjectList({
  onViewDetails,
  onEditProject,
  refreshProjects,
}: StartupProjectListProps) {
  const { projects, loading, error, fetchProjects } = useProjects();
  const [showDeleteSuccess, setShowDeleteSuccess] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  if (loading) return <p>Loading projects...</p>;
  if (error) return <p className="text-red-500">❌ {error}</p>;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">My Projects</h2>

      {projects.length === 0 && <p>No projects yet. Create one!</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.isArray(projects) && projects.length > 0 ? (
          projects.map((project: any) => (
            <ProjectCard
              key={project.projectId || project.id}
              project={project}
              onViewDetails={onViewDetails}
              onDeleteSuccess={() => setShowDeleteSuccess(true)}
            />
          ))
        ) : (
          <p className="text-gray-500">No projects found.</p>
        )}
      </div>

      <button
        onClick={fetchProjects}
        className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
      >
        🔄 Refresh
      </button>

      <DeleteSuccessModal
        isOpen={showDeleteSuccess}
        onClose={() => setShowDeleteSuccess(false)}
      />
    </div>
  );
}
