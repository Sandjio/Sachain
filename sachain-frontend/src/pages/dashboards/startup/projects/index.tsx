// import { Button } from "@/components/ui/button";
// import { ProjectList } from "@/features/project/components/ProjectList";
// import { StartupProjectList } from "@/features/project/components/StartupProjectList";
// import { Star } from "lucide-react";

// interface ProjectPageProps {
//   onCreateProject: () => void; // callback to open create tab
// }

// export default function ProjectPage({ onCreateProject }: ProjectPageProps) {
//   // Your project data or fetch here

//   return (
//     <div className="space-y-6">
//       <div className="flex items-center justify-between">
//         <div>
//           <h2 className="text-xl font-semibold text-gray-900">Projets en Cours</h2>
//           <p className="text-sm text-gray-600 mt-1">Gestion et suivi de vos projets actifs</p>
//         </div>

//         {/* Call the callback instead of router.push */}
//         <Button
//           className="bg-[#123962] hover:bg-[#90A5FB] text-white"
//           onClick={onCreateProject}
//         >
//           New Projet
//         </Button>
//       </div>

//       {/* Render your projects list / cards here */}
//       <StartupProjectList />
//     </div>
//   );
// }




// // Updated ProjectPage.tsx - Following your exact pattern
// import { Button } from "@/components/ui/button";
// import { StartupProjectList } from "@/features/project/components/StartupProjectList";
// import { ProjectDetailView } from "@/features/project/components/ProjectDetail";
// import { useState } from "react";

// interface ProjectPageProps {
//   onCreateProject: () => void; // callback to open create tab
// }

// export default function ProjectPage({ onCreateProject }: ProjectPageProps) {
//   const [currentView, setCurrentView] = useState<'list' | 'details'>('list');
//   const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

//   const handleViewDetails = (projectId: string) => {
//     setSelectedProjectId(projectId);
//     setCurrentView('details');
//   };

//   const handleBackToList = () => {
//     setCurrentView('list');
//     setSelectedProjectId(null);
//   };

//   return (
//     <div className="space-y-6">
//       {/* Show project list */}
//       {currentView === 'list' && (
//         <>
//           <div className="flex items-center justify-between">
//             <div>
//               <h2 className="text-xl font-semibold text-gray-900">Projets en Cours</h2>
//               <p className="text-sm text-gray-600 mt-1">Gestion et suivi de vos projets actifs</p>
//             </div>
            
//             <Button
//               className="bg-[#123962] hover:bg-[#90A5FB] text-white"
//               onClick={onCreateProject}
//             >
//               New Projet
//             </Button>
//           </div>
          
//           <StartupProjectList onViewDetails={handleViewDetails} />
//         </>
//       )}

//       {/* Show project details */}
//       {currentView === 'details' && selectedProjectId && (
//         <ProjectDetailView 
//           projectId={selectedProjectId}
//           onBack={handleBackToList}
//         />
//       )}
//     </div>
//   );
// }


import { Button } from "@/components/ui/button";
import { StartupProjectList } from "@/features/project/components/StartupProjectList";
import { ProjectDetailView } from "@/features/project/components/ProjectDetail";
import { ProjectEditForm } from "@/features/project/components/ProjectEditForm"; // add this import
import { useState } from "react";

interface ProjectPageProps {
  onCreateProject: () => void; // callback to open create tab
}

export default function ProjectPage({ onCreateProject }: ProjectPageProps) {
  const [currentView, setCurrentView] = useState<"list" | "details" | "edit">("list");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

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

  const handleSaveSuccess = () => {
    alert("Project saved successfully!");
    setCurrentView("details");
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
            onEditProject={handleEditProject} // pass edit handler here
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
    </div>
  );
}
