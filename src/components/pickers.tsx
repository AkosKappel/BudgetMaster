import { COLORS, ICONS } from '@/lib/icons'

// Radio groups for a category's or wallet's icon and colour, from the fixed sets in
// src/lib/icons.ts.

const swatchClass =
  'flex size-10 cursor-pointer items-center justify-center rounded-full border-2 border-transparent has-checked:border-foreground has-focus-visible:ring-2 has-focus-visible:ring-ring'

export function IconPicker({
  value,
  color,
  onChange,
}: {
  value: string
  color: string
  onChange: (icon: string) => void
}) {
  return (
    <fieldset>
      <legend className="mb-2 font-medium text-sm">Icon</legend>
      <div className="flex flex-wrap gap-1">
        {Object.entries(ICONS).map(([name, Icon]) => (
          <label key={name} className={swatchClass} title={name}>
            <input
              type="radio"
              name="icon"
              value={name}
              checked={value === name}
              onChange={() => onChange(name)}
              className="sr-only"
              aria-label={name.replaceAll('-', ' ')}
            />
            <Icon className="size-5" style={{ color }} />
          </label>
        ))}
      </div>
    </fieldset>
  )
}

export function ColorPicker({
  value,
  onChange,
}: {
  value: string
  onChange: (color: string) => void
}) {
  return (
    <fieldset>
      <legend className="mb-2 font-medium text-sm">Colour</legend>
      <div className="flex flex-wrap gap-1">
        {COLORS.map((color, index) => (
          <label key={color} className={swatchClass}>
            <input
              type="radio"
              name="color"
              value={color}
              checked={value === color}
              onChange={() => onChange(color)}
              className="sr-only"
              aria-label={`Colour ${index + 1}`}
            />
            <span
              className="size-7 rounded-full"
              style={{ backgroundColor: color }}
            />
          </label>
        ))}
      </div>
    </fieldset>
  )
}
