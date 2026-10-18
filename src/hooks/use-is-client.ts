import { useSyncExternalStore } from 'react'

// False during server rendering and hydration, true once React runs in the browser. Forms
// keep their submit button disabled until then, so a fast tap never does a plain submit.
export const useIsClient = () =>
  useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  )
