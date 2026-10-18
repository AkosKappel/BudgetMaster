import { motion, useReducedMotion } from 'motion/react'
import { useEffect, useState } from 'react'

import { cn } from '@/lib/utils'

const RINGS = 10
const POINTS = 144
const PETALS = 12

// Two families of wavy rings with opposite phase drift cross each other into the lattice
// seen on banknotes.
function ring(index: number, direction: 1 | -1) {
  const base = 44 + index * 4.6
  let d = ''
  for (let p = 0; p <= POINTS; p++) {
    const t = (p / POINTS) * Math.PI * 2
    const r =
      base + 6.5 * Math.sin(PETALS * t + direction * (index + 0.5) * 0.42)
    const x = (100 + r * Math.cos(t)).toFixed(1)
    const y = (100 + r * Math.sin(t)).toFixed(1)
    d += `${p ? 'L' : 'M'}${x} ${y}`
  }
  return d
}

const paths = Array.from({ length: RINGS }, (_, i) => [
  ring(i, 1),
  ring(i, -1),
]).flat()

// Decorative rosette. Rendered after mount only, which keeps about 30 kB of path data out
// of the server HTML.
export function Guilloche({ className }: { className?: string }) {
  const [mounted, setMounted] = useState(false)
  const reduceMotion = useReducedMotion()
  useEffect(() => setMounted(true), [])

  return (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      stroke="currentColor"
      strokeWidth={0.55}
      aria-hidden="true"
      className={cn('pointer-events-none', className)}
    >
      {mounted &&
        paths.map((d, i) => (
          <motion.path
            key={d}
            d={d}
            initial={reduceMotion ? false : { pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 1.4, delay: i * 0.03, ease: 'easeOut' }}
          />
        ))}
    </svg>
  )
}
