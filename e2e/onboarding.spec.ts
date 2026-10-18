import { expect, test } from '@playwright/test'

test('a new account sets up currency, wallet and budget on the welcome page', async ({
  page,
}) => {
  await page.goto('/sign-up')
  await page.getByLabel('Name').fill('Onboarding User')
  await page.getByLabel('Email').fill(`welcome-${Date.now()}@example.com`)
  await page.getByLabel('Password', { exact: true }).fill('a-long-password-1')
  await page.getByRole('button', { name: /create account/i }).click()

  await expect(page.getByRole('heading', { name: 'Welcome' })).toBeVisible()
  await page.getByLabel('Currency').selectOption('USD')
  await page.getByLabel('Month starts on day').selectOption('25')
  await page.getByLabel('Its balance today').fill('1200')
  await page.getByLabel('Monthly budget (optional)').fill('900')
  await page.getByRole('button', { name: 'Start budgeting' }).click()

  await expect(page.getByText('Left to spend')).toBeVisible()
  await expect(page.getByText('$900.00').first()).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Wallets' })).toBeVisible()
  await expect(page.getByText('$1,200.00')).toBeVisible()

  // Set up once: the welcome page sends a configured space home.
  await page.goto('/welcome')
  await expect(page).toHaveURL(/\/$/)
})
