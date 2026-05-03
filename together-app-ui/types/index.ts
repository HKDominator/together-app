// ─────────────────────────────────────────────────────────────────────
// Destination: types/index.ts
// Gold A2 change: added `Comment` type. Everything else unchanged from
// the Silver version.
// ─────────────────────────────────────────────────────────────────────
export type Priority  = 'high' | 'medium' | 'low'
export type TaskState = 'todo' | 'in_progress' | 'done' | 'cancelled'
export type UserRole  = 'owner' | 'partner'

export interface User {
  id:          string
  name:        string
  role:        UserRole
  avatarColor: string
  initials:    string
}

export interface Task {
  id:          string
  title:       string
  description: string
  assigneeId:  string
  createdById: string
  priority:    Priority
  state:       TaskState
  dueDate:     string | null
  createdAt:   Date
  updatedAt:   Date
}

export interface Comment {
  id:        string
  taskId:    string
  authorId:  string
  body:      string
  createdAt: string
  updatedAt: string
}

export interface Workspace {
  name:  string
  users: User[]
  tasks: Task[]
}

export interface TaskFormData {
  title:       string
  description: string
  assigneeId:  string
  priority:    Priority | ''
  dueDate:     string
}

export interface ValidatedTaskData {
  title:       string
  description: string
  assigneeId:  string
  priority:    Priority
  dueDate:     string
}

export interface LoginFormData {
  email:    string
  password: string
}

export type ValidationErrors = {
  title?:       string
  description?: string
  assigneeId?:  string
  priority?:    string
  dueDate?:     string
  email?:       string
  password?:    string
}

export interface State {
  tasks:       Task[]
  users:       User[]
  currentUser: User
}
