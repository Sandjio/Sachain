import { useTranslations as useNextIntlTranslations } from 'next-intl';

export function useTranslate(namespace?: string) {
  return useNextIntlTranslations(namespace);
}