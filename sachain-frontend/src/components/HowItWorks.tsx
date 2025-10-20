

import { Section, SectionHeader } from "./ui/section";
import { Card, CardContent } from "./ui/card";
import { Users, Lightbulb } from "lucide-react";

interface StepCardProps {
  stepNumber: string;
  title: string;
  description: string;
  isHighlighted?: boolean;
}

function StepCard({ stepNumber, title, description, isHighlighted = false }: StepCardProps) {
  return (
    <div className="space-y-4">
      {/* Step Badge */}
      <div className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium bg-brand-light border  text-primary ${
        isHighlighted ? 'bg-primary/50 text-primary-foreground' : 'bg-primary/50 text-primary-foreground'
      }`}>
        {stepNumber}
      </div>
      {/* Content Card */}
      <Card className={`p-6 ${isHighlighted ? 'ring-2 ring-primary/20' : ''}`}>
        <CardContent className="p-0 space-y-3">
          <h3 className="text-xl font-bold text-foreground">{title}</h3>
          <p className="text-muted-foreground leading-relaxed">{description}</p>
        </CardContent>
      </Card>
    </div>
  );
}

export function HowItWorks() {
  const investorSteps = [
    {
      stepNumber: "Step 1",
      title: "Create Account",
      description: "Sign up and verify your identity to start investing with HBAR.",
      isHighlighted: true,
    },
    {
      stepNumber: "Step 2",
      title: "Browse Projects",
      description: "Discover vetted African startups and their innovative solutions.",
    },
    {
      stepNumber: "Step 3",
      title: "Invest with HBAR",
      description: "Use secure Hedera network transactions to purchase equity shares.",
    },
    {
      stepNumber: "Step 4",
      title: "Track Growth",
      description: "Monitor your investments and receive returns transparently.",
    },
  ];

  const startupSteps = [
    {
      stepNumber: "Step 1",
      title: "Submit Project",
      description: "Present your startup idea with a detailed business plan.",
    },
    {
      stepNumber: "Step 2",
      title: "Get Verified",
      description: "Our team reviews and verifies your project authenticity.",
    },
    {
      stepNumber: "Step 3",
      title: "Raise Funds",
      description: "Connect with investors and raise capital through HBAR.",
    },
    {
      stepNumber: "Step 4",
      title: "Scale Together",
      description: "Grow your business with investor support and guidance.",
    },
  ];

  return (
    <Section background="muted">
      <SectionHeader 
        title="How Sachain Works"
        subtitle="Bridging the gap between African innovation and global capital. Simple, secure, and transparent blockchain-powered crowdfunding."
      />
      {/* Target Audience Cards */}
      <div className="grid md:grid-cols-2 gap-8 lg:gap-16 mb-16 lg:mb-24">
        {/* For Investors */}
        <Card className="relative p-6 text-center group hover:shadow-lg transition-shadow">
          <div className="absolute -top-8 left-1/2 transform -translate-x-1/2">
            <div className="bg-secondary rounded-xl w-16 h-16 flex items-center justify-center shadow-lg">
              <Users className="w-8 h-8 text-primary-foreground" />
            </div>
          </div>
          <CardContent className="pt-8 pb-0 space-y-3">
            <h3 className="text-2xl font-bold text-foreground">For Investors</h3>
            <p className="text-muted-foreground">Discover and invest in African innovation</p>
          </CardContent>
        </Card>
        {/* For Startups */}
        <Card className="relative p-8 text-center group hover:shadow-lg transition-shadow">
          <div className="absolute -top-8 left-1/2 transform -translate-x-1/2">
            <div className="bg-secondary rounded-xl w-16 h-16 flex items-center justify-center shadow-lg">
              <Lightbulb className="w-8 h-8 text-primary-foreground" />
            </div>
          </div>
          <CardContent className="pt-8 pb-0 space-y-3">
            <h3 className="text-2xl font-bold text-foreground">For Entrepreneurs</h3>
            <p className="text-muted-foreground">Access global capital to scale across Africa</p>
          </CardContent>
        </Card>
      </div>
      {/* Process Steps */}
      <div className="relative">
        {/* Central Divider - Hidden on mobile */}
        <div className="hidden lg:block absolute left-1/2 top-0 bottom-0 w-px bg-border transform -translate-x-1/2" />
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-16">
          {/* Investor Steps */}
          <div className="space-y-8">
            <h3 className="text-xl font-bold text-primary text-center lg:text-left mb-4">
              Investor Journey
            </h3>
            {investorSteps.map((step, index) => (
              <StepCard key={index} {...step} />
            ))}
          </div>
          {/* Startup Steps */}
          <div className="space-y-8">
            <h3 className="text-xl font-bold text-primary text-center lg:text-left mb-4">
              Entrepreneur Journey
            </h3>
            {startupSteps.map((step, index) => (
              <StepCard key={index} {...step} />
            ))}
          </div>
        </div>
      </div>
    </Section>
  );
}
