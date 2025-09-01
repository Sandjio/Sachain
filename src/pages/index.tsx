import { useTranslate } from '@/hooks/useTranslate';
import PublicLayout from '@/layout/PublicLayout';
import { Button } from '@/components/ui/button';
import { HowItWorks } from '@/components/HowItWorks';
import UserSections from '@/components/UserSections';
import PlatformBenefits from '@/components/PlatformBenefits';
import { Navbar } from "@/components/Navbar";
import { HeroSection } from "@/components/HeroSection";
import { Features } from "@/components/Features";
import { StatsSection } from "@/components/StatSection";


import en from '../locales/en.json';
import fr from '../locales/fr.json';
import { CTASection } from '@/components/CTASection';
import { Footer } from '@/components/Footer';

export async function getStaticProps({ locale = 'en' }) {
  const messages = locale === 'fr' ? fr : en;
  return { props: { messages, locale } };
}


export default function Home() {
  const translate = useTranslate("hero");
 
  return (
 <PublicLayout>
      <div className="min-h-screen bg-white">
      <Navbar />
      <HeroSection />
      <HowItWorks />
      <Features />
      <StatsSection />
      <CTASection />
      <Footer />
    </div>
    </PublicLayout>
  );
}



