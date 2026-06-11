// BUG-03 / identity wire: CommentsService must use the caller's id for
// authorship and ownership checks, not resolveDefaultAuthor().
// BUG-33: CommentsService must emit WS events after each mutation.
import { Test, TestingModule } from '@nestjs/testing'
import { ForbiddenException, NotFoundException } from '@nestjs/common'
import { CommentsService } from './comments.service'
import { CommentsRepository } from './comments.repository'
import { TasksRepository } from '../tasks/tasks.repository'
import { UsersService } from '../users/users.service'
import { TasksGateway } from '../tasks/tasks.gateway'
import { Comment } from './entities/comment.entity'

const makeComment = (over: Partial<Comment> = {}): Comment => ({
  id: 'c-1', taskId: 't-1', authorId: 'u-author',
  body: 'hello', createdAt: new Date(), updatedAt: new Date(),
  ...over,
})

describe('CommentsService (unit, identity wire)', () => {
  let service:  CommentsService
  let repo:     jest.Mocked<CommentsRepository>
  let tasksR:   jest.Mocked<TasksRepository>
  let gateway:  jest.Mocked<TasksGateway>

  beforeEach(async () => {
    const repoMock = {
      findByTask:       jest.fn(),
      findById:         jest.fn(),
      countByTask:      jest.fn(),
      insert:           jest.fn(),
      update:           jest.fn(),
      remove:           jest.fn(),
      removeAllForTask: jest.fn(),
    } as unknown as jest.Mocked<CommentsRepository>

    const tasksRepoMock = {
      findById: jest.fn().mockResolvedValue({ id: 't-1' }),
    } as unknown as jest.Mocked<TasksRepository>

    const usersServiceMock = {} as jest.Mocked<UsersService>

    const gatewayMock = {
      emitCommentCreated: jest.fn(),
      emitCommentUpdated: jest.fn(),
      emitCommentDeleted: jest.fn(),
    } as unknown as jest.Mocked<TasksGateway>

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommentsService,
        { provide: CommentsRepository, useValue: repoMock },
        { provide: TasksRepository,    useValue: tasksRepoMock },
        { provide: UsersService,       useValue: usersServiceMock },
        { provide: TasksGateway,       useValue: gatewayMock },
      ],
    }).compile()

    service = module.get(CommentsService)
    repo    = module.get(CommentsRepository) as jest.Mocked<CommentsRepository>
    tasksR  = module.get(TasksRepository)    as jest.Mocked<TasksRepository>
    gateway = module.get(TasksGateway)       as jest.Mocked<TasksGateway>
  })

  // ── create ────────────────────────────────────────────────────────
  describe('create()', () => {
    it('uses the caller id as authorId (BUG-03)', async () => {
      repo.insert.mockImplementation(async (d) => makeComment(d as Partial<Comment>))
      await service.create('t-1', { body: 'hi' }, 'caller-uuid')
      expect(repo.insert).toHaveBeenCalledWith(
        expect.objectContaining({ authorId: 'caller-uuid' }),
      )
    })
  })

  // ── update ────────────────────────────────────────────────────────
  describe('update()', () => {
    it('throws Forbidden when caller is not the author', async () => {
      repo.findById.mockResolvedValue(makeComment({ authorId: 'u-author' }))
      await expect(service.update('c-1', { body: 'new' }, 'different-user'))
        .rejects.toBeInstanceOf(ForbiddenException)
    })

    it('allows the author to edit their own comment', async () => {
      repo.findById.mockResolvedValue(makeComment({ authorId: 'u-author' }))
      repo.update.mockResolvedValue(makeComment({ body: 'edited' }))
      const r = await service.update('c-1', { body: 'edited' }, 'u-author')
      expect(r.body).toBe('edited')
    })
  })

  // ── remove ────────────────────────────────────────────────────────
  describe('remove()', () => {
    it('throws Forbidden when caller is not the author', async () => {
      repo.findById.mockResolvedValue(makeComment({ authorId: 'u-author' }))
      await expect(service.remove('c-1', 'different-user'))
        .rejects.toBeInstanceOf(ForbiddenException)
    })

    it('allows the author to delete their own comment', async () => {
      repo.findById.mockResolvedValue(makeComment({ authorId: 'u-author' }))
      repo.remove.mockResolvedValue(true)
      await expect(service.remove('c-1', 'u-author')).resolves.toBeUndefined()
    })
  })

  // ── WS emit (BUG-33) ──────────────────────────────────────────────
  describe('WS emit (BUG-33)', () => {
    it('emits comment:created after successful create', async () => {
      const comment = makeComment()
      repo.insert.mockResolvedValue(comment)
      await service.create('t-1', { body: 'hi' }, 'caller-uuid')
      expect(gateway.emitCommentCreated).toHaveBeenCalledWith(comment)
    })

    it('emits comment:updated after successful update', async () => {
      const comment = makeComment({ body: 'edited' })
      repo.findById.mockResolvedValue(makeComment({ authorId: 'u-author' }))
      repo.update.mockResolvedValue(comment)
      await service.update('c-1', { body: 'edited' }, 'u-author')
      expect(gateway.emitCommentUpdated).toHaveBeenCalledWith(comment)
    })

    it('emits comment:deleted after successful remove', async () => {
      const comment = makeComment()
      repo.findById.mockResolvedValue(comment)
      repo.remove.mockResolvedValue(true)
      await service.remove('c-1', 'u-author')
      expect(gateway.emitCommentDeleted).toHaveBeenCalledWith('c-1', 't-1')
    })
  })
})
