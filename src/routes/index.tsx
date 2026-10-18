import { createFileRoute } from '@tanstack/react-router'
import { motion } from 'motion/react'

import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        <h1 className="text-3xl font-semibold tracking-tight">BudgetMaster</h1>
        <p className="text-muted-foreground mt-2">
          Track your income and expenses. Work in progress.
        </p>
      </motion.div>
      <Button size="lg" disabled>
        Get started
      </Button>
    </main>
  )
}
