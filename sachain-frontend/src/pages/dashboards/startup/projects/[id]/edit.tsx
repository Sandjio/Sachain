import React from "react";
import { useRouter } from "next/router";
import { ProjectEditForm } from "@/features/project/components/ProjectEditForm";
import { Button } from "@/components/ui/button";

export default function ProjectEditPage() {
  const router = useRouter();
  const { id } = router.query;

  if (!id || typeof id !== "string") {
    return <p>Loading...</p>;
  }

  const handleCancel = () => {
    router.push(`/dashboards/startup/projects/${id}`);
  };

  return (
    <div className="p-4">
      <Button onClick={handleCancel} variant="outline" className="mb-4">
        ← Back to details
      </Button>

      <ProjectEditForm projectId={id} onCancel={handleCancel} />
    </div>
  );
}
