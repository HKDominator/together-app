// Destination: together-app-ui/app/(app)/pulse/page.tsx
// Wave 5 Step 9 (FD-16 / ADR-0004): Couple Pulse page — replaces the
// "Coming soon — Gold challenge" placeholder (CR-05 dead).
//
// Four states driven by derivePulseView (pure, server-mirrored):
//   empty        — (a) check-in form
//   partner-first — (b) form + "[name] has checked in today" fact
//   solo         — (c) editable form + "Just you so far today."
//   complete     — (d) Reading leads, suggestion beneath; no form
//
// ADR-0004 hard rules observed here:
//   • No numeral anywhere; the word "Score" never appears.
//   • Divergent Readings styled identically to aligned ones (calm palette).
//   • No nudge/reminder copy; no re-roll; no history.
//   • motion-safe: prefix on every transition/animation class.
//   • No TasksContext dependency.
'use client'
import { useState, useEffect, useCallback } from 'react'
import { pulseApi, derivePulseView } from '@/lib/pulse'
import type { PulseTodayView, Mood, Energy } from '@/lib/pulse'

const MOODS: { value: Mood; label: string }[] = [
  { value: 'bright', label: 'Bright' },
  { value: 'steady', label: 'Steady' },
  { value: 'tender', label: 'Tender' },
  { value: 'heavy',  label: 'Heavy'  },
]

const ENERGIES: { value: Energy; label: string }[] = [
  { value: 'charged', label: 'Charged' },
  { value: 'steady',  label: 'Steady'  },
  { value: 'low',     label: 'Low'     },
]

// Shared label classes — same for every choice regardless of reading result
// (ADR-0004: divergent and aligned Readings are styled identically).
const choiceBase = [
  'flex items-center justify-center',
  'min-h-[44px] min-w-[88px] px-4 rounded-lg',
  'cursor-pointer select-none text-sm font-medium border',
  'focus-within:ring-2 focus-within:ring-cr focus-within:ring-offset-1',
  'motion-safe:transition-colors motion-safe:duration-150',
].join(' ')

const choiceActive   = 'bg-cm border-sl text-sl'
const choiceInactive = 'bg-surface border-gray-200 text-sl-muted hover:bg-cm-pale'

function ChoiceButton<T extends string>({
  value, label, current, onSelect, groupName,
}: {
  value: T; label: string; current: T | null
  onSelect: (v: T) => void; groupName: string
}) {
  const active = current === value
  return (
    <label className={`${choiceBase} ${active ? choiceActive : choiceInactive}`}>
      <input
        type="radio"
        name={groupName}
        value={value}
        checked={active}
        onChange={() => onSelect(value)}
        className="sr-only"
      />
      {label}
    </label>
  )
}

export default function PulsePage() {
  const [view,      setView]      = useState<PulseTodayView | null>(null)
  const [mood,      setMood]      = useState<Mood | null>(null)
  const [energy,    setEnergy]    = useState<Energy | null>(null)
  const [saving,    setSaving]    = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [loading,   setLoading]   = useState(true)

  const load = useCallback(async () => {
    try {
      const data = await pulseApi.getToday()
      setView(data)
      if (data.you) {
        setMood(data.you.mood)
        setEnergy(data.you.energy)
      }
    } catch {
      // auth errors dispatched globally; keep prior state on network blip
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Refetch on window focus (stale-while-revalidate pattern)
  useEffect(() => {
    const onFocus = () => { load() }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [load])

  const handleCheckIn = async () => {
    if (!mood || !energy) return
    setSaving(true)
    setSaveError(null)
    try {
      const updated = await pulseApi.upsertCheckIn({ mood, energy })
      setView(updated)
      if (updated.you) {
        setMood(updated.you.mood)
        setEnergy(updated.you.energy)
      }
    } catch (err: unknown) {
      setSaveError(
        err instanceof Error ? err.message : 'Could not save. Please try again.',
      )
    } finally {
      setSaving(false)
    }
  }

  if (loading || !view) {
    return (
      <div className="p-9">
        <p className="text-sm text-sl-muted">Loading…</p>
      </div>
    )
  }

  const state = derivePulseView(view)

  return (
    <div className="p-9 max-w-lg">
      <h1 className="font-display text-3xl font-bold text-sl mb-8">Today</h1>

      {/* ── States a / b / c: show check-in form ── */}
      {state !== 'complete' && (
        <section aria-label="Check in">

          {/* (b) Partner has checked in; their content stays hidden */}
          {state === 'partner-first' && (
            <p className="text-sm text-sl-muted mb-6">
              {view.partner.name} has checked in today.
            </p>
          )}

          {/* (c) You checked in; partner hasn't yet */}
          {state === 'solo' && (
            <p className="text-sm text-sl-muted mb-6">Just you so far today.</p>
          )}

          {/* Mood */}
          <fieldset className="mb-6">
            <legend className="text-xs font-semibold text-sl uppercase tracking-wider mb-3">
              Mood
            </legend>
            <div className="flex flex-wrap gap-2">
              {MOODS.map(({ value, label }) => (
                <ChoiceButton<Mood>
                  key={value}
                  value={value}
                  label={label}
                  current={mood}
                  onSelect={setMood}
                  groupName="mood"
                />
              ))}
            </div>
          </fieldset>

          {/* Energy */}
          <fieldset className="mb-8">
            <legend className="text-xs font-semibold text-sl uppercase tracking-wider mb-3">
              Energy
            </legend>
            <div className="flex flex-wrap gap-2">
              {ENERGIES.map(({ value, label }) => (
                <ChoiceButton<Energy>
                  key={value}
                  value={value}
                  label={label}
                  current={energy}
                  onSelect={setEnergy}
                  groupName="energy"
                />
              ))}
            </div>
          </fieldset>

          {saveError && (
            <p role="alert" className="text-sm text-danger mb-4">
              {saveError}
            </p>
          )}

          <button
            onClick={handleCheckIn}
            disabled={!mood || !energy || saving}
            className={[
              'bg-cr text-white px-5 py-2.5 rounded-lg text-sm font-semibold',
              'disabled:opacity-50',
              'motion-safe:transition-opacity motion-safe:duration-150',
            ].join(' ')}
          >
            {saving
              ? 'Saving…'
              : state === 'solo'
                ? 'Update'
                : 'Check in'}
          </button>
        </section>
      )}

      {/* ── State d: complete — Reading leads, suggestion beneath ── */}
      {state === 'complete' && (
        <section aria-label="Reading">
          {view.reading && (
            <p className="text-2xl font-semibold text-sl mb-3">
              {view.reading.label}
            </p>
          )}
          {view.suggestion && (
            <p className="text-sm text-sl-muted">{view.suggestion}</p>
          )}
        </section>
      )}
    </div>
  )
}
