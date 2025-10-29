import { Button } from '@/components/ui/button';
import { useRouter } from 'next/router';

// src/components/LanguageSwitcher.tsx
export default function LanguageSwitcher() {
  const router = useRouter();
  const { locale = 'en', asPath } = router;
  const switchTo = locale === 'en' ? 'fr' : 'en';

  return (
    <Button
      className="border"
      onClick={() => router.push(asPath, asPath, { locale: switchTo })}
    >
      {switchTo.toUpperCase()}
    </Button>
  );
}
