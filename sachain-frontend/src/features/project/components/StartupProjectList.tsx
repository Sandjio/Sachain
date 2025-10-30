//refactor

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useProjects } from '../hook/useProjects';
import { ProjectCard } from './ProjectCard';
import { DeleteSuccessModal } from './modals/DeleteSuccess';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  RefreshCw,
  Building2,
  ChevronLeft,
  ChevronRight,
  Plus,
  AlertCircle,
} from 'lucide-react';
import { Project } from '../core/types';

interface StartupProjectListProps {
  onViewDetails?: (projectId: string) => void;
  onEditProject?: (projectId: string) => void;
  refreshProjects?: () => void;
  onCreateProject?: () => void;
}

export function StartupProjectList({
  onViewDetails,
  onEditProject,
  refreshProjects,
  onCreateProject,
}: StartupProjectListProps) {
  const { projects, loading, error, fetchProjects } = useProjects();
  const [showDeleteSuccess, setShowDeleteSuccess] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Memoize handleRefresh to avoid redefining it every render
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchProjects();
    setIsRefreshing(false);
    refreshProjects?.();
  }, [fetchProjects, refreshProjects]);

  // Memoize projects to avoid recomputation in map if projects haven't changed

  const projectsMemo: Project[] = useMemo(() => projects || [], [projects]);

  const LoadingSkeleton = useMemo(
    () => (
      <div className="flex gap-4 pb-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="flex-shrink-0 w-80 border border-border">
            <CardHeader>
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-20 w-full" />
              <div className="flex gap-2">
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-6 w-20" />
              </div>
              <Skeleton className="h-8 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    ),
    []
  );

  const EmptyState = useMemo(
    () => (
      <Card className="border border-border">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
            <Building2 className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="font-medium text-foreground mb-2">No Projects Yet</h3>
          <p className="text-muted-foreground text-center mb-4 max-w-sm">
            Get started by creating your first project to begin raising funds
            and managing investors.
          </p>
          {onCreateProject && (
            <Button onClick={onCreateProject} className="h-9">
              <Plus className="h-4 w-4 mr-2" />
              Create Project
            </Button>
          )}
        </CardContent>
      </Card>
    ),
    [onCreateProject]
  );

  const ErrorState = useMemo(
    () => (
      <Card className="border border-destructive/20 bg-destructive/5">
        <CardContent className="flex items-center gap-3 py-6">
          <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-destructive">
              Failed to load projects
            </p>
            <p className="text-xs text-muted-foreground">{error}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`}
            />
            Retry
          </Button>
        </CardContent>
      </Card>
    ),
    [error, handleRefresh, isRefreshing]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-muted rounded-lg">
            <Building2 className="h-4 w-4" />
          </div>
          <div>
            <h2 className="font-medium text-foreground">Project Portfolio</h2>
            <p className="text-sm text-muted-foreground">
              {loading
                ? 'Loading...'
                : `${projectsMemo.length} project${projectsMemo.length !== 1 ? 's' : ''}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {projectsMemo.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {projectsMemo.filter((p) => p.status === 'active').length} Active
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={loading || isRefreshing}
            className="h-8"
          >
            <RefreshCw
              className={`h-3 w-3 mr-2 ${loading || isRefreshing ? 'animate-spin' : ''}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        LoadingSkeleton
      ) : error ? (
        ErrorState
      ) : projectsMemo.length === 0 ? (
        EmptyState
      ) : (
        <div className="relative">
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex gap-5 pb-4">
              {projectsMemo.map((project: any) => (
                <div
                  key={project.projectId || project.id}
                  className="flex-shrink-0 w-80"
                >
                  <ProjectCard
                    project={project}
                    onViewDetails={onViewDetails}
                    onDeleteSuccess={() => setShowDeleteSuccess(true)}
                  />
                </div>
              ))}
            </div>
            <ScrollBar orientation="horizontal" className="h-2" />
          </ScrollArea>

          {/* Navigation Hints */}
          {projectsMemo.length > 3 && (
            <div className="flex items-center justify-center gap-4 mt-3">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <ChevronLeft className="h-5 w-5" />
                <span>Scroll to view more projects</span>
                <ChevronRight className="h-5 w-5" />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <DeleteSuccessModal
        isOpen={showDeleteSuccess}
        onClose={() => setShowDeleteSuccess(false)}
      />
    </div>
  );
}
