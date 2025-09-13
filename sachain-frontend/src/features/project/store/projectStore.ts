import { create } from "zustand";
import type { Project, ProjectPayload } from "../core/types";
import * as api from "../core/api";

interface ProjectState {
  projects: Project[];
  loading: boolean;
  error: string | null;

  fetchProjects: () => Promise<void>;
  createProject: (payload: ProjectPayload) => Promise<Project | void>;
  resetError: () => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  projects: [],
  loading: false,
  error: null,

  fetchProjects: async () => {
    set({ loading: true, error: null });
    try {
      const projects = await api.getProjects();
      set({ projects, loading: false });
    } catch (err: any) {
      set({ error: err.message || "Failed to fetch projects", loading: false });
    }
  },

  createProject: async (payload) => {
    set({ loading: true, error: null });
    try {
      const response = await api.createProject(payload);
      set((state) => ({
        projects: [...state.projects, response.project],
        loading: false,
      }));
      return response.project;
    } catch (err: any) {
      set({ error: err.message || "Failed to create project", loading: false });
    }
  },

  resetError: () => set({ error: null }),
}));
