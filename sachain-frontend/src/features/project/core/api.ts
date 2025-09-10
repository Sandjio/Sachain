// import apiFetch from "@/lib/api";
// import type { CreateProjectPayload, CreatedProjectResponse, Project } from "./types";

// export const getProjects = async (): Promise<Project[]> => {
//   return apiFetch<Project[]>("/projects");
// };

// export const createProject = async (
//   payload: CreateProjectPayload,
// ): Promise<CreatedProjectResponse> => {
//   return apiFetch<CreatedProjectResponse>("/projects", {
//     method: "POST",
//     body: JSON.stringify(payload),
//   });
// };

// features/projects/api/projectApi.ts
import apiFetch from "@/lib/api";
import type { CreateProjectPayload, CreatedProjectResponse, Project } from "./types";

export const getProjects = async (): Promise<Project[]> => {
  return apiFetch<Project[]>("/projects");
};

export const createProject = async (
  payload: CreateProjectPayload,
): Promise<CreatedProjectResponse> => {
  return apiFetch<CreatedProjectResponse>("/projects", {
    method: "POST",
    body: JSON.stringify(payload),
  });
};

// Alternative: Hook-based version for better React integration
// export const useProjectApi = () => {
//   const { apiFetch } = useApi();

//   const getProjects = async (): Promise<Project[]> => {
//     return apiFetch<Project[]>("/projects");
//   };

//   const createProject = async (
//     payload: CreateProjectPayload,
//   ): Promise<CreatedProjectResponse> => {
//     return apiFetch<CreatedProjectResponse>("/projects", {
//       method: "POST",
//       body: JSON.stringify(payload),
//     });
//   };

//   return { getProjects, createProject };
// };