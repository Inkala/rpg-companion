import { strict as assert } from 'node:assert';
import { execFileSync } from 'node:child_process';
import { cpSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const fixtureFiles = [
  'scripts/generate-character-creation-rules.mjs',
  'rules-data/srd-5.1-2014-levels-1-5.json',
  'rules-data/srd-5.1-2014-levels-1-5.schema.json',
  'rules-data/srd-5.1-2014-levels-1-5.sha256',
  'frontend/src/rules/generated/characterCreationRules.ts',
  'backend/internal/rules/generated_character_creation_rules.go',
];

const withFixture = (callback) => {
  const root = mkdtempSync(join(tmpdir(), 't025-generator-test-'));
  try {
    for (const relativePath of fixtureFiles) {
      const target = join(root, relativePath);
      mkdirSync(dirname(target), { recursive: true });
      cpSync(join(repositoryRoot, relativePath), target);
    }
    return callback(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
};

const run = (root, args = ['--check']) => execFileSync(
  process.execPath,
  ['scripts/generate-character-creation-rules.mjs', ...args],
  { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
);
const expectFailure = (root, pattern) => {
  assert.throws(() => run(root), (error) => pattern.test(`${error.stderr ?? ''}${error.stdout ?? ''}`));
};
const mutateCanonical = (root, callback) => {
  const path = join(root, 'rules-data/srd-5.1-2014-levels-1-5.json');
  const canonical = JSON.parse(readFileSync(path, 'utf8'));
  callback(canonical);
  writeFileSync(path, `${JSON.stringify(canonical, null, 2)}\n`);
};

test('check mode accepts the committed deterministic projections', () => withFixture((root) => {
  assert.match(run(root), /character-creation rules check passed/);
}));

test('check mode rejects invalid schema and unexpected record counts', () => withFixture((root) => {
  mutateCanonical(root, (canonical) => canonical.races.pop());
  expectFailure(root, /schema validation failed[\s\S]*races has too few items/);
}));

test('check mode rejects checksum mismatch and stale frontend output', () => withFixture((root) => {
  writeFileSync(join(root, 'rules-data/srd-5.1-2014-levels-1-5.sha256'), `${'0'.repeat(64)}  srd-5.1-2014-levels-1-5.json\n`);
  expectFailure(root, /generated output is stale or parity differs/);
}));

test('check mode rejects missing or duplicated stable IDs', () => withFixture((root) => {
  mutateCanonical(root, (canonical) => {
    canonical.equipment[1].index = canonical.equipment[0].index;
  });
  expectFailure(root, /equipment indexes contains duplicated stable IDs/);
}));

test('check mode rejects nondeterministic ordering', () => withFixture((root) => {
  mutateCanonical(root, (canonical) => {
    [canonical.equipment[0], canonical.equipment[1]] = [canonical.equipment[1], canonical.equipment[0]];
  });
  expectFailure(root, /equipment indexes must be deterministically ordered/);
}));

test('check mode rejects missing Race choices', () => withFixture((root) => {
  mutateCanonical(root, (canonical) => canonical.raceChoices.pop());
  expectFailure(root, /Race choice membership or fidelity differs/);
}));

test('check mode rejects duplicated and nondeterministically ordered choice or modifier IDs', () => {
  withFixture((root) => {
    mutateCanonical(root, (canonical) => {
      canonical.raceChoices[1].id = canonical.raceChoices[0].id;
    });
    expectFailure(root, /Race choice IDs contains duplicated stable IDs/);
  });
  withFixture((root) => {
    mutateCanonical(root, (canonical) => {
      [canonical.featureModifiers[0], canonical.featureModifiers[1]] = [canonical.featureModifiers[1], canonical.featureModifiers[0]];
    });
    expectFailure(root, /feature modifiers must be deterministically ordered/);
  });
});

test('check mode rejects missing required modifiers and unresolved modifier sources', () => withFixture((root) => {
  mutateCanonical(root, (canonical) => canonical.featureModifiers.pop());
  expectFailure(root, /required supported feature modifiers differ/);
}));

test('check mode rejects an unresolved feature-modifier source', () => withFixture((root) => {
  mutateCanonical(root, (canonical) => {
    canonical.featureModifiers.at(-1).sourceIndex = 'unknown-feature';
  });
  expectFailure(root, /references unknown canonical source unknown-feature/);
}));

test('check mode rejects behavioral drift in the existing T-026 projection', () => withFixture((root) => {
  mutateCanonical(root, (canonical) => {
    canonical.classes[0].levels[0].proficiencyBonus = 3;
  });
  expectFailure(root, /existing T-026 Level Up projection changed behaviorally/);
}));

test('check mode enforces exact Half-Elf choices and Barbarian shield compatibility', () => withFixture((root) => {
  mutateCanonical(root, (canonical) => {
    canonical.raceChoices.find(({ id }) => id === 'half-elf-ability-bonuses').selectionCount = 1;
  });
  expectFailure(root, /Half-Elf ability choice differs/);
}));

test('check mode rejects a Barbarian shield restriction and required modifier drift', () => {
  withFixture((root) => {
    mutateCanonical(root, (canonical) => {
      canonical.featureModifiers.find(({ id }) => id === 'barbarian-unarmored-defense-ac').conditions.push('not-using-shield');
    });
    expectFailure(root, /Barbarian Unarmored Defense shield compatibility differs/);
  });
  for (const id of [
    'barbarian-fast-movement-speed',
    'draconic-resilience-ac',
    'draconic-resilience-maximum-hit-points',
    'hill-dwarf-dwarven-toughness-maximum-hit-points',
  ]) {
    withFixture((root) => {
      mutateCanonical(root, (canonical) => {
        canonical.featureModifiers.find((modifier) => modifier.id === id).value = 0;
      });
      expectFailure(root, new RegExp(`required supported feature modifier ${id} differs`));
    });
  }
});

test('check mode rejects frontend and backend parity drift', () => withFixture((root) => {
  const path = join(root, 'backend/internal/rules/generated_character_creation_rules.go');
  writeFileSync(path, `${readFileSync(path, 'utf8')}\n`);
  expectFailure(root, /generated output is stale or parity differs/);
}));

test('regeneration is deterministic', () => withFixture((root) => {
  run(root, []);
  const first = fixtureFiles.slice(2).map((relativePath) => readFileSync(join(root, relativePath), 'utf8'));
  run(root, []);
  const second = fixtureFiles.slice(2).map((relativePath) => readFileSync(join(root, relativePath), 'utf8'));
  assert.deepEqual(second, first);
}));
