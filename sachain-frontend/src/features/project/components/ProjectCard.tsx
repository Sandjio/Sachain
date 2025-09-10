import { Button } from '@/components/ui/button';

interface Project {
  id: string;
  title: string;
  category: string;
  description: string;
  raised: string;
  investors: number;
  daysLeft: number | string;
  progressPercent: number;
  goal: string;
  status: "live" | "draft" | "completed" | "paused";
  image?: string;
}

const statusColors = {
  live: "bg-success text-white",
  draft: "bg-warning text-white",
  completed: "bg-primary-black text-white",
  paused: "bg-error text-white",
};

export function ProjectCard({ project }: { project: Project }) {
  const statusClass = statusColors[project.status];

  const remainingToGoal =
    project.goal && project.raised
      ? `$${parseInt(project.goal.replace(/[^0-9]/g, "")) - parseInt(project.raised.replace(/[^0-9]/g, ""))}`
      : null;

  return (
    <div className="bg-white rounded-xl border border-border-color cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all">
      <div className="relative h-48 bg-accent-gray flex flex-col justify-center items-center text-medium-gray text-sm font-medium rounded-t-xl">
        <span
          className={`absolute top-4 right-4 rounded-full px-4 py-1 text-xs font-semibold uppercase tracking-wide ${statusClass}`}
        >
          {project.status}
        </span>
        {project.image ? (
          <img src={project.image} alt={project.title} className="object-cover w-full h-full rounded-t-xl" />
        ) : (
          <div className="whitespace-pre-line text-center">{`Project Image Placeholder\n${project.title}`}</div>
        )}
      </div>
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-bold text-primary-black leading-tight">{project.title}</h3>
            <p className="text-xs uppercase tracking-wide text-medium-gray">{project.category}</p>
          </div>
          <button
            className="bg-transparent border-none text-2xl text-medium-gray hover:bg-accent-gray rounded-full p-1 transition"
            aria-label="Project actions"
          >
            ⋯
          </button>
        </div>
        <p className="text-sm text-medium-gray mb-5 line-clamp-2">{project.description}</p>
        <div className="grid grid-cols-3 gap-4 mb-5 text-center">
          <Metric label="Raised" value={project.raised} />
          <Metric label="Investors" value={project.investors} />
          <Metric label="Days Left" value={project.daysLeft} />
        </div>
        {project.status !== "draft" && (
          <div className="mb-5">
            <div className="h-2 w-full rounded bg-accent-gray overflow-hidden">
              <div className="h-full bg-success rounded transition-all" style={{ width: `${project.progressPercent}%` }} />
            </div>
            <div className="flex justify-between text-xs text-medium-gray mt-1">
              <span>
                {project.progressPercent}% of {project.goal} goal
              </span>
              <span>{remainingToGoal ? `${remainingToGoal} to go` : null}</span>
            </div>
          </div>
        )}
        <div className="flex gap-3">
          <Button variant="default" className="flex-1">
            View Details
          </Button>
          <Button variant="outline" className="flex-1">
            Edit
          </Button>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div className="text-base font-bold text-primary-black">{value}</div>
      <div className="text-xs uppercase tracking-wide text-medium-gray">{label}</div>
    </div>
  );
}
