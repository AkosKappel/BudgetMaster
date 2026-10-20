import { useMutation, useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ChevronLeft, Sparkles } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formOptionsQuery, useActiveSpace } from '@/lib/queries'
import { m } from '@/paraglide/messages.js'
import { askMoney } from '@/server/ask'

export const Route = createFileRoute('/_app/ask')({
  head: () => ({ meta: [{ title: `${m.ask_title()} | BudgetMaster` }] }),
  component: Ask,
})

type Turn = { question: string; answer: string }

// AI-03: questions in plain words, answered by Claude through read-only totals
// (src/server/ask.ts). The conversation lives on this page only; nothing is stored.
function Ask() {
  const space = useActiveSpace()
  const { data: options } = useQuery(formOptionsQuery(space.id))
  const [turns, setTurns] = useState<Turn[]>([])
  const [question, setQuestion] = useState('')
  const ask = useMutation({
    mutationFn: (text: string) =>
      askMoney({
        data: { spaceId: space.id, question: text, history: turns.slice(-6) },
      }),
    onSuccess: ({ answer }, text) => {
      setTurns((current) => [...current, { question: text, answer }])
      setQuestion('')
    },
  })
  const send = (text: string) => {
    if (text.trim().length >= 2 && !ask.isPending) ask.mutate(text.trim())
  }

  return (
    <div className="flex flex-col gap-6">
      <Link
        to="/more"
        className="-ml-2 flex w-fit items-center gap-1 rounded-md px-2 py-1 text-muted-foreground text-sm hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
        {m.shell_nav_more()}
      </Link>
      <h1 className="font-semibold text-2xl tracking-tight">{m.ask_title()}</h1>
      <p className="max-w-prose text-muted-foreground">{m.ask_intro()}</p>

      {options && !options.canReadReceipts ? (
        <p className="rounded-lg border bg-card p-4 text-sm">
          {m.ask_off()}{' '}
          <Link to="/settings" className="underline underline-offset-4">
            {m.ask_off_link()}
          </Link>
        </p>
      ) : (
        <>
          {turns.length > 0 && (
            <ol className="flex flex-col gap-4" aria-live="polite">
              {turns.map((turn, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: turns are only appended
                <li key={i} className="flex flex-col gap-2">
                  <p className="self-end rounded-lg bg-muted px-3 py-2 text-sm">
                    <span className="sr-only">{m.ask_you()}: </span>
                    {turn.question}
                  </p>
                  <p className="max-w-prose whitespace-pre-line leading-relaxed">
                    <Sparkles
                      className="mr-1.5 inline size-4 text-note"
                      aria-label="Claude"
                    />
                    {turn.answer}
                  </p>
                </li>
              ))}
            </ol>
          )}

          <form
            className="flex flex-col gap-2"
            onSubmit={(event) => {
              event.preventDefault()
              send(question)
            }}
          >
            <Label htmlFor="ask-question">{m.ask_label()}</Label>
            <div className="flex gap-2">
              <Input
                id="ask-question"
                autoComplete="off"
                maxLength={500}
                placeholder={m.ask_placeholder()}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                aria-describedby="ask-privacy"
              />
              <Button type="submit" disabled={ask.isPending}>
                <Sparkles />
                {ask.isPending ? m.ask_thinking() : m.ask_send()}
              </Button>
            </div>
            {ask.isError && (
              <p role="alert" className="text-destructive text-sm">
                {ask.error.message || m.ask_failed()}
              </p>
            )}
            <p id="ask-privacy" className="text-muted-foreground text-xs">
              {m.ask_privacy()}
            </p>
          </form>

          {turns.length === 0 ? (
            <section
              aria-labelledby="ask-examples"
              className="flex flex-col gap-2"
            >
              <h2 id="ask-examples" className="text-muted-foreground text-sm">
                {m.ask_examples()}
              </h2>
              <div className="flex flex-wrap gap-2">
                {[m.ask_example_1(), m.ask_example_2(), m.ask_example_3()].map(
                  (example) => (
                    <Button
                      key={example}
                      variant="outline"
                      size="sm"
                      disabled={ask.isPending}
                      onClick={() => {
                        setQuestion(example)
                        send(example)
                      }}
                    >
                      {example}
                    </Button>
                  ),
                )}
              </div>
            </section>
          ) : (
            <Button
              variant="ghost"
              className="w-fit"
              onClick={() => {
                setTurns([])
                ask.reset()
              }}
            >
              {m.ask_new()}
            </Button>
          )}
        </>
      )}
    </div>
  )
}
