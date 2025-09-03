import { Card, CardContent, CardHeader } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { Clock, Users, Target, TrendingUp } from "lucide-react";

const projects = [
  {
    id: 1,
    title: "EcoTech Solutions",
    description: "Revolutionary solar panel technology that increases efficiency by 40% while reducing costs.",
    category: "Clean Energy",
    raised: 125000,
    goal: 500000,
    investors: 89,
    daysLeft: 23,
    image: "https://images.unsplash.com/photo-1644343262170-e40d72e19a84?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxibG9ja2NoYWluJTIwY3J5cHRvY3VycmVuY3klMjBuZXR3b3JrfGVufDF8fHx8MTc1NjQzNDgyNnww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    featured: true
  },
  {
    id: 2,
    title: "HealthAI Platform",
    description: "AI-powered diagnostic tool that helps doctors detect diseases 3x faster with 95% accuracy.",
    category: "Healthcare",
    raised: 89000,
    goal: 300000,
    investors: 67,
    daysLeft: 45,
    image: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxidXNpbmVzcyUyMG1lZXRpbmclMjBpbnZlc3RtZW50fGVufDF8fHx8MTc1NjQzNDgyOXww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    featured: false
  },
  {
    id: 3,
    title: "SmartCity IoT",
    description: "Internet of Things solutions for smart city infrastructure and traffic management.",
    category: "IoT",
    raised: 156000,
    goal: 400000,
    investors: 112,
    daysLeft: 12,
    image: "https://images.unsplash.com/photo-1590097520752-3258327b7548?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdGFydHVwJTIwdGVjaG5vbG9neSUyMGlubm92YXRpb258ZW58MXx8fHwxNzU2MzY3NzY5fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    featured: false
  }
];

export function FeaturedProjects() {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getProgressPercentage = (raised: number, goal: number) => {
    return Math.round((raised / goal) * 100);
  };

  return (
    <section className="py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Featured Projects
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Discover innovative startups that are changing the world. 
            Invest in the future with secure HBAR transactions.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {projects.map((project) => (
            <Card key={project.id} className="group hover:shadow-xl transition-all duration-300 overflow-hidden">
              <div className="relative">
                <ImageWithFallback
                  src={project.image}
                  alt={project.title}
                  className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                />
                {project.featured && (
                  <Badge className="absolute top-4 left-4 bg-gradient-to-r from-purple-600 to-blue-600">
                    Featured
                  </Badge>
                )}
                <Badge variant="secondary" className="absolute top-4 right-4 bg-white/90">
                  {project.category}
                </Badge>
              </div>
              
              <CardHeader className="pb-4">
                <h3 className="text-xl font-semibold text-gray-900 group-hover:text-purple-600 transition-colors">
                  {project.title}
                </h3>
                <p className="text-gray-600 line-clamp-2">
                  {project.description}
                </p>
              </CardHeader>
              
              <CardContent className="pt-0">
                {/* Progress Bar */}
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600">Funding Progress</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {getProgressPercentage(project.raised, project.goal)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-purple-600 to-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${getProgressPercentage(project.raised, project.goal)}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-sm font-semibold text-gray-900">
                      {formatCurrency(project.raised)} raised
                    </span>
                    <span className="text-sm text-gray-600">
                      of {formatCurrency(project.goal)}
                    </span>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-1">
                      <Users className="w-4 h-4 text-gray-500 mr-1" />
                      <span className="text-sm font-semibold text-gray-900">{project.investors}</span>
                    </div>
                    <span className="text-xs text-gray-500">Investors</span>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-1">
                      <Clock className="w-4 h-4 text-gray-500 mr-1" />
                      <span className="text-sm font-semibold text-gray-900">{project.daysLeft}</span>
                    </div>
                    <span className="text-xs text-gray-500">Days Left</span>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-1">
                      <TrendingUp className="w-4 h-4 text-gray-500 mr-1" />
                      <span className="text-sm font-semibold text-gray-900">A+</span>
                    </div>
                    <span className="text-xs text-gray-500">Rating</span>
                  </div>
                </div>

                <Button className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
                  Invest Now
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center mt-12">
          <Button variant="outline" size="lg" className="border-purple-600 text-purple-600 hover:bg-purple-50">
            View All Projects
          </Button>
        </div>
      </div>
    </section>
  );
}