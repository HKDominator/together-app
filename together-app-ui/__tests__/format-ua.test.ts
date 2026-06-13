// CR-02: session device labels must be meaningful — not raw UA first tokens like "Mozilla"
import { parseDevice } from '@/lib/format-ua'

describe('parseDevice (CR-02)', () => {
  it('identifies Chrome', () => {
    expect(parseDevice('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/121.0.0.0 Safari/537.36'))
      .toBe('Chrome')
  })

  it('identifies Firefox', () => {
    expect(parseDevice('Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0'))
      .toBe('Firefox')
  })

  it('identifies Safari', () => {
    expect(parseDevice('Mozilla/5.0 (Macintosh; Intel Mac OS X 14_2) AppleWebKit/605.1.15 Version/17.2 Safari/605.1.15'))
      .toBe('Safari')
  })

  it('identifies Edge', () => {
    expect(parseDevice('Mozilla/5.0 (Windows NT 10.0) Chrome/121.0.0.0 Safari/537.36 Edg/121.0.0.0'))
      .toBe('Edge')
  })

  it('identifies API clients', () => {
    expect(parseDevice('PostmanRuntime/7.36')).toBe('API client')
    expect(parseDevice('python-requests/2.31')).toBe('API client')
  })

  it('returns "Unknown device" for blank UA (BUG-37 first sessions)', () => {
    expect(parseDevice('')).toBe('Unknown device')
  })
})
