import { AppProps } from 'next/app';
import { IntlProvider } from 'next-intl';
import { AuthProvider } from '@/provider/AuthProvider';
import '../styles/globals.css';

export default function App({ Component, pageProps }: AppProps) {
  const { messages, locale = 'en' } = pageProps;
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return (
    <IntlProvider locale={locale} messages={messages} timeZone={timeZone}>
      <AuthProvider>
        <div style={{ fontFamily: `'Open Sans', 'Outfit', sans-serif` }}>
          <Component {...pageProps} />
        </div>
      </AuthProvider>
    </IntlProvider>
  );
}
