'use client'
import { useState, useEffect, ChangeEvent, FormEvent } from 'react'
import { validateTask, isValid } from '@/lib/validation'
import FormInput from '@/components/ui/FormInput'
import { Task, TaskFormData, ValidatedTaskData, ValidationErrors } from '@/types'
import { useTasks } from '@/context/TasksContext'

interface Props {
  isOpen:   boolean
  task?:    Task | null
  onClose:  () => void
  onSubmit: (data: ValidatedTaskData) => void
}

type FormElement = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement

const EMPTY: TaskFormData = { title: '', description: '', assigneeId: '', priority: '', dueDate: '' }

function taskToForm(task: Task | null | undefined): TaskFormData {
  if (!task) return EMPTY
  return {
    title:       task.title       ?? '',
    description: task.description ?? '',
    assigneeId:  task.assigneeId  ?? '',
    priority:    task.priority    ?? '',
    dueDate:     task.dueDate     ?? '',
  }
}

export default function TaskFormModal({ isOpen, task, onClose, onSubmit }: Props) {
  const [form,   setForm]   = useState<TaskFormData>(() => taskToForm(task))
  const [errors, setErrors] = useState<ValidationErrors>({})

  const mode = task ? 'edit' : 'create'
  const users = useTasks().users

  // Sync form state whenever we open OR the task prop changes.
  useEffect(() => {
    if (!isOpen) return
    queueMicrotask(() => {
      setForm(taskToForm(task))
      setErrors({})
    })
  }, [task, isOpen])

  if (!isOpen) return null

  function handleChange(e: ChangeEvent<FormElement>) {
    const { name, value } = e.target
    const key = name as keyof ValidationErrors
    setForm(prev => ({ ...prev, [key]: value }))
    // Clear the error for this field on change — user is actively editing it.
    if (errors[key]) {
      setErrors(prev => ({ ...prev, [key]: undefined }))
    }
  }

  function handleBlur(e: ChangeEvent<FormElement>) {
    const { name } = e.target
    const key = name as keyof ValidationErrors
    const fieldErrors = validateTask(form, mode)
    if (fieldErrors[key]) {
      setErrors(prev => ({ ...prev, [key]: fieldErrors[key] }))
    }
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const errs = validateTask(form, mode)
    if (!isValid(errs)) { setErrors(errs); return }
    onSubmit({ ...form, title: form.title.trim(), priority: form.priority as Task['priority'] })
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(26,37,51,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-3xl p-10 w-full max-w-md shadow-2xl">
        <h2 className="font-display text-2xl font-bold text-gray-700 mb-7">
          {mode === 'create' ? '✎ New Task' : '✎ Edit Task'}
        </h2>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">

          <FormInput
            label="Task title *"
            id="title"
            name="title"
            value={form.title}
            onChange={handleChange}
            onBlur={handleBlur}
            error={errors.title}
            placeholder="What needs to be done?"
            maxLength={100}
          />

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="description" className="text-xs font-semibold uppercase tracking-wide text-gray-700">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              value={form.description}
              onChange={handleChange}
              onBlur={handleBlur}
              maxLength={500}
              placeholder="Any details, links, or notes…"
              className={`w-full rounded-lg border px-4 py-3 text-sm text-gray-700 outline-none resize-none transition-colors
                focus:ring-2 focus:ring-cr-pale
                ${errors.description ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-white focus:border-cr'}`}
            />
            <div className="flex justify-between">
              {errors.description && <p className="text-xs text-red-600">{errors.description}</p>}
              <p className="text-xs text-gray-400 ml-auto">{form.description.length}/500</p>
            </div>
          </div>

          {/* Assignee + Priority side by side */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="assigneeId" className="text-xs font-semibold uppercase tracking-wide text-gray-700">
                Assign to *
              </label>
              <select
                id="assigneeId"
                name="assigneeId"
                value={form.assigneeId}
                onChange={handleChange}
                onBlur={handleBlur}
                className={`w-full rounded-lg border px-4 py-3 text-sm text-gray-700 outline-none bg-white transition-colors
                  focus:ring-2 focus:ring-cr-pale
                  ${errors.assigneeId ? 'border-red-400 bg-red-50' : 'border-gray-200 focus:border-cr'}`}
              >
                <option value="">Select…</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
              {errors.assigneeId && <p className="text-xs text-red-600">{errors.assigneeId}</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="priority" className="text-xs font-semibold uppercase tracking-wide text-gray-700">
                Priority *
              </label>
              <select
                id="priority"
                name="priority"
                value={form.priority}
                onChange={handleChange}
                onBlur={handleBlur}
                className={`w-full rounded-lg border px-4 py-3 text-sm text-gray-700 outline-none bg-white transition-colors
                  focus:ring-2 focus:ring-cr-pale
                  ${errors.priority ? 'border-red-400 bg-red-50' : 'border-gray-200 focus:border-cr'}`}
              >
                <option value="">Select…</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
              {errors.priority && <p className="text-xs text-red-600">{errors.priority}</p>}
            </div>
          </div>

          <FormInput
            label="Due date"
            id="dueDate"
            name="dueDate"
            type="date"
            value={form.dueDate}
            onChange={handleChange}
            onBlur={handleBlur}
            error={errors.dueDate}
          />

          <div className="flex gap-3 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 rounded-lg border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-lg text-white text-sm font-semibold transition-all hover:-translate-y-0.5"
              style={{ background: '#C0392B', boxShadow: '0 3px 12px rgba(192,57,43,0.3)' }}
            >
              {mode === 'create' ? 'Create Task' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}