import { Suspense } from 'react'

import { TransactionForm } from '@/components/transaction-form'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { Skeleton } from '@/components/ui/skeleton'
import { useMediaQuery } from '@/hooks/use-media-query'
import { useQuickAdd } from '@/stores/quick-add'

// Bottom sheet on phones, side panel from `md` up.
export function QuickAddDrawer() {
  const { draft, close, returnFocus } = useQuickAdd()
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const editing = draft?.mode === 'edit' ? draft.transaction : undefined

  return (
    <Drawer
      open={draft !== null}
      onOpenChange={(open) => !open && close()}
      direction={isDesktop ? 'right' : 'bottom'}
    >
      <DrawerContent
        onCloseAutoFocus={(event) => {
          if (returnFocus?.isConnected) {
            event.preventDefault()
            returnFocus.focus()
          }
        }}
        className="max-h-[92dvh] data-[vaul-drawer-direction=right]:max-h-dvh data-[vaul-drawer-direction=right]:sm:max-w-md"
      >
        <div className="mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col overflow-y-auto">
          <DrawerHeader className="group-data-[vaul-drawer-direction=bottom]/drawer-content:text-left">
            <DrawerTitle>
              {editing ? 'Edit transaction' : 'Add transaction'}
            </DrawerTitle>
            <DrawerDescription className="sr-only">
              Amount, category, wallet and date.
            </DrawerDescription>
          </DrawerHeader>
          {draft && (
            <Suspense fallback={<FormSkeleton />}>
              <TransactionForm
                // A new key per draft resets the form every time it opens.
                key={
                  editing?.id ?? `new-${draft.mode === 'create' && draft.type}`
                }
                transaction={editing}
                initialType={
                  draft.mode === 'create' ? draft.type : draft.transaction.type
                }
                onDone={close}
              />
            </Suspense>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  )
}

function FormSkeleton() {
  return (
    <div className="flex flex-col gap-4 px-4 pb-6" role="status">
      <span className="sr-only">Loading</span>
      <Skeleton className="h-11" />
      <Skeleton className="h-14" />
      <Skeleton className="h-24" />
    </div>
  )
}
