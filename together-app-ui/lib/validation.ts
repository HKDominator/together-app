import { LoginFormData, TaskFormData, ValidationErrors } from "@/types"

const EMAIL_RE         = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const VALID_PRIORITIES = ['high', 'medium', 'low']

export type ValidationMode = 'create' | 'edit'

/**
 * Validates task form data.
 * `dueDate in the past` is only an error on CREATE — on EDIT, a task may
 * have been created with a future date that has since passed.
 */
export function validateTask(
  data: Partial<TaskFormData>,
  mode: ValidationMode = 'create',
): ValidationErrors {
  const errors: ValidationErrors = {}

  

  // ── Title ────────────────────────────────────────────────────
  const title = (data.title ?? '').trim()
  if (!title)                 errors.title = 'Title is required'
  else if (title.length < 3)  errors.title = 'Title must be at least 3 characters'
  else if (title.length > 100) errors.title = 'Title must be under 100 characters'

  // ── Description (optional) ───────────────────────────────────
  if (data.description && data.description.length > 500) {
    errors.description = 'Description must be under 500 characters'
  }

  // ── Assignee ─────────────────────────────────────────────────
  if (!data.assigneeId) errors.assigneeId = 'Please select an assignee'

  // ── Priority ─────────────────────────────────────────────────
  if (!data.priority || !VALID_PRIORITIES.includes(data.priority)) {
    errors.priority = 'Please select a priority'
  }

  // ── Due date (create-only check) ─────────────────────────────
  if (data.dueDate && mode === 'create') {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const due = new Date(data.dueDate)
    if (due < today) errors.dueDate = 'Due date must be today or in the future'
  }

  return errors
}

/**
 * Validates login form data.
 */
export function validateLogin(data: Partial<LoginFormData>): ValidationErrors {
  const errors: ValidationErrors = {}
  if (!data.email || !EMAIL_RE.test(data.email)) {
    errors.email = 'Please enter a valid email address'
  }
  if (!data.password || data.password.length < 8) {
    errors.password = 'Password must be at least 8 characters'
  }
  return errors
}

/**
 * True when the errors object has no keys.
 */
export function isValid(errors: ValidationErrors): boolean {
  return Object.keys(errors).length === 0
}