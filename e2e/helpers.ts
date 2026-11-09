import AxeBuilder from '@axe-core/playwright'
import { expect, type Page } from '@playwright/test'

// Signs in as a fresh private demo user with about 14 months of data.
export async function startDemo(page: Page) {
  await page.goto('/sign-in')
  await page.getByRole('button', { name: 'Try the demo' }).click()
  await expect(page.getByText(/Demo data, deleted in/)).toBeVisible()
}

export async function expectNoAxeViolations(page: Page) {
  // A button fading in from its disabled opacity reads as low contrast mid-transition.
  // Infinite animations (spinners) never finish, so only finite ones are awaited.
  await page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((a) => a.effect?.getComputedTiming().endTime !== Infinity)
        .map((a) => a.finished.catch(() => {})),
    ),
  )
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze()
  expect(
    violations.map(
      (v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`,
    ),
  ).toEqual([])
}
