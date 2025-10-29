import { Section, SectionHeader } from './ui/section';
import { Card, CardContent } from './ui/card';
import { Building, Building2, Lightbulb, Plane } from 'lucide-react';
import svgPaths from '@/utils/svg-tzs4efenma';

interface ReasonCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
}

function ReasonCard({ title, description, icon }: ReasonCardProps) {
  return (
    <div className="relative -top-12 text-center max-w-xs mx-auto">
      <Card className="group relative p-3 bg-[#C4C4C4]/20 border-border/50 hover:shadow-lg transition-all duration-300 hover:scale-105">
        {/* Icon */}
        <div className="absolute -top-6 left-1/2 transform -translate-x-1/2">
          <div className="bg-[#90A5FB] rounded-xl w-12 h-12 flex items-center justify-center shadow-lg transition-colors duration-300">
            {icon}
          </div>
        </div>

        {/* Content */}
        <CardContent className="pt-8 pb-4 px-4">
          <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors duration-300 whitespace-pre-line text-sm">
            {title}
          </h3>
          <p className="text-xs text-muted-foreground leading-snug mt-2">
            {description}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export function WhySachain() {
  const reasons = [
    {
      title: 'Diaspora\nConnection',
      description:
        'Connecting African diaspora investors with homeland innovations to build economic bridges.',
      icon: (
        <Building2
          className="w-10 h-10 text-primary-foreground"
          color="#123962"
        />
      ),
    },
    {
      title: 'Local\nImpact',
      description:
        'Every investment creates jobs and drives economic growth across African communities.',
      icon: (
        <Plane className="w-10 h-10 text-primary-foreground" color="#123962" />
      ),
    },
    {
      title: 'Cultural\nUnderstanding',
      description:
        'Built by Africans for Africans with deep market understanding and cultural context.',
      icon: (
        <Lightbulb
          className="w-10 h-10 text-primary-foreground"
          color="#123962"
        />
      ),
    },
  ];

  return (
    <Section background="muted" size="lg">
      <SectionHeader
        title="Why Sachain for Africa?"
        className="bg-[#E3E3E3]/50 p-4"
        subtitle="Purpose-built to unlock Africa's innovation potential through accessible, secure crowdfunding that understands the continent's unique opportunities and challenges."
      />

      {/* Reasons Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-2">
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
