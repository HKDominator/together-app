// Destination: together-backend/together-backend/src/pulse/pulse-suggestion.service.spec.ts
// Wave 5 Step 5 (FD-16 / ADR-0004): the suggestion pipeline.
//
// The LLM has exactly one job — pick a Curated Canon candidate and
// rephrase it warmly — and every way it can fail lands on the
// deterministic Canon pick through the SAME conditional store, so the
// API response shape is identical on every path (invisible
// degradation). The injectable OllamaClient is the seam: these specs
// drive every degradation row through a mock and assert the stored
// suggestion, never which private method ran.
import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { ConfigService } from '@nestjs/config'
import {
  PulseSuggestionService, SuggestionContext, GENERATION_TIMEOUT_MS,
} from './pulse-suggestion.service'
import { PulseDay } from './entities/pulse-day.entity'
import { OllamaClient } from '../ai/ollama.client'
import { CANON, pickCanonEntry } from './canon'

const TODAY = '2026-06-12' // a Friday; 12:00Z = 15:00 Bucharest (afternoon)
const NOON_UTC = new Date('2026-06-12T12:00:00Z')

const CTX: SuggestionContext = {
  pulseDay: TODAY,
  reading:  'carrying-it-together',
  partners: [
    { name: 'Ana', mood: 'heavy',  energy: 'steady' },
    { name: 'Dan', mood: 'tender', energy: 'low' },
  ],
}
const CANON_PICK = pickCanonEntry(TODAY, CTX.reading)
const VALID_ID   = CANON[CTX.reading][0].id

describe('PulseSuggestionService', () => {
  let service: PulseSuggestionService
  let ollama:  { isAvailable: jest.Mock; generateJson: jest.Mock; modelName: jest.Mock }
  let days:    { createQueryBuilder: jest.Mock; findOne: jest.Mock }
  let qb: {
    insert: jest.Mock; into: jest.Mock; values: jest.Mock
    orIgnore: jest.Mock; execute: jest.Mock
  }

  /** The row shape most recently handed to the conditional insert. */
  const lastInsert = () => qb.values.mock.calls.at(-1)?.[0]

  beforeEach(async () => {
    jest.useFakeTimers().setSystemTime(NOON_UTC)

    qb = {
      insert:   jest.fn().mockReturnThis(),
      into:     jest.fn().mockReturnThis(),
      values:   jest.fn().mockReturnThis(),
      orIgnore: jest.fn().mockReturnThis(),
      execute:  jest.fn().mockResolvedValue({}),
    }
    days = {
      createQueryBuilder: jest.fn(() => qb),
      // Default store behavior: reads back whatever the conditional
      // insert wrote (first-writer-wins is exercised by overriding this).
      findOne: jest.fn().mockImplementation(async () => {
        const v = lastInsert()
        return v ? { id: 'pd-1', generatedAt: new Date(), ...v } : null
      }),
    }
    ollama = {
      isAvailable:  jest.fn().mockResolvedValue(true),
      generateJson: jest.fn().mockResolvedValue({ ok: false, err: 'not configured in this test' }),
      modelName:    jest.fn().mockReturnValue('qwen2.5:3b'),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PulseSuggestionService,
        { provide: getRepositoryToken(PulseDay), useValue: days },
        { provide: OllamaClient,                 useValue: ollama },
        { provide: ConfigService, useValue: {
          get: jest.fn().mockImplementation((key: string, fallback?: string) =>
            key === 'PULSE_TIMEZONE' ? 'Europe/Bucharest' : fallback),
        } },
      ],
    }).compile()

    service = module.get(PulseSuggestionService)
  })

  afterEach(() => { jest.useRealTimers() })

  // ── Idempotence ────────────────────────────────────────────────────

  it('returns the already-stored suggestion without touching Ollama', async () => {
    const stored = {
      id: 'pd-0', pulseDay: TODAY, suggestionText: 'Already here.',
      suggestionSource: 'llm', canonEntryId: VALID_ID,
      readingAtGeneration: CTX.reading, generatedAt: new Date(),
    }
    days.findOne.mockResolvedValueOnce(stored)

    const result = await service.ensureSuggestion(CTX)

    expect(result?.suggestionText).toBe('Already here.')
    expect(ollama.isAvailable).not.toHaveBeenCalled()
    expect(ollama.generateJson).not.toHaveBeenCalled()
    expect(qb.execute).not.toHaveBeenCalled()
  })

  // ── Fast-fail when Ollama is down ──────────────────────────────────

  it('fast-fails to the deterministic Canon pick when isAvailable() is false', async () => {
    ollama.isAvailable.mockResolvedValue(false)

    const result = await service.ensureSuggestion(CTX)

    expect(ollama.generateJson).not.toHaveBeenCalled()
    expect(lastInsert()).toEqual(expect.objectContaining({
      pulseDay:            TODAY,
      suggestionText:      CANON_PICK.text,
      suggestionSource:    'canon',
      canonEntryId:        CANON_PICK.id,
      readingAtGeneration: CTX.reading,
    }))
    expect(result?.suggestionText).toBe(CANON_PICK.text)
  })

  // ── Happy path ────────────────────────────────────────────────────

  it('stores the tailored text traced to the chosen candidate when the LLM answers well', async () => {
    ollama.generateJson.mockResolvedValue({
      ok: true,
      parsed: { choiceId: VALID_ID, text: 'Sit close tonight, Ana. Nothing needs saying.' },
    })

    const result = await service.ensureSuggestion(CTX)

    expect(lastInsert()).toEqual(expect.objectContaining({
      suggestionText:   'Sit close tonight, Ana. Nothing needs saying.',
      suggestionSource: 'llm',
      canonEntryId:     VALID_ID,
    }))
    expect(result?.suggestionText).toBe('Sit close tonight, Ana. Nothing needs saying.')
  })

  it('bounds generation with the approved budget', async () => {
    await service.ensureSuggestion(CTX)
    expect(GENERATION_TIMEOUT_MS).toBe(8_000)
    expect(ollama.generateJson).toHaveBeenCalledWith(expect.any(String), GENERATION_TIMEOUT_MS)
  })

  it('feeds the prompt both check-ins, the Reading, names, local time, and the candidates — JSON-only', async () => {
    await service.ensureSuggestion(CTX)

    const prompt = ollama.generateJson.mock.calls[0][0] as string
    expect(prompt).toContain('Ana')
    expect(prompt).toContain('Dan')
    expect(prompt).toContain('heavy')
    expect(prompt).toContain('tender')
    expect(prompt).toContain('low')
    expect(prompt).toContain('Carrying it together')
    expect(prompt).toContain('Friday')
    expect(prompt).toContain('afternoon')
    for (const entry of CANON[CTX.reading]) {
      expect(prompt).toContain(entry.id)
      expect(prompt).toContain(entry.text)
    }
    expect(prompt).toContain('ONLY with')
    expect(prompt).toContain('JSON')
  })

  // ── Defensive validation: every bad answer routes to the Canon pick ─

  const degradationRows: Array<[string, unknown]> = [
    ['LLM call fails',         { ok: false, err: 'Ollama HTTP 500' }],
    ['LLM times out',          { ok: false, err: `timeout after ${GENERATION_TIMEOUT_MS}ms` }],
    ['JSON unparseable',       { ok: false, raw: '{not json', err: 'JSON parse: bad' }],
    ['payload missing',        { ok: true }],
    ['choiceId untraceable',   { ok: true, parsed: { choiceId: 'invented-by-the-model', text: 'Fine text.' } }],
    ['text empty',             { ok: true, parsed: { choiceId: VALID_ID, text: '   ' } }],
    ['text over length cap',   { ok: true, parsed: { choiceId: VALID_ID, text: 'x'.repeat(201) } }],
    ['text contains digits',   { ok: true, parsed: { choiceId: VALID_ID, text: 'Meet at half past nine, so around nine thirty pm? Say 9.' } }],
    ['text not a string',      { ok: true, parsed: { choiceId: VALID_ID, text: 42 } }],
  ]

  it.each(degradationRows)('%s → the deterministic Canon pick is stored', async (_label, response) => {
    ollama.generateJson.mockResolvedValue(response)

    const result = await service.ensureSuggestion(CTX)

    expect(lastInsert()).toEqual(expect.objectContaining({
      suggestionText:   CANON_PICK.text,
      suggestionSource: 'canon',
      canonEntryId:     CANON_PICK.id,
    }))
    expect(result?.suggestionText).toBe(CANON_PICK.text)
  })

  it('even an unexpected throw from the client lands on the Canon pick', async () => {
    ollama.generateJson.mockRejectedValue(new Error('socket hang up'))

    const result = await service.ensureSuggestion(CTX)

    expect(lastInsert()).toEqual(expect.objectContaining({
      suggestionText: CANON_PICK.text, suggestionSource: 'canon',
    }))
    expect(result?.suggestionText).toBe(CANON_PICK.text)
  })

  // ── Conditional store: first writer wins, no overwrite ever ───────

  it('uses INSERT ... ON CONFLICT DO NOTHING and returns the row that actually won', async () => {
    const winner = {
      id: 'pd-winner', pulseDay: TODAY,
      suggestionText: 'The winner that landed first.',
      suggestionSource: 'llm', canonEntryId: VALID_ID,
      readingAtGeneration: CTX.reading, generatedAt: new Date(),
    }
    // Our insert is silently ignored; the read-back sees the winner.
    days.findOne
      .mockResolvedValueOnce(null)      // pre-check: nothing stored yet
      .mockResolvedValue(winner)        // read-back after orIgnore

    const result = await service.ensureSuggestion(CTX)

    expect(qb.orIgnore).toHaveBeenCalled()
    expect(result?.suggestionText).toBe('The winner that landed first.')
  })

  it('two concurrent completing writes settle on one suggestion', async () => {
    const [a, b] = await Promise.all([
      service.ensureSuggestion(CTX),
      service.ensureSuggestion(CTX),
    ])

    expect(a?.suggestionText).toBe(b?.suggestionText)
    // Every write path went through the conditional insert.
    expect(qb.orIgnore).toHaveBeenCalledTimes(qb.execute.mock.calls.length)
  })

  // ── Lazy repair: read path, Canon only, same conditional insert ───

  it('repairSuggestion stores the deterministic Canon pick without ever calling Ollama', async () => {
    const result = await service.repairSuggestion(TODAY, CTX.reading)

    expect(ollama.isAvailable).not.toHaveBeenCalled()
    expect(ollama.generateJson).not.toHaveBeenCalled()
    expect(qb.orIgnore).toHaveBeenCalled()
    expect(lastInsert()).toEqual(expect.objectContaining({
      pulseDay:            TODAY,
      suggestionText:      CANON_PICK.text,
      suggestionSource:    'canon',
      canonEntryId:        CANON_PICK.id,
      readingAtGeneration: CTX.reading,
    }))
    expect(result?.suggestionText).toBe(CANON_PICK.text)
  })

  it('repairSuggestion never clobbers an in-flight winner', async () => {
    const winner = {
      id: 'pd-winner', pulseDay: TODAY,
      suggestionText: 'Tailored and already stored.',
      suggestionSource: 'llm', canonEntryId: VALID_ID,
      readingAtGeneration: CTX.reading, generatedAt: new Date(),
    }
    days.findOne.mockResolvedValue(winner)

    const result = await service.repairSuggestion(TODAY, CTX.reading)

    expect(result?.suggestionText).toBe('Tailored and already stored.')
  })
})
