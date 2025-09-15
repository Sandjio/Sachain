// import { useState, useCallback } from "react";
// import { deleteProject } from "@/features/project/core/api";
// import { useProjectStore } from "@/features/project/store/projectStore";

// export function useDeleteProject(onSuccess: () => void) {
//   const [isModalOpen, setIsModalOpen] = useState(false);
//   const [isDeleting, setIsDeleting] = useState(false);
//   const deleteProjectFromStore = useProjectStore(state => state.deleteProject);


//   const openDeleteModal = () => setIsModalOpen(true);
//   const closeDeleteModal = () => setIsModalOpen(false);

//   const confirmDelete = useCallback(
//     async (projectId: string) => {
//       setIsDeleting(true);
//       try {
//         await deleteProject(projectId);
//         await deleteProjectFromStore(projectId);
//         setIsDeleting(false);
//         closeDeleteModal();
//         onSuccess();
//       } catch (error) {
//         setIsDeleting(false);
//         throw error;
//       }
//     },
//     [deleteProjectFromStore, onSuccess]
//   );

//   return {
//     isModalOpen,
//     isDeleting,
//     openDeleteModal,
//     closeDeleteModal,
//     confirmDelete,
//   };
// }





import { useState, useCallback } from "react";
import { useProjectStore } from "@/features/project/store/projectStore";

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