
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ImageWithFallback } from '@/components/figma/ImageWithFallback';
import { ArrowRight, Star } from 'lucide-react';

// API Response Type (what we get from backend)
export interface APIProject {
  projectId: string;
  name: string;
  description: string;
  category: string;
  status: 'draft' | 'active' | 'live';
  targetFundingGoal: number;
  pricePerStock: number;
  stockSupply: number;
  coverImageUrl?: string;
  createdAt: string;
}

interface InvestorProjectCardProps {
  project: APIProject;
  onInvestNow: (project: APIProject) => void;
  onViewDetails?: (project: APIProject) => void;
}

export function InvestorProjectCard({
  project,
  onInvestNow,
  onViewDetails,
}: InvestorProjectCardProps) {
  
  // Transform API data to display format
  const transformedProject = {
    id: project.projectId,
    name: project.name,
    description: project.description,
    category: project.category,
    status: project.status,
    
    // Financial calculations
    sharePrice: project.pricePerStock,
    totalShares: project.stockSupply,
    soldShares: 0, // TODO: Calculate from actual investments
    targetAmount: project.targetFundingGoal,
    totalRaised: 0, // TODO: Calculate from actual investments
    
    // Display data
    image: project.coverImageUrl || '/placeholder-project.jpg',
    location: 'Remote', // TODO: Add location field to API
    investorCount: 0, // TODO: Calculate from actual investments
    expectedROI: '15-25%', // TODO: Add to API or calculate
    duration: '12-24 months', // TODO: Add to API
    riskLevel: 'Medium', // TODO: Add to API
    minInvestment: project.pricePerStock, // Minimum is 1 share
    launchDate: project.createdAt,
    featured: false // TODO: Add featured flag to API
  };

  const calculateFundingProgress = (soldShares: number, totalShares: number) => {
    if (totalShares === 0) return 0;
    return Math.round((soldShares / totalShares) * 100);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getRiskColor = (risk: string) => {
    switch (risk.toLowerCase()) {
      case 'low':
        return 'bg-green-100 text-green-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'high':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const fundingProgress = calculateFundingProgress(
    transformedProject.soldShares, 
    transformedProject.totalShares
  );

  return (
    <Card className="group hover:shadow-lg transition-shadow overflow-hidden">
      <div className="relative">
        <ImageWithFallback 
          src={transformedProject.image} 
          alt={transformedProject.name} 
          className="w-full h-48 object-cover" 
        />
        {transformedProject.featured && (
          <div className="absolute top-3 left-3">
            <Badge className="bg-[#90A5FB] text-white flex items-center space-x-1">
              <Star className="h-3 w-3" />
              <span>Featured</span>
            </Badge>
          </div>
        )}
        <div className="absolute top-3 right-3">
          <Badge className={getRiskColor(transformedProject.riskLevel)}>
            {transformedProject.riskLevel} Risk
          </Badge>
        </div>
        <div className="absolute bottom-3 left-3">
          <Badge className="bg-green-500 text-white">
            Live
          </Badge>
        </div>
      </div>
      
      <CardContent className="p-6">
        {/* Project Info */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-bold text-lg text-gray-900 group-hover:text-[#123962] transition-colors">
              {transformedProject.name}
            </h3>
            <p className="text-sm text-gray-600 flex items-center">
              <span className="capitalize">{transformedProject.category}</span>
              <span className="mx-2">•</span>
              <span>{transformedProject.location}</span>
            </p>
          </div>
        </div>
        <p className="text-sm text-gray-600 mb-4 line-clamp-2">
          {transformedProject.description}
        </p>

        {/* Funding Progress */}
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-600">Funding Progress</span>
            <span className="font-medium">{fundingProgress}%</span>
          </div>
          <Progress value={fundingProgress} className="h-2" />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>{formatCurrency(transformedProject.totalRaised)} raised</span>
            <span>{formatCurrency(transformedProject.targetAmount)} target</span>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
          <div>
            <p className="text-gray-600">Share Price</p>
            <p className="font-semibold text-green-600">
              {formatCurrency(transformedProject.sharePrice)}
            </p>
          </div>
          <div>
            <p className="text-gray-600">Available Shares</p>
            <p className="font-semibold">{transformedProject.totalShares}</p>
          </div>
          <div>
            <p className="text-gray-600">Min. Investment</p>
            <p className="font-semibold">
              {formatCurrency(transformedProject.minInvestment)}
            </p>
          </div>
          <div>
            <p className="text-gray-600">Investors</p>
            <p className="font-semibold">{transformedProject.investorCount}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex space-x-2">
          <Button 
            className="flex-1 bg-[#123962] hover:bg-[#90A5FB] text-white"
            onClick={() => onInvestNow(project)}
          >
            Invest Now
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
          {onViewDetails && (
            <Button variant="outline" size="sm" onClick={() => onViewDetails(project)}>
              View Details
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}