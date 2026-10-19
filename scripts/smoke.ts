// Post-deploy smoke test (H-08): `node scripts/smoke.ts https://budgetmaster.tailb52c43.ts.net`.
// Checks the health route, the sign-in page and a real demo sign-in, then signs out again.
// Exits non-zero on the first failure. Starting a demo seeds one temporary account, deleted
// after 48 hours like every demo, and counts against the 5 demos per hour per address.

const base = (process.argv[2] ?? 'http://localhost:3000').replace(/\/$/, '')
const appOrigin = new URL(base).origin

async function check(name: string, run: () => Promise<string | undefined>) {
  const started = performance.now()
  try {
    const detail = await run()
    const ms = Math.round(performance.now() - started)
    console.log(`ok   ${name} (${ms} ms)${detail ? `: ${detail}` : ''}`)
  } catch (error) {
    console.error(`FAIL ${name}: ${(error as Error).message}`)
    process.exit(1)
  }
}

function expectStatus(response: Response, status: number) {
  if (response.status !== status)
    throw new Error(`expected ${status}, got ${response.status}`)
}

await check('health', async () => {
  const response = await fetch(`${base}/api/health`)
  expectStatus(response, 200)
  return JSON.stringify(await response.json())
})

await check('sign-in page', async () => {
  const response = await fetch(`${base}/sign-in`)
  expectStatus(response, 200)
  const html = await response.text()
  if (!html.includes('Try the demo')) throw new Error('demo button missing')
  if (!response.headers.get('content-security-policy'))
    throw new Error('no Content-Security-Policy header')
})

let cookie = ''
await check('demo sign-in', async () => {
  const response = await fetch(`${base}/api/auth/sign-in/anonymous`, {
    method: 'POST',
    headers: { origin: appOrigin, 'content-type': 'application/json' },
    body: '{}',
  })
  expectStatus(response, 200)
  cookie = response.headers
    .getSetCookie()
    .map((c) => c.split(';')[0])
    .join('; ')
  if (!cookie) throw new Error('no session cookie')
})

await check('session', async () => {
  const response = await fetch(`${base}/api/auth/get-session`, {
    headers: { cookie },
  })
  expectStatus(response, 200)
  const session = (await response.json()) as { user?: { name?: string } }
  if (!session?.user) throw new Error('not signed in')
  return session.user.name
})

await check('home page signed in', async () => {
  const response = await fetch(`${base}/`, { headers: { cookie } })
  expectStatus(response, 200)
  if (!(await response.text()).includes('Demo data, deleted in'))
    throw new Error('demo banner missing')
})

await check('sign out', async () => {
  const response = await fetch(`${base}/api/auth/sign-out`, {
    method: 'POST',
    headers: { origin: appOrigin, cookie, 'content-type': 'application/json' },
    body: '{}',
  })
  expectStatus(response, 200)
})

console.log(`All checks passed for ${base}`)

export {}
