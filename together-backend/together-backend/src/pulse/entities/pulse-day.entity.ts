// Destination: together-backend/together-backend/src/pulse/entities/pulse-day.entity.ts
// Wave 5 (FD-16 / ADR-0004): the stored Suggested shared activity.
//
// One row per completed Pulse Day, written once via a conditional
// insert (ON CONFLICT DO NOTHING on the unique pulseDay) when the
// second Check-in lands — never regenerated, never re-rolled.
//
// suggestionSource and canonEntryId are server-side provenance ONLY:
// serializing them would announce LLM degradation, which ADR-0004
// forbids. The today view exposes suggestionText and nothing else.
import {
  Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn,
} from 'typeorm'

export type SuggestionSource = 'llm' | 'canon'

@Entity('pulse_days')
export class PulseDay {
  @PrimaryGeneratedColumn('uuid') id!: string

  @Index({ unique: true })
  @Column({ type: 'date' }) pulseDay!: string

  @Column({ type: 'varchar', length: 200 }) suggestionText!: string
  @Column({ type: 'varchar', length: 10 })  suggestionSource!: SuggestionSource
  @Column({ type: 'varchar', length: 50 })  canonEntryId!: string

  // Which Reading the suggestion was keyed to at generation time. The
  // surface Reading recomputes live if a Check-in is edited afterwards;
  // this snapshot keeps the provenance honest without swapping content.
  @Column({ type: 'varchar', length: 40 })  readingAtGeneration!: string

  @CreateDateColumn({ type: 'timestamptz' }) generatedAt!: Date
}
