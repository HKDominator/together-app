-- Destination: together-backend/together-backend/init-sql/03_tags_and_indices.sql
--
-- Gold-tier Part A — the heavy M:M (Task ↔ Tag) and the indices that
-- make the optimized stat endpoint fast. Naive endpoint deliberately
-- sequential-scans, this file is what flips it to indexed mode.
--
-- Tables are created by TypeORM via the Tag / TaskTag entities, but
-- we add the *composite* indices here because TypeORM only emits
-- single-column ones from @Index. Composite indices are what crush
-- the cardinality on the affinity GROUP BY.

-- Defensive: only add indices if the table exists (entities create it).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'task_tags') THEN

    -- Forward path: lookups by task → which tags?
    CREATE INDEX IF NOT EXISTS task_tags_task_tag_idx
      ON task_tags ("taskId", "tagId");

    -- Reverse path: which tasks carry this tag? Drives the affinity GROUP BY.
    CREATE INDEX IF NOT EXISTS task_tags_tag_task_idx
      ON task_tags ("tagId", "taskId");

    -- For "added by user" queries (who tagged what).
    CREATE INDEX IF NOT EXISTS task_tags_added_by_idx
      ON task_tags ("addedByUserId");

  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tasks') THEN

    -- Drives the assignee+state filter on the affinity query.
    CREATE INDEX IF NOT EXISTS tasks_assignee_state_idx
      ON tasks ("assigneeId", state);

    -- For the date-range filter ("last 90 days") on the affinity query.
    CREATE INDEX IF NOT EXISTS tasks_created_at_idx
      ON tasks ("createdAt" DESC);

  END IF;
END$$;

-- Materialized view used by the OPTIMIZED endpoint. Recomputed by a
-- nightly cron or on-demand via the /refresh action; until then it
-- serves stale-but-fast data. Naive endpoint never reads from it.
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_tag_affinity AS
SELECT
  u.id                                                              AS user_id,
  u.email                                                           AS user_email,
  u.name                                                            AS user_name,
  t.id                                                              AS tag_id,
  t.name                                                            AS tag_name,
  t.color                                                           AS tag_color,
  COUNT(*)::int                                                     AS total_tasks,
  COUNT(*) FILTER (WHERE tk.state = 'done')::int                    AS done_tasks,
  COUNT(*) FILTER (WHERE tk.state = 'in_progress')::int             AS in_progress_tasks,
  COUNT(*) FILTER (WHERE tk.state = 'todo')::int                    AS todo_tasks,
  COUNT(*) FILTER (WHERE tk.state = 'cancelled')::int               AS cancelled_tasks,
  COALESCE(
    ROUND(100.0 * COUNT(*) FILTER (WHERE tk.state = 'done')
                / NULLIF(COUNT(*), 0))::int,
    0
  )                                                                 AS completion_rate,
  COALESCE(
    ROUND(AVG(EXTRACT(EPOCH FROM (tk."updatedAt" - tk."createdAt")) / 86400.0)::numeric, 2),
    0
  )                                                                 AS avg_days_active
FROM users u
JOIN tasks      tk ON tk."assigneeId" = u.id
JOIN task_tags  tt ON tt."taskId"     = tk.id
JOIN tags       t  ON t.id            = tt."tagId"
GROUP BY u.id, u.email, u.name, t.id, t.name, t.color;

CREATE UNIQUE INDEX IF NOT EXISTS mv_tag_affinity_user_tag_idx
  ON mv_tag_affinity (user_id, tag_id);

-- Helper SP to refresh the matview without locking reads.
CREATE OR REPLACE FUNCTION refresh_tag_affinity()
RETURNS VOID AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_tag_affinity;
END;
$$ LANGUAGE plpgsql;