// Destination: together-backend/together-backend/src/database/seed.ts
// REPLACE — now seeds roles + permissions, hashes user passwords, and
// assigns Ana → admin, Dan → user.
import { NestFactory } from '@nestjs/core'
import { DataSource } from 'typeorm'
import * as bcrypt from 'bcrypt'
import { AppModule } from '../app.module'
import { UsersRepository } from '../users/users.repository'
import { TasksRepository } from '../tasks/tasks.repository'
import { CommentsRepository } from '../comments/comments.repository'
import { Priority, TaskState } from '../tasks/entities/task.entity'
import { runSqlBootstrap } from './sql-bootstrap'
import { Role } from '../auth/entities/role.entity'
import { Permission } from '../auth/entities/permission.entity'
import { User } from '../users/entities/user.entity'

const ALL_PERMISSIONS = [
  // Task domain
  ['task.create',  'Create tasks'],
  ['task.read',    'View tasks'],
  ['task.update',  'Edit tasks'],
  ['task.delete',  'Delete tasks'],
  // Comments
  ['comment.create', 'Comment on tasks'],
  ['comment.update', 'Edit comments'],
  ['comment.delete', 'Delete comments'],
  // Admin only
  ['user.manage',    'List/create/delete users'],
  ['log.view',       'View action logs'],          // used by Gold
  ['observation.view', 'View observation list'],   // used by Gold
] as const

const ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: ALL_PERMISSIONS.map(([n]) => n),
  user:  ['task.create', 'task.read', 'task.update',
          'comment.create', 'comment.update'],
}

async function run() {
  const app = await NestFactory.createApplicationContext(AppModule)

  const ds          = app.get(DataSource)
  const users       = app.get(UsersRepository)
  const tasks       = app.get(TasksRepository)
  const comments    = app.get(CommentsRepository)
  const userRepo    = ds.getRepository(User)
  const roleRepo    = ds.getRepository(Role)
  const permRepo    = ds.getRepository(Permission)

  await runSqlBootstrap(ds)

  // Wipe everything in FK-safe order.
  await comments.clear()
  await tasks.clear()
  await ds.query('TRUNCATE TABLE user_roles, role_permissions RESTART IDENTITY CASCADE')
  await ds.query('TRUNCATE TABLE roles, permissions RESTART IDENTITY CASCADE')
  await users.clear()

  // ── Permissions ──────────────────────────────────────────────
  const perms: Record<string, Permission> = {}
  for (const [name, description] of ALL_PERMISSIONS) {
    perms[name] = await permRepo.save(permRepo.create({ name, description }))
  }

  // ── Roles ────────────────────────────────────────────────────
  const roles: Record<string, Role> = {}
  for (const [name, permNames] of Object.entries(ROLE_PERMISSIONS)) {
    const role = roleRepo.create({
      name,
      description: name === 'admin' ? 'Full permissions' : 'Restricted permissions',
      permissions: permNames.map(n => perms[n]),
    })
    roles[name] = await roleRepo.save(role)
  }

  // ── Users (with hashed passwords + role assignments) ─────────
  const hashed = (pw: string) => bcrypt.hash(pw, 10)

  const ana = await userRepo.save(userRepo.create({
    email:               'ana@together.dev',
    passwordHash:        await bcrypt.hash('anaana123', 10),
    securityPinHash:     await bcrypt.hash('1234', 10),
    twoFactorEnabled:    true,
    threeFactorEnabled:  true,
    name:                'Ana Pop',
    role:                'owner',
    avatarColor:         '#C0392B',
    initials:            'AP',
    roles:               [roles.admin],
  }))

  const dan = await userRepo.save(userRepo.create({
    email:               'dan@together.dev',
    passwordHash:        await bcrypt.hash('dandan123', 10),
    securityPinHash:     '',
    twoFactorEnabled:    true,
    threeFactorEnabled:  false,
    name:                'Dan Ionescu',
    role:                'partner',
    avatarColor:         '#2980B9',
    initials:            'DI',
    roles:               [roles.user],
  }))

  // ── Tasks + comments ─────────────────────────────────────────
  const t1 = await tasks.insert({
    title: 'Book restaurant for anniversary 💍',
    description: 'Reserve table at Maison, request window table.',
    assigneeId: ana.id, createdById: ana.id,
    priority: Priority.HIGH, state: TaskState.TODO, dueDate: '2026-06-12',
  })
  const t2 = await tasks.insert({
    title: 'Renew car insurance',
    description: 'Compare quotes on Generali and Allianz.',
    assigneeId: dan.id, createdById: ana.id,
    priority: Priority.HIGH, state: TaskState.IN_PROGRESS, dueDate: '2026-06-20',
  })
  await tasks.insert({
    title: 'Plan Lisbon trip itinerary ✈️',
    description: 'Day-by-day plan for the long weekend.',
    assigneeId: ana.id, createdById: ana.id,
    priority: Priority.MEDIUM, state: TaskState.TODO, dueDate: '2026-07-02',
  })

  await comments.insert({ taskId: t1.id, authorId: dan.id, body: 'Did you confirm the window table? ❤️' })
  await comments.insert({ taskId: t1.id, authorId: ana.id, body: 'Yes — also asked about the vegetarian menu.' })
  await comments.insert({ taskId: t2.id, authorId: ana.id, body: 'Allianz came in €40 cheaper this year.' })

  console.log(`✅ Seeded:`)
  console.log(`   ${ALL_PERMISSIONS.length} permissions, 2 roles (admin, user)`)
  console.log(`   2 users:`)
  console.log(`     • ana@together.dev / anaana123 / PIN 1234   (admin, 3FA on)`)
  console.log(`     • dan@together.dev / dandan123              (user, 2FA only)`)
  console.log(`   3 tasks, 3 comments`)
  await app.close()
}

run().catch(err => { console.error(err); process.exit(1) })