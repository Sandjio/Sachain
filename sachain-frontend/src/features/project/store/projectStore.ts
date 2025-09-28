import { create } from 'zustand';
import {
  getProjects,
  createProject,
  getProjectById,
  updateProject as apiUpdateProject,
  deleteProject as apiDeleteProject,
} from '@/features/project/core/api';
import type { Project, ProjectPayload } from '@/features/project/core/types';

interface ProjectState {
  projects: Project[];
  loading: boolean;
  error: string | null;
  fetchProjects: () => Promise<void>;
  addProject: (payload: ProjectPayload) => Promise<Project>;
  updateProject: (
    projectId: string,
    payload: Partial<ProjectPayload>
  ) => Promise<Project>;
  deleteProject: (projectId: string) => Promise<void>;
  clearProjects: () => void;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
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

  updateProject: async (
    projectId: string,
    payload: Partial<ProjectPayload>
  ) => {
    set({ loading: true, error: null });
    try {
      const updatedProject = await apiUpdateProject(projectId, payload);

      set((state) => ({
        projects: state.projects.map((project) =>
          project.projectId === projectId
            ? { ...project, ...updatedProject }
            : project
        ),
        loading: false,
      }));

      return updatedProject;
    } catch (err: any) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  deleteProject: async (projectId: string) => {
    set({ loading: true, error: null });
    try {
      await apiDeleteProject(projectId);

      set((state) => ({
        projects: state.projects.filter(
          (project) => project.projectId !== projectId
        ),
        loading: false,
      }));
    } catch (err: any) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  clearProjects: () => set({ projects: [] }),
}));
