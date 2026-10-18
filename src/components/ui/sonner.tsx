import {
  CircleAlert,
  CircleCheck,
  Info,
  LoaderCircle,
  TriangleAlert,
} from 'lucide-react'
import { Toaster as Sonner } from 'sonner'

// Top centre keeps toasts clear of the tab bar and the add button on phones. Success stays
// ink with a check (green means income in this app); errors get the destructive colour.
// The colours are theme tokens, so light and dark mode need nothing extra.
export function Toaster() {
  return (
    <Sonner
      position="top-center"
      mobileOffset={{ top: 'max(16px, env(safe-area-inset-top))' }}
      icons={{
        success: <CircleCheck className="size-4" />,
        error: <CircleAlert className="size-4 text-destructive" />,
        warning: <TriangleAlert className="size-4 text-warning" />,
        info: <Info className="size-4" />,
        loading: <LoaderCircle className="size-4 animate-spin" />,
      }}
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          actionButton: '!bg-primary !text-primary-foreground',
          error: '!border-destructive/50',
        },
      }}
    />
  )
}
