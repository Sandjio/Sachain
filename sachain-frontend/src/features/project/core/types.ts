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
  currentFunding: number;
  fundingGoal: number;
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

export interface MintStocksStatusProgress {
  completed: number;
  total: number;
  percentage: number;
  status: string;
}

export interface MintStocksStatus {
  projectId: string;
  status: string;
  progress: MintStocksStatusProgress;
}
