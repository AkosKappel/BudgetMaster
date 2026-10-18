import { cn } from '@/lib/utils'

// Two six-petal rings in opposite phase: the guilloché rosette reduced to what still reads
// at favicon size. Same paths as `public/favicon.svg`.
const FRONT =
  'M47.5 32.0L50.2 33.6L52.0 35.5L52.3 37.4L51.0 38.9L48.5 39.7L45.4 39.8L42.4 39.3L40.2 38.9L39.1 39.1L38.9 40.2L39.3 42.4L39.8 45.4L39.7 48.5L38.9 51.0L37.4 52.3L35.5 52.0L33.6 50.2L32.0 47.5L30.9 44.7L30.1 42.6L29.4 41.7L28.3 42.1L26.6 43.6L24.3 45.4L21.5 46.9L19.0 47.5L17.2 46.8L16.5 45.0L17.1 42.5L18.6 39.8L20.4 37.4L21.9 35.7L22.3 34.6L21.4 33.9L19.3 33.1L16.5 32.0L13.8 30.4L12.0 28.5L11.7 26.6L13.0 25.1L15.5 24.3L18.6 24.3L21.6 24.7L23.8 25.1L24.9 24.9L25.1 23.8L24.7 21.6L24.2 18.6L24.3 15.5L25.1 13.0L26.6 11.7L28.5 12.0L30.4 13.8L32.0 16.5L33.1 19.3L33.9 21.4L34.6 22.3L35.7 21.9L37.4 20.4L39.8 18.6L42.5 17.1L45.0 16.5L46.8 17.2L47.5 19.0L46.9 21.5L45.4 24.2L43.6 26.6L42.1 28.3L41.7 29.4L42.6 30.1L44.7 30.9Z'
const BACK =
  'M47.5 32.0L44.7 33.1L42.6 33.9L41.7 34.6L42.1 35.7L43.6 37.4L45.4 39.8L46.9 42.5L47.5 45.0L46.8 46.8L45.0 47.5L42.5 46.9L39.8 45.4L37.4 43.6L35.7 42.1L34.6 41.7L33.9 42.6L33.1 44.7L32.0 47.5L30.4 50.2L28.5 52.0L26.6 52.3L25.1 51.0L24.3 48.5L24.3 45.4L24.7 42.4L25.1 40.2L24.9 39.1L23.8 38.9L21.6 39.3L18.6 39.8L15.5 39.7L13.0 38.9L11.7 37.4L12.0 35.5L13.8 33.6L16.5 32.0L19.3 30.9L21.4 30.1L22.3 29.4L21.9 28.3L20.4 26.6L18.6 24.2L17.1 21.5L16.5 19.0L17.2 17.2L19.0 16.5L21.5 17.1L24.2 18.6L26.6 20.4L28.3 21.9L29.4 22.3L30.1 21.4L30.9 19.3L32.0 16.5L33.6 13.8L35.5 12.0L37.4 11.7L38.9 13.0L39.7 15.5L39.8 18.6L39.3 21.6L38.9 23.8L39.1 24.9L40.2 25.1L42.4 24.7L45.4 24.2L48.5 24.3L51.0 25.1L52.3 26.6L52.0 28.5L50.2 30.4Z'

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="12 12 40 40"
      fill="none"
      strokeWidth={4.4}
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn('size-6', className)}
    >
      <path d={BACK} stroke="var(--note)" />
      <path d={FRONT} stroke="currentColor" />
    </svg>
  )
}

export function Logo({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'flex items-center gap-2 font-semibold text-lg tracking-tight',
        className,
      )}
    >
      <LogoMark />
      BudgetMaster
    </span>
  )
}
