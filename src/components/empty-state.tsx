import type { LucideIcon } from 'lucide-react'

export function EmptyState({
  icon: Icon,
  children,
}: {
  icon: LucideIcon
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed px-5 py-8 text-muted-foreground">
      <Icon className="size-6" strokeWidth={1.5} />
      <p className="max-w-prose text-sm">{children}</p>
    </div>
  )
}
