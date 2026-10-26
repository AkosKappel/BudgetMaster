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
import { m } from '@/paraglide/messages.js'
import { createSharedSpace } from '@/server/space-admin'

export const Route = createFileRoute('/_app/spaces/')({
  head: () => ({
    meta: [{ title: `${m.acct_spaces_title()} | BudgetMaster` }],
  }),
  component: Spaces,
})

const roleLabel = (role: 'owner' | 'editor' | 'viewer') =>
  ({
    owner: m.acct_role_owner(),
    editor: m.acct_role_editor(),
    viewer: m.acct_role_viewer(),
  })[role]

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
      toast.success(m.acct_spaces_created())
      await navigate({ to: '/spaces/$spaceId', params: { spaceId: id } })
    },
  })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">
          {m.acct_spaces_title()}
        </h1>
        <Button onClick={() => setCreating(true)}>
          <Plus />
          {m.acct_spaces_new()}
        </Button>
      </div>
      <p className="max-w-prose text-muted-foreground">
        {m.acct_spaces_intro()}
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
                      <span className="ml-2 text-sm font-normal text-muted-foreground">
                        {m.acct_spaces_active()}
                      </span>
                    )}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {s.personal
                      ? m.acct_spaces_personal_only_you()
                      : m.acct_spaces_role_members({
                          role: roleLabel(s.role),
                          count: s.memberCount,
                        })}
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
              <DrawerTitle>{m.acct_spaces_new_shared()}</DrawerTitle>
              <DrawerDescription>{m.acct_spaces_new_hint()}</DrawerDescription>
            </DrawerHeader>
            <SpaceSettingsForm
              defaults={{
                name: '',
                baseCurrency: toCurrency(active.baseCurrency),
                budgetMonthStartDay: 1,
              }}
              submitLabel={m.acct_spaces_create()}
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
