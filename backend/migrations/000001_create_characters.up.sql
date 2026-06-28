CREATE TABLE characters (
  id UUID PRIMARY KEY,
  owner_subject_id UUID NULL,
  name TEXT NOT NULL,
  class_name TEXT NOT NULL,
  subclass_name TEXT NULL,
  level SMALLINT NOT NULL CHECK (level BETWEEN 1 AND 20),
  ancestry TEXT NOT NULL,
  background TEXT NOT NULL,
  strength_score SMALLINT NOT NULL,
  dexterity_score SMALLINT NOT NULL,
  constitution_score SMALLINT NOT NULL,
  intelligence_score SMALLINT NOT NULL,
  wisdom_score SMALLINT NOT NULL,
  charisma_score SMALLINT NOT NULL,
  hp_current SMALLINT NOT NULL CHECK (hp_current >= 0),
  hp_max SMALLINT NOT NULL CHECK (hp_max >= 0),
  armor_class SMALLINT NOT NULL CHECK (armor_class >= 0),
  speed_ft SMALLINT NOT NULL CHECK (speed_ft >= 0),
  reference_payload JSONB NOT NULL CHECK (jsonb_typeof(reference_payload) = 'object'),
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  CHECK (hp_current <= hp_max)
);

COMMENT ON COLUMN characters.owner_subject_id IS
  'Reserved for future authenticated ownership. Nullable until user accounts and auth exist.';

CREATE INDEX characters_owner_subject_id_idx ON characters (owner_subject_id);
