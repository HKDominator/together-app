// Destination: together-backend/together-backend/src/tags/entities/tag.entity.ts
//
// One half of the heavy M:M. Tags are global (not user-owned) so the
// join surface is dense — every user can tag with every tag, which is
// what makes the affinity matrix interesting.
import {
  Column, CreateDateColumn, Entity, Index, OneToMany, PrimaryGeneratedColumn,
} from 'typeorm'
import { TaskTag } from './task-tag.entity'

@Entity('tags')
export class Tag {
  @PrimaryGeneratedColumn('uuid')                          id!: string

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 50 })                 name!: string

  // Hex like '#a78bfa'. Used by the frontend chip.
  @Column({ type: 'varchar', length: 7, default: '#888888' }) color!: string

  // 'category' | 'context' | 'priority-flavor' — purely for grouping in UI.
  @Column({ type: 'varchar', length: 30, default: 'category' }) kind!: string

  @CreateDateColumn({ type: 'timestamptz' })               createdAt!: Date

  @OneToMany(() => TaskTag, tt => tt.tag, { cascade: ['remove'] })
  taskTags?: TaskTag[]
}