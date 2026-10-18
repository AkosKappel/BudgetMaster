import { createIsomorphicFn } from '@tanstack/react-start'
import { getCookie } from '@tanstack/react-start/server'

export const THEMES = ['system', 'light', 'dark'] as const
export type Theme = (typeof THEMES)[number]

const THEME_COOKIE = 'theme'
const toTheme = (value: string | undefined): Theme =>
  THEMES.find((theme) => theme === value) ?? 'system'

// The chosen theme, rendered into <html data-theme> on the server so the page never
// flashes the wrong colours; src/styles.css does the rest.
export const getTheme = createIsomorphicFn()
  .server(() => toTheme(getCookie(THEME_COOKIE)))
  .client(() => toTheme(document.documentElement.dataset.theme))

export function setTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme
  // biome-ignore lint/suspicious/noDocumentCookie: a plain preference cookie, read on the server
  document.cookie = `${THEME_COOKIE}=${theme}; path=/; max-age=31536000; samesite=lax`
}
