import { expect, test } from '@playwright/test'

import { startDemo } from './helpers'

test('the first day of the week is saved on the account', async ({ page }) => {
  await startDemo(page)
  await page.goto('/settings')
  const sunday = page.getByRole('radio', { name: 'Sunday' })
  await expect(page.getByRole('radio', { name: 'Monday' })).toBeChecked()
  await sunday.check({ force: true })
  await expect(sunday).toBeChecked()
  // Saved through the server, not just in the page.
  await expect
    .poll(async () => (await page.request.get('/api/auth/get-session')).json())
    .toMatchObject({ user: { weekStartsOn: 0 } })
  await page.reload()
  await expect(sunday).toBeChecked()
  // Without ANTHROPIC_API_KEY on the server, AI features are not offered at all.
  await expect(page.getByText('AI features')).toHaveCount(0)
})
