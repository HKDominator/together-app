// ADR-0004 Addendum A — Synchronized Breathing field.
//
// Two warm-sand orbs. Idle is a single orb breathing subtly via CSS
// (`.breath-orb-anim`, period ≥ 6s, scale amp ≤ ±4%). When the partner comes
// online a second orb slides in (CSS `partnerArrive` + the `.is-paired` shift
// on "you"), and over ~3s an rAF loop eases the partner orb's breath from
// counter-phase into unison, then hands back to the CSS keyframe phase-locked
// to "you". The lerp math is the pure deep module in lib/breath.ts.
//
// Position (slot) and breath (orb scale) live on separate elements so the two
// transforms never fight: the slot does translateX, the orb does scale.
//
// Hard rules (Addendum A): the second orb ≡ live presence (never check-in);
// breath is valence-blind; warm-sand palette (set in globals.css, visible on
// the stone-100 page); under reduced motion the partner orb still appears
// (geometry + resting position) but never JS-animates.
'use client'
import { useEffect, useRef } from 'react'
import {
  breathScale,
  partnerPhase,
  ALIGN_DURATION_MS,
  BREATH_PERIOD_MS,
} from '@/lib/breath'

interface BreathingFieldProps {
  partnerPresent: boolean
  /** State (d): recede to a low-opacity halo behind the Reading. */
  recede?: boolean
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

export default function BreathingField({ partnerPresent, recede = false }: BreathingFieldProps) {
  const partnerRef  = useRef<HTMLDivElement | null>(null)
  const youStartRef = useRef<number>(0)
  const rafRef      = useRef<number | null>(null)

  // Record when the "you" circle's CSS breath began so the partner circle can
  // be phase-locked to it at handoff.
  useEffect(() => {
    youStartRef.current = performance.now()
  }, [])

  // Phase-alignment runs once each time the partner circle appears.
  useEffect(() => {
    const el = partnerRef.current
    if (!partnerPresent || !el) return
    if (prefersReducedMotion()) return // static circle; presence is the signal

    const start = performance.now()
    el.style.animation = 'none' // suspend CSS breath while we paint the lerp

    const tick = () => {
      const elapsed = performance.now() - start
      if (elapsed < ALIGN_DURATION_MS) {
        el.style.transform = `scale(${breathScale(performance.now(), partnerPhase(elapsed))})`
        rafRef.current = requestAnimationFrame(tick)
      } else {
        // Handoff: drop inline transform, resume the CSS breath phase-locked to you.
        el.style.transform = ''
        el.style.animation = ''
        const youPhaseMs = (performance.now() - youStartRef.current) % BREATH_PERIOD_MS
        el.style.animationDelay = `-${youPhaseMs}ms`
        rafRef.current = null
      }
    }
    rafRef.current = requestAnimationFrame(tick)

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [partnerPresent])

  return (
    <div
      aria-hidden="true"
      className={[
        'relative h-40 w-full flex items-center justify-center overflow-hidden',
        recede ? 'breath-recede' : '',
      ].join(' ')}
    >
      {/* "You" — always present; drifts aside to make room when partner joins */}
      <div className={`breath-slot breath-slot-you ${partnerPresent ? 'is-paired' : ''}`}>
        <div
          data-testid="breath-you"
          className="breath-orb breath-orb-you breath-orb-anim"
        />
      </div>

      {/* Partner — live presence only (Addendum A: second orb ≡ online).
          Slides in, counter-breathes, then locks into unison with "you". */}
      {partnerPresent && (
        <div className="breath-slot breath-slot-partner">
          <div
            ref={partnerRef}
            data-testid="breath-partner"
            className="breath-orb breath-orb-partner breath-orb-anim"
          />
        </div>
      )}
    </div>
  )
}
