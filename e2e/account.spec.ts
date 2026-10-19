import { createHmac } from 'node:crypto'

import { expect, type Page, test } from '@playwright/test'

import { expectNoAxeViolations } from './helpers'

test('a password can be changed, and the reset pages work without an inbox', async ({
  page,
}) => {
  const email = `account-${Date.now()}@example.com`
  await page.goto('/sign-up')
  await page.getByLabel('Name').fill('Account Test')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password', { exact: true }).fill('first-password-1')
  await page.getByRole('button', { name: /create account/i }).click()
  await expect(page.getByRole('heading', { name: 'Welcome' })).toBeVisible()

  await page.goto('/more')
  await expect(page.getByText(/so you can reset your password/)).toBeVisible()
  await page.locator('summary', { hasText: 'Change password' }).click()
  await page.getByLabel('Current password').fill('first-password-1')
  await page.getByLabel('New password').fill('second-password-2')
  await page.getByRole('button', { name: 'Change password' }).click()
  await expect(page.getByText(/Password changed/)).toBeVisible()
  await expectNoAxeViolations(page)

  await page.context().clearCookies()
  await page.goto('/sign-in')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password', { exact: true }).fill('second-password-2')
  await page.getByRole('button', { name: /^sign in$/i }).click()
  await expect(page).not.toHaveURL(/sign-in/)

  await page.context().clearCookies()
  await page.goto('/sign-in')
  await page.getByRole('link', { name: 'Forgot password?' }).click()
  await page.getByLabel('Email').fill(email)
  await page.getByRole('button', { name: 'Send link' }).click()
  await expect(page.getByText(/an email with a link/)).toBeVisible()
  await expectNoAxeViolations(page)

  await page.goto('/reset-password?error=INVALID_TOKEN')
  await expect(
    page.getByRole('heading', { name: 'Link expired' }),
  ).toBeVisible()
  await expectNoAxeViolations(page)
})

// RFC 6238 code for a base32 secret, like an authenticator app.
function totp(secret: string) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  const bits = [...secret.replace(/=+$/, '')]
    .map((c) => alphabet.indexOf(c).toString(2).padStart(5, '0'))
    .join('')
  const key = Buffer.from(
    bits.match(/.{8}/g)?.map((byte) => Number.parseInt(byte, 2)) ?? [],
  )
  const counter = Buffer.alloc(8)
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30_000)))
  const hash = createHmac('sha1', key).update(counter).digest()
  const offset = hash[hash.length - 1] & 15
  return String((hash.readUInt32BE(offset) & 0x7fffffff) % 1e6).padStart(6, '0')
}

async function signIn(page: Page, email: string, password: string) {
  await page.context().clearCookies()
  await page.goto('/sign-in')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByRole('button', { name: /^sign in$/i }).click()
  await expect(
    page.getByRole('heading', { name: 'Two-step sign-in' }),
  ).toBeVisible()
}

test('two-step sign-in asks for an authenticator or backup code', async ({
  page,
}) => {
  const email = `two-step-${Date.now()}@example.com`
  const password = 'two-step-password-1'
  await page.goto('/sign-up')
  await page.getByLabel('Name').fill('Two Step')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByRole('button', { name: /create account/i }).click()
  await expect(page.getByRole('heading', { name: 'Welcome' })).toBeVisible()

  await page.goto('/more')
  await page.locator('summary', { hasText: 'Two-step sign-in' }).click()
  await page.locator('#enable-2fa-password').fill(password)
  await page.getByRole('button', { name: 'Set up' }).click()
  await expect(page.getByRole('img', { name: /QR code/ })).toBeVisible()
  const secret = await page.locator('code').innerText()
  await page.getByLabel('Code from the app').fill(totp(secret))
  await page.getByRole('button', { name: 'Turn on' }).click()
  await expect(page.getByText(/Save these backup codes/)).toBeVisible()
  const backupCode = await page.locator('ul.font-mono li').first().innerText()
  await expectNoAxeViolations(page)
  await page.getByRole('button', { name: 'I saved them' }).click()
  await expect(
    page.locator('summary', { hasText: 'Two-step sign-in (on)' }),
  ).toBeVisible()

  await signIn(page, email, password)
  await page.getByLabel('Code').fill('000000')
  await page.getByRole('button', { name: 'Verify' }).click()
  await expect(page.getByRole('alert')).toBeVisible()
  await expectNoAxeViolations(page)
  await page.getByRole('button', { name: 'Use a backup code instead' }).click()
  await page.getByLabel('Backup code').fill(backupCode)
  await page.getByRole('button', { name: 'Verify' }).click()
  await expect(page).not.toHaveURL(/two-factor|sign-in/)

  await signIn(page, email, password)
  await page.getByLabel('Code').fill(totp(secret))
  await page.getByRole('button', { name: 'Verify' }).click()
  await expect(page).not.toHaveURL(/two-factor|sign-in/)
})
