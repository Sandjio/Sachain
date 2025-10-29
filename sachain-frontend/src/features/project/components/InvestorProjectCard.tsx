// import { useState } from 'react';
// import { Button } from '@/components/ui/button';
// import { Card, CardContent } from '@/components/ui/card';
// import { Badge } from '@/components/ui/badge';
// import { Progress } from '@/components/ui/progress';
// import { ImageWithFallback } from '@/components/figma/ImageWithFallback';
// import { ArrowRight, Star } from 'lucide-react';

// export interface APIProject {
//   projectId: string;
//   name: string;
//   description: string;
//   category: string;
//   status: string
//   targetFundingGoal: number;
//   pricePerStock: number;
//   stockSupply: number;
//   coverImageUrl?: string;
//   createdAt: string;
// }

// interface InvestorProjectCardProps {
//   project: APIProject;
//   onInvestNow: (project: APIProject) => void;
//   onViewDetails?: (project: APIProject) => void;
// }

// export function InvestorProjectCard({
//   project,
//   onInvestNow,
//   onViewDetails,
// }: InvestorProjectCardProps) {

//   const transformedProject = {
//     id: project.projectId,
//     name: project.name,
//     description: project.description,
//     category: project.category,
//     status: project.status,

//     // Financial calculations
//     sharePrice: project.pricePerStock,
//     totalShares: project.stockSupply,
//     soldShares: 0,
//     targetAmount: project.targetFundingGoal,
//     totalRaised: 0, // TODO: Calculate from actual investments

//     // Display data
//     image: project.coverImageUrl || '/placeholder-project.jpg',
//     location: 'Remote',
//     investorCount: 0,
//     expectedROI: '15-25%',
//     duration: '12-24 months',
//     riskLevel: 'Medium',
//     minInvestment: project.pricePerStock,
//     launchDate: project.createdAt,
//     featured: false
//   };

//   const calculateFundingProgress = (soldShares: number, totalShares: number) => {
//     if (totalShares === 0) return 0;
//     return Math.round((soldShares / totalShares) * 100);
//   };

//   const formatCurrency = (amount: number) => {
//     return new Intl.NumberFormat('en-US', {
//       style: 'currency',
//       currency: 'USD',
//       minimumFractionDigits: 0,
//       maximumFractionDigits: 0,
//     }).format(amount);
//   };

//   const getRiskColor = (risk: string) => {
//     switch (risk.toLowerCase()) {
//       case 'low':
//         return 'bg-green-100 text-green-800';
//       case 'medium':
//         return 'bg-yellow-100 text-yellow-800';
//       case 'high':
//         return 'bg-red-100 text-red-800';
//       default:
//         return 'bg-gray-100 text-gray-800';
//     }
//   };

//   const fundingProgress = calculateFundingProgress(
//     transformedProject.soldShares,
//     transformedProject.totalShares
//   );

//   return (
//     <Card className="group hover:shadow-lg transition-shadow overflow-hidden">
//       <div className="relative">
//         <ImageWithFallback
//           src={transformedProject.image}
//           alt={transformedProject.name}
//           className="w-full h-48 object-cover"
//         />
//         {transformedProject.featured && (
//           <div className="absolute top-3 left-3">
//             <Badge className="bg-[#90A5FB] text-white flex items-center space-x-1">
//               <Star className="h-3 w-3" />
//               <span>Featured</span>
//             </Badge>
//           </div>
//         )}
//         <div className="absolute top-3 right-3">
//           <Badge className={getRiskColor(transformedProject.riskLevel)}>
//             {transformedProject.riskLevel} Risk
//           </Badge>
//         </div>
//         <div className="absolute bottom-3 left-3">
//           <Badge className="bg-green-500 text-white">
//             Live
//           </Badge>
//         </div>
//       </div>

//       <CardContent className="p-6">
//         {/* Project Info */}
//         <div className="flex items-start justify-between mb-3">
//           <div>
//             <h3 className="font-bold text-lg text-gray-900 group-hover:text-[#123962] transition-colors">
//               {transformedProject.name}
//             </h3>
//             <p className="text-sm text-gray-600 flex items-center">
//               <span className="capitalize">{transformedProject.category}</span>
//               <span className="mx-2">•</span>
//               <span>{transformedProject.location}</span>
//             </p>
//           </div>
//         </div>
//         <p className="text-sm text-gray-600 mb-4 line-clamp-2">
//           {transformedProject.description}
//         </p>

//         {/* Funding Progress */}
//         <div className="mb-4">
//           <div className="flex justify-between text-sm mb-2">
//             <span className="text-gray-600">Funding Progress</span>
//             <span className="font-medium">{fundingProgress}%</span>
//           </div>
//           <Progress value={fundingProgress} className="h-2" />
//           <div className="flex justify-between text-xs text-gray-500 mt-1">
//             <span>{formatCurrency(transformedProject.totalRaised)} raised</span>
//             <span>{formatCurrency(transformedProject.targetAmount)} target</span>
//           </div>
//         </div>

//         {/* Key Metrics */}
//         <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
//           <div>
//             <p className="text-gray-600">Share Price</p>
//             <p className="font-semibold text-green-600">
//               {formatCurrency(transformedProject.sharePrice)}
//             </p>
//           </div>
//           <div>
//             <p className="text-gray-600">Available Shares</p>
//             <p className="font-semibold">{transformedProject.totalShares}</p>
//           </div>
//           <div>
//             <p className="text-gray-600">Min. Investment</p>
//             <p className="font-semibold">
//               {formatCurrency(transformedProject.minInvestment)}
//             </p>
//           </div>
//           <div>
//             <p className="text-gray-600">Investors</p>
//             <p className="font-semibold">{transformedProject.investorCount}</p>
//           </div>
//         </div>

//         {/* Actions */}
//         <div className="flex space-x-2">
//           <Button
//             className="flex-1 bg-[#123962] hover:bg-[#90A5FB] text-white"
//             onClick={() => onInvestNow(project)}
//           >
//             Invest Now
//             <ArrowRight className="h-4 w-4 ml-2" />
//           </Button>
//           {onViewDetails && (
//             <Button variant="outline" size="sm" onClick={() => onViewDetails(project)}>
//               View Details
//             </Button>
//           )}
//         </div>
//       </CardContent>
//     </Card>
//   );
// }

import { useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ImageWithFallback } from '@/components/figma/ImageWithFallback';
import {
  ArrowRight,
  Star,
  DollarSign,
  Users,
  TrendingUp,
  Target,
  Activity,
  BarChart3,
} from 'lucide-react';

export interface APIProject {
  projectId: string;
  name: string;
  description: string;
  category: string;
  status: string;
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

// Move helper functions outside component to avoid recreation
const calculateFundingProgress = (
  soldShares: number,
  totalShares: number
): number => {
  if (totalShares === 0) return 0;
  return Math.round((soldShares / totalShares) * 100);
};

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const getRiskColor = (risk: string): string => {
  switch (risk.toLowerCase()) {
    case 'low':
      return 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20';
    case 'medium':
      return 'bg-amber-500/10 text-amber-700 border-amber-500/20';
    case 'high':
      return 'bg-red-500/10 text-red-700 border-red-500/20';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export function InvestorProjectCard({
  project,
  onInvestNow,
  onViewDetails,
}: InvestorProjectCardProps) {
  // Memoize transformed project data to avoid recalculation on every render
  const transformedProject = useMemo(
    () => ({
      id: project.projectId,
      name: project.name,
      description: project.description,
      category: project.category,
      status: project.status,
      sharePrice: project.pricePerStock,
      totalShares: project.stockSupply,
      soldShares: 0,
      targetAmount: project.targetFundingGoal,
      totalRaised: 0,
      image: project.coverImageUrl || '/placeholder-project.jpg',
      location: 'Remote',
      investorCount: 0,
      expectedROI: '15-25%',
      duration: '12-24 months',
      riskLevel: 'Medium',
      minInvestment: project.pricePerStock,
      launchDate: project.createdAt,
      featured: false,
    }),
    [
      project.projectId,
      project.name,
      project.description,
      project.category,
      project.status,
      project.pricePerStock,
      project.stockSupply,
      project.targetFundingGoal,
      project.coverImageUrl,
      project.createdAt,
    ]
  );

  // Memoize funding progress calculation
  const fundingProgress = useMemo(
    () =>
      calculateFundingProgress(
        transformedProject.soldShares,
        transformedProject.totalShares
      ),
    [transformedProject.soldShares, transformedProject.totalShares]
  );

  // Memoize risk color to avoid recalculation
  const riskColorClass = useMemo(
    () => getRiskColor(transformedProject.riskLevel),
    [transformedProject.riskLevel]
  );

  // Memoize formatted currency values
  const formattedValues = useMemo(
    () => ({
      totalRaised: formatCurrency(transformedProject.totalRaised),
      targetAmount: formatCurrency(transformedProject.targetAmount),
      sharePrice: formatCurrency(transformedProject.sharePrice),
      minInvestment: formatCurrency(transformedProject.minInvestment),
    }),
    [
      transformedProject.totalRaised,
      transformedProject.targetAmount,
      transformedProject.sharePrice,
      transformedProject.minInvestment,
    ]
  );

  // Memoize callback handlers to prevent recreation on every render
  const handleInvestNow = useCallback(() => {
    onInvestNow(project);
  }, [onInvestNow, project]);

  const handleViewDetails = useCallback(() => {
    onViewDetails?.(project);
  }, [onViewDetails, project]);

  return (
    <Card className="group bg-white border border-gray-200 hover:border-[#90A5FB]/50 rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden">
      <div className="relative">
        <ImageWithFallback
          src={transformedProject.image}
          alt={transformedProject.name}
          className="w-full h-48 object-cover"
        />
        {transformedProject.featured && (
          <div className="absolute top-3 left-3">
            <Badge className="bg-gradient-to-r from-[#123962] to-[#90A5FB] text-white shadow-lg backdrop-blur-sm">
              <Star className="h-3 w-3 mr-1 fill-white" />
              <span>Featured</span>
            </Badge>
          </div>
        )}
        <div className="absolute top-3 right-3">
          <Badge className={`${riskColorClass} backdrop-blur-sm`}>
            {transformedProject.riskLevel} Risk
          </Badge>
        </div>
        <div className="absolute bottom-3 left-3">
          <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20 backdrop-blur-sm">
            <Activity className="h-3 w-3 mr-1" />
            Live
          </Badge>
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
      </div>

      <CardContent className="p-6">
        {/* Project Info */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-semibold text-lg bg-gradient-to-r from-[#123962] to-[#90A5FB] bg-clip-text text-transparent group-hover:from-[#90A5FB] group-hover:to-[#123962] transition-all">
              {transformedProject.name}
            </h3>
            <p className="text-sm text-gray-600 flex items-center mt-1">
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
        <div className="mb-4 p-4 bg-gradient-to-br from-blue-50/50 to-indigo-50/30 border border-blue-100 rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-[#123962]/10 rounded-md flex items-center justify-center">
                <Target className="h-3 w-3 text-[#123962]" />
              </div>
              <span className="text-sm text-gray-700">Funding Progress</span>
            </div>
            <Badge className="bg-[#90A5FB]/10 text-[#90A5FB] border-[#90A5FB]/20 text-xs">
              {fundingProgress}%
            </Badge>
          </div>
          <Progress value={fundingProgress} className="h-2 mb-2" />
          <div className="flex justify-between text-xs text-gray-600">
            <span className="flex items-center gap-1">
              <DollarSign className="h-3 w-3 text-emerald-600" />
              {formattedValues.totalRaised} raised
            </span>
            <span className="text-gray-500">
              {formattedValues.targetAmount} target
            </span>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="p-3 bg-gradient-to-br from-emerald-50/50 to-green-50/30 border border-emerald-100 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-5 h-5 bg-emerald-500/10 rounded flex items-center justify-center">
                <DollarSign className="h-3 w-3 text-emerald-600" />
              </div>
              <p className="text-xs text-gray-600">Share Price</p>
            </div>
            <p className="font-semibold text-emerald-600">
              {formattedValues.sharePrice}
            </p>
          </div>
          <div className="p-3 bg-gradient-to-br from-blue-50/50 to-indigo-50/30 border border-blue-100 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-5 h-5 bg-[#90A5FB]/10 rounded flex items-center justify-center">
                <BarChart3 className="h-3 w-3 text-[#90A5FB]" />
              </div>
              <p className="text-xs text-gray-600">Available Shares</p>
            </div>
            <p className="font-semibold text-gray-900">
              {transformedProject.totalShares}
            </p>
          </div>
          <div className="p-3 bg-gradient-to-br from-purple-50/50 to-violet-50/30 border border-purple-100 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-5 h-5 bg-purple-500/10 rounded flex items-center justify-center">
                <Target className="h-3 w-3 text-purple-600" />
              </div>
              <p className="text-xs text-gray-600">Min. Investment</p>
            </div>
            <p className="font-semibold text-gray-900">
              {formattedValues.minInvestment}
            </p>
          </div>
          <div className="p-3 bg-gradient-to-br from-amber-50/50 to-orange-50/30 border border-amber-100 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-5 h-5 bg-amber-500/10 rounded flex items-center justify-center">
                <Users className="h-3 w-3 text-amber-600" />
              </div>
              <p className="text-xs text-gray-600">Investors</p>
            </div>
            <p className="font-semibold text-gray-900">
              {transformedProject.investorCount}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex space-x-2">
          <Button
            className="flex-1 bg-gradient-to-r from-[#123962] to-[#90A5FB] hover:from-[#123962]/90 hover:to-[#90A5FB]/90 text-white shadow-lg hover:shadow-xl transition-all duration-300"
            onClick={handleInvestNow}
          >
            Invest Now
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
          {onViewDetails && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleViewDetails}
              className=" flex-1"
            >
              View Details
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
