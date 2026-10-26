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
import { m } from '@/paraglide/messages.js'
import { acceptInvite } from '@/server/space-admin'

export const Route = createFileRoute('/_app/invite/$token')({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(inviteQuery(params.token)),
  head: () => ({
    meta: [{ title: `${m.acct_invite_page_title()} | BudgetMaster` }],
  }),
  component: InvitePage,
})

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
        invite.status === 'ok'
          ? m.acct_invite_joined({ space: invite.spaceName })
          : m.acct_invite_joined_space(),
      )
      await navigate({ to: '/' })
    },
  })

  const message = {
    ok: null,
    invalid: m.acct_invite_invalid(),
    used: m.acct_invite_used(),
    expired: m.acct_invite_expired_message(),
    'wrong-account':
      invite.status === 'wrong-account'
        ? m.acct_invite_wrong_account({
            email: invite.email,
            current: user.email,
          })
        : null,
  }[invite.status]

  return (
    <div className="flex flex-col items-start gap-6 py-6">
      <span className="flex size-12 items-center justify-center rounded-full bg-note/15 text-note">
        <Users className="size-6" />
      </span>
      {invite.status === 'invalid' ? (
        <h1 className="text-2xl font-semibold tracking-tight">
          {m.acct_invite_not_found()}
        </h1>
      ) : (
        <h1 className="text-2xl font-semibold tracking-tight">
          {m.acct_invite_heading({
            name: invite.invitedBy ?? m.acct_invite_someone(),
            space: invite.spaceName,
          })}
        </h1>
      )}
      {invite.status === 'ok' && (
        <p className="max-w-prose text-muted-foreground">
          {
            {
              owner: m.acct_invite_join_as_owner(),
              editor: m.acct_invite_join_as_editor(),
              viewer: m.acct_invite_join_as_viewer(),
            }[invite.role]
          }{' '}
          {invite.role === 'viewer'
            ? m.acct_invite_viewer_can()
            : m.acct_invite_editor_can()}{' '}
          {m.acct_invite_personal_private()}
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
            {m.acct_invite_join({ space: invite.spaceName })}
          </Button>
        )}
        {invite.status === 'wrong-account' && (
          <Button size="lg" onClick={() => signOut(`/invite/${token}`)}>
            {m.acct_invite_sign_in_as({ email: invite.email })}
          </Button>
        )}
        <Button size="lg" variant="outline" asChild>
          <Link to="/">
            {invite.status === 'ok'
              ? m.acct_invite_not_now()
              : m.acct_invite_go_home()}
          </Link>
        </Button>
      </div>
    </div>
  )
}
