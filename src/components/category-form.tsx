import { useState } from 'react'

import { FormError } from '@/components/auth-page'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { COLORS, ICONS } from '@/lib/icons'
import type { CategoryInput, ManagedCategory } from '@/server/categories'

type CategoryType = ManagedCategory['type']
export type CategoryValues = Pick<
  CategoryInput,
  'name' | 'type' | 'icon' | 'color' | 'parentId'
>

const selectClass =
  'h-9 rounded-md border border-input bg-card px-3 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50 md:text-sm'

const swatchClass =
  'flex size-10 cursor-pointer items-center justify-center rounded-full border-2 border-transparent has-checked:border-foreground has-focus-visible:ring-2 has-focus-visible:ring-ring'

export function CategoryForm({
  defaults,
  editing,
  parents,
  hasChildren,
  pending,
  error,
  onSubmit,
}: {
  defaults: CategoryValues
  // The type is fixed once a category exists: its transactions and budgets rely on it.
  editing: boolean
  // Top-level categories it could move under, of both types.
  parents: ManagedCategory[]
  hasChildren: boolean
  pending: boolean
  error?: string
  onSubmit: (values: CategoryValues) => void
}) {
  const [values, setValues] = useState(defaults)
  const set = (change: Partial<CategoryValues>) =>
    setValues((current) => ({ ...current, ...change }))
  const parentOptions = parents.filter((p) => p.type === values.type)

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit(values)
      }}
    >
      {!editing && (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 font-medium text-sm">Type</legend>
          <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
            {(['expense', 'income'] as const).map((type: CategoryType) => (
              <label
                key={type}
                className="flex h-8 cursor-pointer items-center justify-center rounded-md text-sm has-checked:bg-card has-checked:shadow-xs has-focus-visible:ring-2 has-focus-visible:ring-ring"
              >
                <input
                  type="radio"
                  name="type"
                  value={type}
                  checked={values.type === type}
                  onChange={() => set({ type, parentId: null })}
                  className="sr-only"
                />
                {type === 'expense' ? 'Expense' : 'Income'}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="category-name">Name</Label>
        <Input
          id="category-name"
          value={values.name}
          maxLength={40}
          required
          autoComplete="off"
          onChange={(e) => set({ name: e.target.value })}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="category-parent">Group</Label>
        <select
          id="category-parent"
          className={selectClass}
          value={values.parentId ?? ''}
          disabled={hasChildren}
          aria-describedby={hasChildren ? 'category-parent-hint' : undefined}
          onChange={(e) => set({ parentId: e.target.value || null })}
        >
          <option value="">None (top level)</option>
          {parentOptions.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        {hasChildren && (
          <p
            id="category-parent-hint"
            className="text-muted-foreground text-sm"
          >
            It has subcategories, so it stays at the top level.
          </p>
        )}
      </div>

      <fieldset>
        <legend className="mb-2 font-medium text-sm">Icon</legend>
        <div className="flex flex-wrap gap-1">
          {Object.entries(ICONS).map(([name, Icon]) => (
            <label key={name} className={swatchClass} title={name}>
              <input
                type="radio"
                name="icon"
                value={name}
                checked={values.icon === name}
                onChange={() => set({ icon: name })}
                className="sr-only"
                aria-label={name.replaceAll('-', ' ')}
              />
              <Icon className="size-5" style={{ color: values.color }} />
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 font-medium text-sm">Colour</legend>
        <div className="flex flex-wrap gap-1">
          {COLORS.map((color, index) => (
            <label key={color} className={swatchClass}>
              <input
                type="radio"
                name="color"
                value={color}
                checked={values.color === color}
                onChange={() => set({ color })}
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

      <FormError message={error ?? null} />
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? 'Saving' : editing ? 'Save changes' : 'Create category'}
      </Button>
    </form>
  )
}
