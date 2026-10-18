import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ChevronLeft, Plus, Tag } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { FormError } from '@/components/auth-page'
import { EmptyState } from '@/components/empty-state'
import { ColorPicker } from '@/components/pickers'
import { Button } from '@/components/ui/button'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { COLORS } from '@/lib/icons'
import { tagsQuery, useActiveSpace } from '@/lib/queries'
import { deleteTag, type ManagedTag, saveTag } from '@/server/tags'

export const Route = createFileRoute('/_app/tags')({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(tagsQuery(context.activeSpaceId)),
  head: () => ({ meta: [{ title: 'Tags | BudgetMaster' }] }),
  component: Tags,
})

type Editor = { mode: 'create' } | { mode: 'edit'; tag: ManagedTag }

function Tags() {
  const space = useActiveSpace()
  const { data } = useSuspenseQuery(tagsQuery(space.id))
  const queryClient = useQueryClient()
  const [editor, setEditor] = useState<Editor | null>(null)
  const editing = editor?.mode === 'edit' ? editor.tag : null

  // Tags show up in pickers, filters and transaction rows.
  const done = (message: string) => async () => {
    await queryClient.invalidateQueries({ queryKey: ['space', space.id] })
    toast.success(message)
    setEditor(null)
  }
  const save = useMutation({
    mutationFn: (values: { name: string; color: string }) =>
      saveTag({ data: { ...values, spaceId: space.id, id: editing?.id } }),
    onSuccess: done(editing ? 'Tag updated' : 'Tag created'),
  })
  const remove = useMutation({
    mutationFn: (id: string) => deleteTag({ data: { id, spaceId: space.id } }),
    onSuccess: done('Tag deleted'),
    onError: (error) => toast.error(error.message),
  })

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
        <h1 className="font-semibold text-2xl tracking-tight">Tags</h1>
        {data.canWrite && (
          <Button onClick={() => setEditor({ mode: 'create' })}>
            <Plus />
            New tag
          </Button>
        )}
      </div>
      <p className="max-w-prose text-muted-foreground">
        Tags cut across categories: a trip, a renovation or a work expense to
        claim back. Filter Activity by a tag to see its total.
      </p>

      {data.tags.length === 0 ? (
        <EmptyState icon={Tag}>
          No tags yet. Create one, then pick it when you add a transaction.
        </EmptyState>
      ) : (
        <ul className="divide-y rounded-lg border bg-card">
          {data.tags.map((t) => {
            const content = (
              <>
                <span
                  className="size-3 shrink-0 rounded-full"
                  style={{ backgroundColor: t.color }}
                />
                <span className="min-w-0 flex-1 truncate">{t.name}</span>
                <Link
                  to="/activity"
                  search={{ tag: t.id }}
                  className="text-muted-foreground text-sm underline-offset-4 hover:text-foreground hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  {t.uses} {t.uses === 1 ? 'transaction' : 'transactions'}
                </Link>
              </>
            )
            return (
              <li key={t.id} className="flex items-center gap-3 px-4 py-3">
                {content}
                {data.canWrite && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditor({ mode: 'edit', tag: t })}
                    aria-label={`Edit ${t.name}`}
                  >
                    Edit
                  </Button>
                )}
              </li>
            )
          })}
        </ul>
      )}

      <Drawer
        open={editor !== null}
        onOpenChange={(open) => {
          if (!open) {
            save.reset()
            setEditor(null)
          }
        }}
      >
        <DrawerContent>
          <div className="mx-auto max-h-[85dvh] w-full max-w-md overflow-y-auto px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            <DrawerHeader className="px-0 group-data-[vaul-drawer-direction=bottom]/drawer-content:text-left">
              <DrawerTitle>{editing ? 'Edit tag' : 'New tag'}</DrawerTitle>
              <DrawerDescription>
                {editing
                  ? `Used by ${editing.uses} ${editing.uses === 1 ? 'transaction' : 'transactions'}.`
                  : 'Pick it later in quick add.'}
              </DrawerDescription>
            </DrawerHeader>
            {editor && (
              <TagForm
                key={editing?.id ?? 'new'}
                defaults={editing ?? { name: '', color: COLORS[13] }}
                editing={editing !== null}
                pending={save.isPending}
                error={save.error?.message}
                onSubmit={(values) => save.mutate(values)}
              />
            )}
            {editing && (
              <Button
                variant="ghost"
                className="mt-2 w-full text-destructive hover:text-destructive"
                disabled={remove.isPending}
                onClick={() => remove.mutate(editing.id)}
              >
                Delete tag
              </Button>
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  )
}

function TagForm({
  defaults,
  editing,
  pending,
  error,
  onSubmit,
}: {
  defaults: { name: string; color: string }
  editing: boolean
  pending: boolean
  error?: string
  onSubmit: (values: { name: string; color: string }) => void
}) {
  const [name, setName] = useState(defaults.name)
  const [color, setColor] = useState(defaults.color)
  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit({ name, color })
      }}
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="tag-name">Name</Label>
        <Input
          id="tag-name"
          value={name}
          maxLength={30}
          required
          autoComplete="off"
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <ColorPicker value={color} onChange={setColor} />
      <FormError message={error ?? null} />
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? 'Saving' : editing ? 'Save changes' : 'Create tag'}
      </Button>
    </form>
  )
}
