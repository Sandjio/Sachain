

// import { Button } from "@/components/ui/button";
// import { StartupProjectList } from "@/features/project/components/StartupProjectList";
// import { ProjectDetailView } from "@/features/project/components/ProjectDetail";
// import { ProjectEditForm } from "@/features/project/components/ProjectEditForm";
// import { useState } from "react";
// import { SaveSuccessModal } from '@/features/project/components/modals/SaveSuccessModal';


// interface ProjectPageProps {
//   onCreateProject: () => void; // callback to open create tab
// }

// export default function ProjectPage({ onCreateProject }: ProjectPageProps) {
//   const [currentView, setCurrentView] = useState<"list" | "details" | "edit">("list");
//   const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
//   const [showSaveSuccess, setShowSaveSuccess] = useState(false);
//   const [showDeleteSuccess, setShowDeleteSuccess] = useState(false);
//   const [refreshKey, setRefreshKey] = useState(0);

//   const refreshProjects = () => setRefreshKey(k => k + 1); // to trigger re-fetch in child component

//   const handleViewDetails = (projectId: string) => {
//     setSelectedProjectId(projectId);
//     setCurrentView("details");
//   };

//   const handleEditProject = (projectId: string) => {
//     setSelectedProjectId(projectId);
//     setCurrentView("edit");
//   };

//   const handleBackToList = () => {
//     setCurrentView("list");
//     setSelectedProjectId(null);
//   };

//   const handleBackToDetails = () => {
//     setCurrentView("details");
//   };

//   // Call refreshProjects after save (minting) success
//   const handleSaveSuccess = () => {
//     setShowSaveSuccess(true);
//     setCurrentView("details");
//     refreshProjects();
//   };

//   return (
//     <div className="space-y-6">
//       {/* Show project list */}
//       {currentView === "list" && (
//         <>
//           <div className="flex items-center justify-between">
//             <div>
//               <h2 className="text-xl font-semibold text-gray-900">Projets en Cours</h2>
//               <p className="text-sm text-gray-600 mt-1">
//                 Gestion et suivi de vos projets actifs
//               </p>
//             </div>

//             <Button
//               className="bg-[#123962] hover:bg-[#90A5FB] text-white"
//               onClick={onCreateProject}
//             >
//               New Projet
//             </Button>
//           </div>

//           <StartupProjectList
//             onViewDetails={handleViewDetails}
//             onEditProject={handleEditProject}
//             refreshProjects={refreshProjects}
//             key={refreshKey}
//           />
//         </>
//       )}

//       {/* Show project details */}
//       {currentView === "details" && selectedProjectId && (
//         <ProjectDetailView projectId={selectedProjectId} onBack={handleBackToList} onEdit={handleEditProject} />
//       )}

//       {/* Show project edit form */}
//       {currentView === "edit" && selectedProjectId && (
//         <ProjectEditForm
//           projectId={selectedProjectId}
//           onCancel={handleBackToDetails}
//           onSaveSuccess={handleSaveSuccess}
//         />
//       )}

//       <SaveSuccessModal
//         isOpen={showSaveSuccess}
//         onClose={() => setShowSaveSuccess(false)}
//       />
//     </div>
//   );
// }


import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Plus,
  BarChart3,
  Activity,
  Users,
  TrendingUp,
  Target,
  ArrowLeft,
  Rocket,
  Edit3,
  DollarSign,
  Sparkles
} from "lucide-react";

import { StartupProjectList } from "@/features/project/components/StartupProjectList";
import { ProjectDetailView } from "@/features/project/components/ProjectDetail";
import { ProjectEditForm } from "@/features/project/components/ProjectEditForm";
import { SaveSuccessModal } from "@/features/project/components/modals/SaveSuccessModal";

interface ProjectPageProps {
  onCreateProject: () => void;
}

export default function ProjectPage({ onCreateProject }: ProjectPageProps) {
  const [currentView, setCurrentView] = useState<"list" | "details" | "edit">("list");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const refreshProjects = () => setRefreshKey((k) => k + 1);

  const handleViewDetails = (projectId: string) => {
    setSelectedProjectId(projectId);
    setCurrentView("details");
  };

  const handleEditProject = (projectId: string) => {
    setSelectedProjectId(projectId);
    setCurrentView("edit");
  };

  const handleBackToList = () => {
    setSelectedProjectId(null);
    setCurrentView("list");
  };

  const handleBackToDetails = () => {
    setCurrentView("details");
  };

  const handleSaveSuccess = () => {
    setShowSaveSuccess(true);
    setCurrentView("details");
    refreshProjects();
  };

  const projectStats = {
    totalProjects: 10,
    activeProjects: 7,
    totalRaised: 3500000,
    totalInvestors: 2350,
    avgFunding: 85,
    successRate: 92,
  };

  const formatHBARs = (amount: number) => {
    if (amount >= 1_000_000) return (amount / 1_000_000).toFixed(1) + "M";
    if (amount >= 1_000) return (amount / 1_000).toFixed(1) + "K";
    return amount.toLocaleString();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100/80 space-y-6">
      {currentView === "list" && (
        <>
          <div className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-accent/5" />
            <div
              className="absolute inset-0 opacity-30"
              style={{
                backgroundImage: `radial-gradient(circle at 25% 25%, rgba(18, 57, 98, 0.1) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(144, 165, 251, 0.1) 0%, transparent 50%)`,
              }}
            />

            <div className="relative max-w-7xl mx-auto px-6 py-12 lg:py-16">

              <div className="text-center space-y-6 mb-12 flex flex-row items-center justify-between gap-3">
                <h2 className="text-4xl lg:text-4xl font-bold bg-gradient-to-r from-primary via-primary to-accent bg-clip-text text-transparent leading-tight">
                  Projets en Cours...
                </h2>
               
                <div className="flex justify-center pt-4">
                  <Button
                    onClick={onCreateProject}
                    className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white px-8 py-4 h-auto text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                  >
                    <Plus className="h-5 w-5 mr-3" />
                    Nouveau Projet
                    <Sparkles className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>

              {/* Stats Overview */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {[
                  {
                    icon: <BarChart3 className="h-6 w-6 text-primary" />,
                    value: projectStats.totalProjects,
                    label: "Total Projets",
                    bg: "bg-primary/10",
                    text: "text-primary",
                  },
                  {
                    icon: <Activity className="h-6 w-6 text-emerald-600" />,
                    value: projectStats.activeProjects,
                    label: "Actifs",
                    bg: "bg-emerald-100",
                    text: "text-emerald-600",
                  },
                  {
                    icon: <DollarSign className="h-6 w-6 text-accent" />,
                    value: formatHBARs(projectStats.totalRaised),
                    label: "HBAR Levés",
                    bg: "bg-accent/10",
                    text: "text-accent",
                  },
                  {
                    icon: <Users className="h-6 w-6 text-purple-600" />,
                    value: formatHBARs(projectStats.totalInvestors),
                    label: "Investisseurs",
                    bg: "bg-purple-100",
                    text: "text-purple-600",
                  },
                ].map(({ icon, value, label, bg, text }, idx) => (
                  <Card
                    key={idx}
                    className={`border-0 shadow-lg ${bg} backdrop-blur-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1`}
                  >
                    <CardContent className="p-2 text-center">
                      <div className={`w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-3 ${bg}`}>
                        {icon}
                      </div>
                      <div className="space-y-1">
                        <p className={`text-2xl font-bold ${text}`}>{value}</p>
                        <p className="text-sm text-gray-600">{label}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>

          {/* Project List Section */}
          <div className="max-w-7xl mx-auto px-6 pb-16">
            <div className="flex items-center gap-3 mb-8">
              {/* <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                <Rocket className="h-4 w-4 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">All Projects</h2> */}
              <div className="flex-1" />
              <Badge className="bg-primary/10 text-primary border-primary/20 px-3 py-1">
              <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                <Rocket className="h-4 w-4 text-primary" />
              </div>
                <h2 className="text-2xl font-bold text-gray-900">All Projects</h2>
              </Badge>
            </div>
            <StartupProjectList
              onViewDetails={handleViewDetails}
              onEditProject={handleEditProject}
              refreshProjects={refreshProjects}
              key={refreshKey}
            />
          </div>
        </>
      )}

      {/* Project Details View */}
      {currentView === "details" && selectedProjectId && (
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <Button
              variant="outline"
              onClick={handleBackToList}
              className="bg-white border-gray-200 hover:bg-gray-50"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Projects
            </Button>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <ProjectDetailView
              projectId={selectedProjectId}
              onBack={handleBackToList}
              onEdit={handleEditProject}
            />
          </div>
        </div>
      )}

      {/* Project Edit Form */}
      {currentView === "edit" && selectedProjectId && (
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <Button
              variant="outline"
              onClick={handleBackToDetails}
              className="bg-white border-gray-200 hover:bg-gray-50"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Details
            </Button>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-accent/10 rounded-lg">
                <Edit3 className="h-5 w-5 text-accent" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Edit Project</h2>
            </div>

            <ProjectEditForm
              projectId={selectedProjectId}
              onCancel={handleBackToDetails}
              onSaveSuccess={handleSaveSuccess}
            />
          </div>
        </div>
      )}

      {/* Save Success Modal */}
      <SaveSuccessModal
        isOpen={showSaveSuccess}
        onClose={() => setShowSaveSuccess(false)}
      />
    </div>
  );
}
