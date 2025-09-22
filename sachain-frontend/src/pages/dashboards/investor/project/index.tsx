// pages/dashboards/investor/project/index.tsx
import { useState } from 'react';
import { useInvestorProjects } from '@/features/project/hook/useInvestorProjects';
import { InvestorProjectCard } from '@/features/project/components/InvestorProjectCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Filter } from 'lucide-react';

// API Project Type
interface APIProject {
  projectId: string;
  name: string;
  description: string;
  category: string;
  status: 'draft' | 'live';
  targetFundingGoal: number;
  pricePerStock: number;
  stockSupply: number;
  coverImageUrl?: string;
  createdAt: string;
}

export default function InvestorProjectsPage() {
  const { projects, loading, error, refetch } = useInvestorProjects();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [priceFilter, setPriceFilter] = useState<string>('all');
  const [showInvestmentModal, setShowInvestmentModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<APIProject | null>(null);

  // Filter projects based on search and filters
  const filteredProjects = projects.filter((project) => {
    const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         project.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = categoryFilter === 'all' || project.category === categoryFilter;
    
    const matchesPrice = priceFilter === 'all' || 
                        (priceFilter === 'under-50' && project.pricePerStock < 50) ||
                        (priceFilter === '50-100' && project.pricePerStock >= 50 && project.pricePerStock <= 100) ||
                        (priceFilter === 'over-100' && project.pricePerStock > 100);

    return matchesSearch && matchesCategory && matchesPrice;
  });

  // Get unique categories from projects
  const categories = [...new Set(projects.map(p => p.category))];

  const handleInvestNow = (project: APIProject) => {
    setSelectedProject(project);
    setShowInvestmentModal(true);
  };

  const handleViewDetails = (project: APIProject) => {
    // TODO: Navigate to project details page or open details modal
    console.log('View details for:', project.name);
  };

  const closeInvestmentModal = () => {
    setShowInvestmentModal(false);
    setSelectedProject(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#123962] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading investment opportunities...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error loading projects: {error}</p>
          <Button onClick={refetch}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Investment Opportunities</h1>
        <p className="text-gray-600 mt-1">
          Discover and invest in promising startups that have completed tokenization
        </p>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg border p-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search Input */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search projects by name or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Category Filter */}
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category.charAt(0).toUpperCase() + category.slice(1).replace('_', ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Price Filter */}
          <Select value={priceFilter} onValueChange={setPriceFilter}>
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder="All Prices" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Prices</SelectItem>
              <SelectItem value="under-50">Under $50</SelectItem>
              <SelectItem value="50-100">$50 - $100</SelectItem>
              <SelectItem value="over-100">Over $100</SelectItem>
            </SelectContent>
          </Select>

          {/* Clear Filters Button */}
          {(searchQuery || categoryFilter !== 'all' || priceFilter !== 'all') && (
            <Button
              variant="outline"
              onClick={() => {
                setSearchQuery('');
                setCategoryFilter('all');
                setPriceFilter('all');
              }}
            >
              Clear Filters
            </Button>
          )}
        </div>
      </div>

      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          {filteredProjects.length} investment{filteredProjects.length !== 1 ? 's' : ''} available
          {searchQuery && ` for "${searchQuery}"`}
        </p>
        <Button variant="ghost" size="sm" onClick={refetch}>
          <Filter className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Projects Grid */}
      {filteredProjects.length === 0 ? (
        <div className="text-center py-12">
          <div className="mx-auto h-24 w-24 text-gray-400 mb-4">
            <Search className="h-full w-full" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No projects found</h3>
          <p className="text-gray-600 mb-4">
            {projects.length === 0 
              ? "No live projects are currently available for investment."
              : "Try adjusting your search criteria or filters."}
          </p>
          {searchQuery && (
            <Button variant="outline" onClick={() => setSearchQuery('')}>
              Clear Search
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <InvestorProjectCard
              key={project.projectId}
              project={project}
              onInvestNow={handleInvestNow}
              onViewDetails={handleViewDetails}
            />
          ))}
        </div>
      )}

      {/* Investment Modal - Placeholder */}
      {showInvestmentModal && selectedProject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold mb-4">Invest in {selectedProject.name}</h3>
            <p className="text-gray-600 mb-4">
              Investment flow will be implemented here.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={closeInvestmentModal}>
                Cancel
              </Button>
              <Button className="bg-[#123962] hover:bg-[#90A5FB] text-white">
                Continue
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}