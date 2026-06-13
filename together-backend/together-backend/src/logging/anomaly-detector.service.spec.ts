// BUG-09: flag() had a find-then-insert race: two concurrent calls both
// miss the existing row and insert duplicate observations.
// Fix: single atomic ON CONFLICT upsert — no findOne read needed.
import { AnomalyDetectorService } from './anomaly-detector.service'

const makeObs = () => ({
  findOne: jest.fn(),
  save:    jest.fn(),
  query:   jest.fn(async () => []),
})

describe('AnomalyDetectorService — flag() atomicity (BUG-09)', () => {
  it('does NOT call findOne — uses a single atomic upsert instead', async () => {
    const obs = makeObs()
    const service = new AnomalyDetectorService(null as any, obs as any, null as any)

    await service.flag(
      { id: 'u1', email: 'a@b.com', name: 'Ana' },
      'burst',
      { burstPerMin: 70 },
    )

    expect(obs.findOne).not.toHaveBeenCalled()
    expect(obs.query).toHaveBeenCalledWith(
      expect.stringMatching(/ON CONFLICT/i),
      expect.any(Array),
    )
  })
})
