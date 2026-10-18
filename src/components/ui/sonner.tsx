import { Toaster as Sonner } from 'sonner'

// Top centre keeps toasts clear of the tab bar and the add button on phones.
export function Toaster() {
  return (
    <Sonner
      position="top-center"
      mobileOffset={{ top: 'max(16px, env(safe-area-inset-top))' }}
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: { actionButton: '!bg-primary !text-primary-foreground' },
      }}
    />
  )
}
