// Wave 5 Step 9 (FD-16 / ADR-0004): Couple Pulse page.
//
// Four states driven by derivePulseView (pure, server-mirrored):
//   empty        — (a) check-in form only
//   partner-first — (b) form + "{name} is already in."
//   solo         — (c) editable form + "Just you so far today."
//   complete     — (d) Reading label, suggestion; no form
//
// ADR-0004 hard rules:
//   • No numeral anywhere; the word "Score" never appears.
//   • Divergent Readings styled identically to aligned ones (calm palette).
//   • No nudge/reminder copy; no re-roll; no history.
//   • motion-safe: prefix on every transition/animation class.
//   • No TasksContext dependency.
'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
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

const choiceActive   = 'bg-cm border-sl-muted text-sl'
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
  // hasEverLoaded distinguishes initial-load failure (show error) from
  // refetch failure (keep prior state — auth errors dispatched globally).
  const hasEverLoaded = useRef(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await pulseApi.getToday()
      setView(data)
      hasEverLoaded.current = true
      if (data.you) {
        setMood(data.you.mood)
        setEnergy(data.you.energy)
      }
    } catch {
      // On refetch failure, keep prior state (auth errors dispatched globally).
      // On initial load failure (hasEverLoaded still false), view stays null
      // and the error state below renders with a retry affordance.
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Refetch on window focus (stale-while-revalidate pattern).
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
      const msg = err instanceof Error ? err.message : ''
      setSaveError(
        msg.length > 0 && msg.length < 80
          ? msg
          : 'Could not save. Please try again.',
      )
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-9">
        <p className="text-sm text-sl-muted">Getting today&apos;s pulse…</p>
      </div>
    )
  }

  // Initial load failure — view is null because the fetch errored before
  // hasEverLoaded was set. Show a recovery affordance.
  if (!view) {
    return (
      <div className="p-9">
        <p className="text-sm text-sl-muted mb-4">Couldn&apos;t load today&apos;s pulse.</p>
        <button
          onClick={load}
          className="text-sm font-semibold text-cr hover:underline min-h-[44px]"
        >
          Try again →
        </button>
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
            <div key="partner-first" className="mb-6 pulse-state-in">
              <p className="text-sm text-sl-muted">
                {view.partner.name} is already in.
              </p>
              <p className="text-xs text-sl-dim mt-1">
                Check in to see today&apos;s reading together.
              </p>
            </div>
          )}

          {/* (c) You checked in; partner hasn't yet */}
          {state === 'solo' && (
            <div key="solo" className="mb-6 pulse-state-in">
              <p className="text-sm text-sl-muted">
                Just you so far today.
              </p>
              <p className="text-xs text-sl-dim mt-1">
                The reading appears once {view.partner.name} checks in.
              </p>
            </div>
          )}

          {/* Mood */}
          <fieldset className="mb-6">
            <legend className="text-xs font-semibold text-sl uppercase tracking-wider mb-1">
              Mood
            </legend>
            <p className="text-xs text-sl-muted mb-3">How are you feeling emotionally?</p>
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
            <legend className="text-xs font-semibold text-sl uppercase tracking-wider mb-1">
              Energy
            </legend>
            <p className="text-xs text-sl-muted mb-3">What's your energy level?</p>
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
        <section aria-label="Reading" className="pulse-reading-in">
          {view.reading ? (
            <>
              <p className="text-xs font-semibold text-sl-muted uppercase tracking-wider mb-3">
                Today&apos;s reading
              </p>
              <p className="text-2xl font-semibold text-sl mb-3">
                {view.reading.label}
              </p>
              {view.suggestion && (
                <p className="text-sm text-sl-muted pulse-reading-suggestion">{view.suggestion}</p>
              )}
            </>
          ) : (
            /* Ollama-down fallback: both checked in but reading hasn't come through yet */
            <div className="py-4">
              <p className="text-sm text-sl-muted mb-1">
                You&apos;re both checked in. The reading is still coming together.
              </p>
              <p className="text-xs text-sl-dim mb-4">
                This usually takes a moment — check back shortly.
              </p>
              <button
                onClick={load}
                className="text-sm font-semibold text-cr hover:underline"
              >
                Try again →
              </button>
            </div>
          )}
        </section>
      )}
    </div>
  )
}
