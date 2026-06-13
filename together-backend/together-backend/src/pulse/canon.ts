// Destination: together-backend/together-backend/src/pulse/canon.ts
// Wave 5 (FD-16 / ADR-0004): the Curated Canon.
//
// Hand-written, in-code, keyed by Reading — the guaranteed quality
// floor of Couple Pulse. Copy approved by the product owner 2026-06-12
// (.scratch/couple-pulse/canon-draft.md); edits here are product copy
// changes and need the same review. Entry rules (grilled): doable
// tonight, at home or walkable, free with no purchases, no screens by
// default, phrased as an invitation, never an instruction, digit-free.
//
// The LLM picks and tailors from these candidates; it never invents.
// With Ollama unavailable, pickCanonEntry() is the suggestion.
import { ReadingKey } from './reading'

export interface CanonEntry {
  id:   string // stored as canonEntryId for traceability; never serialized to the client
  text: string
}

export const CANON_TEXT_MAX = 100

export const CANON: Record<ReadingKey, readonly CanonEntry[]> = {
  'bright-together': [
    { id: 'bright-loud-kitchen',    text: 'Music loud in the kitchen, cook something ridiculous together.' },
    { id: 'bright-dance-badly',     text: 'Open the windows and dance badly until somebody laughs.' },
    { id: 'bright-no-route',        text: 'A walk with no route, take every turn you have never taken.' },
    { id: 'bright-dessert-first',   text: 'Dessert first tonight. Dinner can wait its turn.' },
    { id: 'bright-streetlights',    text: 'Sit outside until the streetlights come on, like you have nowhere to be.' },
    { id: 'bright-silly-weekend',   text: 'Plan the next free weekend out loud, the sillier the better.' },
    { id: 'bright-doorstep-trade',  text: 'Trade the best moment of your day over something cold on the doorstep.' },
    { id: 'bright-board-game',      text: 'The board game from the back of the shelf, winner picks breakfast.' },
  ],
  'quiet-day-for-both': [
    { id: 'quiet-balcony-tea',      text: 'Tea on the balcony, phones inside.' },
    { id: 'quiet-early-pajamas',    text: 'Early pajamas, soft lamp, no plans.' },
    { id: 'quiet-same-room-read',   text: 'Read in the same room, no need to talk.' },
    { id: 'quiet-slow-lap',         text: 'A slow lap around the block before bed, coats over pajamas.' },
    { id: 'quiet-warm-soup',        text: 'Warm soup, low light, leftovers count.' },
    { id: 'quiet-whole-album',      text: 'A whole album from start to finish, lying down, eyes closed optional.' },
    { id: 'quiet-kettle-race',      text: 'Couch and blankets, whoever reaches the kettle first makes both cups.' },
    { id: 'quiet-clean-sheets',     text: 'Hot shower, clean sheets, lights out early. Tomorrow gets the rest.' },
  ],
  'carrying-it-together': [
    { id: 'carry-sit-close',        text: 'Sit close for a while. Nothing needs saying tonight.' },
    { id: 'carry-simple-dinner',    text: 'The simplest dinner you both like, eaten side by side.' },
    { id: 'carry-arm-in-arm',       text: 'A short walk arm in arm, no destination.' },
    { id: 'carry-one-pot',          text: 'One pot of something warm, two spoons, the couch.' },
    { id: 'carry-candle-toast',     text: 'A candle at dinner, even if dinner is toast.' },
    { id: 'carry-early-night',      text: 'An early night together. The dishes can lose this one.' },
    { id: 'carry-kitchen-table',    text: 'Shoulder to shoulder at the kitchen table, whatever is left of the evening.' },
    { id: 'carry-no-fixing',        text: 'Hot drinks made the way you each like them, and no fixing anything tonight.' },
  ],
  'different-speeds-today': [
    { id: 'speeds-kitchen-chair',   text: 'One of you cooks, the other keeps them company from the kitchen chair.' },
    { id: 'speeds-music-blanket',   text: 'One picks the music, the other picks the blanket.' },
    { id: 'speeds-gentle-pace',     text: 'A lap around the block, pace set by whoever needs it gentler.' },
    { id: 'speeds-shelf-supervisor', text: 'Big energy tidies one shelf, low energy supervises from the armchair.' },
    { id: 'speeds-sky-walk',        text: 'Pajamas on, then one short walk together to look at the sky.' },
    { id: 'speeds-read-aloud',      text: 'The rested one reads aloud, the tired one gets the good cushion.' },
    { id: 'speeds-same-rug',        text: 'One stretches, one sprawls, same rug, same playlist.' },
    { id: 'speeds-bath-first-turn', text: 'The energized one draws the bath, the tired one gets first turn.' },
  ],
  'in-step': [
    { id: 'step-swap-parts',        text: 'Cook the usual thing together, but swap who does which part.' },
    { id: 'step-regular-route',     text: 'A walk after dinner, the regular route, phones at home.' },
    { id: 'step-small-plans',       text: 'Coffee or tea at the table, and small plans for tomorrow.' },
    { id: 'step-nothing-counts',    text: 'Shoulder to shoulder doing nothing in particular. It counts.' },
    { id: 'step-good-and-odd',      text: 'One good thing and one odd thing from today, traded over dessert.' },
    { id: 'step-crossword',         text: 'The crossword on the couch, one pen between you.' },
    { id: 'step-plant-survivors',   text: 'Water the plants together and congratulate the survivors.' },
    { id: 'step-actual-table',      text: 'An unhurried dinner at the actual table, candles optional.' },
  ],
  'each-in-your-own-weather': [
    { id: 'weather-separate-books', text: 'Same room, separate books, one pot of tea between you.' },
    { id: 'weather-two-chairs',     text: 'Two chairs, two moods, one balcony.' },
    { id: 'weather-couch-corners',  text: 'Your own corner of the couch each, feet allowed to meet in the middle.' },
    { id: 'weather-own-cravings',   text: 'Each cooks what they crave, dinner together anyway.' },
    { id: 'weather-meet-at-kettle', text: 'Your music in the kitchen, theirs in the shower, meet at the kettle.' },
    { id: 'weather-no-talk-walk',   text: 'A walk where nobody has to talk, hands can still find each other.' },
    { id: 'weather-nap-pile',       text: 'Separate naps, shared blanket pile after.' },
    { id: 'weather-puttering',      text: 'Parallel puttering: your little project, theirs, snacks in the middle.' },
  ],
}

// djb2-xor over the day+reading key. Pure arithmetic — stable across
// calls, restarts, and processes, which is the whole point: the
// degradation path and lazy repair must agree on today's entry without
// coordinating.
function hash(s: string): number {
  let h = 5381
  for (let i = 0; i < s.length; i++) {
    h = ((h * 33) ^ s.charCodeAt(i)) >>> 0
  }
  return h
}

/** The deterministic Canon pick: a stable function of (Pulse Day, Reading). */
export function pickCanonEntry(pulseDay: string, reading: ReadingKey): CanonEntry {
  const entries = CANON[reading]
  return entries[hash(`${pulseDay}:${reading}`) % entries.length]
}
