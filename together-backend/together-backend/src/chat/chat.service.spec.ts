// BUG-01: toPayload must use the document's stored createdAt, not new Date()
import { ChatService } from './chat.service'

const STORED_DATE = new Date('2024-01-15T10:00:00.000Z')

const makeDoc = (overrides?: Record<string, unknown>) => ({
  _id:         { toString: () => 'm1' },
  roomId:      'workspace',
  senderId:    'u1',
  senderName:  'Ana',
  senderColor: '#C0392B',
  body:        'hello',
  createdAt:   STORED_DATE,
  ...overrides,
})

const makeModel = (doc: Record<string, unknown>) => ({
  create: jest.fn(async () => doc),
  find:   jest.fn(() => ({
    sort:  jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    lean:  jest.fn(async () => [doc]),
  })),
})

describe('ChatService (BUG-01 — timestamps)', () => {
  it('insert() returns the document stored createdAt, not "now"', async () => {
    const doc = makeDoc()
    const service = new ChatService(makeModel(doc) as any)
    const result = await service.insert({
      roomId: 'workspace', senderId: 'u1', senderName: 'Ana', senderColor: '#abc', body: 'hello',
    })
    expect(result.createdAt).toBe(STORED_DATE.toISOString())
  })

  it('listForRoom() returns stored createdAt timestamps, not "now"', async () => {
    const doc = makeDoc()
    const service = new ChatService(makeModel(doc) as any)
    const messages = await service.listForRoom('workspace')
    expect(messages[0].createdAt).toBe(STORED_DATE.toISOString())
  })
})
