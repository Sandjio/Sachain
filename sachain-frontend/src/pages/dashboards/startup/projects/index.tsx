import { Button } from "@/components/ui/button";
import { ProjectList } from "@/features/project/components/ProjectList";

interface ProjectPageProps {
  onCreateProject: () => void; // callback to open create tab
}

export default function ProjectPage({ onCreateProject }: ProjectPageProps) {
  // Your project data or fetch here

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Projets en Cours</h2>
          <p className="text-sm text-gray-600 mt-1">Gestion et suivi de vos projets actifs</p>
        </div>

        {/* Call the callback instead of router.push */}
        <Button
          className="bg-[#123962] hover:bg-[#90A5FB] text-white"
          onClick={onCreateProject}
        >
          New Projet
        </Button>
      </div>

      {/* Render your projects list / cards here */}
      <ProjectList />
    </div>
  );
}
