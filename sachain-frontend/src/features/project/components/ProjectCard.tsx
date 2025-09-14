import { Button } from "@/components/ui/button";

// Updated Project interface to match API response
interface Project {
  projectId: string;           
  name: string;               
  status: 'draft' | 'live';  
  category: string;            
  description: string;         
  targetFundingGoal: number;   
  pricePerStock: number;       
  stockSupply: number;         
  coverImageUrl?: string;      
  createdAt: string;           
  
  // Computed/derived fields for display
  raised?: string;             
  investors?: number;          
  daysLeft?: number | string;  
  progressPercent?: number;    
  goal?: string;              
}

// Updated ProjectCard component
export function ProjectCard({ project }: { project: Project }) {
  const statusColors = {
    live: "bg-success text-red",
    draft: "bg-warning text-green",
  };

  const statusClass = statusColors[project.status] || "bg-gray-500 text-white";
  
  // Convert API data to display format
  const displayData = {
    title: project.name,
    goal: `$${project.targetFundingGoal.toLocaleString()}`,
    raised: "$0",
    investors: project.investors ?? 0, // value from API or 0 for the amount of investors that have invested
    daysLeft: "30",
    progressPercent: 0,
    image: project.coverImageUrl,
  };

  const goalNumber = project.targetFundingGoal || 0;
  const raisedNumber = 0; // TODO: Get actual raised amount
  const remainingToGoal = `${(goalNumber - raisedNumber).toLocaleString()}`;

  return (
    <div className="bg-white rounded-xl border border-border-color cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all">
      <div className="relative h-48 bg-accent-gray flex flex-col justify-center items-center text-medium-gray text-sm font-medium rounded-t-xl">
        
        <span
          className={`absolute top-4 text-primary-black right-4 text-red rounded-full px-4 py-1 text-xs font-semibold uppercase tracking-wide ${statusClass}`}
        >
          {project.status}
        </span>
        
        {displayData.image ? (
          <img src={displayData.image} alt={displayData.title} className="object-cover w-full h-full rounded-t-xl" />
        ) : (
          <div className="whitespace-pre-line text-center">
            {`Project Image Placeholder\n${displayData.title}`}
          </div>
        )}
      </div>
      
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-bold text-primary-black leading-tight">
              {displayData.title}
            </h3>
            <p className="text-xs uppercase tracking-wide text-medium-gray">
              {project.category}
            </p>
          </div>
          <button
            className="bg-transparent border-none text-2xl text-medium-gray hover:bg-accent-gray rounded-full p-1 transition"
            aria-label="Project actions"
          >
            ⋯
          </button>
        </div>
        
        <p className="text-sm text-medium-gray mb-5 line-clamp-2">
          {project.description}
        </p>
        
        <div className="grid grid-cols-3 gap-4 mb-5 text-center">
          <Metric label="Raised" value={displayData.raised} />
          <Metric label="Investors" value={displayData.investors} />
          <Metric label="Days Left" value={displayData.daysLeft} />
        </div>
        
        {project.status !== "draft" && (
          <div className="mb-5">
            <div className="h-2 w-full rounded bg-accent-gray overflow-hidden">
              <div 
                className="h-full bg-success rounded transition-all" 
                style={{ width: `${displayData.progressPercent}%` }} 
              />
            </div>
            <div className="flex justify-between text-xs text-medium-gray mt-1">
              <span>
                {displayData.progressPercent}% of {displayData.goal} goal
              </span>
              <span>{remainingToGoal} to go</span>
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