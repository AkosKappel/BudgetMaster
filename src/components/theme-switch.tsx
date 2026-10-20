import { Monitor, Moon, Sun } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { setTheme, THEMES, type Theme, useTheme } from '@/lib/theme'
import { m } from '@/paraglide/messages.js'

export const THEME_OPTIONS: Record<
  Theme,
  {
    label: () => string
    icon: typeof Sun
  }
> = {
  system: { label: m.shell_theme_system, icon: Monitor },
  light: { label: m.shell_theme_light, icon: Sun },
  dark: { label: m.shell_theme_dark, icon: Moon },
}

const isTheme = (value: string): value is Theme =>
  THEMES.some((theme) => theme === value)

export function ThemeSwitch() {
  const theme = useTheme()

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 font-semibold text-lg">
        {m.shell_theme_appearance()}
      </legend>
      <div className="grid w-full max-w-sm grid-cols-3 gap-1 rounded-lg bg-muted p-1">
        {THEMES.map((value) => {
          const { label, icon: Icon } = THEME_OPTIONS[value]
          return (
            <label
              key={value}
              className="flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-md text-sm has-checked:bg-card has-checked:shadow-xs has-focus-visible:ring-2 has-focus-visible:ring-ring"
            >
              <input
                type="radio"
                name="theme"
                value={value}
                checked={theme === value}
                onChange={() => setTheme(value)}
                className="sr-only"
              />
              <Icon className="size-4" aria-hidden="true" />
              {label()}
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}

// Compact control for the sidebar, the phone header and the public pages.
export function ThemeMenu({ className }: { className?: string }) {
  const theme = useTheme()
  const { label, icon: Icon } = THEME_OPTIONS[theme]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={className}
          aria-label={m.shell_theme_change({ theme: label() })}
          title={m.shell_theme_title()}
        >
          <Icon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuLabel className="text-muted-foreground text-xs">
          {m.shell_theme_title()}
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={theme}
          onValueChange={(value) => isTheme(value) && setTheme(value)}
        >
          {THEMES.map((value) => {
            const { label, icon: ItemIcon } = THEME_OPTIONS[value]
            return (
              <DropdownMenuRadioItem key={value} value={value}>
                <ItemIcon />
                {label()}
              </DropdownMenuRadioItem>
            )
          })}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
