// src/features/projects/hooks/useCreateProject.ts
import { useProjectStore } from "@/features/project/store/projectStore";
import type { ProjectPayload } from "../core/types";

export function useCreateProject() {
  const { addProject, loading, error } = useProjectStore();

  const submitProject = async (payload: ProjectPayload) => {
    return await addProject(payload);
  };

  return { submitProject, loading, error };
}
