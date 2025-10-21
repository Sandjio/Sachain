import { useTranslate } from '@/hooks/useTranslate';
import PublicLayout from '@/layout/PublicLayout';
import { HowItWorks } from '@/components/HowItWorks';
import { Navbar } from '@/components/Navbar';
import { HeroSection } from '@/components/HeroSection';
import { PlatformFeatures } from '@/components/Features';
import { StatsSection } from '@/components/StatSection';

import en from '../locales/en.json';
import fr from '../locales/fr.json';
import { CTASection } from '@/components/CTASection';
import { Footer } from '@/components/Footer';
import { Partners } from '@/components/Partners';
import { AfricanOpportunity } from '@/components/AfricanOpportunity';
import { ReadyToStart } from '@/components/ReadyToStart';
import { WhySachain } from '@/components/WhySachain';

export async function getStaticProps({ locale = 'en' }) {
  const messages = locale === 'fr' ? fr : en;
  return { props: { messages, locale } };
}

export default function Home() {
  return (
    <PublicLayout>
      <div className="min-h-screen">
        {/* <Navbar /> */}
        <HeroSection />
        <Partners />
        <HowItWorks />

        <PlatformFeatures />
        <AfricanOpportunity />

        <WhySachain />
        <ReadyToStart />
        <Footer />
      </div>
    </PublicLayout>
  );
}
