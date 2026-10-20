import { Link } from '@tanstack/react-router'
import { Check, ChevronsUpDown, Settings2, User, Users } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useActiveSpace, useSpaces, useSwitchSpace } from '@/lib/queries'
import { cn } from '@/lib/utils'
import { m } from '@/paraglide/messages.js'

const ROLE_LABELS: Record<string, () => string> = {
  owner: m.shell_role_owner,
  editor: m.shell_role_editor,
  viewer: m.shell_role_viewer,
}

export function SpaceSwitcher({
  className,
  compact = false,
}: {
  className?: string
  // Icon only, for the collapsed sidebar.
  compact?: boolean
}) {
  const { spaces } = useSpaces()
  const active = useActiveSpace()
  const { switchTo, pendingId } = useSwitchSpace()
  const ActiveIcon = active.personal ? User : Users

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            'h-10 justify-start gap-2 px-3',
            compact && 'justify-center px-0',
            className,
          )}
          aria-label={m.shell_space_label({ name: active.name })}
          title={compact ? active.name : undefined}
          disabled={pendingId !== null}
        >
          <ActiveIcon />
          {!compact && (
            <>
              <span className="truncate font-semibold">{active.name}</span>
              <ChevronsUpDown className="ml-auto text-muted-foreground" />
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel className="text-muted-foreground text-xs">
          {m.shell_palette_spaces()}
        </DropdownMenuLabel>
        {spaces.map((s) => {
          const Icon = s.personal ? User : Users
          return (
            <DropdownMenuItem
              key={s.id}
              onSelect={() => s.id !== active.id && switchTo(s.id)}
              className="gap-3 py-2"
            >
              <Icon />
              <span className="flex min-w-0 flex-col">
                <span className="truncate">{s.name}</span>
                <span className="text-muted-foreground text-xs">
                  {s.personal
                    ? m.shell_space_only_you()
                    : m.shell_space_members({
                        count: s.memberCount,
                        role: ROLE_LABELS[s.role]?.() ?? s.role,
                      })}
                </span>
              </span>
              {s.id === active.id && <Check className="ml-auto" />}
            </DropdownMenuItem>
          )
        })}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="gap-3 py-2">
          <Link to="/spaces">
            <Settings2 />
            {m.shell_space_manage()}
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
