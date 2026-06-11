// Destination: together-backend/together-backend/src/database/seed-big.ts
//
// Bulk seeder for the Gold demo. Defaults:
//   USERS=200  TAGS=50  TASKS=50000  COMMENTS=30000  TAGS_PER_TASK=3
//
// Preserves Ana and Dan (the canonical demo accounts) — wipes
// everyone else. Designed to make the JMeter naive-vs-sql comparison
// dramatic: at these volumes the naive endpoint is 15-30s per request
// where sql is sub-second.
//
// Usage:
//   USERS=200 TASKS=50000 npm run seed:big
import { NestFactory } from '@nestjs/core'
import { DataSource } from 'typeorm'
import { faker } from '@faker-js/faker'
import * as bcrypt from 'bcrypt'
import { AppModule } from '../app.module'
import { User } from '../users/entities/user.entity'
import { Task, Priority, TaskState } from '../tasks/entities/task.entity'
import { Tag } from '../tags/entities/tag.entity'
import { TaskTag } from '../tags/entities/task-tag.entity'
import { Role } from '../auth/entities/role.entity'
import { runSqlBootstrap } from './sql-bootstrap'

const N_USERS         = Number(process.env.USERS         ?? 200)
const N_TAGS          = Number(process.env.TAGS          ?? 50)
const N_TASKS         = Number(process.env.TASKS         ?? 50_000)
const TAGS_PER_TASK   = Number(process.env.TAGS_PER_TASK ?? 3)
const BATCH_SIZE      = 1_000

// Couples-flavoured tag pool. We sample without replacement until we
// hit N_TAGS; if N_TAGS > pool size, we pad with generated names.
const SEED_TAGS = [
  'groceries', 'errands', 'date-night', 'household', 'finance', 'travel',
  'cooking', 'cleaning', 'family', 'pets', 'health', 'gifts', 'home-improvement',
  'birthday', 'anniversary', 'vacation', 'workout', 'meal-prep', 'budget',
  'rent', 'bills', 'maintenance', 'laundry', 'kids', 'in-laws', 'friends',
  'school', 'doctor', 'car', 'subscription', 'urgent', 'someday', 'romantic',
  'quick-win', 'project', 'reading', 'movies', 'restaurant', 'weekend', 'morning',
  'evening', 'thursday', 'recurring', 'one-off', 'shared', 'mine', 'theirs',
  'celebration', 'planning', 'admin',
] as const

const STATE_WEIGHTS: Array<[TaskState, number]> = [
  [TaskState.TODO,        0.35],
  [TaskState.IN_PROGRESS, 0.20],
  [TaskState.DONE,        0.35],
  [TaskState.CANCELLED,   0.10],
]
const PRIORITY_WEIGHTS: Array<[Priority, number]> = [
  [Priority.HIGH,   0.20],
  [Priority.MEDIUM, 0.55],
  [Priority.LOW,    0.25],
]

function weighted<T>(weights: Array<[T, number]>): T {
  let r = Math.random()
  for (const [v, w] of weights) { r -= w; if (r <= 0) return v }
  return weights[weights.length - 1][0]
}

async function run() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`Gold-tier bulk seed:`)
  console.log(`  USERS=${N_USERS}  TAGS=${N_TAGS}  TASKS=${N_TASKS}  TAGS_PER_TASK=${TAGS_PER_TASK}`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  const app = await NestFactory.createApplicationContext(AppModule)
  const ds  = app.get(DataSource)
  await runSqlBootstrap(ds)

  const userRepo = ds.getRepository(User)
  const taskRepo = ds.getRepository(Task)
  const tagRepo  = ds.getRepository(Tag)
  const roleRepo = ds.getRepository(Role)

  // ── Wipe everyone except Ana / Dan ──────────────────────────
  console.log('• Wiping seeded data (preserving Ana + Dan)…')
  await ds.query(`DELETE FROM task_tags`)
  await ds.query(`DELETE FROM tasks`)
  await ds.query(`DELETE FROM tags`)
  await ds.query(`
    DELETE FROM users
    WHERE email NOT IN ('ana@together.dev', 'dan@together.dev')
  `)

  const ana = await userRepo.findOne({ where: { email: 'ana@together.dev' } })
  const dan = await userRepo.findOne({ where: { email: 'dan@together.dev' } })
  const userRole = await roleRepo.findOne({ where: { name: 'user' } })
  if (!ana || !dan || !userRole) {
    throw new Error('Run `npm run seed` first to create Ana, Dan, and roles.')
  }

  // ── Users ────────────────────────────────────────────────────
  console.log(`• Creating ${N_USERS} faker users…`)
  const passwordHash = await bcrypt.hash('FakerSeed!42', 10)
  const userRows: User[] = []

  for (let i = 0; i < N_USERS; i++) {
    const first = faker.person.firstName()
    const last  = faker.person.lastName()
    const u = userRepo.create({
      email:        `seed${i}_${faker.string.alphanumeric(6).toLowerCase()}@bots.local`,
      passwordHash,
      name:         `${first} ${last}`,
      coupleRole:   'partner',
      avatarColor:  faker.color.rgb(),
      initials:     (first[0] + last[0]).toUpperCase(),
      twoFactorEnabled:   false,
      threeFactorEnabled: false,
    })
    userRows.push(u)
  }
  const savedUsers = await userRepo.save(userRows, { chunk: 500 })
  // Bulk-attach the 'user' role.
  const userRoleRows = savedUsers.map(u => `('${u.id}','${userRole.id}')`).join(',')
  if (userRoleRows) {
    await ds.query(`INSERT INTO user_roles ("userId","roleId") VALUES ${userRoleRows}`)
  }

  const allUsers = [...savedUsers, ana, dan]
  console.log(`  ✓ ${allUsers.length} total users in DB`)

  // ── Tags ─────────────────────────────────────────────────────
  console.log(`• Creating ${N_TAGS} tags…`)
  const tagNames = new Set<string>()
  let idx = 0
  while (tagNames.size < N_TAGS) {
    tagNames.add(idx < SEED_TAGS.length
      ? SEED_TAGS[idx]
      : `${faker.word.adjective()}-${faker.word.noun()}-${idx}`)
    idx++
  }
  const tagRows = [...tagNames].map(name => tagRepo.create({
    name, color: faker.color.rgb(), kind: faker.helpers.arrayElement(['category', 'context']),
  }))
  const savedTags = await tagRepo.save(tagRows)
  console.log(`  ✓ ${savedTags.length} tags`)

  // ── Tasks + task_tags ────────────────────────────────────────
  console.log(`• Creating ${N_TASKS} tasks (in batches of ${BATCH_SIZE})…`)
  const total = N_TASKS
  let created = 0

  for (let b = 0; b < total; b += BATCH_SIZE) {
    const batchSize = Math.min(BATCH_SIZE, total - b)
    const batch: Task[] = []
    for (let i = 0; i < batchSize; i++) {
      const assignee = faker.helpers.arrayElement(allUsers)
      const creator  = faker.helpers.arrayElement(allUsers)
      const createdAt = faker.date.recent({ days: 120 })
      const updatedAt = faker.date.between({ from: createdAt, to: new Date() })
      batch.push(taskRepo.create({
        title:       faker.lorem.sentence({ min: 3, max: 8 }).slice(0, 100),
        description: faker.lorem.paragraph().slice(0, 500),
        assigneeId:  assignee.id,
        createdById: creator.id,
        priority:    weighted(PRIORITY_WEIGHTS),
        state:       weighted(STATE_WEIGHTS),
        dueDate:     Math.random() < 0.6
          ? faker.date.future({ years: 0.5 }).toISOString().slice(0, 10)
          : null,
        createdAt,
        updatedAt,
      }))
    }
    const savedTasks = await taskRepo.save(batch, { chunk: 500 })

    // Bulk-insert M:M rows: pick TAGS_PER_TASK random tags per task.
    const ttRows: string[] = []
    for (const tk of savedTasks) {
      const pickCount = Math.max(1, Math.round(TAGS_PER_TASK + (Math.random() - 0.5) * 2))
      const picked = faker.helpers.arrayElements(savedTags, Math.min(pickCount, savedTags.length))
      for (const t of picked) {
        ttRows.push(`('${tk.id}','${t.id}','${tk.assigneeId}',NOW())`)
      }
    }
    if (ttRows.length > 0) {
      // Multi-row insert — much faster than per-row save().
      // ON CONFLICT in case dedup ever matters.
      await ds.query(`
        INSERT INTO task_tags ("taskId","tagId","addedByUserId","addedAt")
        VALUES ${ttRows.join(',')}
        ON CONFLICT DO NOTHING
      `)
    }

    created += savedTasks.length
    process.stdout.write(`\r  ✓ ${created} / ${total} tasks   `)
  }
  process.stdout.write('\n')

  // ── Refresh matview ──────────────────────────────────────────
  console.log('• Refreshing mv_tag_affinity…')
  await ds.query('REFRESH MATERIALIZED VIEW mv_tag_affinity')

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('Bulk seed done. Try:')
  console.log('  time curl -s -b cookies.txt http://localhost:3001/api/stats/tag-affinity/naive | wc -c')
  console.log('  time curl -s -b cookies.txt http://localhost:3001/api/stats/tag-affinity/sql   | wc -c')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  await app.close()
}

run().catch(err => { console.error(err); process.exit(1) })