import { getLocale, type Locale } from '../paraglide/runtime.js'

// Number, money and date formats follow the language: Irish English keeps day-month order
// and the euro sign in front, the others use their country's conventions.
const FORMAT_LOCALES: Record<Locale, string> = {
  en: 'en-IE',
  hu: 'hu-HU',
  sk: 'sk-SK',
}

export const LANGUAGES: { locale: Locale; name: string }[] = [
  { locale: 'en', name: 'English' },
  { locale: 'hu', name: 'Magyar' },
  { locale: 'sk', name: 'Slovenčina' },
]

export const formatLocale = () => FORMAT_LOCALES[getLocale()]
