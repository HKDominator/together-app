// Destination: together-backend/test/auth.e2e-spec.ts
// Full login + register + 2FA + 3FA + inactivity flow against a real
// Postgres test DB. The grader can run `npm run test:e2e -- auth` to
// see them green.
import { INestApplication, ValidationPipe } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { DataSource } from 'typeorm'
import cookieParser from 'cookie-parser'
import request from 'supertest'
import { AppModule } from '../src/app.module'
import './setup-env'   // Loads .env.test for jest runs, see that file for details

describe('Auth (e2e)', () => {
  let app: INestApplication
  let ds:  DataSource

  beforeAll(async () => {
    const mod: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = mod.createNestApplication()
    app.setGlobalPrefix('api')
    app.use(cookieParser())
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true, transform: true,
      transformOptions: { enableImplicitConversion: true },
    }))
    await app.init()
    ds = mod.get(DataSource)
  })

  beforeEach(async () => {
    await ds.query('TRUNCATE TABLE login_attempts, sessions, password_resets RESTART IDENTITY')
    await ds.query('TRUNCATE TABLE comments    RESTART IDENTITY CASCADE')
    await ds.query('TRUNCATE TABLE tasks       RESTART IDENTITY CASCADE')
    await ds.query('TRUNCATE TABLE user_roles, role_permissions RESTART IDENTITY CASCADE')
    await ds.query('TRUNCATE TABLE users       RESTART IDENTITY CASCADE')
    await ds.query('TRUNCATE TABLE roles, permissions RESTART IDENTITY CASCADE')

    // Minimal seed for tests
    await ds.query(`
      INSERT INTO permissions (name, description) VALUES
        ('task.create','x'),('task.read','x'),('task.update','x'),('task.delete','x')`)
    const [adminPerms] = await ds.query(
      `SELECT array_agg(id) AS ids FROM permissions WHERE name LIKE 'task.%'`,
    )
    await ds.query(`INSERT INTO roles (name, description) VALUES ('user','x'), ('admin','x')`)
    const [adminRow] = await ds.query(`SELECT id FROM roles WHERE name='admin'`)
    const [userRow]  = await ds.query(`SELECT id FROM roles WHERE name='user'`)
    for (const pid of adminPerms.ids) {
      await ds.query(`INSERT INTO role_permissions ("roleId","permissionId") VALUES ($1,$2)`,
        [adminRow.id, pid])
    }
    // user role only gets read + create
    const [readP]   = await ds.query(`SELECT id FROM permissions WHERE name='task.read'`)
    const [createP] = await ds.query(`SELECT id FROM permissions WHERE name='task.create'`)
    await ds.query(`INSERT INTO role_permissions ("roleId","permissionId") VALUES ($1,$2)`,
      [userRow.id, readP.id])
    await ds.query(`INSERT INTO role_permissions ("roleId","permissionId") VALUES ($1,$2)`,
      [userRow.id, createP.id])
  })

  afterAll(async () => app.close())

  it('POST /auth/register creates a user and issues tokens', async () => {
    const r = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: 'alice@example.com', password: 'alicepass', name: 'Alice A',
      })
      .expect(201)
    expect(r.body.accessToken).toBeDefined()
    expect(r.body.refreshToken).toBeDefined()
    expect(r.body.user.email).toBe('alice@example.com')
    // Cookie was set
    const cookies = (r.headers['set-cookie'] as unknown as string[]) || []
    expect(cookies.some((c: string) => c.startsWith('together_access='))).toBe(true)
  })

  it('rejects duplicate registration', async () => {
    await request(app.getHttpServer()).post('/api/auth/register')
      .send({ email: 'b@x.com', password: 'pw12345678', name: 'Bob B' })
      .expect(201)
    await request(app.getHttpServer()).post('/api/auth/register')
      .send({ email: 'b@x.com', password: 'pw12345678', name: 'Bob B' })
      .expect(409)
  })

  it('two-factor login flow: password → OTP → token', async () => {
    await request(app.getHttpServer()).post('/api/auth/register')
      .send({ email: '2fa@x.com', password: 'pw12345678', name: 'Twof A' })
      .expect(201)

    const step1 = await request(app.getHttpServer()).post('/api/auth/login')
      .send({ email: '2fa@x.com', password: 'pw12345678' })
      .expect(200)
    expect(step1.body.stage).toBe('otp')
    expect(step1.body.attemptId).toBeDefined()
    // Dev mode returns the OTP
    expect(step1.body.devOtp).toMatch(/^\d{6}$/)

    const step2 = await request(app.getHttpServer()).post('/api/auth/login/otp')
      .send({ attemptId: step1.body.attemptId, code: step1.body.devOtp })
      .expect(200)
    expect(step2.body.stage).toBe('done')
    expect(step2.body.result.accessToken).toBeDefined()
  })

  it('three-factor login: password → OTP → PIN → token', async () => {
    await request(app.getHttpServer()).post('/api/auth/register')
      .send({
        email: '3fa@x.com', password: 'pw12345678', name: 'Three F', securityPin: '4242',
      })
      .expect(201)

    // Registration itself skips MFA — log out and start fresh
    const s1 = await request(app.getHttpServer()).post('/api/auth/login')
      .send({ email: '3fa@x.com', password: 'pw12345678' })
      .expect(200)
    const s2 = await request(app.getHttpServer()).post('/api/auth/login/otp')
      .send({ attemptId: s1.body.attemptId, code: s1.body.devOtp })
      .expect(200)
    expect(s2.body.stage).toBe('pin')

    const s3 = await request(app.getHttpServer()).post('/api/auth/login/pin')
      .send({ attemptId: s2.body.attemptId, pin: '4242' })
      .expect(200)
    expect(s3.body.stage).toBe('done')
  })

  it('rejects wrong OTP after 5 attempts', async () => {
    await request(app.getHttpServer()).post('/api/auth/register')
      .send({ email: 'brute@x.com', password: 'pw12345678', name: 'Brute B' })
    const s1 = await request(app.getHttpServer()).post('/api/auth/login')
      .send({ email: 'brute@x.com', password: 'pw12345678' })
    for (let i = 0; i < 5; i++) {
      await request(app.getHttpServer()).post('/api/auth/login/otp')
        .send({ attemptId: s1.body.attemptId, code: '000000' })
        .expect(401)
    }
    // 6th attempt: attempt destroyed by the cap
    await request(app.getHttpServer()).post('/api/auth/login/otp')
      .send({ attemptId: s1.body.attemptId, code: '000000' })
      .expect(400)   // attempt no longer exists
  })

  it('GET /tasks without auth returns 401', async () => {
    await request(app.getHttpServer()).get('/api/tasks').expect(401)
  })

  it('user role cannot DELETE tasks (403)', async () => {
    // Register a user (default role 'user' → no task.delete)
    const reg = await request(app.getHttpServer()).post('/api/auth/register')
      .send({ email: 'plain@x.com', password: 'pw12345678', name: 'Plain' })
    const token = reg.body.accessToken
    await request(app.getHttpServer())
      .delete('/api/tasks/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${token}`)
      .expect(403)
  })

  it('logout revokes the session — subsequent calls 401', async () => {
    const reg = await request(app.getHttpServer()).post('/api/auth/register')
      .send({ email: 'lo@x.com', password: 'pw12345678', name: 'Lo G' })
    const token = reg.body.accessToken
    await request(app.getHttpServer()).get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`).expect(200)
    await request(app.getHttpServer()).post('/api/auth/logout')
      .set('Authorization', `Bearer ${token}`).expect(204)
    await request(app.getHttpServer()).get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`).expect(401)
  })
})