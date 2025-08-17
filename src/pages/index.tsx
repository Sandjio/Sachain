import { useTranslate } from '@/hooks/useTranslate';
import LanguageSwitcher from '@/components/LanguageSwitcher';

export default function Home() {
  const translate = useTranslate();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background">
      <LanguageSwitcher />
      <h1 className="text-5xl font-bold text-primary mb-4">{translate('welcome')}</h1>
      <p className="text-lg text-secondary mb-6">{translate('description')}</p>
    </main>
  );
}


