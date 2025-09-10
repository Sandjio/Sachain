

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Users, Calendar, ArrowRight } from 'lucide-react';
import { useRouter } from "next/navigation";
import router from 'next/router';

interface Project {
  id: string;
  name: string;
  description: string;
  progress: number;
  status: 'active' | 'completed' | 'pending';
  team: number;
  deadline: string;
  priority: 'high' | 'medium' | 'low';
}

const projects: Project[] = [
  {
    id: '1',
    name: 'SACHAIN Mobile App',
    description: 'Développement de l\'application mobile pour les transactions',
    progress: 75,
    status: 'active',
    team: 5,
    deadline: '15 Oct 2025',
    priority: 'high'
  },
  {
    id: '2',
    name: 'Dashboard Analytics',
    description: 'Amélioration du tableau de bord avec nouvelles métriques',
    progress: 45,
    status: 'active',
    team: 3,
    deadline: '28 Oct 2025',
    priority: 'medium'
  },
  {
    id: '3',
    name: 'API Integration',
    description: 'Intégration des APIs tierces pour les paiements',
    progress: 90,
    status: 'active',
    team: 4,
    deadline: '10 Oct 2025',
    priority: 'high'
  },
  {
    id: '4',
    name: 'User Authentication',
    description: 'Mise en place du système d\'authentification sécurisé',
    progress: 100,
    status: 'completed',
    team: 2,
    deadline: '5 Oct 2025',
    priority: 'low'
  }
];

export function ProjectCard({ project }: { project: Project }) {


  const statusColors = {
    active: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    pending: 'bg-yellow-100 text-yellow-800'
  };

  const priorityColors = {
    high: 'bg-red-100 text-red-800',
    medium: 'bg-orange-100 text-orange-800',
    low: 'bg-gray-100 text-gray-800'
  };
  const router = useRouter();
  
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg font-semibold text-gray-900">
              {project.name}
            </CardTitle>
            <p className="text-sm text-gray-600 line-clamp-2">
              {project.description}
            </p>
          </div>
          <Button variant="ghost" size="sm" className="text-gray-400 hover:text-gray-600">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Progression</span>
            <span className="font-medium">{project.progress}%</span>
          </div>
          <Progress value={project.progress} className="h-2" />
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary" className={statusColors[project.status]}>
            {project.status === 'active' ? 'En cours' : 
             project.status === 'completed' ? 'Terminé' : 'En attente'}
          </Badge>
          <Badge variant="outline" className={priorityColors[project.priority]}>
            {project.priority === 'high' ? 'Haute' :
             project.priority === 'medium' ? 'Moyenne' : 'Basse'}
          </Badge>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span>{project.team}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>{project.deadline}</span>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="text-[#123962] hover:text-[#90A5FB]">
            Voir <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function ProjectPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Projets en Cours</h2>
          <p className="text-sm text-gray-600 mt-1">
            Gestion et suivi de vos projets actifs
          </p>
        </div>
         <Button
          className="bg-[#123962] hover:bg-[#90A5FB] text-white"
          onClick={() => router.push("/dashboards/startup/projects/create")}
        >
          New Projet
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {projects.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>
    </div>
  );
}