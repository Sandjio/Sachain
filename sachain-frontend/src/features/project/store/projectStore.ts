import { create } from "zustand";
import { getProjects, createProject } from "@/features/project/core/api";
import type { Project, ProjectPayload } from "@/features/project/core/types";

interface ProjectState {
  projects: Project[];
  loading: boolean;
  error: string | null;
  fetchProjects: () => Promise<void>;
  addProject: (payload: ProjectPayload) => Promise<Project>;
  clearProjects: () => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  projects: [],
  loading: false,
  error: null,

  fetchProjects: async () => {
    set({ loading: true, error: null });
    try {
      const data = await getProjects();
      set({ projects: data.projects ?? data, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  addProject: async (payload) => {
    set({ loading: true, error: null });
    try {
      const newProject = await createProject(payload);
      set((state) => ({
        projects: [...state.projects, newProject],
        loading: false,
      }));
      return newProject;
    } catch (err: any) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  clearProjects: () => set({ projects: [] }),
}));
