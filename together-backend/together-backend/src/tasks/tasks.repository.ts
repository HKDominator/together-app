import { Injectable } from '@nestjs/common'
import { v4 as uuid } from 'uuid'
import { Task, Priority, TaskState } from './entities/task.entity'

/**
 * Pure in-memory storage of Task entities.
 *
 * Per the Bronze requirements of SDI Assignment 2:
 *   "the information will be stored solely in the RAM of the server
 *    machine (e.g. lists or dictionaries containing entities)
 *    NO PERSISTENCY OF ANY KIND!!!"
 *
 * A single instance lives for the process lifetime — tasks reset on
 * every restart. That's intentional.
 */
@Injectable()
export class TasksRepository {
  private readonly store: Map<string, Task> = new Map()

  constructor() {
    SEED_TASKS.forEach(t => this.store.set(t.id, { ...t }))
  }

  findAll(): Task[] {
    return Array.from(this.store.values())
  }

  findById(id: string): Task | undefined {
    return this.store.get(id)
  }

  insert(draft: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Task {
    const now = new Date().toISOString()
    const task: Task = { ...draft, id: uuid(), createdAt: now, updatedAt: now }
    this.store.set(task.id, task)
    return task
  }

  update(id: string, patch: Partial<Omit<Task, 'id' | 'createdAt' | 'createdById'>>): Task | undefined {
    const current = this.store.get(id)
    if (!current) return undefined

    const next: Task = {
      ...current,
      ...patch,
      id:          current.id,
      createdAt:   current.createdAt,
      createdById: current.createdById,
      updatedAt:   new Date().toISOString(),
    }
    this.store.set(id, next)
    return next
  }

  remove(id: string): boolean {
    return this.store.delete(id)
  }

  clear(): void {
    this.store.clear()
  }

  size(): number {
    return this.store.size
  }
}

const iso = (s: string) => new Date(s).toISOString()

const SEED_TASKS: Task[] = [
  { id: 't1', title: 'Book restaurant for anniversary 💍', description: 'Reserve table at Maison, confirm vegetarian menu option and request window table.', assigneeId: 'u1', createdById: 'u1', priority: Priority.HIGH,   state: TaskState.TODO,        dueDate: '2026-04-12', createdAt: iso('2026-03-08'), updatedAt: iso('2026-03-08') },
  { id: 't2', title: 'Renew car insurance',                description: 'Compare quotes on Generali and Allianz before the renewal deadline.',                assigneeId: 'u2', createdById: 'u1', priority: Priority.HIGH,   state: TaskState.IN_PROGRESS, dueDate: '2026-04-20', createdAt: iso('2026-03-05'), updatedAt: iso('2026-03-10') },
  { id: 't3', title: 'Plan Lisbon trip itinerary ✈️',       description: 'Day-by-day plan for the April long weekend trip.',                                   assigneeId: 'u1', createdById: 'u1', priority: Priority.MEDIUM, state: TaskState.TODO,        dueDate: '2026-04-02', createdAt: iso('2026-03-01'), updatedAt: iso('2026-03-01') },
  { id: 't4', title: 'Buy birthday gift for Mum',          description: 'She mentioned wanting a cookbook. Check Humanitas or order online.',                 assigneeId: 'u1', createdById: 'u2', priority: Priority.MEDIUM, state: TaskState.TODO,        dueDate: '2026-04-22', createdAt: iso('2026-03-12'), updatedAt: iso('2026-03-12') },
  { id: 't5', title: 'Update apartment rental contract',   description: 'Send signed copy to landlord by end of month.',                                      assigneeId: 'u2', createdById: 'u1', priority: Priority.HIGH,   state: TaskState.DONE,        dueDate: '2026-03-31', createdAt: iso('2026-03-01'), updatedAt: iso('2026-03-28') },
  { id: 't6', title: 'Weekly grocery run 🛒',              description: "Don't forget oat milk and coffee pods.",                                              assigneeId: 'u1', createdById: 'u1', priority: Priority.LOW,    state: TaskState.DONE,        dueDate: '2026-03-15', createdAt: iso('2026-03-13'), updatedAt: iso('2026-03-15') },
  { id: 't7', title: 'Set up emergency savings goal',      description: 'Open joint savings account, first transfer by Mar 30.',                              assigneeId: 'u2', createdById: 'u2', priority: Priority.MEDIUM, state: TaskState.TODO,        dueDate: '2026-03-30', createdAt: iso('2026-03-01'), updatedAt: iso('2026-03-01') },
  { id: 't8', title: 'Gym membership renewal',             description: 'Check if the Together discount is still valid.',                                      assigneeId: 'u2', createdById: 'u2', priority: Priority.LOW,    state: TaskState.IN_PROGRESS, dueDate: '2026-04-15', createdAt: iso('2026-03-10'), updatedAt: iso('2026-03-10') },
  { id: 't9', title: 'Fix the bathroom tap',               description: 'Call the plumber or check if it can be DIY fixed.',                                  assigneeId: 'u2', createdById: 'u1', priority: Priority.MEDIUM, state: TaskState.CANCELLED,   dueDate: null,         createdAt: iso('2026-03-02'), updatedAt: iso('2026-03-05') },
]
