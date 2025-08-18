import { useTranslate } from '@/hooks/useTranslate';
import PublicLayout from '@/layout/PublicLayout';
import { Button } from '@/components/ui/button';

export default function Home() {
  const translate = useTranslate();

  return (
 <PublicLayout>
      {/* Hero Section */}
      <section className="container-max py-20 md:py-28 text-center flex flex-col items-center">
        <h1 className="text-5xl md:text-6xl font-bold text-primary mb-4">
          {translate('hero.title')}
        </h1>

        <p className="text-lg text-secondary mb-8 max-w-2xl">
          {translate(
            'hero.subtitle'
          )}
        </p>

        <div className="flex flex-col sm:flex-row gap-4">
          <Button variant="default" className="px-6 py-3">
            {translate('hero.getStarted')}
          </Button>
          <Button variant="outline" className="px-6 py-3">
            {translate('hero.learnMore')}
          </Button>
        </div>
      </section>
    </PublicLayout>
  );
}


