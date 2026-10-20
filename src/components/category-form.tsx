import { useState } from 'react'

import { FormError } from '@/components/auth-page'
import { ColorPicker, IconPicker } from '@/components/pickers'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { m } from '@/paraglide/messages.js'
import type { CategoryInput, ManagedCategory } from '@/server/categories'

type CategoryType = ManagedCategory['type']
export type CategoryValues = Pick<
  CategoryInput,
  'name' | 'type' | 'icon' | 'color' | 'parentId'
>

const selectClass =
  'h-9 rounded-md border border-input bg-card px-3 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50 md:text-sm'

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
          <legend className="mb-2 font-medium text-sm">
            {m.setup_form_type()}
          </legend>
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
                {type === 'expense'
                  ? m.setup_type_expense()
                  : m.setup_type_income()}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="category-name">{m.setup_form_name()}</Label>
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
        <Label htmlFor="category-parent">{m.setup_category_form_group()}</Label>
        <select
          id="category-parent"
          className={selectClass}
          value={values.parentId ?? ''}
          disabled={hasChildren}
          aria-describedby={hasChildren ? 'category-parent-hint' : undefined}
          onChange={(e) => set({ parentId: e.target.value || null })}
        >
          <option value="">{m.setup_category_form_no_group()}</option>
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
            {m.setup_category_form_parent_locked()}
          </p>
        )}
      </div>

      <IconPicker
        value={values.icon}
        color={values.color}
        onChange={(icon) => set({ icon })}
      />
      <ColorPicker value={values.color} onChange={(color) => set({ color })} />

      <FormError message={error ?? null} />
      <Button type="submit" size="lg" disabled={pending}>
        {pending
          ? m.setup_form_saving()
          : editing
            ? m.setup_form_save_changes()
            : m.setup_category_form_create()}
      </Button>
    </form>
  )
}
