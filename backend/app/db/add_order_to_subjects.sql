-- Add an 'order' column to the subjects table for drag-and-drop ordering
ALTER TABLE subjects ADD COLUMN "order" integer;
-- Set default order for existing rows (incremental per user)
UPDATE subjects
SET "order" = sub.rn
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at ASC) AS rn
  FROM subjects
) AS sub
WHERE subjects.id = sub.id;
