import { test, expect } from '@playwright/test'

// ── Scenario 1: Create a task end-to-end ─────────────────────────────
test.describe('Create Task', () => {
  test('should create a new task and see it in the table', async ({ page }) => {
  await page.goto('/tasks')

  // Open modal
  await page.getByRole('button', { name: '＋ New Task' }).click()

  // Fill form
  await page.getByLabel(/task title/i).fill('My Playwright Task')
  await page.getByLabel(/description/i).fill('Created by Playwright test')
  await page.getByLabel(/assign to/i).selectOption({ index: 1 })
  await page.getByLabel(/priority/i).selectOption('high')

  // Submit
  await page.getByRole('button', { name: /create task/i }).click()

  // Wait for modal to close (robust)
  await expect(page.getByRole('heading', { name: /new task/i })).toHaveCount(0)

  // 🔥 Search instead of relying on pagination
  await page.getByPlaceholder('Search tasks…').fill('My Playwright Task')

  // Verify task appears
  await expect(page.getByText('My Playwright Task')).toBeVisible()
})

  test('should show validation errors when submitting empty form', async ({ page }) => {
    await page.goto('/tasks')
    await page.getByRole('button', { name: '＋ New Task' }).click()

    // Submit without filling anything
    await page.getByRole('button', { name: /create task/i }).click()

    // Errors should appear
    await expect(page.getByText(/title is required/i)).toBeVisible()
    await expect(page.getByText(/please select an assignee/i)).toBeVisible()
    await expect(page.getByText(/please select a priority/i)).toBeVisible()

    // Modal should still be open
    await expect(page.getByRole('heading', { name: /new task/i })).toBeVisible()
  })

// test('should close modal when cancel is clicked', async ({ page }) => {
//   await page.goto('/tasks')

//   // Open modal
//   await page.getByRole('button', { name: '＋ New Task' }).click()

//   // Wait for modal to appear
//   const modalTitle = page.getByRole('heading', { name: /new task/i })
//   await expect(modalTitle).toBeVisible()

//   // Wait for cancel button to be ready
//   const cancelBtn = page.getByRole('button', { name: /cancel/i })
//   await expect(cancelBtn).toBeVisible()
//   await expect(cancelBtn).toBeEnabled()

//   // Click cancel
//   await cancelBtn.click()

//   // Assert modal is gone (BEST PRACTICE)
//   await expect(modalTitle).toHaveCount(0)
// })
})

// ── Scenario 2: Filter tasks ──────────────────────────────────────────
test.describe('Filter Tasks', () => {
  test('should filter tasks by priority', async ({ page }) => {
    await page.goto('/tasks')

    // Select High priority
    const prioritySelect = page.getByRole('combobox').nth(1)
    await prioritySelect.selectOption('high')

    // Wait for UI to update (important!)
    await page.waitForTimeout(100) // or better: wait for condition below

    // Target ONLY table rows (real tasks)
    const rows = page.locator('.row-animate')

    // Ensure at least one row exists
    await expect(rows.first()).toBeVisible()

    // Check all rows contain "High"
    const highBadges = rows.locator('text=High')
    await expect(highBadges.first()).toBeVisible()

    // Ensure NO Medium or Low exist
    await expect(rows.locator('text=Medium')).toHaveCount(0)
    await expect(rows.locator('text=Low')).toHaveCount(0)
})

  test('should filter tasks by state chip', async ({ page }) => {
    await page.goto('/tasks')

    // Click Done filter chip
    await page.getByRole('button', { name: 'Done' }).click()

    // All visible rows should have Done status
    const doneChips = page.locator('text=Done ✓')
    const count = await doneChips.count()
    expect(count).toBeGreaterThan(0)
  })

  test('should search tasks by title', async ({ page }) => {
    await page.goto('/tasks')

    await page.getByPlaceholder('Search tasks…').fill('anniversary')

    // Should show the anniversary task
    await expect(page.getByText(/anniversary/i).first()).toBeVisible()

    // Should not show unrelated tasks
    await expect(page.getByText('Gym membership renewal')).not.toBeVisible()
  })
})

// ── Scenario 3: Task detail and state transition ──────────────────────
test.describe('Task Detail & State Transitions', () => {
  test('should navigate to task detail when clicking a row', async ({ page }) => {
    await page.goto('/tasks')

    // Click the first task row
    const firstRow = page.locator('[class*="row-animate"]').first()
    await firstRow.click()

    // Should be on detail page
    await expect(page).toHaveURL(/\/tasks\//)
    await expect(page.getByText('State Flow')).toBeVisible()
    await expect(page.getByText('Actions')).toBeVisible()
  })

  // test('should transition task from todo to in_progress', async ({ page }) => {
  //   await page.goto('/tasks')

  //   // Find a To Do task and click it
  //   const todoRow = page.locator('[class*="row-animate"]').filter({ hasText: 'To Do' }).first()
  //   await todoRow.click()

  //   // Should see Start Task button
  //   const startBtn = page.getByRole('button', { name: /start task/i })
  //   await expect(startBtn).toBeVisible()

  //   // Click it
  //   await startBtn.click()

  //   // Status should update to In Progress
  //   await expect(page.getByText('In Progress')).toBeVisible()
  //   await expect(startBtn).not.toBeVisible()
  // })

  test('should go back to tasks list from detail', async ({ page }) => {
    await page.goto('/tasks')

    const firstRow = page.locator('[class*="row-animate"]').first()
    await firstRow.click()

    await page.getByRole('button', { name: /back to tasks/i }).click()
    await expect(page).toHaveURL('/tasks')
    await expect(page.getByRole('heading', { name: 'Tasks' })).toBeVisible()
  })
})
