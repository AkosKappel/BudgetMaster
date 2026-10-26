import {
  useMutation,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query'
import {
  createFileRoute,
  Link,
  useNavigate,
  useRouteContext,
} from '@tanstack/react-router'
import { ChevronLeft, Copy, Link2, Share2, Trash2, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'

import { FormError } from '@/components/auth-page'
import { MemberBalances } from '@/components/member-balances'
import { SpaceSettingsForm } from '@/components/space-settings-form'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { describeActivity } from '@/lib/activity'
import { toCurrency } from '@/lib/currencies'
import { formatShortDate } from '@/lib/format-date'
import { formatLocale } from '@/lib/locale'
import {
  activityQuery,
  spaceDetailsQuery,
  spacesQuery,
  useActiveSpace,
  useSwitchSpace,
} from '@/lib/queries'
import { m } from '@/paraglide/messages.js'
import {
  createInvite,
  deleteSpace,
  type getSpaceDetails,
  removeMember,
  revokeInvite,
  updateMemberRole,
  updateSpaceSettings,
} from '@/server/space-admin'
import { restoreTransaction, undoChange } from '@/server/transactions'

export const Route = createFileRoute('/_app/spaces/$spaceId')({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(spaceDetailsQuery(params.spaceId)),
  head: ({ loaderData }) => ({
    meta: [
      {
        title: `${loaderData?.name ?? m.acct_space_fallback_title()} | BudgetMaster`,
      },
    ],
  }),
  component: SpaceSettingsPage,
})

type Role = 'owner' | 'editor' | 'viewer'
const ROLES: Role[] = ['owner', 'editor', 'viewer']
const roleLabel = (role: Role) =>
  ({
    owner: m.acct_role_owner(),
    editor: m.acct_role_editor(),
    viewer: m.acct_role_viewer(),
  })[role]
const roleHint = (role: Role) =>
  ({
    owner: m.acct_role_owner_hint(),
    editor: m.acct_role_editor_hint(),
    viewer: m.acct_role_viewer_hint(),
  })[role]

const selectClass =
  'h-9 rounded-md border border-input bg-card px-2 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 md:text-sm'

function SpaceSettingsPage() {
  const { spaceId } = Route.useParams()
  const { data: space } = useSuspenseQuery(spaceDetailsQuery(spaceId))
  const active = useActiveSpace()
  const { switchTo, pendingId } = useSwitchSpace()
  const queryClient = useQueryClient()
  const isOwner = space.role === 'owner'

  // Currency, month start day and members change balances, budgets and reports too.
  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['space', spaceId] }),
      queryClient.invalidateQueries({ queryKey: spacesQuery.queryKey }),
    ])

  const save = useMutation({
    mutationFn: updateSpaceSettings,
    onSuccess: async () => {
      await refresh()
      toast.success(m.acct_space_settings_saved())
    },
  })

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <Link
          to="/spaces"
          className="-ml-1 flex items-center gap-1 self-start text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          {m.acct_spaces_title()}
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">
            {space.name}
          </h1>
          {space.id !== active.id && (
            <Button
              variant="outline"
              disabled={pendingId !== null}
              onClick={() => switchTo(space.id)}
            >
              {m.acct_space_switch()}
            </Button>
          )}
        </div>
        <p className="text-muted-foreground">
          {space.personal
            ? m.acct_space_personal_hint()
            : {
                owner: m.acct_space_you_are_owner(),
                editor: m.acct_space_you_are_editor(),
                viewer: m.acct_space_you_are_viewer(),
              }[space.role]}
        </p>
      </div>

      <section aria-labelledby="settings" className="flex flex-col gap-4">
        <h2 id="settings" className="text-lg font-semibold">
          {m.acct_space_settings()}
        </h2>
        {!isOwner && (
          <p className="text-sm text-muted-foreground">
            {m.acct_space_owners_only()}
          </p>
        )}
        <SpaceSettingsForm
          defaults={{
            name: space.name,
            baseCurrency: toCurrency(space.baseCurrency),
            budgetMonthStartDay: space.budgetMonthStartDay,
          }}
          submitLabel={m.acct_space_save()}
          disabled={!isOwner}
          pending={save.isPending}
          error={save.error?.message}
          onSubmit={(values) => save.mutate({ data: { spaceId, ...values } })}
        />
      </section>

      {!space.personal && (
        <>
          <Members space={space} onChange={refresh} />
          <MemberBalances spaceId={space.id} />
          {isOwner && <Invites space={space} onChange={refresh} />}
        </>
      )}
      <RecentChanges
        spaceId={space.id}
        canWrite={space.role !== 'viewer'}
        shared={!space.personal}
      />
      {!space.personal && <DangerZone space={space} />}
    </div>
  )
}

type Details = Awaited<ReturnType<typeof getSpaceDetails>>

function Members({
  space,
  onChange,
}: {
  space: Details
  onChange: () => Promise<unknown>
}) {
  const isOwner = space.role === 'owner'
  const changeRole = useMutation({
    mutationFn: updateMemberRole,
    onSuccess: onChange,
    onError: (error) => toast.error(error.message),
  })
  const remove = useMutation({
    mutationFn: removeMember,
    onSuccess: async () => {
      await onChange()
      toast.success(m.acct_members_removed())
    },
    onError: (error) => toast.error(error.message),
  })

  return (
    <section aria-labelledby="members" className="flex flex-col gap-3">
      <h2 id="members" className="text-lg font-semibold">
        {m.acct_members_title()}
      </h2>
      <ul className="divide-y rounded-lg border bg-card">
        {space.members.map((member) => {
          const isMe = member.userId === space.currentUserId
          return (
            <li
              key={member.userId}
              className="flex flex-wrap items-center gap-3 px-4 py-3"
            >
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-medium">
                  {member.name}
                  {isMe && (
                    <span className="font-normal text-muted-foreground">
                      {' '}
                      {m.acct_members_you()}
                    </span>
                  )}
                </span>
                <span className="truncate text-sm text-muted-foreground">
                  {member.email}
                </span>
              </span>
              {isOwner ? (
                <select
                  aria-label={m.acct_members_role_of({ name: member.name })}
                  value={member.role}
                  disabled={changeRole.isPending}
                  onChange={(e) =>
                    changeRole.mutate({
                      data: {
                        spaceId: space.id,
                        userId: member.userId,
                        role: e.target.value as Role,
                      },
                    })
                  }
                  className={selectClass}
                >
                  {ROLES.map((role) => (
                    <option key={role} value={role}>
                      {roleLabel(role)}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="text-sm text-muted-foreground">
                  {roleLabel(member.role)}
                </span>
              )}
              {isOwner && !isMe && (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={m.acct_members_remove({ name: member.name })}
                  disabled={remove.isPending}
                  onClick={() =>
                    remove.mutate({
                      data: { spaceId: space.id, userId: member.userId },
                    })
                  }
                >
                  <X />
                </Button>
              )}
            </li>
          )
        })}
      </ul>
      <dl className="grid gap-1 text-sm text-muted-foreground">
        {ROLES.map((role) => (
          <div key={role} className="flex gap-1.5">
            <dt className="font-medium text-foreground">{roleLabel(role)}:</dt>
            <dd>{roleHint(role)}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

function Invites({
  space,
  onChange,
}: {
  space: Details
  onChange: () => Promise<unknown>
}) {
  const [link, setLink] = useState<{
    email: string
    url: string
    emailed: boolean
  } | null>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const create = useMutation({
    mutationFn: createInvite,
    onSuccess: async ({ token, emailed }, { data }) => {
      setLink({
        email: data.email,
        url: `${window.location.origin}/invite/${token}`,
        emailed,
      })
      formRef.current?.reset()
      await onChange()
    },
  })
  const revoke = useMutation({
    mutationFn: revokeInvite,
    onSuccess: onChange,
    onError: (error) => toast.error(error.message),
  })
  const canShare = typeof navigator !== 'undefined' && 'share' in navigator
  // The server only emails invites for verified, non-demo accounts.
  const { user } = useRouteContext({ from: '/_app' })
  const canEmail = !user.demoExpiresAt && user.emailVerified
  const now = Date.now()

  return (
    <section aria-labelledby="invite" className="flex flex-col gap-4">
      <h2 id="invite" className="text-lg font-semibold">
        {m.acct_invite_title()}
      </h2>
      <form
        ref={formRef}
        className="flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault()
          const form = new FormData(event.currentTarget)
          create.mutate({
            data: {
              spaceId: space.id,
              email: String(form.get('email')),
              role: form.get('role') === 'viewer' ? 'viewer' : 'editor',
              sendEmail: form.get('send-email') === 'on',
            },
          })
        }}
      >
        <div className="grid grid-cols-[1fr_auto] gap-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="invite-email">{m.acct_invite_email()}</Label>
            <Input
              id="invite-email"
              name="email"
              type="email"
              autoComplete="off"
              required
              aria-describedby="invite-hint"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="invite-role">{m.acct_invite_role()}</Label>
            <select
              id="invite-role"
              name="role"
              defaultValue="editor"
              className={selectClass}
            >
              <option value="editor">{m.acct_role_editor()}</option>
              <option value="viewer">{m.acct_role_viewer()}</option>
            </select>
          </div>
        </div>
        {canEmail && (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="send-email"
              defaultChecked
              className="size-4"
            />
            {m.acct_invite_send_email()}
          </label>
        )}
        <p id="invite-hint" className="text-sm text-muted-foreground">
          {m.acct_invite_hint()}
        </p>
        <FormError message={create.error?.message ?? null} />
        <Button
          type="submit"
          disabled={create.isPending}
          className="self-start"
        >
          <Link2 />
          {m.acct_invite_create()}
        </Button>
      </form>

      {link && (
        <div
          className="flex flex-col gap-3 rounded-lg border border-note/40 bg-card p-4"
          role="status"
        >
          <p className="text-sm">
            {link.emailed
              ? m.acct_invite_emailed_to()
              : m.acct_invite_send_to()}
            <span className="font-medium">{link.email}</span>.{' '}
            {link.emailed
              ? m.acct_invite_emailed_note()
              : m.acct_invite_shown_once()}
          </p>
          <Input
            readOnly
            value={link.url}
            onFocus={(e) => e.currentTarget.select()}
            aria-label={m.acct_invite_link()}
          />
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={async () => {
                await navigator.clipboard.writeText(link.url)
                toast.success(m.acct_invite_copied())
              }}
            >
              <Copy />
              {m.acct_invite_copy()}
            </Button>
            {canShare && (
              <Button
                variant="outline"
                onClick={() =>
                  navigator
                    .share({
                      title: m.acct_invite_share_title({ space: space.name }),
                      url: link.url,
                    })
                    .catch(() => {})
                }
              >
                <Share2 />
                {m.acct_invite_share()}
              </Button>
            )}
          </div>
        </div>
      )}

      {space.invites.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-medium">{m.acct_invite_pending()}</h3>
          <ul className="divide-y rounded-lg border bg-card">
            {space.invites.map((invite) => {
              const expired = new Date(invite.expiresAt).getTime() < now
              return (
                <li
                  key={invite.id}
                  className="flex items-center gap-3 px-4 py-3"
                >
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate">{invite.email}</span>
                    <span
                      className={
                        expired
                          ? 'text-sm text-destructive'
                          : 'text-sm text-muted-foreground'
                      }
                    >
                      {roleLabel(invite.role)},{' '}
                      {expired
                        ? m.acct_invite_expired()
                        : m.acct_invite_expires({
                            date: formatShortDate(
                              new Date(invite.expiresAt)
                                .toISOString()
                                .slice(0, 10),
                            ),
                          })}
                    </span>
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={m.acct_invite_revoke({ email: invite.email })}
                    disabled={revoke.isPending}
                    onClick={() =>
                      revoke.mutate({
                        data: { spaceId: space.id, inviteId: invite.id },
                      })
                    }
                  >
                    <Trash2 />
                  </Button>
                </li>
              )
            })}
          </ul>
          <p className="text-sm text-muted-foreground">
            {m.acct_invite_resend_hint()}
          </p>
        </div>
      )}
    </section>
  )
}

function DangerZone({ space }: { space: Details }) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [confirm, setConfirm] = useState<'leave' | 'delete' | null>(null)
  const [typed, setTyped] = useState('')
  const isOwner = space.role === 'owner'

  const done = async (message: string) => {
    setConfirm(null)
    queryClient.removeQueries({ queryKey: ['space', space.id] })
    await queryClient.invalidateQueries({ queryKey: spacesQuery.queryKey })
    toast.success(message)
    await navigate({ to: '/spaces' })
  }
  const leave = useMutation({
    mutationFn: removeMember,
    onSuccess: ({ deleted }) =>
      done(
        deleted
          ? m.acct_danger_left_deleted({ space: space.name })
          : m.acct_danger_left({ space: space.name }),
      ),
  })
  const remove = useMutation({
    mutationFn: deleteSpace,
    onSuccess: () => done(m.acct_danger_deleted({ space: space.name })),
  })
  const error =
    (confirm === 'leave' ? leave.error : remove.error)?.message ?? null
  const pending = leave.isPending || remove.isPending

  return (
    <section aria-labelledby="danger" className="flex flex-col gap-3">
      <h2 id="danger" className="text-lg font-semibold">
        {m.acct_danger_title()}
      </h2>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => setConfirm('leave')}>
          {m.acct_danger_leave()}
        </Button>
        {isOwner && (
          <Button
            variant="outline"
            className="text-destructive"
            onClick={() => {
              setTyped('')
              setConfirm('delete')
            }}
          >
            {m.acct_danger_delete()}
          </Button>
        )}
      </div>

      <Dialog
        open={confirm !== null}
        onOpenChange={(open) => !open && setConfirm(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirm === 'delete'
                ? m.acct_danger_delete_title({ space: space.name })
                : m.acct_danger_leave_title({ space: space.name })}
            </DialogTitle>
            <DialogDescription>
              {confirm === 'delete'
                ? m.acct_danger_delete_body()
                : m.acct_danger_leave_body()}
            </DialogDescription>
          </DialogHeader>
          {confirm === 'delete' && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="confirm-name">
                {m.acct_danger_type_name({ space: space.name })}
              </Label>
              <Input
                id="confirm-name"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                autoComplete="off"
              />
            </div>
          )}
          <FormError message={error} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirm(null)}>
              {m.acct_cancel()}
            </Button>
            <Button
              variant="destructive"
              disabled={
                pending || (confirm === 'delete' && typed !== space.name)
              }
              onClick={() =>
                confirm === 'delete'
                  ? remove.mutate({ data: { spaceId: space.id } })
                  : leave.mutate({
                      data: { spaceId: space.id, userId: space.currentUserId },
                    })
              }
            >
              {confirm === 'delete'
                ? m.acct_danger_delete()
                : m.acct_danger_leave()}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}

// Who added, changed or deleted what: trust when several people keep one ledger, and a
// way back for a deletion whose undo toast was missed. Loaded in the browser, so times are
// in the viewer's own zone.
function RecentChanges({
  spaceId,
  canWrite,
  shared,
}: {
  spaceId: string
  canWrite: boolean
  shared: boolean
}) {
  const queryClient = useQueryClient()
  const { data: events } = useQuery(activityQuery(spaceId))
  const restore = useMutation({
    mutationFn: restoreTransaction,
    onSuccess: () => {
      toast.success(m.acct_changes_restored())
      return queryClient.invalidateQueries({ queryKey: ['space', spaceId] })
    },
    onError: (e) => toast.error(e.message),
  })
  const undo = useMutation({
    mutationFn: undoChange,
    onSuccess: () => {
      toast.success(m.acct_changes_undone())
      return queryClient.invalidateQueries({ queryKey: ['space', spaceId] })
    },
    onError: (e) => toast.error(e.message),
  })
  if (!events) return null

  return (
    <section aria-labelledby="recent-changes" className="flex flex-col gap-3">
      <h2 id="recent-changes" className="text-lg font-semibold">
        {m.acct_changes_title()}
      </h2>
      {events.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {shared ? m.acct_changes_empty_shared() : m.acct_changes_empty()}
        </p>
      ) : (
        <ul className="divide-y rounded-lg border bg-card text-sm">
          {events.map((e) => (
            <li key={e.id} className="flex items-center gap-3 px-4 py-2.5">
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span>
                  <span className="font-medium">
                    {e.isMe
                      ? m.acct_changes_you()
                      : (e.userName ?? m.acct_former_member())}
                  </span>
                  {m.acct_activity_separator()}
                  {describeActivity(e)}
                </span>
                <time
                  dateTime={e.createdAt}
                  className="text-xs text-muted-foreground"
                >
                  {new Date(e.createdAt).toLocaleString(formatLocale(), {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </time>
              </span>
              {canWrite && e.restorable && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={restore.isPending}
                  onClick={() =>
                    restore.mutate({ data: { spaceId, eventId: e.id } })
                  }
                >
                  {m.acct_changes_restore()}
                </Button>
              )}
              {canWrite && e.undoable && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={undo.isPending}
                  onClick={() =>
                    undo.mutate({ data: { spaceId, eventId: e.id } })
                  }
                >
                  {m.acct_changes_undo()}
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
