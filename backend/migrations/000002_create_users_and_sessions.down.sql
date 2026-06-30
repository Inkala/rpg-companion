ALTER TABLE characters
  DROP CONSTRAINT IF EXISTS characters_owner_subject_id_fkey;

DROP TABLE IF EXISTS user_sessions;
DROP TABLE IF EXISTS users;
