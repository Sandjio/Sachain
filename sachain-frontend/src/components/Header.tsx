import Link from 'next/link';
import LanguageSwitcher from './LanguageSwitcher';
import { Button } from '@/components/ui/button';
import { useTranslate } from '@/hooks/useTranslate';

import en from '../locales/en.json';
import fr from '../locales/fr.json';

export async function getStaticProps({ locale = 'en' }) {
  const messages = locale === 'fr' ? fr : en;
  return { props: { messages, locale } };
}

export default function Header() {
  const translate = useTranslate('header');

  return (
    <header className="border-b bg-background">
      <div className="container-max flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link
          href="/"
          className="text-primary font-bold text-xl tracking-tight"
        >
          SACHAIN
        </Link>

        {/* Navigation */}
        <nav className="flex items-center gap-4">
          <LanguageSwitcher />

          <Link href="/login">
            <Button variant="outline" className="text-sm">
              login
            </Button>
          </Link>

          <Link href="/signup">
            <Button className="text-sm bg-accent hover:bg-accent/90 text-accent-foreground">
              signup
            </Button>
          </Link>
        </nav>
      </div>
    </header>
  );
}
