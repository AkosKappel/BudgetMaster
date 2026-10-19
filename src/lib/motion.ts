// Shared motion presets. Reduced motion is handled once by MotionConfig in __root.tsx.

// Indicators, swipe actions and anything that follows a finger.
export const snappySpring = {
  type: 'spring',
  stiffness: 500,
  damping: 40,
} as const

// Rows and cards entering or leaving a list.
export const listItemTransition = { duration: 0.2, ease: 'easeOut' } as const
