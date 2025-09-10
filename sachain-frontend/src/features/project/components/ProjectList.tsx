import { ProjectCard } from "./ProjectCard";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/router";

interface Project {
  id: string;
  title: string;
  category: string;
  description: string;
  raised: string;
  investors: number;
  daysLeft: number | string;
  progressPercent: number;
  goal: string;
  status: "live" | "draft" | "completed" | "paused";
  image?: string;
}

const projects: Project[] = [
  // Your project data here, consistent with Project interface
];

export function ProjectList() {
  const router = useRouter();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Projets en Cours</h2>
          <p className="text-sm text-gray-600 mt-1">Gestion et suivi de vos projets actifs</p>
        </div>
        <Button
          className="bg-[#123962] hover:bg-[#90A5FB] text-white"
          onClick={() => router.push("/dashboards/startup/projects/create")}
        >
          New Projet
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {projects.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>
    </div>
  );
}
