// export type ProjectCategory =
//   | "technology"
//   | "healthcare"
//   | "finance"
//   | "education"
//   | "retail"
//   | "agriculture"
//   | "energy"
//   | "real_estate"
//   | "other";

// export interface CreateProjectPayload {
//   name: string;
//   description: string;
//   category: ProjectCategory;
//   coverImageUrl: string;
//   stockSupply: number;
//   targetFundingGoal: number;
//   pricePerStock: number;
// }

// export interface Project {
//   id: string;
//   name: string;
//   description: string;
//   category: ProjectCategory;
//   coverImageUrl: string;
//   stockSupply: number;
//   targetFundingGoal: number;
//   pricePerStock: number;
//   status: "draft" | "live" | "completed" | "paused";
//   createdAt: string; // ISO datetime
// }

// export interface CreatedProjectResponse {
//   projectId: string;
//   message: string;
//   project: Project;
// }



export interface ProjectPayload {
  name: string;
  description: string;
  category: string;
  coverImageUrl: string;
  stockSupply: number;
  targetFundingGoal: number;
  pricePerStock: number;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  category: string;
  stockSupply: number;
  targetFundingGoal: number;
  pricePerStock: number;
  status: string;
  createdAt: string;
}
