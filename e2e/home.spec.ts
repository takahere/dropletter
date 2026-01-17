import { test, expect } from '@playwright/test'

test.describe('ホームページ', () => {
  test('should load the homepage', async ({ page }) => {
    await page.goto('/')

    // Check for main elements
    await expect(page).toHaveTitle(/DropLetter/)
  })

  test('should have navigation elements', async ({ page }) => {
    await page.goto('/')

    // Check for logo/brand
    await expect(page.locator('text=DropLetter').first()).toBeVisible()
  })

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')

    // Page should still be visible and usable
    await expect(page).toHaveTitle(/DropLetter/)
  })
})

test.describe('認証フロー', () => {
  test('should redirect to login for protected routes', async ({ page }) => {
    await page.goto('/history')

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/)
  })

  test('should show login page', async ({ page }) => {
    await page.goto('/login')

    // Check for login form elements
    await expect(page.locator('text=ログイン').first()).toBeVisible()
  })
})

test.describe('エラーハンドリング', () => {
  test('should show 404 page for invalid routes', async ({ page }) => {
    const response = await page.goto('/this-page-does-not-exist-12345')

    // Should get a 404 response
    expect(response?.status()).toBe(404)
  })
})
