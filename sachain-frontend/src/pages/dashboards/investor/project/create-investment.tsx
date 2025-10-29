import React, { useState } from 'react';
import { DashboardLayout } from '@/layout/DashboardLayout';
import  InvestmentModal  from '@/features/project/components/InvestmentFlow';

type Project = {
  projectId: string;
  name: string;
};

export default function CreateInvestment() {
  const [isModalOpen, setModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedProject(null);
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto p-6">
        {isModalOpen && selectedProject && (
          <InvestmentModal
            isOpen={isModalOpen}
            onClose={handleCloseModal}
            project={selectedProject}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
