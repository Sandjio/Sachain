
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
  projectId: string;
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
