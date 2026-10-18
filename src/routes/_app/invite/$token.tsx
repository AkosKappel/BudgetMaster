import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { Users } from 'lucide-react'
import { toast } from 'sonner'

import { FormError, useSignOut } from '@/components/auth-page'
import { Button } from '@/components/ui/button'
import { inviteQuery, spacesQuery } from '@/lib/queries'
import { acceptInvite } from '@/server/space-admin'

export const Route = createFileRoute('/_app/invite/$token')({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(inviteQuery(params.token)),
  head: () => ({ meta: [{ title: 'Invite | BudgetMaster' }] }),
  component: InvitePage,
})

const ROLE = { owner: 'owner', editor: 'editor', viewer: 'viewer' }

function InvitePage() {
  const { token } = Route.useParams()
  const { user } = Route.useRouteContext()
  const { data: invite } = useSuspenseQuery(inviteQuery(token))
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const signOut = useSignOut()

  const accept = useMutation({
    mutationFn: acceptInvite,
    onSuccess: async () => {
      // The server made the new space active; refetch everything for it.
      await queryClient.invalidateQueries({ queryKey: spacesQuery.queryKey })
      queryClient.removeQueries({ queryKey: inviteQuery(token).queryKey })
      toast.success(
        `You joined ${invite.status === 'ok' ? invite.spaceName : 'the space'}`,
      )
      await navigate({ to: '/' })
    },
  })

  const message = {
    ok: null,
    invalid: 'This invite link is not valid. Check that you copied all of it.',
    used: 'This invite has already been used.',
    expired: 'This invite has expired. Ask for a new link.',
    'wrong-account':
      invite.status === 'wrong-account'
        ? `This invite is for ${invite.email}, but you are signed in as ${user.email}.`
        : null,
  }[invite.status]

  return (
    <div className="flex flex-col items-start gap-6 py-6">
      <span className="flex size-12 items-center justify-center rounded-full bg-note/15 text-note">
        <Users className="size-6" />
      </span>
      {invite.status === 'invalid' ? (
        <h1 className="font-semibold text-2xl tracking-tight">
          Invite not found
        </h1>
      ) : (
        <h1 className="font-semibold text-2xl tracking-tight">
          {invite.invitedBy ?? 'Someone'} invited you to {invite.spaceName}
        </h1>
      )}
      {invite.status === 'ok' && (
        <p className="max-w-prose text-muted-foreground">
          You join as {ROLE[invite.role]}.{' '}
          {invite.role === 'viewer'
            ? 'You can see its wallets, transactions and budgets.'
            : 'You can see and add transactions in its wallets.'}{' '}
          Your personal space stays private.
        </p>
      )}
      {message && <p className="max-w-prose">{message}</p>}
      <FormError message={accept.error?.message ?? null} />
      <div className="flex flex-wrap gap-2">
        {invite.status === 'ok' && (
          <Button
            size="lg"
            disabled={accept.isPending}
            onClick={() => accept.mutate({ data: { token } })}
          >
            Join {invite.spaceName}
          </Button>
        )}
        {invite.status === 'wrong-account' && (
          <Button size="lg" onClick={() => signOut(`/invite/${token}`)}>
            Sign in as {invite.email}
          </Button>
        )}
        <Button size="lg" variant="outline" asChild>
          <Link to="/">{invite.status === 'ok' ? 'Not now' : 'Go home'}</Link>
        </Button>
      </div>
    </div>
  )
}
