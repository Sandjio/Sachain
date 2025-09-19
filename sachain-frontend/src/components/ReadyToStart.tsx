import { Section, SectionHeader } from "./ui/section";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Clock, Percent, Headphones, Sparkles } from "lucide-react";
import svgPaths from "@/utils/svg-tzs4efenma";

export function ReadyToStart() {
  const stats = [
    {
      value: "2 min",
      label: "Setup Time",
      icon: <Clock className="w-6 h-6 text-primary" />
    },
    {
      value: "0%",
      label: "Platform Fees*",
      icon: <Percent className="w-6 h-6 text-primary" />
    },
    {
      value: "24/7",
      label: "Support",
      icon: <Headphones className="w-6 h-6 text-primary" />
    }
  ];

  return (
    <Section background="brand" size="lg">
      <SectionHeader 
        title="Ready to Start Your Investment Journey?"
        subtitle="Whether you're an investor looking for African opportunities or a startup ready to scale across the continent, Sachain makes it simple, secure, and transparent."
      />

      {/* CTA Buttons */}  
      <div className="space-y-6 mb-16">
        <div className="flex justify-center">
          <Button 
            size="lg" 
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-16 py-4 text-lg font-bold w-full max-w-2xl"
          >
            Registration
          </Button>
        </div>

        <div className="text-center">
          <p className="font-semibold text-foreground mb-4">
            Already have an account?
          </p>
          <Button 
            variant="outline" 
            size="lg"
            className="bg-brand-muted/25 border-border/50 text-foreground hover:bg-brand-muted/40 px-16 py-4 font-bold w-full max-w-2xl"
          >
            Login
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12 mb-16">
        {stats.map((stat, index) => (
          <div key={index} className="text-center space-y-2">
            <div className="flex justify-center mb-3">
              {stat.icon}
            </div>
            <div className="text-2xl lg:text-3xl font-black text-primary">
              {stat.value}
            </div>
            <div className="font-semibold text-primary">
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Disclaimer */}
      <div className="text-center mb-16">
        <p className="font-semibold text-primary">
          *MVP launching soon. Built for the Hedera Hackathon challenge.
        </p>
      </div>

      {/* Join the Future Badge */}
      <div className="flex justify-center">
        <Card className="bg-brand-light/50 border-primary-foreground/20">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-primary flex-shrink-0" />
              <p className="font-semibold text-primary">
                Join the Future of Crowdfunding
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </Section>
  );
}