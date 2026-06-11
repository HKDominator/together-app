// CR-13: TaskFormModal must stay open and surface errors when onSubmit rejects
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import TaskFormModal from '@/components/tasks/TaskFormModal'

vi.mock('@/context/TasksContext', () => ({
  useTasks: () => ({ users: [{ id: 'u1', name: 'Alice' }] }),
}))

function fillAndSubmit() {
  fireEvent.change(screen.getByLabelText(/task title/i), { target: { name: 'title', value: 'Buy groceries' } })
  fireEvent.change(screen.getByLabelText(/assign to/i),  { target: { name: 'assigneeId', value: 'u1' } })
  fireEvent.change(screen.getByLabelText(/priority/i),   { target: { name: 'priority',   value: 'medium' } })
  fireEvent.click(screen.getByRole('button', { name: /create task/i }))
}

describe('TaskFormModal error handling (CR-13)', () => {
  it('shows inline error and stays open when onSubmit rejects', async () => {
    const onClose  = vi.fn()
    const onSubmit = vi.fn().mockRejectedValue(new Error('Network error'))

    render(<TaskFormModal isOpen task={null} onClose={onClose} onSubmit={onSubmit} />)
    fillAndSubmit()

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())
    expect(screen.getByRole('alert')).toHaveTextContent('Network error')
    expect(onClose).not.toHaveBeenCalled()
  })

  it('calls onClose when onSubmit resolves', async () => {
    const onClose  = vi.fn()
    const onSubmit = vi.fn().mockResolvedValue(undefined)

    render(<TaskFormModal isOpen task={null} onClose={onClose} onSubmit={onSubmit} />)
    fillAndSubmit()

    await waitFor(() => expect(onClose).toHaveBeenCalledOnce())
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('clears the previous error when a new submit starts', async () => {
    const onClose  = vi.fn()
    // Second call returns a never-resolving promise so the modal stays in-flight.
    // This lets us assert that submitError was cleared before the await, not after.
    const onSubmit = vi.fn()
      .mockRejectedValueOnce(new Error('First failure'))
      .mockReturnValue(new Promise(() => {}))

    render(<TaskFormModal isOpen task={null} onClose={onClose} onSubmit={onSubmit} />)
    fillAndSubmit()

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('First failure'))

    // Trigger the second submit — fills required fields first so validation passes
    fireEvent.change(screen.getByLabelText(/task title/i), { target: { value: 'Buy groceries' } })
    fireEvent.change(screen.getByLabelText(/assign to/i),  { target: { value: 'u1' } })
    fireEvent.change(screen.getByLabelText(/priority/i),   { target: { value: 'medium' } })
    fireEvent.click(screen.getByRole('button', { name: /create task/i }))

    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull())
  })
})
