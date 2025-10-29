import { Section, SectionHeader } from './ui/section';
import { Card, CardContent } from './ui/card';
import {
  Building2,
  DollarSign,
  Users,
  TrendingUp,
  MapPin,
  Lightbulb,
} from 'lucide-react';
import svgPaths from '@/utils/svg-tzs4efenma';

interface StatCardProps {
  value: string;
  label: string;
  description: string;
  icon: React.ReactNode;
}

function StatCard({ value, label, description, icon }: StatCardProps) {
  return (
    <Card className="group text-center p-2 hover:shadow-lg transition-all duration-300 hover:scale-105 bg-[#C4C4C4]/20 border-[#90A5FB]/50 max-w-sm">
      {/* Icon */}
      <div className="mb-4 flex justify-center">
        <div className="bg-[#90A5FB]/25 rounded-xl w-16 h-16 flex items-center justify-center group-hover:bg-secondary transition-colors duration-300">
          {icon}
        </div>
      </div>

      {/* Content */}
      <CardContent className=" space-y-1">
        <div className="font-black text-foreground group-hover:text-primary transition-colors duration-300">
          {value}
        </div>
        <div className="font-semibold text-foreground">{label}</div>
        <div className="text-sm text-muted-foreground leading-relaxed">
          {description}
        </div>
      </CardContent>
    </Card>
  );
}

export function AfricanOpportunity() {
  const stats = [
    {
      value: '$2.3B',
      label: 'Funding Gap',
      description: 'Unmet capital needs in Africa',
      icon: <DollarSign className="w-8 h-8 text-primary" />,
    },
    {
      value: '200M+',
      label: 'Potential Investors',
      description: 'African diaspora worldwide',
      icon: <Users className="w-8 h-8 text-primary" />,
    },

    {
      value: '54',
      label: 'African Countries',
      description: 'African startup ecosystem',
      icon: <MapPin className="w-8 h-8 text-primary" />,
    },
    {
      value: '1M+',
      label: 'Ideas Waiting',
      description: 'For funding and support',
      icon: <Lightbulb className="w-8 h-8 text-primary" />,
    },
  ];

  return (
    <Section size="lg" className="px-6 lg:px-16">
      <SectionHeader
        title="The African Opportunity"
        subtitle="Africa's startup ecosystem is booming, but access to capital remains a challenge. Sachain bridges this gap with blockchain-powered crowdfunding."
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-6">
        {stats.map((stat, index) => (
          <StatCard
            key={index}
            value={stat.value}
            label={stat.label}
            description={stat.description}
            icon={stat.icon}
          />
        ))}
      </div>
    </Section>
  );
}
