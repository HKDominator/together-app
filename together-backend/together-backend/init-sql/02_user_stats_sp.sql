-- Destination: together-backend/together-backend/init-sql/02_user_stats_sp.sql
-- Stored procedure: per-user task statistics. Returns one row.
-- Note the quoted "assigneeId"/"dueDate" — TypeORM keeps property names
-- verbatim, and Postgres lowercases unquoted identifiers, so we have to
-- quote them.

CREATE OR REPLACE FUNCTION get_user_task_stats(user_uuid UUID)
RETURNS TABLE (
  total_tasks       INT,
  done_tasks        INT,
  in_progress_tasks INT,
  todo_tasks        INT,
  cancelled_tasks   INT,
  overdue_tasks     INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::INT                                                           AS total_tasks,
    COUNT(*) FILTER (WHERE state = 'done')::INT                             AS done_tasks,
    COUNT(*) FILTER (WHERE state = 'in_progress')::INT                      AS in_progress_tasks,
    COUNT(*) FILTER (WHERE state = 'todo')::INT                             AS todo_tasks,
    COUNT(*) FILTER (WHERE state = 'cancelled')::INT                        AS cancelled_tasks,
    COUNT(*) FILTER (
      WHERE "dueDate" IS NOT NULL
        AND "dueDate" < TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD')
        AND state NOT IN ('done', 'cancelled')
    )::INT                                                                  AS overdue_tasks
  FROM tasks
  WHERE "assigneeId" = user_uuid;
END;
$$ LANGUAGE plpgsql STABLE;