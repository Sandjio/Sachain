

import { Button } from "@/components/ui/button";
import { StartupProjectList } from "@/features/project/components/StartupProjectList";
import { ProjectDetailView } from "@/features/project/components/ProjectDetail";
import { ProjectEditForm } from "@/features/project/components/ProjectEditForm";
import { useState } from "react";
import { SaveSuccessModal } from '@/features/project/components/modals/SaveSuccessModal';


interface ProjectPageProps {
  onCreateProject: () => void; // callback to open create tab
}

export default function ProjectPage({ onCreateProject }: ProjectPageProps) {
  const [currentView, setCurrentView] = useState<"list" | "details" | "edit">("list");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [showDeleteSuccess, setShowDeleteSuccess] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const refreshProjects = () => setRefreshKey(k => k + 1); // to trigger re-fetch in child component

  const handleViewDetails = (projectId: string) => {
    setSelectedProjectId(projectId);
    setCurrentView("details");
  };

  const handleEditProject = (projectId: string) => {
    setSelectedProjectId(projectId);
    setCurrentView("edit");
  };

  const handleBackToList = () => {
    setCurrentView("list");
    setSelectedProjectId(null);
  };

  const handleBackToDetails = () => {
    setCurrentView("details");
  };

  // Call refreshProjects after save (minting) success
  const handleSaveSuccess = () => {
    setShowSaveSuccess(true);
    setCurrentView("details");
    refreshProjects();
  };

  return (
    <div className="space-y-6">
      {/* Show project list */}
      {currentView === "list" && (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Projets en Cours</h2>
              <p className="text-sm text-gray-600 mt-1">
                Gestion et suivi de vos projets actifs
              </p>
            </div>

            <Button
              className="bg-[#123962] hover:bg-[#90A5FB] text-white"
              onClick={onCreateProject}
            >
              New Projet
            </Button>
          </div>

          <StartupProjectList
            onViewDetails={handleViewDetails}
            onEditProject={handleEditProject}
            refreshProjects={refreshProjects}
            key={refreshKey}
          />
        </>
      )}

      {/* Show project details */}
      {currentView === "details" && selectedProjectId && (
        <ProjectDetailView projectId={selectedProjectId} onBack={handleBackToList} onEdit={handleEditProject} />
      )}

      {/* Show project edit form */}
      {currentView === "edit" && selectedProjectId && (
        <ProjectEditForm
          projectId={selectedProjectId}
          onCancel={handleBackToDetails}
          onSaveSuccess={handleSaveSuccess}
        />
      )}

      <SaveSuccessModal
        isOpen={showSaveSuccess}
        onClose={() => setShowSaveSuccess(false)}
      />
    </div>
  );
}
