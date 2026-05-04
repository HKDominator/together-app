// Destination: together-backend/together-backend/src/database/sql-bootstrap.ts
import { readdirSync, readFileSync } from 'fs'
import { join } from 'path'
import { DataSource } from 'typeorm'

/**
 * Runs every *.sql file in init-sql/ in lexicographic order. Idempotent
 * — every script uses CREATE OR REPLACE / IF NOT EXISTS so re-running
 * is safe. Call AFTER TypeORM has synced the schema (so referenced
 * tables like `tasks` already exist).
 */
export async function runSqlBootstrap(ds: DataSource): Promise<void> {
  const dir = join(process.cwd(), 'init-sql')
  let files: string[]
  try {
    files = readdirSync(dir).filter(f => f.endsWith('.sql')).sort()
  } catch {
    console.warn(`⚠️  init-sql/ folder missing — skipping SP/trigger bootstrap`)
    return
  }

  for (const file of files) {
    const sql = readFileSync(join(dir, file), 'utf-8')
    if (!sql.trim()) continue
    await ds.query(sql)
    console.log(`✓ ran ${file}`)
  }
}