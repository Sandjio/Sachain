import { Section, SectionHeader } from './ui/section';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Clock, Percent, Headphones, Sparkles } from 'lucide-react';
import svgPaths from '@/utils/svg-tzs4efenma';

export function ReadyToStart() {
  return (
    <Section background="brand" size="md" className="py-10">
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
            size="lg"
            className="bg-muted-foreground/50 text-primary-foreground px-16 py-4 font-bold w-full max-w-2xl"
          >
            Login
          </Button>
        </div>
      </div>

      {/* Join the Future Badge */}
      <div className="flex justify-center">
        <Card className="bg-brand-light/50 border-primary-foreground/20">
          <CardContent className="p-2">
            <div className="flex items-center gap-3">
              <Sparkles className="w-7 h-7 text-primary flex-shrink-0" />
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
