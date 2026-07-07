# T-012 Notes

- Certain: The old uncommitted T-012 implementation was reverted because it used the obsolete
  3-question, 2-answer questionnaire.
- Certain: The revised direction is 5 questions with 4 answers per question.
- Certain: The quiz may detect broader fantasy buckets, but MVP output still supports only Strength
  melee Fighter and Dexterity archer Fighter.
- Certain: Answer cards must not reveal scoring, bucket names, or Fighter build mappings while the
  user answers.
- Certain: Unsupported fantasies need honest future-path messaging, not fake support.
- Decision: Use these fantasy buckets for planning: `strengthMelee`, `dexterityArcher`,
  `futureMagic`, `futureHealingSupport`, `futureStealthTrickery`, and
  `futureSocialCleverChaos`.
- Decision: Keep global app header/navigation as a separate task and do not mix it into T-012
  implementation until approved.
- Assumption: Implementation should remain inside `frontend/src/character-creation/` unless the
  approved app-shell task changes page composition first.

