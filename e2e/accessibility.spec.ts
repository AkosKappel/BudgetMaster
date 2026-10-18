import { expect, test } from '@playwright/test'

import { expectNoAxeViolations, startDemo } from './helpers'

test('sign-in and sign-up pages have no axe violations', async ({ page }) => {
  await page.goto('/sign-in')
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
  await expectNoAxeViolations(page)
  await page.goto('/sign-up')
  await expect(
    page.getByRole('heading', { name: 'Create account' }),
  ).toBeVisible()
  await expectNoAxeViolations(page)
})

test('app pages have no axe violations', async ({ page }) => {
  await startDemo(page)
  for (const [path, heading] of [
    ['/', /Over budget by|Left to spend|Spent since/],
    ['/activity', 'Activity'],
    ['/budgets', 'Budgets'],
    ['/categories', 'Categories'],
    ['/spaces', 'Spaces'],
    ['/more', 'More'],
  ] as const) {
    await page.goto(path)
    await expect(
      page.getByRole('heading', { level: 1, name: heading }),
    ).toBeVisible()
    await expectNoAxeViolations(page)
  }
})
