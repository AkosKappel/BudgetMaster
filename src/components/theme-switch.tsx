import { Monitor, Moon, Sun } from 'lucide-react'
import { useState } from 'react'

import { getTheme, setTheme, THEMES, type Theme } from '@/lib/theme'

const OPTIONS: Record<Theme, { label: string; icon: typeof Sun }> = {
  system: { label: 'System', icon: Monitor },
  light: { label: 'Light', icon: Sun },
  dark: { label: 'Dark', icon: Moon },
}

export function ThemeSwitch() {
  const [theme, setChosen] = useState<Theme>(getTheme)

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 font-semibold text-lg">Appearance</legend>
      <div className="grid w-full max-w-sm grid-cols-3 gap-1 rounded-lg bg-muted p-1">
        {THEMES.map((value) => {
          const { label, icon: Icon } = OPTIONS[value]
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
                onChange={() => {
                  setTheme(value)
                  setChosen(value)
                }}
                className="sr-only"
              />
              <Icon className="size-4" aria-hidden="true" />
              {label}
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
