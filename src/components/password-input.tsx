import { Eye, EyeOff } from 'lucide-react'
import { type ComponentProps, useEffect, useRef, useState } from 'react'

import { cn } from '@/lib/utils'
import { m } from '@/paraglide/messages.js'

// The toggle sits next to the <input>, not on top of it: password managers (1Password,
// Bitwarden, LastPass, the browser's own) draw their icon inside the input's right edge, so
// nothing overlaps. The shared border makes both look like one field.
export function PasswordInput({
  className,
  ...props
}: Omit<ComponentProps<'input'>, 'type'>) {
  const [visible, setVisible] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  // Hidden again on submit, so browsers still offer to save the password.
  useEffect(() => {
    const form = input.current?.form
    if (!form) return
    const hide = () => setVisible(false)
    form.addEventListener('submit', hide)
    return () => form.removeEventListener('submit', hide)
  }, [])

  return (
    <div
      className={cn(
        'flex h-9 w-full items-stretch rounded-md border border-input bg-transparent shadow-xs transition-[color,box-shadow] focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50 has-aria-invalid:border-destructive',
        className,
      )}
    >
      <input
        ref={input}
        type={visible ? 'text' : 'password'}
        className="min-w-0 flex-1 bg-transparent px-3 text-base outline-none placeholder:text-muted-foreground md:text-sm"
        {...props}
      />
      <button
        type="button"
        aria-label={visible ? m.shell_password_hide() : m.shell_password_show()}
        aria-pressed={visible}
        aria-controls={props.id}
        // Keeps focus and the caret in the input when clicked with a mouse or finger.
        onPointerDown={(event) => event.preventDefault()}
        onClick={() => setVisible((v) => !v)}
        className="flex w-10 shrink-0 items-center justify-center rounded-r-md text-muted-foreground outline-none hover:text-foreground focus-visible:bg-accent focus-visible:text-foreground"
      >
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  )
}
