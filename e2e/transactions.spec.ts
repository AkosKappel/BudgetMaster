import { expect, test } from '@playwright/test'

import { startDemo } from './helpers'

test('quick add saves an expense that shows up in activity', async ({
  page,
}) => {
  await startDemo(page)
  await page
    .getByRole('button', { name: /add transaction|add expense/i })
    .first()
    .click()
  const sheet = page.getByRole('dialog')
  // A receipt added up in the field.
  await sheet.getByLabel('Amount').fill('10+2.34')
  await expect(sheet.getByText('= €12.34')).toBeVisible()
  await sheet.getByLabel('Paid to').fill('E2E Bakery')
  await sheet.getByText('Groceries', { exact: true }).click()
  await sheet.getByRole('button', { name: /save/i }).click()
  await expect(page.getByText('Expense saved')).toBeVisible()

  await page.goto('/activity?q=E2E%20Bakery')
  await expect(page.getByRole('button', { name: /E2E Bakery/ })).toContainText(
    '−€12.34',
  )
})

test('a typed line fills the quick add form', async ({ page }) => {
  await startDemo(page)
  await page
    .getByRole('button', { name: /add transaction|add expense/i })
    .first()
    .click()
  const sheet = page.getByRole('dialog')
  await sheet.getByLabel('Or type it').fill('Typed Bakery 4.80 groceries cash')
  await sheet.getByLabel('Or type it').press('Enter')
  await expect(sheet.getByLabel('Amount')).toHaveValue('4.80')
  await expect(sheet.getByLabel('Paid to')).toHaveValue('Typed Bakery')
  await sheet.getByRole('button', { name: /save/i }).click()
  await expect(page.getByText('Expense saved')).toBeVisible()

  await page.goto('/activity?q=Typed%20Bakery')
  await expect(
    page.getByRole('button', { name: /Typed Bakery/ }),
  ).toContainText('Groceries')
})

test('activity filters come from the URL', async ({ page }) => {
  await startDemo(page)
  await page.goto('/activity?type=income')
  await expect(page.getByRole('button', { name: /Filters/ })).toContainText('1')
  // Every amount shown is income, so none has a minus sign.
  const amounts = page.locator('main section li').getByText(/[€$]/)
  await expect(amounts.first()).toBeVisible()
  await expect(page.locator('main section li', { hasText: '−' })).toHaveCount(0)
})

test('the command palette opens activity filtered by a category', async ({
  page,
}) => {
  await startDemo(page)
  await page.keyboard.press('ControlOrMeta+k')
  const palette = page.getByRole('dialog', { name: 'Search and commands' })
  await palette.getByRole('combobox').fill('Groceries')
  await palette.getByRole('option', { name: /^Groceries\s+Category/ }).click()
  await expect(page).toHaveURL(/\/activity\?category=/)
  await expect(page.getByRole('button', { name: /Filters/ })).toContainText('1')
})

test('a receipt split across categories counts in each of them', async ({
  page,
}) => {
  await startDemo(page)
  await page
    .getByRole('button', { name: /add transaction|add expense/i })
    .first()
    .click()
  const sheet = page.getByRole('dialog')
  await sheet.getByLabel('Amount').fill('30')
  await sheet.getByLabel('Paid to').fill('E2E Market')
  await sheet.getByText('Groceries', { exact: true }).click()
  await sheet.getByRole('button', { name: 'Split across categories' }).click()
  await sheet.getByLabel('Amount of part 1').fill('20')
  await sheet
    .getByLabel('Category of part 2')
    .selectOption({ label: 'Shopping' })
  await expect(sheet.getByText('€10.00 left to assign')).toBeVisible()
  // Too much is refused before it reaches the server.
  await sheet.getByLabel('Amount of part 2').fill('15')
  await expect(sheet.getByText('€5.00 too much')).toBeVisible()
  await sheet.getByRole('button', { name: /save/i }).click()
  await expect(
    sheet.getByText('The parts must add up to the amount.'),
  ).toBeVisible()
  await sheet.getByLabel('Amount of part 2').fill('10')
  await expect(sheet.getByText('Adds up')).toBeVisible()
  await sheet.getByRole('button', { name: /save/i }).click()
  await expect(page.getByText('Expense saved')).toBeVisible()

  await page.goto('/activity?q=E2E%20Market')
  await expect(page.getByRole('button', { name: /E2E Market/ })).toContainText(
    'Groceries + Shopping',
  )
  await page.getByRole('button', { name: /E2E Market/ }).click()
  await expect(page.getByLabel('Amount of part 1')).toHaveValue('20.00')
})

test('a receipt photo is shrunk, saved with the transaction and shown again', async ({
  page,
}) => {
  await startDemo(page)
  await page
    .getByRole('button', { name: /add transaction|add expense/i })
    .first()
    .click()
  const sheet = page.getByRole('dialog')
  await sheet.getByLabel('Amount').fill('3.10')
  await sheet.getByLabel('Paid to').fill('Receipt Kiosk')
  await sheet.getByText('Groceries', { exact: true }).click()
  // A 2x2 PNG; the browser turns it into a WebP before the upload.
  await sheet.getByLabel('Add a photo').setInputFiles({
    name: 'receipt.png',
    mimeType: 'image/png',
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFElEQVR4nGP4z8DAAMIM/////w8AH+4F+7C4l8kAAAAASUVORK5CYII=',
      'base64',
    ),
  })
  await expect(sheet.getByRole('img', { name: /Receipt photo/ })).toBeVisible()
  await sheet.getByRole('button', { name: /save/i }).click()
  await expect(page.getByText('Expense saved')).toBeVisible()
  // The photo uploads right after the row; Home's recent list shows it once it is in.
  await expect(
    page
      .getByRole('button', { name: /Receipt Kiosk/ })
      .getByLabel('Receipt photo'),
  ).toBeVisible()

  await page.goto('/activity?q=Receipt%20Kiosk')
  const row = page.getByRole('button', { name: /Receipt Kiosk/ })
  await expect(row.getByLabel('Receipt photo')).toBeVisible()
  await row.click()
  const photo = page.getByRole('dialog').getByRole('img', { name: /Receipt/ })
  await expect(photo).toHaveAttribute('src', /^\/api\/receipts\//)
  await expect
    .poll(() => photo.evaluate((img: HTMLImageElement) => img.naturalWidth))
    .toBe(2)

  // Not readable without a session.
  const src = await photo.getAttribute('src')
  const anonymous = await page.request.fetch(src ?? '', {
    headers: { cookie: '' },
  })
  expect(anonymous.status()).toBe(401)
})

test('the add expense shortcut opens quick add', async ({ page }) => {
  await startDemo(page)
  await page.goto('/?add=expense')
  await expect(page.getByRole('dialog').getByLabel('Amount')).toBeVisible()
  await expect(page).toHaveURL(/\/$/)
})

test('the amount filter keeps only amounts in range', async ({ page }) => {
  await startDemo(page)
  await page.goto('/activity?type=expense&min=500')
  const rows = page.locator('main section li')
  await expect(rows.first()).toBeVisible()
  for (const text of await rows.allTextContents()) {
    const amount = Number(
      /−[€$]([\d,]+\.\d{2})/.exec(text)?.[1].replace(/,/g, ''),
    )
    expect(amount).toBeGreaterThanOrEqual(500)
  }
})
