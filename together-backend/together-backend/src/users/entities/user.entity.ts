export type UserRole = 'owner' | 'partner'

export interface User {
  id:          string
  name:        string
  role:        UserRole
  avatarColor: string
  initials:    string
}
