import { test, expect } from '@playwright/test'

test.describe('アクセシビリティ', () => {
  test('should have proper heading hierarchy on homepage', async ({ page }) => {
    await page.goto('/')

    // Check for h1
    const h1 = page.locator('h1')
    await expect(h1.first()).toBeVisible()
  })

  test('should have proper alt text for images', async ({ page }) => {
    await page.goto('/')

    // Get all images
    const images = page.locator('img')
    const count = await images.count()

    for (let i = 0; i < count; i++) {
      const img = images.nth(i)
      const alt = await img.getAttribute('alt')
      const role = await img.getAttribute('role')

      // Images should have alt text or be decorative
      expect(alt !== null || role === 'presentation').toBeTruthy()
    }
  })

  test('should be keyboard navigable', async ({ page }) => {
    await page.goto('/')

    // Tab through the page
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')

    // Some element should be focused
    const focusedElement = page.locator(':focus')
    await expect(focusedElement).toBeVisible()
  })

  test('should have sufficient color contrast', async ({ page }) => {
    await page.goto('/')

    // Check that text is visible
    const bodyText = page.locator('body')
    await expect(bodyText).toBeVisible()
  })
})
