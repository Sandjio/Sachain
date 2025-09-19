import { Section, SectionHeader } from "./ui/section";
import { Card, CardContent } from "./ui/card";
import { Network, Heart, MapPin } from "lucide-react";
import svgPaths from "@/utils/svg-tzs4efenma";

interface ReasonCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
}

function ReasonCard({ title, description, icon }: ReasonCardProps) {
  return (
    <div className="text-center space-y-6">
      <Card className="group relative p-8 bg-brand-surface/50 border-border/50 hover:shadow-lg transition-all duration-300 hover:scale-105">
        {/* Icon */}
        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2">
          <div className="bg-secondary rounded-xl w-16 h-16 flex items-center justify-center shadow-lg group-hover:bg-primary transition-colors duration-300">
            {icon}
          </div>
        </div>
        
        {/* Content */}  
        <CardContent className="pt-8 pb-0">
          <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors duration-300 whitespace-pre-line">
            {title}
          </h3>
        </CardContent>
      </Card>
      
      <p className="text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto">
        {description}
      </p>
    </div>
  );
}

export function WhySachain() {
  const reasons = [
    {
      title: "Diaspora\nConnection",
      description: "Connecting African diaspora investors with homeland innovations to build economic bridges.",
      icon: <Network className="w-8 h-8 text-primary-foreground" />
    },
    {
      title: "Local\nImpact",
      description: "Every investment creates jobs and drives economic growth across African communities.",
      icon: <Heart className="w-8 h-8 text-primary-foreground" />
    },
    {
      title: "Cultural\nUnderstanding",
      description: "Built by Africans for Africans with deep market understanding and cultural context.",
      icon: <MapPin className="w-8 h-8 text-primary-foreground" />
    }
  ];

  return (
    <Section background="muted" size="lg">
      <SectionHeader 
        title="Why Sachain for Africa?"
        subtitle="Purpose-built to unlock Africa's innovation potential through accessible, secure crowdfunding that understands the continent's unique opportunities and challenges."
      />

      {/* Reasons Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-12 lg:gap-16">
        {reasons.map((reason, index) => (
          <ReasonCard 
            key={index}
            title={reason.title}
            description={reason.description}
            icon={reason.icon}
          />
        ))}
      </div>
    </Section>
  );
}