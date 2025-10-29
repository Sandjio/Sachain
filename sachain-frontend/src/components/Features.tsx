import { Section, SectionHeader } from './ui/section';
import { Card, CardContent } from './ui/card';
import {
  Shield,
  Zap,
  Users,
  TrendingUp,
  Globe,
  Coins,
  FileText,
  CheckCircle,
} from 'lucide-react';
import svgPaths from '@/utils/svg-tzs4efenma';

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <Card className="group relative overflow-hidden p-6 hover:shadow-lg transition-all duration-300 bg-[#90A5FB]/20  border-[#90A5FB]/50 hover:scale-105 flex flex-col items-center text-center">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-brand-light/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      {/* Icon */}
      <div className="relative z-10 mb-6 flex items-center justify-center rounded-xl bg-primary w-20 h-20 group-hover:bg-secondary transition-colors duration-300">
        {icon}
      </div>

      {/* Content */}
      <CardContent className="relative z-10 p-0 space-y-3 flex flex-col items-center text-center">
        <h3 className="font-bold text-foreground group-hover:text-primary transition-colors duration-300">
          {title}
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {description}
        </p>
      </CardContent>
    </Card>
  );
}

export function PlatformFeatures() {
  const features = [
    {
      icon: <Zap className="w-10 h-10 text-primary-foreground" />,
      title: 'Instant HBAR Transactions',
      description:
        'Lightning-fast payments and settlements using HBAR cryptocurrency with minimal fees.',
    },
    {
      icon: <Users className="w-10 h-10 text-primary-foreground" />,
      title: 'Community Driven',
      description:
        'Connect with investors and entrepreneurs across Africa to build the future together.',
    },

    {
      icon: <Globe className="w-10 h-10 text-primary-foreground" />,
      title: 'Pan-African Focus',
      description:
        'Specifically designed to support and scale African startups and innovation.',
    },
    {
      icon: <Coins className="w-10 h-10 text-primary-foreground" />,
      title: 'Fractional Ownership',
      description:
        'Invest in startups with any amount through tokenized shares and smart contracts.',
    },
    {
      icon: <FileText className="w-10 h-10 text-primary-foreground" />,
      title: 'Transparent Reporting',
      description:
        'Complete transparency with real-time project updates and financial reporting.',
    },
    {
      icon: <CheckCircle className="w-10 h-10 text-primary-foreground" />,
      title: 'KYC & Compliance',
      description:
        'Fully compliant with international regulations and comprehensive KYC verification.',
    },
  ];

  return (
    <Section size="md" className="bg-[#E3E3E3]/50">
      <SectionHeader
        title="Platform Features"
        subtitle="SACHAIN combines cutting-edge blockchain technology with user-friendly design to create the most powerful crowdfunding platform for African innovation."
      />
      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3  gap-6 lg:gap-8 lg:mb-24 p-12 lg:px-10">
        {features.map((feature, index) => (
          <FeatureCard
            key={index}
            icon={feature.icon}
            title={feature.title}
            description={feature.description}
          />
        ))}
      </div>

      {/* MVP Badge: place inside the big container but below the grid */}
      <div className="flex justify-center ">
        <div className="inline-flex items-center gap-3 bg-brand-light rounded-lg shadow-sm px-6 py-4 border bg-[#90A5FB]/50 border-primary/10">
          <div className="flex-shrink-0">
            <svg
              className="w-5 h-5 text-primary"
              fill="none"
              viewBox="0 0 20 20"
            >
              <path
                d={svgPaths.p750f180}
                fill="currentColor"
                fillRule="evenodd"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <p className="font-medium text-primary">
            MVP Coming Soon - Built for{' '}
            <span className="font-bold uppercase">Hedera Hackathon</span>
          </p>
        </div>
      </div>
    </Section>
  );
}
