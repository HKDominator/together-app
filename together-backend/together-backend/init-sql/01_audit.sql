-- Destination: together-backend/together-backend/init-sql/01_audit.sql
-- Audit table + trigger that records every INSERT / UPDATE / DELETE on
-- the tasks table. Bronze rubric: "stored procedures and triggers".
-- Also useful for Gold's logging story — we'll lean on this later.

CREATE TABLE IF NOT EXISTS task_audit (
  id          BIGSERIAL    PRIMARY KEY,
  task_id     UUID         NOT NULL,
  action      VARCHAR(20)  NOT NULL CHECK (action IN ('INSERT','UPDATE','DELETE')),
  old_data    JSONB,
  new_data    JSONB,
  changed_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS task_audit_task_id_idx   ON task_audit (task_id);
CREATE INDEX IF NOT EXISTS task_audit_changed_at_idx ON task_audit (changed_at DESC);

CREATE OR REPLACE FUNCTION audit_task_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO task_audit (task_id, action, new_data)
      VALUES (NEW.id, 'INSERT', to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Only record if something actually changed (skip noise)
    IF row_to_json(OLD)::text IS DISTINCT FROM row_to_json(NEW)::text THEN
      INSERT INTO task_audit (task_id, action, old_data, new_data)
        VALUES (NEW.id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW));
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO task_audit (task_id, action, old_data)
      VALUES (OLD.id, 'DELETE', to_jsonb(OLD));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS task_audit_trigger ON tasks;
CREATE TRIGGER task_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON tasks
  FOR EACH ROW EXECUTE FUNCTION audit_task_changes();