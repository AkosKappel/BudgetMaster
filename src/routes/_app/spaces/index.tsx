import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { ChevronRight, Plus, User, Users } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { SpaceSettingsForm } from '@/components/space-settings-form'
import { Button } from '@/components/ui/button'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { toCurrency } from '@/lib/currencies'
import { spacesQuery, useActiveSpace, useSpaces } from '@/lib/queries'
import { createSharedSpace } from '@/server/space-admin'

export const Route = createFileRoute('/_app/spaces/')({
  head: () => ({ meta: [{ title: 'Spaces | BudgetMaster' }] }),
  component: Spaces,
})

const roleLabel = { owner: 'Owner', editor: 'Editor', viewer: 'Viewer' }

function Spaces() {
  const { spaces } = useSpaces()
  const active = useActiveSpace()
  const [creating, setCreating] = useState(false)
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const create = useMutation({
    mutationFn: createSharedSpace,
    onSuccess: async ({ id }) => {
      // The server already made it the active space.
      await queryClient.invalidateQueries({ queryKey: spacesQuery.queryKey })
      setCreating(false)
      toast.success('Space created. Invite people to it next.')
      await navigate({ to: '/spaces/$spaceId', params: { spaceId: id } })
    },
  })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-semibold text-2xl tracking-tight">Spaces</h1>
        <Button onClick={() => setCreating(true)}>
          <Plus />
          New space
        </Button>
      </div>
      <p className="max-w-prose text-muted-foreground">
        A space has its own wallets, categories and budgets. Your personal space
        is only yours; create a shared space to manage money with a partner or
        flatmates.
      </p>
      <ul className="divide-y rounded-lg border bg-card">
        {spaces.map((s) => {
          const Icon = s.personal ? User : Users
          return (
            <li key={s.id}>
              <Link
                to="/spaces/$spaceId"
                params={{ spaceId: s.id }}
                className="flex items-center gap-3 px-4 py-3 outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
              >
                <Icon className="size-5 shrink-0 text-muted-foreground" />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-medium">
                    {s.name}
                    {s.id === active.id && (
                      <span className="ml-2 font-normal text-muted-foreground text-sm">
                        Active
                      </span>
                    )}
                  </span>
                  <span className="text-muted-foreground text-sm">
                    {s.personal
                      ? 'Personal, only you'
                      : `${roleLabel[s.role]}, ${s.memberCount} ${s.memberCount === 1 ? 'member' : 'members'}`}
                  </span>
                </span>
                <ChevronRight className="size-4 text-muted-foreground" />
              </Link>
            </li>
          )
        })}
      </ul>

      <Drawer open={creating} onOpenChange={setCreating}>
        <DrawerContent>
          <div className="mx-auto w-full max-w-md px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            <DrawerHeader className="px-0 group-data-[vaul-drawer-direction=bottom]/drawer-content:text-left">
              <DrawerTitle>New shared space</DrawerTitle>
              <DrawerDescription>
                You become its owner and can invite people right after.
              </DrawerDescription>
            </DrawerHeader>
            <SpaceSettingsForm
              defaults={{
                name: '',
                baseCurrency: toCurrency(active.baseCurrency),
                budgetMonthStartDay: 1,
              }}
              submitLabel="Create space"
              pending={create.isPending}
              error={create.error?.message}
              onSubmit={(values) => create.mutate({ data: values })}
            />
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  )
}
