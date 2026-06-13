// Destination: together-app-ui/lib/pulse.ts
// Wave 5 Step 8 (FD-16 / ADR-0004): FE data layer for Couple Pulse.
//
// Thin fetchers over API_URL (cookies + 401-retry already wired here via
// refreshOnce from api.ts). derivePulseView is a pure function — the UI
// renders from the state string, never inspects fields directly.
//
// ADR-0004 boundary: nothing here touches tasks, stats, or chat data.
import { API_URL, ApiError, NetworkError, refreshOnce } from './api'

// ── Types (mirror PulseTodayView from pulse.service.ts) ───────────────

export type Mood   = 'bright' | 'steady' | 'tender' | 'heavy'
export type Energy = 'charged' | 'steady' | 'low'

export interface CheckInValues {
  mood:   Mood
  energy: Energy
}

export interface PulseTodayView {
  pulseDay: string
  you:      CheckInValues | null
  partner: {
    name:         string
    hasCheckedIn: boolean
    checkIn:      CheckInValues | null
  }
  reading?:    { key: string; label: string }
  suggestion?: string | null
}

export type PulseViewState = 'empty' | 'partner-first' | 'solo' | 'complete'

// ── Internal fetch helper (same 401-retry contract as api.ts req()) ───

async function req<T>(
  method: 'GET' | 'PUT',
  path:   string,
  body?:  unknown,
  retry = true,
): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      credentials: 'include',
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body:    body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch { throw new NetworkError() }

  if (res.status === 401 && retry) {
    const refreshed = await refreshOnce()
    if (refreshed) return req<T>(method, path, body, false)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('auth:unauthorized'))
    }
  }

  if (!res.ok) {
    let detail = res.statusText
    try {
      const b = await res.json()
      detail = Array.isArray(b.message) ? b.message.join('; ') : (b.message ?? detail)
    } catch { /* not JSON */ }
    throw new ApiError(res.status, detail)
  }
  return res.json() as Promise<T>
}

// ── Public API ────────────────────────────────────────────────────────

export const pulseApi = {
  getToday:      ()                   => req<PulseTodayView>('GET', '/pulse/today'),
  upsertCheckIn: (dto: CheckInValues) => req<PulseTodayView>('PUT', '/pulse/today/check-in', dto),
}

/**
 * Maps a raw PulseTodayView to one of four UI states.
 *
 *   empty        — neither partner has checked in → show check-in form
 *   partner-first — partner checked in, you haven't → form + "partner checked in" fact (content hidden)
 *   solo         — you checked in, partner hasn't → your check-in + solo copy
 *   complete     — both checked in → Reading + suggestion revealed
 */
export function derivePulseView(data: PulseTodayView): PulseViewState {
  const youDone     = data.you !== null
  const partnerDone = data.partner.hasCheckedIn

  if (!youDone && !partnerDone) return 'empty'
  if (!youDone &&  partnerDone) return 'partner-first'
  if ( youDone && !partnerDone) return 'solo'
  return 'complete'
}
