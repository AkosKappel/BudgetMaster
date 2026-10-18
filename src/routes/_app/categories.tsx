import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ChevronLeft, Plus } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { CategoryForm, type CategoryValues } from '@/components/category-form'
import { Button } from '@/components/ui/button'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { COLORS, iconFor } from '@/lib/icons'
import { categoriesQuery, useActiveSpace } from '@/lib/queries'
import { cn } from '@/lib/utils'
import {
  type ManagedCategory,
  saveCategory,
  setCategoryArchived,
} from '@/server/categories'

export const Route = createFileRoute('/_app/categories')({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(categoriesQuery(context.activeSpaceId)),
  head: () => ({ meta: [{ title: 'Categories | BudgetMaster' }] }),
  component: Categories,
})

type Editor = { mode: 'create' } | { mode: 'edit'; category: ManagedCategory }

// Parents followed by their subcategories.
function grouped(categories: ManagedCategory[]) {
  return categories
    .filter((c) => !c.parentId)
    .map((parent) => ({
      parent,
      children: categories.filter((c) => c.parentId === parent.id),
    }))
}

function Categories() {
  const space = useActiveSpace()
  const { data } = useSuspenseQuery(categoriesQuery(space.id))
  const queryClient = useQueryClient()
  const [editor, setEditor] = useState<Editor | null>(null)

  const active = data.categories.filter((c) => !c.archived)
  const archived = data.categories.filter((c) => c.archived)
  const editing = editor?.mode === 'edit' ? editor.category : null

  // Names, icons and colours show up in every list and picker of the space.
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ['space', space.id] })

  const save = useMutation({
    mutationFn: (values: CategoryValues) =>
      saveCategory({
        data: { ...values, spaceId: space.id, id: editing?.id },
      }),
    onSuccess: async () => {
      await refresh()
      toast.success(editing ? 'Category updated' : 'Category created')
      setEditor(null)
    },
  })

  const archive = useMutation({
    mutationFn: (variables: { id: string; archived: boolean }) =>
      setCategoryArchived({ data: { ...variables, spaceId: space.id } }),
    onSuccess: async (_result, { archived }) => {
      await refresh()
      toast.success(archived ? 'Category archived' : 'Category restored')
      setEditor(null)
    },
    onError: (error) => toast.error(error.message),
  })

  const openEditor = (next: Editor | null) => {
    save.reset()
    setEditor(next)
  }

  return (
    <div className="flex flex-col gap-6">
      <Link
        to="/more"
        className="-ml-2 flex w-fit items-center gap-1 rounded-md px-2 py-1 text-muted-foreground text-sm hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        More
      </Link>
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-semibold text-2xl tracking-tight">Categories</h1>
        {data.canWrite && (
          <Button onClick={() => openEditor({ mode: 'create' })}>
            <Plus />
            New category
          </Button>
        )}
      </div>

      {(['expense', 'income'] as const).map((type) => (
        <section
          key={type}
          aria-labelledby={`${type}-heading`}
          className="flex flex-col gap-3"
        >
          <h2 id={`${type}-heading`} className="font-semibold text-lg">
            {type === 'expense' ? 'Expenses' : 'Income'}
          </h2>
          <ul className="divide-y rounded-lg border bg-card">
            {grouped(active.filter((c) => c.type === type)).flatMap(
              ({ parent, children }) =>
                [parent, ...children].map((c) => (
                  <CategoryRow
                    key={c.id}
                    category={c}
                    nested={c !== parent}
                    onSelect={
                      data.canWrite
                        ? () => openEditor({ mode: 'edit', category: c })
                        : undefined
                    }
                  />
                )),
            )}
          </ul>
        </section>
      ))}

      {archived.length > 0 && (
        <details>
          <summary className="cursor-pointer font-semibold text-lg">
            Archived ({archived.length})
          </summary>
          <p className="my-3 max-w-prose text-muted-foreground text-sm">
            Hidden from pickers. Their transactions and history stay as they
            are.
          </p>
          <ul className="divide-y rounded-lg border bg-card">
            {archived.map((c) => (
              <CategoryRow key={c.id} category={c}>
                {data.canWrite && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={archive.isPending}
                    onClick={() =>
                      archive.mutate({ id: c.id, archived: false })
                    }
                  >
                    Restore
                  </Button>
                )}
              </CategoryRow>
            ))}
          </ul>
        </details>
      )}

      <Drawer
        open={editor !== null}
        onOpenChange={(open) => !open && openEditor(null)}
      >
        <DrawerContent>
          <div className="mx-auto max-h-[85dvh] w-full max-w-md overflow-y-auto px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            <DrawerHeader className="px-0 group-data-[vaul-drawer-direction=bottom]/drawer-content:text-left">
              <DrawerTitle>
                {editing ? 'Edit category' : 'New category'}
              </DrawerTitle>
              <DrawerDescription>
                {editing
                  ? `${editing.type === 'expense' ? 'Expense' : 'Income'} category`
                  : 'Group it under another category to keep lists short.'}
              </DrawerDescription>
            </DrawerHeader>
            {editor && (
              <CategoryForm
                key={editing?.id ?? 'new'}
                defaults={
                  editing ?? {
                    name: '',
                    type: 'expense',
                    icon: 'shopping-bag',
                    color: COLORS[0],
                    parentId: null,
                  }
                }
                editing={editing !== null}
                parents={active.filter(
                  (c) => !c.parentId && c.id !== editing?.id,
                )}
                hasChildren={
                  editing !== null &&
                  active.some((c) => c.parentId === editing.id)
                }
                pending={save.isPending}
                error={save.error?.message}
                onSubmit={(values) => save.mutate(values)}
              />
            )}
            {editing && (
              <Button
                variant="ghost"
                className="mt-2 w-full text-destructive hover:text-destructive"
                disabled={archive.isPending}
                onClick={() =>
                  archive.mutate({ id: editing.id, archived: true })
                }
              >
                Archive
                {active.some((c) => c.parentId === editing.id) &&
                  ' with its subcategories'}
              </Button>
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  )
}

function CategoryRow({
  category,
  nested = false,
  onSelect,
  children,
}: {
  category: ManagedCategory
  nested?: boolean
  onSelect?: () => void
  children?: React.ReactNode
}) {
  const Icon = iconFor(category.icon)
  const content = (
    <>
      <span
        className="flex size-9 shrink-0 items-center justify-center rounded-full"
        style={{
          color: category.color,
          backgroundColor: `color-mix(in oklab, ${category.color} 14%, transparent)`,
        }}
      >
        <Icon className="size-4" strokeWidth={1.75} />
      </span>
      <span className="min-w-0 flex-1 truncate">{category.name}</span>
    </>
  )
  const rowClass = cn(
    'flex w-full items-center gap-3 px-4 py-2.5 text-left',
    nested && 'pl-10',
  )
  return (
    <li className="flex items-center">
      {onSelect ? (
        <button
          type="button"
          onClick={onSelect}
          className={cn(
            rowClass,
            'outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
          )}
        >
          {content}
        </button>
      ) : (
        <div className={rowClass}>{content}</div>
      )}
      {children && <div className="pr-4">{children}</div>}
    </li>
  )
}
