import { Button } from '@/components/ui/button';

export function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="text-center py-24 text-medium-gray">
      <div className="text-7xl mb-8">🚀</div>
      <h2 className="text-3xl font-bold text-primary-black mb-4">
        No Projects Yet
      </h2>
      <p className="text-lg max-w-md mx-auto mb-10">
        Start your first funding campaign to get investors on board and grow
        your project.
      </p>
      <Button onClick={onCreate} size="lg">
        + Create New Project
      </Button>
    </div>
  );
}
