
import { AppProps } from 'next/app';
import { IntlProvider } from 'next-intl';
import '@/styles/globals.css';

export default function App({ Component, pageProps }: AppProps) {
  // pageProps.messages must be provided from getStaticProps or getServerSideProps
  const { messages, locale = 'en' } = pageProps;
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return (
    <IntlProvider locale={locale} messages={messages} timeZone={timeZone}>
      <Component {...pageProps} />
    </IntlProvider>
  );
}
