import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface SectionProps {
  children: ReactNode;
  className?: string;
  background?: 'default' | 'muted' | 'brand';
  size?: 'sm' | 'md' | 'lg';
}

const backgroundVariants = {
  default: 'bg-background',
  muted: 'bg-brand-surface/30',
  brand: 'bg-brand-light/30',
};

const sizeVariants = {
  sm: 'py-8 lg:py-12',
  md: 'py-12 lg:py-16',
  lg: 'py-16 lg:py-24',
};

export function Section({
  children,
  className,
  background = 'default',
  size = 'md',
}: SectionProps) {
  return (
    <section
      className={cn(
        'px-4 lg:px-8',
        backgroundVariants[background],
        sizeVariants[size],
        className
      )}
    >
      <div className="container mx-auto">{children}</div>
    </section>
  );
}

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  className?: string;
}

export function SectionHeader({
  title,
  subtitle,
  className,
}: SectionHeaderProps) {
  return (
    <div className={cn('text-center space-y-4 mb-12 lg:mb-16', className)}>
      <h2 className="text-2xl md:text-3xl lg:text-4xl font-black text-foreground">
        {title}
      </h2>
      {subtitle && (
        <p className="text-lg lg:text-xl text-muted-foreground leading-relaxed max-w-3xl mx-auto">
          {subtitle}
        </p>
      )}
    </div>
  );
}
