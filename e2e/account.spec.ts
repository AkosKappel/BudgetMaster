import { expect, test } from '@playwright/test'

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
