import React from 'react';
import { useRouter } from 'next/router';
import { Button } from '@/components/ui/button';

export default function ProjectDetailsPage() {
  const router = useRouter();
  const { id } = router.query;

  if (!id || typeof id !== 'string') {
    return <p>Loading...</p>;
  }

  const handleBack = () => {
    router.push('/dashboards/startup/projects');
  };

  return (
    <div className="p-4">
      <Button onClick={handleBack} variant="outline" className="mb-4">
        ← Back to projects
      </Button>

      <h1>Project Details Page for {id}</h1>
    </div>
  );
}
