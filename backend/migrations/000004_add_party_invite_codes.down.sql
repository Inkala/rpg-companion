DROP INDEX party_invites_code_hash_key;

ALTER TABLE party_invites
  DROP CONSTRAINT party_invites_code_hash_length_check;

ALTER TABLE party_invites
  DROP COLUMN code_hash;
