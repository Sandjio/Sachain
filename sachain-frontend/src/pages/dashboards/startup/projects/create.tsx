import React from "react";
import { MultiStepProjectForm } from "@/features/project/form/MultiStepProjectForm";
import { DashboardLayout } from "@/layout/DashboardLayout";

export default function CreateProjectPage() {
  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="mb-6 text-3xl font-bold">Create New Project</h1>
        <MultiStepProjectForm onCancel={function (): void {
          throw new Error("Function not implemented.");
        } } />
      </div>
    </DashboardLayout>
  );
}
