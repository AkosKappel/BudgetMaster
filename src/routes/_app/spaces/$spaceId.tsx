import {
  useMutation,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
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
import { APP_LOCALE } from '@/lib/money'
import {
  activityQuery,
  spaceDetailsQuery,
  spacesQuery,
  useActiveSpace,
  useSwitchSpace,
} from '@/lib/queries'
import {
  createInvite,
  deleteSpace,
  type getSpaceDetails,
  removeMember,
  revokeInvite,
  updateMemberRole,
  updateSpaceSettings,
} from '@/server/space-admin'
import { restoreTransaction } from '@/server/transactions'

export const Route = createFileRoute('/_app/spaces/$spaceId')({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(spaceDetailsQuery(params.spaceId)),
  head: ({ loaderData }) => ({
    meta: [{ title: `${loaderData?.name ?? 'Space'} | BudgetMaster` }],
  }),
  component: SpaceSettingsPage,
})

type Role = 'owner' | 'editor' | 'viewer'
const ROLE_LABEL: Record<Role, string> = {
  owner: 'Owner',
  editor: 'Editor',
  viewer: 'Viewer',
}
const ROLE_HINT: Record<Role, string> = {
  owner: 'Can change settings, invite and remove people',
  editor: 'Can add and change transactions',
  viewer: 'Can only look',
}

const selectClass =
  'h-9 rounded-md border border-input bg-card px-2 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 md:text-sm'

function SpaceSettingsPage() {
  const { spaceId } = Route.useParams()
  const { data: space } = useSuspenseQuery(spaceDetailsQuery(spaceId))
  const active = useActiveSpace()
  const { switchTo, pendingId } = useSwitchSpace()
  const queryClient = useQueryClient()
  const isOwner = space.role === 'owner'

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({
        queryKey: spaceDetailsQuery(spaceId).queryKey,
      }),
      queryClient.invalidateQueries({ queryKey: spacesQuery.queryKey }),
      queryClient.invalidateQueries({
        queryKey: ['space', spaceId, 'overview'],
      }),
    ])

  const save = useMutation({
    mutationFn: updateSpaceSettings,
    onSuccess: async () => {
      await refresh()
      toast.success('Settings saved')
    },
  })

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <Link
          to="/spaces"
          className="-ml-1 flex items-center gap-1 self-start text-muted-foreground text-sm hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          Spaces
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-semibold text-2xl tracking-tight">
            {space.name}
          </h1>
          {space.id !== active.id && (
            <Button
              variant="outline"
              disabled={pendingId !== null}
              onClick={() => switchTo(space.id)}
            >
              Switch to this space
            </Button>
          )}
        </div>
        <p className="text-muted-foreground">
          {space.personal
            ? 'Your personal space. Only you can see it.'
            : `You are ${ROLE_LABEL[space.role].toLowerCase()} here.`}
        </p>
      </div>

      <section aria-labelledby="settings" className="flex flex-col gap-4">
        <h2 id="settings" className="font-semibold text-lg">
          Settings
        </h2>
        {!isOwner && (
          <p className="text-muted-foreground text-sm">
            Only owners can change these.
          </p>
        )}
        <SpaceSettingsForm
          defaults={{
            name: space.name,
            baseCurrency: toCurrency(space.baseCurrency),
            budgetMonthStartDay: space.budgetMonthStartDay,
          }}
          submitLabel="Save settings"
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
      toast.success('Removed from the space')
    },
    onError: (error) => toast.error(error.message),
  })

  return (
    <section aria-labelledby="members" className="flex flex-col gap-3">
      <h2 id="members" className="font-semibold text-lg">
        Members
      </h2>
      <ul className="divide-y rounded-lg border bg-card">
        {space.members.map((m) => {
          const isMe = m.userId === space.currentUserId
          return (
            <li
              key={m.userId}
              className="flex flex-wrap items-center gap-3 px-4 py-3"
            >
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-medium">
                  {m.name}
                  {isMe && (
                    <span className="font-normal text-muted-foreground">
                      {' '}
                      (you)
                    </span>
                  )}
                </span>
                <span className="truncate text-muted-foreground text-sm">
                  {m.email}
                </span>
              </span>
              {isOwner ? (
                <select
                  aria-label={`Role of ${m.name}`}
                  value={m.role}
                  disabled={changeRole.isPending}
                  onChange={(e) =>
                    changeRole.mutate({
                      data: {
                        spaceId: space.id,
                        userId: m.userId,
                        role: e.target.value as Role,
                      },
                    })
                  }
                  className={selectClass}
                >
                  {(Object.keys(ROLE_LABEL) as Role[]).map((role) => (
                    <option key={role} value={role}>
                      {ROLE_LABEL[role]}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="text-muted-foreground text-sm">
                  {ROLE_LABEL[m.role]}
                </span>
              )}
              {isOwner && !isMe && (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove ${m.name}`}
                  disabled={remove.isPending}
                  onClick={() =>
                    remove.mutate({
                      data: { spaceId: space.id, userId: m.userId },
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
      <dl className="grid gap-1 text-muted-foreground text-sm">
        {(Object.keys(ROLE_LABEL) as Role[]).map((role) => (
          <div key={role} className="flex gap-1.5">
            <dt className="font-medium text-foreground">{ROLE_LABEL[role]}:</dt>
            <dd>{ROLE_HINT[role]}</dd>
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
  const now = Date.now()

  return (
    <section aria-labelledby="invite" className="flex flex-col gap-4">
      <h2 id="invite" className="font-semibold text-lg">
        Invite people
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
            <Label htmlFor="invite-email">Email</Label>
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
            <Label htmlFor="invite-role">Role</Label>
            <select
              id="invite-role"
              name="role"
              defaultValue="editor"
              className={selectClass}
            >
              <option value="editor">Editor</option>
              <option value="viewer">Viewer</option>
            </select>
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="send-email"
            defaultChecked
            className="size-4"
          />
          Email the invite to them
        </label>
        <p id="invite-hint" className="text-muted-foreground text-sm">
          You also get the link to send another way. It works once, only for
          this email, for 7 days.
        </p>
        <FormError message={create.error?.message ?? null} />
        <Button
          type="submit"
          disabled={create.isPending}
          className="self-start"
        >
          <Link2 />
          Create invite link
        </Button>
      </form>

      {link && (
        <div
          className="flex flex-col gap-3 rounded-lg border border-note/40 bg-card p-4"
          role="status"
        >
          <p className="text-sm">
            {link.emailed ? 'Emailed to ' : 'Send this link to '}
            <span className="font-medium">{link.email}</span>.{' '}
            {link.emailed
              ? 'You can also share the link yourself; it is shown only now.'
              : 'It is shown only now.'}
          </p>
          <Input
            readOnly
            value={link.url}
            onFocus={(e) => e.currentTarget.select()}
            aria-label="Invite link"
          />
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={async () => {
                await navigator.clipboard.writeText(link.url)
                toast.success('Link copied')
              }}
            >
              <Copy />
              Copy link
            </Button>
            {canShare && (
              <Button
                variant="outline"
                onClick={() =>
                  navigator
                    .share({
                      title: `Join ${space.name} on BudgetMaster`,
                      url: link.url,
                    })
                    .catch(() => {})
                }
              >
                <Share2 />
                Share
              </Button>
            )}
          </div>
        </div>
      )}

      {space.invites.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="font-medium text-sm">Pending</h3>
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
                          ? 'text-destructive text-sm'
                          : 'text-muted-foreground text-sm'
                      }
                    >
                      {ROLE_LABEL[invite.role]},{' '}
                      {expired
                        ? 'expired'
                        : `expires ${formatShortDate(new Date(invite.expiresAt).toISOString().slice(0, 10))}`}
                    </span>
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Revoke invite for ${invite.email}`}
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
          <p className="text-muted-foreground text-sm">
            To send a new link, invite the same email again.
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
          ? `You left and ${space.name} was deleted`
          : `You left ${space.name}`,
      ),
  })
  const remove = useMutation({
    mutationFn: deleteSpace,
    onSuccess: () => done(`${space.name} deleted`),
  })
  const error =
    (confirm === 'leave' ? leave.error : remove.error)?.message ?? null
  const pending = leave.isPending || remove.isPending

  return (
    <section aria-labelledby="danger" className="flex flex-col gap-3">
      <h2 id="danger" className="font-semibold text-lg">
        Leave or delete
      </h2>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => setConfirm('leave')}>
          Leave space
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
            Delete space
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
                ? `Delete ${space.name}?`
                : `Leave ${space.name}?`}
            </DialogTitle>
            <DialogDescription>
              {confirm === 'delete'
                ? 'All its wallets, transactions, budgets and members are removed for everyone. This cannot be undone.'
                : 'You lose access to its wallets and transactions. Someone has to invite you again to come back.'}
            </DialogDescription>
          </DialogHeader>
          {confirm === 'delete' && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="confirm-name">Type {space.name} to confirm</Label>
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
              Cancel
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
              {confirm === 'delete' ? 'Delete space' : 'Leave space'}
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
      toast.success('Transaction restored')
      return queryClient.invalidateQueries({ queryKey: ['space', spaceId] })
    },
    onError: (e) => toast.error(e.message),
  })
  if (!events) return null

  return (
    <section aria-labelledby="recent-changes" className="flex flex-col gap-3">
      <h2 id="recent-changes" className="font-semibold text-lg">
        Recent changes
      </h2>
      {events.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Nothing yet. Changes to transactions show up here
          {shared ? ' for every member' : ''}.
        </p>
      ) : (
        <ul className="divide-y rounded-lg border bg-card text-sm">
          {events.map((e) => (
            <li key={e.id} className="flex items-center gap-3 px-4 py-2.5">
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span>
                  <span className="font-medium">
                    {e.isMe ? 'You' : (e.userName ?? 'A former member')}
                  </span>{' '}
                  {describeActivity(e)}
                </span>
                <time
                  dateTime={e.createdAt}
                  className="text-muted-foreground text-xs"
                >
                  {new Date(e.createdAt).toLocaleString(APP_LOCALE, {
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
                  Restore
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
