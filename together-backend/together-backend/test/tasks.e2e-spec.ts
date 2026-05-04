// Destination: together-backend/together-backend/test/tasks.e2e-spec.ts
// REPLACE — titles meet the @Length(3, 100) constraint, and every
// POST asserts its expected status so a regression fails fast.
import { INestApplication, ValidationPipe } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { DataSource } from 'typeorm'
import request from 'supertest'
import { AppModule } from '../src/app.module'
import { Priority, TaskState } from '../src/tasks/entities/task.entity'

describe('Tasks (e2e, real Postgres)', () => {
  let app: INestApplication
  let ds:  DataSource
  let userId: string

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = module.createNestApplication()
    app.setGlobalPrefix('api')
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true, transform: true,
      transformOptions: { enableImplicitConversion: true },
    }))
    await app.init()

    ds = module.get(DataSource)
  })

  beforeEach(async () => {
    await ds.query('TRUNCATE TABLE comments    RESTART IDENTITY CASCADE')
    await ds.query('TRUNCATE TABLE tasks       RESTART IDENTITY CASCADE')
    await ds.query('TRUNCATE TABLE task_audit  RESTART IDENTITY CASCADE')
    await ds.query('TRUNCATE TABLE users       RESTART IDENTITY CASCADE')

    const [u] = await ds.query(`
      INSERT INTO users (email, "passwordHash", name, role, "avatarColor", initials)
      VALUES ('test@x.com','','Test User','owner','#000','TU')
      RETURNING id
    `)
    userId = u.id
  })

  afterAll(async () => app.close())

  // ── CRUD ───────────────────────────────────────────────────────
  it('POST /tasks creates a task', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/tasks')
      .send({ title: 'Buy milk', assigneeId: userId, priority: 'high' })
      .expect(201)
    expect(res.body.id).toBeDefined()
    expect(res.body.state).toBe('todo')
  })

  it('GET /tasks paginates and filters', async () => {
    for (let i = 0; i < 15; i++) {
      await request(app.getHttpServer()).post('/api/tasks')
        .send({
          title:      `Task number ${i}`,
          assigneeId: userId,
          priority:   i % 2 === 0 ? Priority.HIGH : Priority.LOW,
        })
        .expect(201)
    }
    const r1 = await request(app.getHttpServer())
      .get('/api/tasks?page=1&perPage=10').expect(200)
    expect(r1.body.items).toHaveLength(10)
    expect(r1.body.total).toBe(15)
    expect(r1.body.totalPages).toBe(2)

    const r2 = await request(app.getHttpServer())
      .get('/api/tasks?priority=high&perPage=100').expect(200)
    expect(r2.body.total).toBe(8)   // indices 0,2,4,6,8,10,12,14
  })

  it('PATCH /tasks/:id/state enforces the state machine', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/tasks')
      .send({ title: 'State machine task', assigneeId: userId, priority: 'low' })
      .expect(201)
    const id = created.body.id

    // todo → done is not allowed (must go via in_progress)
    await request(app.getHttpServer())
      .patch(`/api/tasks/${id}/state`).send({ newState: TaskState.DONE })
      .expect(400)

    // todo → in_progress is allowed
    await request(app.getHttpServer())
      .patch(`/api/tasks/${id}/state`).send({ newState: TaskState.IN_PROGRESS })
      .expect(200)
  })

  it('DELETE /tasks/:id cascades to comments via FK', async () => {
    const t = await request(app.getHttpServer())
      .post('/api/tasks')
      .send({ title: 'Task with comments', assigneeId: userId, priority: 'low' })
      .expect(201)
    const id = t.body.id

    await request(app.getHttpServer())
      .post(`/api/tasks/${id}/comments`).send({ body: 'first' }).expect(201)

    await request(app.getHttpServer())
      .delete(`/api/tasks/${id}`).expect(204)

    const [{ count }] = await ds.query(
      'SELECT COUNT(*)::INT FROM comments WHERE "taskId" = $1', [id],
    )
    expect(count).toBe(0)
  })

  // ── Trigger ────────────────────────────────────────────────────
  it('the task_audit trigger records every mutation', async () => {
    const t = await request(app.getHttpServer())
      .post('/api/tasks')
      .send({ title: 'Audited task', assigneeId: userId, priority: 'medium' })
      .expect(201)
    const id = t.body.id

    await request(app.getHttpServer())
      .patch(`/api/tasks/${id}`).send({ title: 'Renamed task' })
      .expect(200)
    await request(app.getHttpServer())
      .delete(`/api/tasks/${id}`)
      .expect(204)

    const rows = await ds.query(
      'SELECT action FROM task_audit WHERE task_id = $1 ORDER BY id ASC',
      [id],
    )
    expect(rows.map((r: { action: string }) => r.action))
      .toEqual(['INSERT', 'UPDATE', 'DELETE'])
  })

  // ── Stored procedure ──────────────────────────────────────────
  it('GET /stats/user/:id calls get_user_task_stats and returns the row', async () => {
    // 2 tasks left as todo, 1 walked through to done
    await request(app.getHttpServer()).post('/api/tasks')
      .send({ title: 'Alpha task', assigneeId: userId, priority: 'high' })
      .expect(201)
    await request(app.getHttpServer()).post('/api/tasks')
      .send({ title: 'Beta task',  assigneeId: userId, priority: 'high' })
      .expect(201)
    const c = await request(app.getHttpServer()).post('/api/tasks')
      .send({ title: 'Gamma task', assigneeId: userId, priority: 'low' })
      .expect(201)

    await request(app.getHttpServer())
      .patch(`/api/tasks/${c.body.id}/state`).send({ newState: TaskState.IN_PROGRESS })
      .expect(200)
    await request(app.getHttpServer())
      .patch(`/api/tasks/${c.body.id}/state`).send({ newState: TaskState.DONE })
      .expect(200)

    const r = await request(app.getHttpServer())
      .get(`/api/stats/user/${userId}`).expect(200)
    expect(r.body).toEqual({
      total: 3, done: 1, inProgress: 0, todo: 2, cancelled: 0, overdue: 0,
    })
  })
})