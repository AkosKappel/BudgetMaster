import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ChevronLeft, Trash2, Wand } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { FormError } from '@/components/auth-page'
import { EmptyState } from '@/components/empty-state'
import { categoryOrder } from '@/components/transaction-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formOptionsQuery, rulesQuery, useActiveSpace } from '@/lib/queries'
import { m } from '@/paraglide/messages.js'
import { deleteRule, saveRules } from '@/server/rules'

export const Route = createFileRoute('/_app/rules')({
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(rulesQuery(context.activeSpaceId)),
      context.queryClient.ensureQueryData(
        formOptionsQuery(context.activeSpaceId),
      ),
    ]),
  head: () => ({ meta: [{ title: m.setup_rules_meta_title() }] }),
  component: Rules,
})

const selectClass =
  'h-9 w-full rounded-md border border-input bg-card px-3 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 md:text-sm'

type RuleType = 'income' | 'expense'

function Rules() {
  const space = useActiveSpace()
  const { data } = useSuspenseQuery(rulesQuery(space.id))
  const { data: options } = useSuspenseQuery(formOptionsQuery(space.id))
  const queryClient = useQueryClient()
  const [match, setMatch] = useState('')
  const [type, setType] = useState<RuleType>('expense')
  const [categoryId, setCategoryId] = useState('')

  // Rules feed quick add and the import review through the form options.
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ['space', space.id] })
  const create = useMutation({
    mutationFn: () =>
      saveRules({
        data: { spaceId: space.id, rules: [{ type, match, categoryId }] },
      }),
    onSuccess: async () => {
      await refresh()
      toast.success(m.setup_rules_saved())
      setMatch('')
    },
  })
  const remove = useMutation({
    mutationFn: (id: string) => deleteRule({ data: { id, spaceId: space.id } }),
    onSuccess: async () => {
      await refresh()
      toast.success(m.setup_rules_deleted())
    },
    onError: (error) => toast.error(error.message),
  })

  return (
    <div className="flex flex-col gap-6">
      <Link
        to="/more"
        className="-ml-2 flex w-fit items-center gap-1 rounded-md px-2 py-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        {m.setup_back_more()}
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight">
        {m.setup_rules_title()}
      </h1>
      <p className="max-w-prose text-muted-foreground">
        {m.setup_rules_intro()}
      </p>

      {data.canWrite && (
        <form
          className="grid gap-3 rounded-lg border bg-card p-4 sm:grid-cols-[1fr_auto_1fr_auto] sm:items-end"
          onSubmit={(e) => {
            e.preventDefault()
            create.mutate()
          }}
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="rule-match">{m.setup_rules_match_label()}</Label>
            <Input
              id="rule-match"
              value={match}
              maxLength={60}
              required
              autoComplete="off"
              placeholder={m.setup_rules_match_placeholder()}
              onChange={(e) => setMatch(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="rule-type">{m.setup_form_type()}</Label>
            <select
              id="rule-type"
              className={selectClass}
              value={type}
              onChange={(e) => {
                setType(e.target.value as RuleType)
                setCategoryId('')
              }}
            >
              <option value="expense">{m.setup_type_expense()}</option>
              <option value="income">{m.setup_type_income()}</option>
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="rule-category">{m.setup_form_category()}</Label>
            <select
              id="rule-category"
              className={selectClass}
              value={categoryId}
              required
              onChange={(e) => setCategoryId(e.target.value)}
            >
              <option value="">{m.setup_categories_choose()}</option>
              {categoryOrder(options.categories, type).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.parentId ? ` ${c.name}` : c.name}
                </option>
              ))}
            </select>
          </div>
          <Button
            type="submit"
            disabled={
              create.isPending || match.trim().length < 2 || !categoryId
            }
          >
            {m.setup_rules_add()}
          </Button>
          <div className="sm:col-span-4">
            <FormError message={create.error?.message ?? null} />
          </div>
        </form>
      )}

      {data.rules.length === 0 ? (
        <EmptyState icon={Wand}>{m.setup_rules_empty()}</EmptyState>
      ) : (
        <ul className="divide-y rounded-lg border bg-card">
          {data.rules.map((rule) => (
            <li key={rule.id} className="flex items-center gap-3 px-4 py-3">
              <span className="min-w-0 flex-1">
                <span className="font-medium">
                  {m.setup_quoted({ text: rule.match })}
                </span>
                <span className="text-muted-foreground">
                  {' '}
                  → {rule.categoryName}
                  {rule.type === 'income'
                    ? ` ${m.setup_rules_income_suffix()}`
                    : ''}
                </span>
              </span>
              {data.canWrite && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={m.setup_rules_delete_label({ match: rule.match })}
                  disabled={remove.isPending}
                  onClick={() => remove.mutate(rule.id)}
                >
                  <Trash2 />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
