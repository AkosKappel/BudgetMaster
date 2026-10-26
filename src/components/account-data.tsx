import { useQueryClient } from '@tanstack/react-query'
import { useNavigate, useRouteContext } from '@tanstack/react-router'
import { Download, FileSpreadsheet, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { FormError } from '@/components/auth-page'
import { PasswordInput } from '@/components/password-input'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { authClient } from '@/lib/auth-client'
import { useActiveSpace } from '@/lib/queries'
import { localTodayIso } from '@/lib/recurrence'
import { m } from '@/paraglide/messages.js'
import { exportAllData, exportTransactionsCsv } from '@/server/account'

function download(name: string, type: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.click()
  URL.revokeObjectURL(url)
}

const fileName = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

export function AccountData() {
  const { user } = useRouteContext({ from: '/_app' })
  const space = useActiveSpace()
  const [busy, setBusy] = useState<'json' | 'csv' | null>(null)
  const [deleting, setDeleting] = useState(false)

  const run = async (kind: 'json' | 'csv') => {
    setBusy(kind)
    try {
      if (kind === 'json') {
        const data = await exportAllData()
        download(
          `budgetmaster-${localTodayIso()}.json`,
          'application/json',
          JSON.stringify(data, null, 2),
        )
      } else {
        const csv = await exportTransactionsCsv({ data: { spaceId: space.id } })
        download(
          `budgetmaster-${fileName(space.name)}-${localTodayIso()}.csv`,
          'text/csv',
          csv,
        )
      }
    } catch {
      toast.error(m.acct_data_download_error())
    } finally {
      setBusy(null)
    }
  }

  return (
    <section aria-labelledby="your-data" className="flex flex-col gap-3">
      <h2 id="your-data" className="text-lg font-semibold">
        {m.acct_data_title()}
      </h2>
      <p className="max-w-prose text-sm text-muted-foreground">
        {m.acct_data_intro()}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          disabled={busy !== null}
          onClick={() => run('json')}
        >
          <Download />
          {busy === 'json'
            ? m.acct_data_preparing()
            : m.acct_data_download_json()}
        </Button>
        <Button
          variant="outline"
          disabled={busy !== null}
          onClick={() => run('csv')}
        >
          <FileSpreadsheet />
          {busy === 'csv'
            ? m.acct_data_preparing()
            : m.acct_data_download_csv({ space: space.name })}
        </Button>
      </div>
      {!user.demoExpiresAt && (
        <>
          <Button
            variant="ghost"
            className="w-fit text-destructive hover:text-destructive"
            onClick={() => setDeleting(true)}
          >
            <Trash2 />
            {m.acct_data_delete_account()}
          </Button>
          <DeleteAccountDialog open={deleting} onOpenChange={setDeleting} />
        </>
      )}
    </section>
  )
}

function DeleteAccountDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const confirm = async () => {
    setError(null)
    setPending(true)
    const { error } = await authClient.deleteUser({ password })
    setPending(false)
    if (error) {
      setError(error.message ?? m.acct_data_delete_error())
      return
    }
    queryClient.clear()
    toast.success(m.acct_data_deleted())
    await navigate({ to: '/sign-in' })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next)
        setPassword('')
        setError(null)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{m.acct_data_delete_title()}</DialogTitle>
          <DialogDescription>{m.acct_data_delete_body()}</DialogDescription>
        </DialogHeader>
        <form
          id="delete-account"
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            confirm()
          }}
        >
          <Label htmlFor="delete-password">{m.acct_data_your_password()}</Label>
          <PasswordInput
            id="delete-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </form>
        <FormError message={error} />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {m.acct_cancel()}
          </Button>
          <Button
            type="submit"
            form="delete-account"
            variant="destructive"
            disabled={pending || !password}
          >
            {m.acct_data_delete_account()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
