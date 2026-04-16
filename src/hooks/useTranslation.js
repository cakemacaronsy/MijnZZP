import { useContext } from 'react';
import { AppContext } from './useAppData';
import T from '../i18n';

export function useTranslation() {
  const ctx = useContext(AppContext);
  const lang = ctx?.settings?.lang || 'en';
  return { t: T[lang] || T.en, lang };
}
