
import { AppProps } from 'next/app';
import { IntlProvider } from 'next-intl';
import { useRouter } from 'next/router';
import '@/styles/globals.css';
import en from '../locales/en.json';
import fr from '../locales/fr.json';

 const messagesMap: Record<string, Record<string, string>> = {
  en,
  fr,
};


export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const locale = router.locale || 'en';
  const messages = messagesMap[locale];

  return (
    <IntlProvider locale={locale} messages={messages}>
      <Component {...pageProps} />
    </IntlProvider>
  );
}

