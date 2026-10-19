// A short buzz on phones that support the Vibration API (Android); a no-op elsewhere.
const PATTERNS: Record<'confirm' | 'delete', VibratePattern> = {
  confirm: 12,
  delete: [12, 60, 12],
}

export function haptic(pattern: keyof typeof PATTERNS) {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(PATTERNS[pattern])
  }
}
