import { COLORS, ICONS } from '@/lib/icons'
import { m } from '@/paraglide/messages.js'

// Radio groups for a category's or wallet's icon and colour, from the fixed sets in
// src/lib/icons.ts.

const ICON_LABELS: Record<string, () => string> = {
  banknote: m.shell_icon_banknote,
  briefcase: m.shell_icon_briefcase,
  bus: m.shell_icon_bus,
  camera: m.shell_icon_camera,
  carrot: m.shell_icon_carrot,
  coins: m.shell_icon_coins,
  'credit-card': m.shell_icon_credit_card,
  gift: m.shell_icon_gift,
  'graduation-cap': m.shell_icon_graduation_cap,
  hammer: m.shell_icon_hammer,
  handshake: m.shell_icon_handshake,
  'heart-pulse': m.shell_icon_heart_pulse,
  house: m.shell_icon_house,
  'key-round': m.shell_icon_key_round,
  landmark: m.shell_icon_landmark,
  laptop: m.shell_icon_laptop,
  'paw-print': m.shell_icon_paw_print,
  'piggy-bank': m.shell_icon_piggy_bank,
  plane: m.shell_icon_plane,
  repeat: m.shell_icon_repeat,
  'shopping-bag': m.shell_icon_shopping_bag,
  'shopping-basket': m.shell_icon_shopping_basket,
  sofa: m.shell_icon_sofa,
  ticket: m.shell_icon_ticket,
  'undo-2': m.shell_icon_undo_2,
  utensils: m.shell_icon_utensils,
  wallet: m.shell_icon_wallet,
  zap: m.shell_icon_zap,
}

const iconLabel = (name: string) =>
  ICON_LABELS[name]?.() ?? name.replaceAll('-', ' ')

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
      <legend className="mb-2 font-medium text-sm">
        {m.shell_picker_icon()}
      </legend>
      <div className="flex flex-wrap gap-1">
        {Object.entries(ICONS).map(([name, Icon]) => (
          <label key={name} className={swatchClass} title={iconLabel(name)}>
            <input
              type="radio"
              name="icon"
              value={name}
              checked={value === name}
              onChange={() => onChange(name)}
              className="sr-only"
              aria-label={iconLabel(name)}
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
      <legend className="mb-2 font-medium text-sm">
        {m.shell_picker_colour()}
      </legend>
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
              aria-label={m.shell_picker_colour_n({ n: index + 1 })}
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
