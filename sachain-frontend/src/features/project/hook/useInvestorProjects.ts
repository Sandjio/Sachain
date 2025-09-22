// src/features/investor/hooks/useInvestorProjects.ts
import { useState, useEffect } from 'react';
import { getProjects } from '@/features/project/core/api';

interface Project {
  projectId: string;
  name: string;
  description: string;
  category: string;
  status: 'draft' | 'live';
  targetFundingGoal: number;
  pricePerStock: number;
  stockSupply: number;
  coverImageUrl?: string;
  createdAt: string;
  // Add other fields as needed
}

export function useInvestorProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

const fetchLiveProjects = async () => {
  setLoading(true);
  setError(null);

  try {
    const response = await getProjects();
    
    // Handle the nested structure - projects are inside response.projects
    const allProjects = response.projects || response || [];

    // Filter for active projects only
    //const activeProjects = allProjects.filter((project: Project) => project.status === 'active');
    // Cast the API response to handle the type mismatch
const activeProjects = allProjects.filter((project: any) => project.status === 'active');

    console.log('All projects:', allProjects);
    console.log('Active projects:', activeProjects);

    setProjects(activeProjects);
  } catch (err: any) {
    setError(err.message || 'Failed to fetch active projects');
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
    fetchLiveProjects();
  }, []);

  const refetch = () => {
    fetchLiveProjects();
  };

  return {
    projects,
    loading,
    error,
    refetch
  };
}