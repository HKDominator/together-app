/**
 * A Comment belongs to exactly one Task (1-to-many). Authors are
 * workspace users (u1 or u2). Kept minimal — no @mentions, no
 * rich text. That's where this scales next but not today.
 */
export interface Comment {
  id:        string
  taskId:    string
  authorId:  string
  body:      string
  createdAt: string   // ISO timestamp
  updatedAt: string   // ISO timestamp
}
