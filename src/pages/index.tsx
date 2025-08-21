import { useTranslate } from '@/hooks/useTranslate';
import PublicLayout from '@/layout/PublicLayout';
import { Button } from '@/components/ui/button';
import HowItWorks from '@/components/HowItWorks';
import UserSections from '@/components/UserSections';
import PlatformBenefits from '@/components/PlatformBenefits';


import en from '../locales/en.json';
import fr from '../locales/fr.json';
import CTASection from '@/components/CTASection';
import Footer from '@/components/Footer';

export async function getStaticProps({ locale = 'en' }) {
  const messages = locale === 'fr' ? fr : en;
  return { props: { messages, locale } };
}


export default function Home() {
  const translate = useTranslate("hero");
 
  return (
 <PublicLayout>
      {/* Hero Section */}
      <section className="container-max py-10 md:py-20 text-center flex flex-col items-center">

        <h1 className="text-5xl md:text-6xl font-bold text-primary mb-4">
          {translate('title')}
        </h1>

         <CTASection />

        <p className="text-lg text-secondary mb-8 max-w-2xl">
          {translate(
            'subtitle'
          )}
        </p>

        <div className="flex flex-col sm:flex-row gap-4">
           
          <Button variant="outline" className="px-6 py-3">
            {translate('learnMore')}
          </Button>
        </div>
      </section>
       {/* How It Works Section */}
      <HowItWorks />

      {/* User Sections */}
      <UserSections />

      {/* Platform Benefits */}
      <PlatformBenefits />

       <CTASection />

     
        <Footer />
    </PublicLayout>
  );
}


