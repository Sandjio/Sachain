
// src/features/projects/hooks/useProjects.ts
import { useProjectStore } from "@/features/project/store/projectStore";

export function useProjects() {
  const { projects, loading, error, fetchProjects, clearProjects } =
    useProjectStore();

  return { projects, loading, error, fetchProjects, clearProjects };
}





