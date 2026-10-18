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
    ['/wallets', 'Wallets'],
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

test('open sheets and panels have no axe violations', async ({ page }) => {
  await startDemo(page)
  const addButton = page
    .getByRole('button', { name: 'Add transaction' })
    .filter({ visible: true })
  await addButton.click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expectNoAxeViolations(page)
  // Escape closes the sheet and returns focus to the button that opened it.
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toBeHidden()
  await expect(addButton).toBeFocused()

  await page.goto('/activity')
  await page.getByRole('button', { name: /Filters/ }).click()
  await expect(page.getByLabel('Min amount')).toBeVisible()
  await expectNoAxeViolations(page)

  await page.goto('/categories')
  await page.getByRole('button', { name: 'New category' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expectNoAxeViolations(page)
})

// WCAG 1.4.10: content reflows at 320 CSS pixels (400 % zoom) without sideways scrolling.
test('pages reflow at 320 px without horizontal scrolling', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 640 })
  await startDemo(page)
  for (const path of ['/', '/activity', '/budgets', '/categories', '/more']) {
    await page.goto(path)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    // Charts measure their container after the first paint, so wait for layout to settle.
    await expect
      .poll(
        () =>
          page.evaluate(
            () => document.documentElement.scrollWidth - window.innerWidth,
          ),
        { message: path },
      )
      .toBeLessThanOrEqual(0)
  }
})
