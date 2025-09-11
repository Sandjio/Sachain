import { useState } from 'react';
import { createProject } from '../core/api';
import type { Project, ProjectPayload } from '../core/types';

export function useCreateProject() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [project, setProject] = useState<Project | null>(null);

  const submitProject = async (payload: ProjectPayload) => {
    setLoading(true);
    setError(null);
    try {
      const result = await createProject(payload);
      setProject(result);
      return result;
      console.log('the project', result);
    } catch (err: any) {
      setError(err.message || 'Project creation failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { submitProject, loading, error, project };
}
