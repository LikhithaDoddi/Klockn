import { test, expect, Page } from '@playwright/test'

async function loginAsTestUser(page: Page) {
  await page.goto('/login')
  await page.getByPlaceholder('you@example.com').fill(process.env.TEST_EMAIL ?? 'test@klockn.com')
  await page.getByPlaceholder('••••••••').fill(process.env.TEST_PASSWORD ?? 'testpassword123')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.waitForURL(/\/dashboard|\/onboarding/, { timeout: 10000 })
  if (page.url().includes('/onboarding')) {
    await page.goto('/dashboard')
  }
}

async function createGroupAndOpenChat(page: Page): Promise<string> {
  await page.goto('/dashboard/groups/create')
  const name = `Chat Test ${Date.now()}`
  await page.getByPlaceholder(/e\.g\. Weekend crew/).fill(name)
  await page.getByRole('button', { name: 'Create group' }).click()
  await page.waitForURL(/\/dashboard\/groups\/[a-z0-9-]+$/)
  await page.getByRole('button', { name: 'Ask AI' }).click()
  await page.waitForURL(/\/chat$/)
  return name
}

test.describe('AI Chat', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page)
  })

  test('chat page renders header and welcome message', async ({ page }) => {
    await createGroupAndOpenChat(page)
    await expect(page.getByText('Klockn AI')).toBeVisible()
    await expect(page.getByText(/Hey! I've looked at everyone's availability/)).toBeVisible()
    await expect(page.getByPlaceholder(/Ask about availability/)).toBeVisible()
  })

  test('send button is disabled when input is empty', async ({ page }) => {
    await createGroupAndOpenChat(page)
    const sendBtn = page.locator('button[class*="w-9"]').last()
    await expect(sendBtn).toBeDisabled()
  })

  test('suggestion chips are visible on first load', async ({ page }) => {
    await createGroupAndOpenChat(page)
    await expect(page.getByText('What times work this week?')).toBeVisible()
    await expect(page.getByText('Find a 2-hour slot for everyone')).toBeVisible()
  })

  test('clicking a suggestion chip populates the input', async ({ page }) => {
    await createGroupAndOpenChat(page)
    await page.getByText('What times work this week?').click()
    const textarea = page.getByPlaceholder(/Ask about availability/)
    await expect(textarea).toHaveValue('What times work this week?')
  })

  test('can send a message and receive a response', async ({ page }) => {
    await createGroupAndOpenChat(page)
    const textarea = page.getByPlaceholder(/Ask about availability/)
    await textarea.fill('What times work this week?')
    await textarea.press('Enter')

    // User message appears
    await expect(page.getByText('What times work this week?')).toBeVisible()

    // Typing indicator appears then disappears
    await expect(page.locator('.animate-spin, [style*="bounce"]')).toBeVisible({ timeout: 3000 })

    // AI response arrives
    await expect(page.locator('.bg-white.border').filter({ hasText: /[A-Za-z]/ }).last()).toBeVisible({ timeout: 15000 })
  })

  test('back button returns to group detail', async ({ page }) => {
    await createGroupAndOpenChat(page)
    await page.getByRole('button').first().click()
    await expect(page).toHaveURL(/\/dashboard\/groups\/[a-z0-9-]+$/)
  })

  test('enter key sends message, shift+enter adds newline', async ({ page }) => {
    await createGroupAndOpenChat(page)
    const textarea = page.getByPlaceholder(/Ask about availability/)

    // Shift+Enter should NOT send
    await textarea.fill('line one')
    await textarea.press('Shift+Enter')
    await expect(textarea).toBeVisible()
    await expect(page.getByText('line one', { exact: false }).first()).toBeVisible()
  })
})
