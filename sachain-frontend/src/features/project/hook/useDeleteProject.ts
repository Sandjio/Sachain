import { useState, useCallback } from 'react';
import { useProjectStore } from '@/features/project/store/projectStore';

export function useDeleteProject(onSuccess: () => void) {
  const [isDeleting, setIsDeleting] = useState(false);
  const deleteProject = useProjectStore((state) => state.deleteProject);

  const deleteProjectById = useCallback(
    async (projectId: string) => {
      setIsDeleting(true);
      try {
        await deleteProject(projectId);
        setIsDeleting(false);
        onSuccess();
      } catch (error) {
        setIsDeleting(false);
        throw error;
      }
    },
    [deleteProject, onSuccess]
  );

  return { isDeleting, deleteProjectById };
}
