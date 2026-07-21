import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { CharactersApiError } from '../characters/api';
import type {
  AbilityName,
  LevelUpCharacterRequestDTO,
  LevelUpClassChoiceInput,
  SavedCharacterDTO,
} from '../characters/apiTypes';
import type { CharacterSheetV1 } from '../characters/characterSheet';
import { characterCreationRules } from '../rules/generated/characterCreationRules';
import { levelUpRules } from '../rules/generated/levelUpRules';
import {
  abilityModifier,
  activeFeatureIndexesForLevelUpChoices,
  buildLevelUpPlan,
  choiceAlreadyPresent,
  humanizeRuleId,
  optionsForChoice,
  preparedSpellCount,
  reconcileLevelUpChoiceSelections,
  type CanonicalChoiceRule,
  type CanonicalSpellcastingRule,
  type LevelUpPlan,
  type LevelUpStep,
} from './stateMachine';
import './levelUp.css';

type LevelUpFlowProps = {
  character: SavedCharacterDTO;
  sheet: CharacterSheetV1;
  onClose: () => void;
  onSubmit: (request: LevelUpCharacterRequestDTO) => Promise<SavedCharacterDTO>;
  onSuccess: (character: SavedCharacterDTO) => void;
  onReload: () => void;
};

type ChoiceDraft = {
  optionIds: string[];
  manualNote: string;
};

type Draft = {
  hpMode: 'fixed-average' | 'rolled';
  hpRoll: string;
  currentHpMode: 'increase-by-gain' | 'retain' | 'manual';
  manualCurrentHp: string;
  subclassMode: '' | 'srd' | 'manual';
  subclassIndex: string;
  manualSubclassName: string;
  asiMode: 'ability-scores' | 'feat-note';
  abilityIncreases: Partial<Record<AbilityName, 1 | 2>>;
  featNote: string;
  choices: Record<string, ChoiceDraft>;
  spellAdditions: string[];
  preparedSpellIds: string[];
  wizardSpellbookAdditions: string[];
  replacementRemoveSpellId: string;
  replacementAddSpellId: string;
  retainedConfirmed: boolean;
  overrides: Record<OverrideName, string>;
};

type OverrideName =
  | 'proficiencyBonus'
  | 'initiative'
  | 'passivePerception'
  | 'spellSaveDC'
  | 'spellAttackBonus';

type FieldError = { id: string; message: string };

type CanonicalSpell = {
  index: string;
  name: string;
  level: number;
  classIndexes: readonly string[];
  subclassMemberships: readonly {
    subclassIndex: string;
    classIndex: string;
    classLevel: number;
    kind: 'expanded' | 'always-prepared';
    requiredFeatureIndexes: readonly string[];
  }[];
};

const abilityNames: AbilityName[] = [
  'strength',
  'dexterity',
  'constitution',
  'intelligence',
  'wisdom',
  'charisma',
];

const canonicalSpells = levelUpRules.spells as unknown as readonly CanonicalSpell[];

const standardSkillAbilities: Record<string, AbilityName> = {
  acrobatics: 'dexterity',
  'animal handling': 'wisdom',
  arcana: 'intelligence',
  athletics: 'strength',
  deception: 'charisma',
  history: 'intelligence',
  insight: 'wisdom',
  intimidation: 'charisma',
  investigation: 'intelligence',
  medicine: 'wisdom',
  nature: 'intelligence',
  perception: 'wisdom',
  performance: 'charisma',
  persuasion: 'charisma',
  religion: 'intelligence',
  'sleight of hand': 'dexterity',
  stealth: 'dexterity',
  survival: 'wisdom',
};

const stepLabels: Record<LevelUpStep, string> = {
  'decision-prerequisites': 'Review earlier choices',
  'decision-hp': 'Choose hit points',
  'decision-subclass': 'Choose a subclass',
  'decision-asi': 'Choose an Ability Score Improvement',
  'decision-spells': 'Choose spells',
  'decision-class-specific': 'Choose class options',
  'decision-confirm-retained': 'Confirm retained values',
  review: 'Review level up',
};

export const LevelUpFlow = ({
  character,
  sheet,
  onClose,
  onSubmit,
  onSuccess,
  onReload,
}: LevelUpFlowProps) => {
  const plan = useMemo(() => buildLevelUpPlan(character, sheet), [character, sheet]);
  const [stepIndex, setStepIndex] = useState(0);
  const [draft, setDraft] = useState<Draft>(() => createDraft());
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const submitLockRef = useRef(false);
  const activeRef = useRef(true);
  const currentStep = plan.steps[stepIndex];

  useEffect(() => {
    activeRef.current = true;
    const app = document.querySelector<HTMLElement>('.global-shell');
    if (app) {
      app.inert = true;
    }
    headingRef.current?.focus();
    return () => {
      activeRef.current = false;
      if (app) {
        app.inert = false;
      }
    };
  }, []);

  useEffect(() => {
    headingRef.current?.focus();
  }, [stepIndex]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSubmitting) {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab' || dialogRef.current === null) {
        return;
      }
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ));
      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isSubmitting, onClose]);

  const updateDraft = <Key extends keyof Draft>(key: Key, value: Draft[Key]) => {
    setDraft((current) => ({
      ...current,
      [key]: key === 'choices'
        ? reconcileLevelUpChoiceSelections(plan.classRule, sheet, plan.toLevel, value as Draft['choices'])
        : value,
    }));
    setErrors([]);
  };

  const validateCurrentStep = () => validateStep(currentStep, draft, plan, sheet);

  const focusFirstError = (nextErrors: FieldError[]) => {
    window.setTimeout(() => {
      document.getElementById(nextErrors[0]?.id)?.focus();
    }, 0);
  };

  const showValidationErrors = (nextErrors: FieldError[]) => {
    setErrors(nextErrors);
    const first = nextErrors[0];
    if (first?.id === 'manual-current-hp') {
      const hpStep = plan.steps.indexOf('decision-hp');
      if (hpStep >= 0) setStepIndex(hpStep);
    }
    focusFirstError(nextErrors);
  };

  const goNext = () => {
    const nextErrors = validateCurrentStep();
    if (nextErrors.length > 0) {
      showValidationErrors(nextErrors);
      return;
    }
    if (plan.steps[stepIndex + 1] === 'review') {
      const finalErrors = validateAllSteps(draft, plan, sheet);
      if (finalErrors.length > 0) {
        showValidationErrors(finalErrors);
        return;
      }
    }
    setErrors([]);
    setStepIndex((current) => Math.min(current + 1, plan.steps.length - 1));
  };

  const goBack = () => {
    setErrors([]);
    setRequestError(null);
    setStepIndex((current) => Math.max(0, current - 1));
  };

  const submit = async () => {
    if (submitLockRef.current) {
      return;
    }
    const reviewErrors = validateAllSteps(draft, plan, sheet);
    if (reviewErrors.length > 0) {
      showValidationErrors(reviewErrors);
      return;
    }
    submitLockRef.current = true;
    setIsSubmitting(true);
    setRequestError(null);
    try {
      const updated = await onSubmit(buildRequest(character, sheet, plan, draft));
      if (activeRef.current) {
        onSuccess(updated);
      }
    } catch (error) {
      if (!activeRef.current) {
        return;
      }
      if (error instanceof CharactersApiError && error.status === 409) {
        setConflict(true);
      } else {
        setRequestError(
          error instanceof Error && error.message
            ? error.message
            : 'Could not level up this character. Try again.',
        );
      }
    } finally {
      submitLockRef.current = false;
      if (activeRef.current) {
        setIsSubmitting(false);
      }
    }
  };

  const blockedReason = plan.blockedReason;
  const body = blockedReason ? (
    <BlockedState reason={blockedReason} onClose={onClose} />
  ) : conflict ? (
    <ConflictState onClose={onClose} onReload={onReload} />
  ) : (
    <>
      <p className="level-up-flow__progress">
        Step {stepIndex + 1} of {plan.steps.length}. Level {plan.fromLevel} to {plan.toLevel}.
      </p>
      <ErrorSummary errors={errors} requestError={requestError} />
      <div className="level-up-flow__body">
        {renderStep(currentStep, { plan, sheet, draft, updateDraft, errors })}
      </div>
      <footer className="level-up-flow__actions">
        {stepIndex > 0 ? (
          <button type="button" className="button button--secondary" onClick={goBack} disabled={isSubmitting}>
            Back
          </button>
        ) : (
          <button type="button" className="button button--secondary" onClick={onClose}>
            Cancel
          </button>
        )}
        {currentStep === 'review' ? (
          <button
            type="button"
            className="button button--primary"
            onClick={() => void submit()}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Leveling up...' : requestError ? 'Try again' : 'Confirm level up'}
          </button>
        ) : (
          <button type="button" className="button button--primary" onClick={goNext}>
            Continue
          </button>
        )}
      </footer>
    </>
  );

  return createPortal(
    <div className="level-up-layer" onMouseDown={isSubmitting ? undefined : onClose}>
      <div
        ref={dialogRef}
        className="level-up-flow"
        role="dialog"
        aria-modal="true"
        aria-labelledby="level-up-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="level-up-flow__header">
          <p className="eyebrow">Guided level up</p>
          <h2 id="level-up-title" className="sr-only">Level up {character.name}</h2>
          <h3 ref={headingRef} tabIndex={-1}>{blockedReason ? 'Level up is blocked' : conflict ? 'Reload required' : stepLabels[currentStep]}</h3>
          <button
            type="button"
            className="level-up-flow__close"
            aria-label="Close level-up flow"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Close
          </button>
        </header>
        {body}
      </div>
    </div>,
    document.body,
  );
};

type StepContext = {
  plan: LevelUpPlan;
  sheet: CharacterSheetV1;
  draft: Draft;
  updateDraft: <Key extends keyof Draft>(key: Key, value: Draft[Key]) => void;
  errors: FieldError[];
};

const renderStep = (step: LevelUpStep, context: StepContext) => {
  switch (step) {
    case 'decision-prerequisites':
      return <PrerequisiteStep {...context} />;
    case 'decision-hp':
      return <HitPointStep {...context} />;
    case 'decision-subclass':
      return <SubclassStep {...context} />;
    case 'decision-asi':
      return <AbilityScoreStep {...context} />;
    case 'decision-spells':
      return <SpellStep {...context} />;
    case 'decision-class-specific':
      return <ClassChoiceStep {...context} />;
    case 'decision-confirm-retained':
      return <RetainedStep {...context} />;
    case 'review':
      return <ReviewStep {...context} />;
  }
};

const PrerequisiteStep = ({ plan, sheet, draft, updateDraft }: StepContext) => {
  if (plan.missingPrerequisites.length === 0) {
    return (
      <section className="level-up-panel">
        <p>No earlier required class or spell choices are missing.</p>
        <p className="level-up-help">Hunin will keep every represented earlier choice unchanged.</p>
      </section>
    );
  }
  return (
    <section className="level-up-panel">
      <p>Complete the earlier choices that can be represented safely before adding the new level.</p>
      {plan.missingPrerequisites.map((item) => item.kind === 'subclass' ? (
        <SubclassFields key={item.id} plan={plan} draft={draft} updateDraft={updateDraft} prefix="prerequisite" />
      ) : item.kind === 'class-choice' ? (
        <ChoiceEditor
          key={item.id}
          classRule={plan.classRule}
          rule={item.rule}
          level={plan.fromLevel}
          sheet={sheet}
          draft={draft}
          updateDraft={updateDraft}
          prefix="prerequisite"
        />
      ) : null)}
    </section>
  );
};

const HitPointStep = ({ plan, sheet, draft, updateDraft }: StepContext) => {
  const conModifier = abilityModifier(sheet.abilities.scores.constitution);
  const fixedGain = Math.max(1, plan.fixedAverageHp + conModifier);
  return (
    <section className="level-up-panel">
      <p>Choose the hit-die result for this level. The server applies Constitution changes and validates the final maximum.</p>
      <fieldset>
        <legend>Hit point increase</legend>
        <RadioCard
          id="hp-fixed"
          name="hp-mode"
          checked={draft.hpMode === 'fixed-average'}
          onChange={() => updateDraft('hpMode', 'fixed-average')}
          label={`Use fixed average: ${plan.fixedAverageHp} + Constitution modifier (${formatSigned(conModifier)})`}
          detail={`Current maximum ${sheet.combat.hitPoints.max}. Suggested base increase ${fixedGain}.`}
        />
        <RadioCard
          id="hp-rolled"
          name="hp-mode"
          checked={draft.hpMode === 'rolled'}
          onChange={() => updateDraft('hpMode', 'rolled')}
          label={`Enter a d${plan.classRule.hitDie} roll`}
          detail="Enter the die result only. Hunin adds the resulting Constitution modifier."
        />
        {draft.hpMode === 'rolled' ? (
          <label className="level-up-field" htmlFor="hp-roll">
            Hit die roll
            <input
              id="hp-roll"
              type="number"
              min="1"
              max={plan.classRule.hitDie}
              inputMode="numeric"
              value={draft.hpRoll}
              onChange={(event) => updateDraft('hpRoll', event.target.value)}
            />
          </label>
        ) : null}
      </fieldset>
      <fieldset>
        <legend>Current hit points after level up</legend>
        <RadioCard id="current-hp-gain" name="current-hp" checked={draft.currentHpMode === 'increase-by-gain'} onChange={() => updateDraft('currentHpMode', 'increase-by-gain')} label="Increase by the complete max-HP gain" detail="Capped at the final maximum." />
        <RadioCard id="current-hp-retain" name="current-hp" checked={draft.currentHpMode === 'retain'} onChange={() => updateDraft('currentHpMode', 'retain')} label={`Retain ${sheet.combat.hitPoints.current} current HP`} />
        <RadioCard id="current-hp-manual" name="current-hp" checked={draft.currentHpMode === 'manual'} onChange={() => updateDraft('currentHpMode', 'manual')} label="Enter current HP manually" />
        {draft.currentHpMode === 'manual' ? (
          <label className="level-up-field" htmlFor="manual-current-hp">
            Final current HP
            <input id="manual-current-hp" type="number" min="0" max="9999" inputMode="numeric" value={draft.manualCurrentHp} onChange={(event) => updateDraft('manualCurrentHp', event.target.value)} />
          </label>
        ) : null}
      </fieldset>
    </section>
  );
};

const SubclassStep = (context: StepContext) => (
  <section className="level-up-panel">
    <p>{context.plan.classRule.subclasses[0]?.flavor ?? 'Subclass'} becomes part of this character at level {context.plan.toLevel}.</p>
    <SubclassFields {...context} prefix="target" />
  </section>
);

const SubclassFields = ({ plan, draft, updateDraft, prefix }: Pick<StepContext, 'plan' | 'draft' | 'updateDraft'> & { prefix: string }) => (
  <fieldset>
    <legend>{plan.classRule.subclasses[0]?.flavor ?? 'Subclass'}</legend>
    <RadioCard id={`${prefix}-subclass-srd`} name={`${prefix}-subclass-source`} checked={draft.subclassMode === 'srd'} onChange={() => {
      updateDraft('subclassIndex', plan.classRule.subclasses[0]?.index ?? '');
      updateDraft('subclassMode', 'srd');
    }} label={`Use SRD ${plan.classRule.subclasses[0]?.name ?? 'subclass'}`} detail="Canonical SRD 5.1 option." />
    <RadioCard id={`${prefix}-subclass-manual`} name={`${prefix}-subclass-source`} checked={draft.subclassMode === 'manual'} onChange={() => {
      updateDraft('subclassIndex', '');
      updateDraft('subclassMode', 'manual');
    }} label="Retain a reviewed manual subclass" detail="Hunin records this choice as needing audit." />
    {draft.subclassMode === 'manual' ? (
      <label className="level-up-field" htmlFor={`${prefix}-manual-subclass`}>
        Manual subclass name
        <input id={`${prefix}-manual-subclass`} maxLength={200} value={draft.manualSubclassName} onChange={(event) => updateDraft('manualSubclassName', event.target.value)} />
      </label>
    ) : null}
  </fieldset>
);

const AbilityScoreStep = ({ plan, sheet, draft, updateDraft }: StepContext) => {
  const total = Object.values(draft.abilityIncreases).reduce<number>((sum, value) => sum + (value ?? 0), 0);
  return (
    <section className="level-up-panel">
      <p>{plan.schemaVersion === 'CharacterSheetV2'
        ? 'At level 4, increase one score by 2 or increase two scores by 1.'
        : 'At level 4, increase one score by 2, increase two scores by 1, or record a reviewed feat note.'}</p>
      <fieldset>
        <legend>Level 4 choice</legend>
        <RadioCard id="asi-scores" name="asi-mode" checked={draft.asiMode === 'ability-scores'} onChange={() => updateDraft('asiMode', 'ability-scores')} label="Increase ability scores" />
        {plan.schemaVersion === 'CharacterSheetV1' ? (
          <RadioCard id="asi-feat" name="asi-mode" checked={draft.asiMode === 'feat-note'} onChange={() => updateDraft('asiMode', 'feat-note')} label="Record a manual feat note" detail="The feat catalog is outside this SRD slice." />
        ) : null}
      </fieldset>
      {draft.asiMode === 'ability-scores' ? (
        <fieldset>
          <legend>Ability increases ({total} of 2 points)</legend>
          <div className="level-up-ability-grid">
            {abilityNames.map((ability) => (
              <label key={ability} htmlFor={`asi-${ability}`}>
                <span>{capitalize(ability)}: {sheet.abilities.scores[ability]}</span>
                <select id={`asi-${ability}`} value={draft.abilityIncreases[ability] ?? 0} onChange={(event) => {
                  const value = Number(event.target.value) as 0 | 1 | 2;
                  const next = { ...draft.abilityIncreases };
                  if (value === 0) delete next[ability]; else next[ability] = value;
                  updateDraft('abilityIncreases', next);
                }}>
                  <option value="0">No increase</option>
                  <option value="1">+1</option>
                  <option value="2">+2</option>
                </select>
              </label>
            ))}
          </div>
        </fieldset>
      ) : (
        <label className="level-up-field" htmlFor="feat-note">
          Feat note
          <textarea id="feat-note" maxLength={1000} rows={4} value={draft.featNote} onChange={(event) => updateDraft('featNote', event.target.value)} />
        </label>
      )}
    </section>
  );
};

const ClassChoiceStep = ({ plan, sheet, draft, updateDraft }: StepContext) => (
  <section className="level-up-panel">
    <p>Choose the canonical class options unlocked at level {plan.toLevel}.</p>
    {targetChoiceRules(plan, sheet, draft).map((choice) => (
      <ChoiceEditor key={choice.id} classRule={plan.classRule} rule={choice} level={plan.toLevel} sheet={sheet} draft={draft} updateDraft={updateDraft} prefix="target" />
    ))}
  </section>
);

const ChoiceEditor = ({ classRule, rule, level, sheet, draft, updateDraft, prefix }: {
  classRule: LevelUpPlan['classRule'];
  rule: CanonicalChoiceRule;
  level: number;
  sheet: CharacterSheetV1;
  draft: Draft;
  updateDraft: StepContext['updateDraft'];
  prefix: string;
}) => {
  const value = draft.choices[rule.id] ?? { optionIds: [], manualNote: '' };
  const activeFeatures = activeFeatureIndexesForLevelUpChoices(classRule, sheet, draft.choices);
  const options = optionsForChoice(rule, sheet, level, activeFeatures);
  const required = rule.selectionCountByLevel[String(level)] ?? 0;
  const update = (next: ChoiceDraft) => updateDraft('choices', { ...draft.choices, [rule.id]: next });
  return (
    <fieldset className="level-up-choice-group">
      <legend>{humanizeRuleId(rule.id)}: choose {required}</legend>
      <p className="level-up-help">Selected {value.optionIds.length} of {required}.</p>
      <div className="level-up-check-grid">
        {options.map((option) => (
          <CheckboxCard
            key={option.index}
            id={`${prefix}-${rule.id}-${option.index}`}
            checked={value.optionIds.includes(option.index)}
            onChange={(checked) => update({
              optionIds: checked
                ? required === 1 ? [option.index] : [...value.optionIds, option.index]
                : value.optionIds.filter((id) => id !== option.index),
              manualNote: '',
            })}
            label={option.name}
          />
        ))}
      </div>
      {rule.allowManual ? (
        <label className="level-up-field" htmlFor={`${prefix}-${rule.id}-manual`}>
          Or enter a reviewed manual choice
          <textarea id={`${prefix}-${rule.id}-manual`} rows={3} maxLength={1000} value={value.manualNote} onChange={(event) => update({ optionIds: [], manualNote: event.target.value })} />
        </label>
      ) : null}
    </fieldset>
  );
};

const SpellStep = ({ plan, sheet, draft, updateDraft }: StepContext) => {
  const progression = plan.targetRule.spellcasting as CanonicalSpellcastingRule;
  const eligible = eligibleSpells(plan, sheet, draft);
  const existing = sheet.spellcasting?.spells ?? [];
  const cantrips = eligible.filter((spell) => spell.level === 0 && !existing.some((item) => item.id === spell.index));
  const leveled = eligible.filter((spell) => spell.level > 0);
  const knownMode = progression.mode === 'known' || progression.mode === 'pact-known';
  const preparedMode = progression.mode === 'prepared';
  const wizardMode = progression.mode === 'spellbook-prepared';
  const preparedOptions = wizardMode
    ? [...existing.filter((spell) => spell.level > 0).map((spell) => ({ index: spell.id, name: spell.name, level: spell.level })), ...leveled.filter((spell) => draft.wizardSpellbookAdditions.includes(spell.index))]
    : [...existing.filter((spell) => spell.level > 0).map((spell) => ({ index: spell.id, name: spell.name, level: spell.level })), ...leveled.filter((spell) => !existing.some((item) => item.id === spell.index))];
  return (
    <section className="level-up-panel">
      <p>Only spells in the committed SRD snapshot and this class list can be added. Existing non-SRD spells remain unchanged.</p>
      {(progression.cantripsKnown ?? 0) > 0 ? (
        <SpellCheckboxGroup
          legend={`Cantrips: choose enough to reach ${progression.cantripsKnown}`}
          prefix="spell-addition-cantrip"
          spells={cantrips}
          selected={draft.spellAdditions}
          onChange={(ids) => {
            updateDraft('spellAdditions', ids);
            if (ids.includes(draft.replacementAddSpellId)) updateDraft('replacementAddSpellId', '');
          }}
        />
      ) : null}
      {knownMode ? (
        <>
          <SpellCheckboxGroup
            legend={`Known spells: choose enough to reach ${progression.spellsKnown}`}
            prefix="spell-addition-known"
            spells={leveled.filter((spell) => !existing.some((item) => item.id === spell.index))}
            selected={draft.spellAdditions}
            onChange={(ids) => {
              updateDraft('spellAdditions', ids);
              if (ids.includes(draft.replacementAddSpellId)) updateDraft('replacementAddSpellId', '');
            }}
          />
          {progression.replacementLimit > 0 && existing.some((spell) => spell.level > 0) ? (
            <fieldset>
              <legend>Optional spell replacement</legend>
              <label className="level-up-field" htmlFor="replacement-remove">
                Existing spell to replace
                <select id="replacement-remove" value={draft.replacementRemoveSpellId} onChange={(event) => {
                  updateDraft('replacementRemoveSpellId', event.target.value);
                  updateDraft('replacementAddSpellId', '');
                }}>
                  <option value="">Do not replace a spell</option>
                  {existing.filter((spell) => spell.level > 0).map((spell) => <option key={spell.id} value={spell.id}>{spell.name}</option>)}
                </select>
              </label>
              {draft.replacementRemoveSpellId ? (
                <label className="level-up-field" htmlFor="replacement-add">
                  Replacement SRD spell
                  <select id="replacement-add" value={draft.replacementAddSpellId} onChange={(event) => updateDraft('replacementAddSpellId', event.target.value)}>
                    <option value="">Choose a replacement</option>
                    {leveled.filter((spell) => !existing.some((item) => item.id === spell.index) && !draft.spellAdditions.includes(spell.index)).map((spell) => <option key={spell.index} value={spell.index}>{spell.name}</option>)}
                  </select>
                </label>
              ) : null}
            </fieldset>
          ) : null}
        </>
      ) : null}
      {wizardMode ? (
        <SpellCheckboxGroup
          legend="Wizard spellbook: choose exactly 2 new spells"
          prefix="wizard-spellbook"
          spells={leveled.filter((spell) => !existing.some((item) => item.id === spell.index))}
          selected={draft.wizardSpellbookAdditions}
          onChange={(ids) => updateDraft('wizardSpellbookAdditions', ids)}
        />
      ) : null}
      {(preparedMode || wizardMode) ? (
        <SpellCheckboxGroup
          legend={`Prepared spells: choose exactly ${preparedCountFor(plan, sheet, draft)}`}
          prefix="prepared-spell"
          spells={deduplicateSpells(preparedOptions).filter((spell) => !isAlwaysPrepared(spell.index, plan, sheet, draft))}
          selected={draft.preparedSpellIds}
          onChange={(ids) => {
            updateDraft('preparedSpellIds', ids);
            if (preparedMode) {
              const existingIds = new Set(existing.map((spell) => spell.id));
              const selectedCantrips = draft.spellAdditions.filter((id) => canonicalSpells.find((spell) => spell.index === id)?.level === 0);
              updateDraft('spellAdditions', [...selectedCantrips, ...ids.filter((id) => !existingIds.has(id))]);
            }
          }}
        />
      ) : null}
      <p className="level-up-help">Pact Magic, half-caster slots, standard slots, and used-slot preservation are calculated by the server from the same canonical snapshot.</p>
    </section>
  );
};

const SpellCheckboxGroup = ({ legend, prefix, spells, selected, onChange }: {
  legend: string;
  prefix: string;
  spells: readonly { index: string; name: string; level: number }[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) => (
  <fieldset className="level-up-choice-group">
    <legend>{legend}</legend>
    <div className="level-up-spell-grid">
      {spells.map((spell) => (
        <CheckboxCard
          key={spell.index}
          id={`${prefix}-${spell.index}`}
          checked={selected.includes(spell.index)}
          onChange={(checked) => onChange(checked ? [...selected, spell.index] : selected.filter((id) => id !== spell.index))}
          label={spell.name}
          detail={spell.level === 0 ? 'Cantrip' : `Level ${spell.level}`}
        />
      ))}
    </div>
  </fieldset>
);

const RetainedStep = ({ plan, sheet, draft, updateDraft }: StepContext) => (
  <section className="level-up-panel">
    <p>{plan.schemaVersion === 'CharacterSheetV2'
      ? 'Structured values are recalculated server-side from the saved V2 decisions. Manual content remains unchanged.'
      : 'These values stay exactly as represented because their source cannot be recalculated safely from CharacterSheetV1.'}</p>
    <dl className="level-up-review-list">
      <ReviewRow label="Armor Class" previous={String(sheet.combat.armorClass.value)} proposed={plan.schemaVersion === 'CharacterSheetV2' ? 'Recalculated' : 'Retained'} reason={plan.schemaVersion === 'CharacterSheetV2' ? 'Structured defense and canonical modifiers remain authoritative.' : 'Equipment detail is not structured enough for safe recalculation.'} />
      <ReviewRow label="Speed" previous={`${sheet.combat.speed[0].feet} ft.`} proposed={plan.schemaVersion === 'CharacterSheetV2' ? 'Recalculated' : 'Retained'} reason={plan.schemaVersion === 'CharacterSheetV2' ? 'Structured Race, equipment, and Class modifiers remain authoritative.' : 'Ancestry and manual movement exceptions stay unchanged.'} />
      <ReviewRow label="Attacks" previous={`${sheet.actions.length} represented`} proposed={plan.schemaVersion === 'CharacterSheetV2' ? 'Recalculated' : 'Retained'} reason={plan.schemaVersion === 'CharacterSheetV2' ? 'Structured attack ability and proficiency inputs remain authoritative.' : 'Attack ability and proficiency sources are not explicit.'} />
      <ReviewRow label="Equipment" previous={`${sheet.equipment.weapons.length + sheet.equipment.packsAndGear.values.length} represented items`} proposed="Retained" reason="Level up does not edit equipment." />
      <ReviewRow label="Manual and non-SRD content" previous="Preserved" proposed="Preserved" reason="Existing reviewed content is outside canonical automation." />
    </dl>
    <CheckboxCard id="confirm-retained" checked={draft.retainedConfirmed} onChange={(checked) => updateDraft('retainedConfirmed', checked)} label="I reviewed the values that will be retained" detail="This confirmation does not authorize hidden changes." />
  </section>
);

const ReviewStep = ({ plan, sheet, draft, updateDraft }: StepContext) => {
  const review = buildReview(plan, sheet, draft);
  return (
    <section className="level-up-panel">
      <p>Review every proposed change and retained critical value before submitting.</p>
      <dl className="level-up-review-list">
        {review.map((item) => <ReviewRow key={item.label} {...item} />)}
      </dl>
      {plan.schemaVersion === 'CharacterSheetV1' ? <fieldset>
        <legend>Explicit typed overrides (optional)</legend>
        <p className="level-up-help">Leave these blank to use canonical values. Manual overrides are marked as needing audit by the server. The decision summary never authorizes a value.</p>
        {([
          ['proficiencyBonus', 'Proficiency bonus'],
          ['initiative', 'Initiative'],
          ['passivePerception', 'Passive Perception'],
          ['spellSaveDC', 'Spell save DC'],
          ['spellAttackBonus', 'Spell attack bonus'],
        ] as const).map(([name, label]) => {
          const spellOnly = name === 'spellSaveDC' || name === 'spellAttackBonus';
          if (spellOnly && plan.targetRule.spellcasting === null) return null;
          return (
            <label key={name} className="level-up-field" htmlFor={`override-${name}`}>
              {label} override
              <input id={`override-${name}`} type="number" inputMode="numeric" value={draft.overrides[name]} onChange={(event) => updateDraft('overrides', { ...draft.overrides, [name]: event.target.value })} />
            </label>
          );
        })}
      </fieldset> : null}
      <section className="level-up-payload-note" aria-label="Submission privacy">
        <h4>What Hunin sends</h4>
        <p>Only these decisions and the saved update timestamp. Class, source level, target level, owner, Party data, and the character sheet are not submitted.</p>
      </section>
    </section>
  );
};

const BlockedState = ({ reason, onClose }: { reason: string; onClose: () => void }) => (
  <section className="level-up-panel level-up-blocked" role="alert">
    <p>{reason}</p>
    <p>No changes were sent or saved. Review this character manually before trying again.</p>
    <button type="button" className="button button--primary" onClick={onClose}>Return to Character Reference</button>
  </section>
);

const ConflictState = ({ onClose, onReload }: { onClose: () => void; onReload: () => void }) => (
  <section className="level-up-panel level-up-blocked" role="alert">
    <p>This character changed after the level-up flow started.</p>
    <p>Reload the saved character before making new decisions. Hunin will not retry this request automatically.</p>
    <div className="level-up-flow__actions">
      <button type="button" className="button button--secondary" onClick={onClose}>Cancel</button>
      <button type="button" className="button button--primary" onClick={onReload}>Reload character</button>
    </div>
  </section>
);

const ErrorSummary = ({ errors, requestError }: { errors: FieldError[]; requestError: string | null }) => {
  if (errors.length === 0 && requestError === null) return null;
  return (
    <div className="level-up-errors" role="alert" aria-labelledby="level-up-errors-title">
      <h4 id="level-up-errors-title">Check the level-up choices</h4>
      {requestError ? <p>{requestError}</p> : null}
      {errors.length > 0 ? <ul>{errors.map((error) => <li key={`${error.id}-${error.message}`}>{error.message}</li>)}</ul> : null}
    </div>
  );
};

const RadioCard = ({ id, name, checked, onChange, label, detail }: {
  id: string; name: string; checked: boolean; onChange: () => void; label: string; detail?: string;
}) => (
  <label className="level-up-option" htmlFor={id}>
    <input id={id} type="radio" name={name} checked={checked} onChange={onChange} />
    <span><strong>{label}</strong>{detail ? <small>{detail}</small> : null}</span>
  </label>
);

const CheckboxCard = ({ id, checked, onChange, label, detail }: {
  id: string; checked: boolean; onChange: (checked: boolean) => void; label: string; detail?: string;
}) => (
  <label className="level-up-option" htmlFor={id}>
    <input id={id} type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    <span><strong>{label}</strong>{detail ? <small>{detail}</small> : null}</span>
  </label>
);

const ReviewRow = ({ label, previous, proposed, reason }: {
  label: string; previous: string; proposed: string; reason: string;
}) => (
  <div className="level-up-review-row">
    <dt>{label}</dt>
    <dd><span><strong>Previous:</strong> {previous}</span><span><strong>Proposed:</strong> {proposed}</span><small>{reason}</small></dd>
  </div>
);

const createDraft = (): Draft => ({
  hpMode: 'fixed-average',
  hpRoll: '',
  currentHpMode: 'increase-by-gain',
  manualCurrentHp: '',
  subclassMode: '',
  subclassIndex: '',
  manualSubclassName: '',
  asiMode: 'ability-scores',
  abilityIncreases: {},
  featNote: '',
  choices: {},
  spellAdditions: [],
  preparedSpellIds: [],
  wizardSpellbookAdditions: [],
  replacementRemoveSpellId: '',
  replacementAddSpellId: '',
  retainedConfirmed: false,
  overrides: {
    proficiencyBonus: '', initiative: '', passivePerception: '', spellSaveDC: '', spellAttackBonus: '',
  },
});

const validateStep = (step: LevelUpStep, draft: Draft, plan: LevelUpPlan, sheet: CharacterSheetV1): FieldError[] => {
  const errors: FieldError[] = [];
  if (step === 'decision-prerequisites') {
    if (plan.missingPrerequisites.some((item) => item.kind === 'subclass')) {
      validateSubclass(draft, errors, 'prerequisite');
    }
    for (const item of plan.missingPrerequisites) {
      if (item.kind === 'class-choice') validateChoice(item.rule, plan.fromLevel, draft, errors, 'prerequisite');
    }
  }
  if (step === 'decision-hp') {
    if (draft.hpMode === 'rolled') {
      const roll = Number(draft.hpRoll);
      if (!Number.isInteger(roll) || roll < 1 || roll > plan.classRule.hitDie) errors.push({ id: 'hp-roll', message: `Enter a whole-number d${plan.classRule.hitDie} roll from 1 to ${plan.classRule.hitDie}.` });
    }
    if (draft.currentHpMode === 'manual') {
      const current = Number(draft.manualCurrentHp);
      if (!Number.isInteger(current) || current < 0 || current > 9999) errors.push({ id: 'manual-current-hp', message: 'Enter final current HP as a whole number from 0 to 9999.' });
    }
  }
  if (step === 'decision-subclass') validateSubclass(draft, errors, 'target');
  if (step === 'decision-asi') {
    if (draft.asiMode === 'feat-note') {
      if (plan.schemaVersion === 'CharacterSheetV2') {
        errors.push({ id: 'asi-scores', message: 'CharacterSheetV2 requires a bounded ability-score increase.' });
      } else if (!draft.featNote.trim()) errors.push({ id: 'feat-note', message: 'Enter the reviewed feat note.' });
    } else {
      const values = Object.entries(draft.abilityIncreases);
      const total = values.reduce((sum, [, value]) => sum + (value ?? 0), 0);
      const invalidScore = values.find(([ability, increase]) => sheet.abilities.scores[ability as AbilityName] + (increase ?? 0) > 20);
      if (total !== 2 || values.length > 2 || invalidScore) errors.push({ id: 'asi-strength', message: 'Allocate exactly 2 points without increasing a score above 20.' });
    }
  }
  if (step === 'decision-class-specific') {
    for (const choice of targetChoiceRules(plan, sheet, draft)) validateChoice(choice, plan.toLevel, draft, errors, 'target');
  }
  if (step === 'decision-spells') errors.push(...validateSpells(draft, plan, sheet));
  if (step === 'decision-confirm-retained' && !draft.retainedConfirmed) errors.push({ id: 'confirm-retained', message: 'Confirm the retained critical values before continuing.' });
  if (step === 'review') {
    if (plan.schemaVersion === 'CharacterSheetV2' && Object.values(draft.overrides).some((value) => value !== '')) {
      errors.push({ id: 'override-proficiencyBonus', message: 'CharacterSheetV2 does not accept unaudited Level Up overrides.' });
    }
    for (const [name, raw] of Object.entries(draft.overrides)) {
      if (raw === '') continue;
      const value = Number(raw);
      const minimum = name === 'proficiencyBonus' ? 0 : name === 'initiative' || name === 'spellAttackBonus' ? -100 : 0;
      const maximum = name === 'proficiencyBonus' ? 20 : 100;
      if (!Number.isInteger(value) || value < minimum || value > maximum) errors.push({ id: `override-${name}`, message: `${humanizeRuleId(name)} override must be a whole number from ${minimum} to ${maximum}.` });
    }
  }
  return errors;
};

const validateAllSteps = (draft: Draft, plan: LevelUpPlan, sheet: CharacterSheetV1) => {
  const errors = plan.steps.flatMap((step) => validateStep(step, draft, plan, sheet));
  if (draft.currentHpMode === 'manual') {
    const current = Number(draft.manualCurrentHp);
    const finalMax = proposedMaxHp(plan, sheet, draft);
    if (Number.isInteger(current) && current >= 0 && current <= 9999 && current > finalMax) {
      errors.push({ id: 'manual-current-hp', message: `Manual current HP cannot exceed the final maximum of ${finalMax}.` });
    }
  }
  return errors;
};

const validateSubclass = (draft: Draft, errors: FieldError[], prefix: string) => {
  if (draft.subclassMode === '') {
    errors.push({ id: `${prefix}-subclass-srd`, message: 'Choose a subclass.' });
  } else if (draft.subclassMode === 'srd' && !draft.subclassIndex) {
    errors.push({ id: `${prefix}-subclass-srd`, message: 'Choose a subclass.' });
  } else if (draft.subclassMode === 'manual' && !draft.manualSubclassName.trim()) {
    errors.push({ id: `${prefix}-manual-subclass`, message: 'Enter the reviewed manual subclass name.' });
  }
};

const validateChoice = (rule: CanonicalChoiceRule, level: number, draft: Draft, errors: FieldError[], prefix: string) => {
  const value = draft.choices[rule.id] ?? { optionIds: [], manualNote: '' };
  const required = rule.selectionCountByLevel[String(level)] ?? 0;
  if (value.manualNote.trim()) {
    if (!rule.allowManual) errors.push({ id: `${prefix}-${rule.id}-manual`, message: `${humanizeRuleId(rule.id)} requires represented canonical choices.` });
  } else if (value.optionIds.length !== required || new Set(value.optionIds).size !== value.optionIds.length) {
    errors.push({ id: `${prefix}-${rule.id}-${rule.options[0]?.index ?? 'manual'}`, message: `Choose ${required} distinct option${required === 1 ? '' : 's'} for ${humanizeRuleId(rule.id)}.` });
  }
};

const validateSpells = (draft: Draft, plan: LevelUpPlan, sheet: CharacterSheetV1): FieldError[] => {
  const progression = plan.targetRule.spellcasting;
  if (!progression) return [];
  const existing = sheet.spellcasting?.spells ?? [];
  const additions = draft.spellAdditions.map((id) => canonicalSpells.find((spell) => spell.index === id)).filter((spell): spell is CanonicalSpell => Boolean(spell));
  const cantrips = existing.filter((spell) => spell.level === 0).length + additions.filter((spell) => spell.level === 0).length;
  if (progression.cantripsKnown !== null && progression.cantripsKnown !== undefined && cantrips !== progression.cantripsKnown) return [{ id: 'spell-addition-cantrip-' + (eligibleSpells(plan, sheet, draft).find((spell) => spell.level === 0)?.index ?? 'missing'), message: `Choose enough cantrips to reach exactly ${progression.cantripsKnown}.` }];
  if (progression.mode === 'known' || progression.mode === 'pact-known') {
    const leveled = existing.filter((spell) => spell.level > 0).length + additions.filter((spell) => spell.level > 0).length;
    if (leveled !== progression.spellsKnown) return [{ id: 'spell-addition-known-' + (eligibleSpells(plan, sheet, draft).find((spell) => spell.level > 0)?.index ?? 'missing'), message: `Choose enough leveled spells to reach exactly ${progression.spellsKnown}.` }];
    if (draft.replacementRemoveSpellId && !draft.replacementAddSpellId) return [{ id: 'replacement-add', message: 'Choose the SRD replacement spell.' }];
  }
  const spellChangeIds = [
    ...draft.spellAdditions,
    ...(draft.replacementAddSpellId ? [draft.replacementAddSpellId] : []),
    ...draft.wizardSpellbookAdditions,
  ];
  if (new Set(spellChangeIds).size !== spellChangeIds.length) {
    return [{ id: 'replacement-add', message: 'A spell cannot be selected in more than one spell change.' }];
  }
  if (progression.mode === 'spellbook-prepared' && draft.wizardSpellbookAdditions.length !== progression.wizardSpellbookAdditions) return [{ id: 'wizard-spellbook-' + (eligibleSpells(plan, sheet, draft).find((spell) => spell.level > 0)?.index ?? 'missing'), message: `Choose exactly ${progression.wizardSpellbookAdditions} Wizard spellbook additions.` }];
  if ((progression.mode === 'prepared' || progression.mode === 'spellbook-prepared') && draft.preparedSpellIds.length !== preparedCountFor(plan, sheet, draft)) return [{ id: 'prepared-spell-' + (eligibleSpells(plan, sheet, draft).find((spell) => spell.level > 0)?.index ?? sheet.spellcasting?.spells.find((spell) => spell.level > 0)?.id ?? 'missing'), message: `Choose exactly ${preparedCountFor(plan, sheet, draft)} prepared spells.` }];
  return [];
};

const buildRequest = (character: SavedCharacterDTO, sheet: CharacterSheetV1, plan: LevelUpPlan, draft: Draft): LevelUpCharacterRequestDTO => {
  const allowedChoiceIDs = new Set([
    ...plan.missingPrerequisites.filter((item) => item.kind === 'class-choice').map((item) => item.id),
    ...targetChoiceRules(plan, sheet, draft).map((choice) => choice.id),
  ]);
  const classInputs = plan.classRule.choices.flatMap((choice): LevelUpClassChoiceInput[] => {
    if (!allowedChoiceIDs.has(choice.id)) return [];
    const value = draft.choices[choice.id];
    if (!value) return [];
    return [{ ruleId: choice.id, optionIds: value.optionIds, ...(value.manualNote.trim() ? { manualNote: value.manualNote.trim() } : {}) }];
  });
  const prerequisiteIds = new Set(plan.missingPrerequisites.filter((item) => item.kind === 'class-choice').map((item) => item.id));
  const prerequisiteChoices = classInputs.filter((input) => prerequisiteIds.has(input.ruleId));
  const classChoices = classInputs.filter((input) => !prerequisiteIds.has(input.ruleId));
  const request: LevelUpCharacterRequestDTO = {
    expectedUpdatedAt: character.updatedAt,
    hp: draft.hpMode === 'fixed-average' ? { mode: 'fixed-average' } : { mode: 'rolled', roll: Number(draft.hpRoll) },
    currentHp: draft.currentHpMode === 'manual' ? { mode: 'manual', value: Number(draft.manualCurrentHp) } : { mode: draft.currentHpMode },
    prerequisiteChoices,
    classChoices,
    decisionSummary: buildDecisionSummary(plan, draft),
  };
  const needsSubclass = plan.toLevel >= plan.classRule.subclassDecisionLevel && !sheet.identity.classes[0].subclass;
  if (needsSubclass) request.subclass = draft.subclassMode === 'srd' ? { source: 'srd', index: draft.subclassIndex } : { source: 'manual', name: draft.manualSubclassName.trim() };
  if (plan.targetRule.abilityScoreImprovement) request.abilityScoreImprovement = draft.asiMode === 'feat-note' ? { mode: 'feat-note', note: draft.featNote.trim() } : { mode: 'ability-scores', increases: draft.abilityIncreases };
  if (plan.targetRule.spellcasting) request.spells = buildSpellChanges(plan, sheet, draft);
  if (plan.schemaVersion === 'CharacterSheetV1') {
    const overrides = Object.fromEntries(Object.entries(draft.overrides).filter(([, value]) => value !== '').map(([key, value]) => [key, Number(value)]));
    if (Object.keys(overrides).length > 0) request.overrides = overrides;
  }
  return request;
};

const buildSpellChanges = (plan: LevelUpPlan, sheet: CharacterSheetV1, draft: Draft) => {
  const progression = plan.targetRule.spellcasting as CanonicalSpellcastingRule;
  const existingIds = new Set(sheet.spellcasting?.spells.map((spell) => spell.id) ?? []);
  const additions = progression.mode === 'prepared'
    ? [...new Set([...draft.spellAdditions, ...draft.preparedSpellIds.filter((id) => !existingIds.has(id))])]
    : [...new Set(draft.spellAdditions)];
  const used = new Set(additions);
  const replacementAllowed = draft.replacementRemoveSpellId && draft.replacementAddSpellId && !used.has(draft.replacementAddSpellId);
  if (replacementAllowed) used.add(draft.replacementAddSpellId);
  const spellbookAdditions = progression.mode === 'spellbook-prepared'
    ? [...new Set(draft.wizardSpellbookAdditions)].filter((id) => !used.has(id))
    : [];
  return {
    additions: additions.map((index) => ({ source: 'srd' as const, index })),
    replacements: replacementAllowed ? [{ removeSpellId: draft.replacementRemoveSpellId, add: { source: 'srd' as const, index: draft.replacementAddSpellId } }] : [],
    preparedSpellIds: progression.mode === 'prepared' || progression.mode === 'spellbook-prepared' ? draft.preparedSpellIds : [],
    wizardSpellbookAdditions: spellbookAdditions.map((index) => ({ source: 'srd' as const, index })),
  };
};

const buildDecisionSummary = (plan: LevelUpPlan, draft: Draft) => {
  const summary: string[] = [];
  if (draft.subclassMode === 'manual') summary.push('Recorded a reviewed manual subclass.');
  if (Object.values(draft.choices).some((choice) => choice.manualNote.trim())) summary.push('Recorded reviewed manual class choices.');
  if (plan.targetRule.abilityScoreImprovement && draft.asiMode === 'feat-note') summary.push('Recorded a reviewed manual feat note.');
  if (Object.values(draft.overrides).some(Boolean)) summary.push('Entered explicit typed manual overrides for server audit.');
  return summary;
};

const targetChoiceRules = (plan: LevelUpPlan, sheet: CharacterSheetV1, draft: Draft) => {
  const missingPrerequisiteIds = new Set(
    plan.missingPrerequisites
      .filter((item) => item.kind === 'class-choice')
      .map((item) => item.id),
  );
  return plan.classRule.choices.filter((choice) =>
    choice.fromLevel <= plan.toLevel &&
    choiceAppliesToSelectedSubclass(choice, plan, sheet, draft) &&
    !missingPrerequisiteIds.has(choice.id) &&
    !choiceAlreadyPresent(sheet.features, choice, plan.toLevel),
  );
};

const choiceAppliesToSelectedSubclass = (
  choice: CanonicalChoiceRule,
  plan: LevelUpPlan,
  sheet: CharacterSheetV1,
  draft: Draft,
) => {
  if (!choice.requiredSubclassIndex) return true;
  const existingName = sheet.identity.classes[0].subclass?.trim().toLowerCase();
  const existing = plan.classRule.subclasses.find((subclass) => subclass.name.toLowerCase() === existingName)?.index;
  const selected = existing ?? (draft.subclassMode === 'srd' ? draft.subclassIndex : '');
  return selected === choice.requiredSubclassIndex;
};

const eligibleSpells = (plan: LevelUpPlan, sheet: CharacterSheetV1, draft: Draft): CanonicalSpell[] => {
  const progression = plan.targetRule.spellcasting;
  if (!progression) return [];
  const subclassName = sheet.identity.classes[0].subclass?.trim().toLowerCase();
  const existingSubclassIndex = plan.classRule.subclasses.find((subclass) => subclass.name.toLowerCase() === subclassName)?.index;
  const subclassIndex = existingSubclassIndex ?? (draft.subclassMode === 'srd' ? draft.subclassIndex : '');
  return canonicalSpells.filter((spell) => {
    if (spell.level > 0 && !progression.availableSpellLevels.includes(spell.level)) return false;
    if (spell.classIndexes.includes(plan.classRule.index)) return true;
    return spell.subclassMemberships.some((membership) => membership.classIndex === plan.classRule.index && membership.subclassIndex === subclassIndex && membership.kind === 'expanded' && membership.classLevel <= plan.toLevel);
  });
};

const isAlwaysPrepared = (spellId: string, plan: LevelUpPlan, sheet: CharacterSheetV1, draft: Draft) => {
  const featureIds = new Set(sheet.features.map((feature) => feature.id));
  const subclassName = sheet.identity.classes[0].subclass?.trim().toLowerCase();
  const existingSubclass = plan.classRule.subclasses.find((subclass) => subclass.name.toLowerCase() === subclassName);
  const subclassIndex = existingSubclass?.index ?? (draft.subclassMode === 'srd' ? draft.subclassIndex : '');
  if (!existingSubclass && subclassIndex) {
    const selectedSubclass = plan.classRule.subclasses.find((subclass) => subclass.index === subclassIndex);
    for (const featureLevel of selectedSubclass?.featuresByLevel ?? []) {
      if (featureLevel.level <= plan.toLevel) {
        for (const feature of featureLevel.features) featureIds.add(feature.index);
      }
    }
  }
  return canonicalSpells.find((spell) => spell.index === spellId)?.subclassMemberships.some((membership) => membership.classIndex === plan.classRule.index && membership.subclassIndex === subclassIndex && membership.kind === 'always-prepared' && membership.classLevel <= plan.toLevel && membership.requiredFeatureIndexes.every((id) => featureIds.has(id))) ?? false;
};

const preparedCountFor = (plan: LevelUpPlan, sheet: CharacterSheetV1, draft: Draft) => {
  const progression = plan.targetRule.spellcasting as CanonicalSpellcastingRule;
  const ability = progression.ability;
  const increase = draft.asiMode === 'ability-scores' ? draft.abilityIncreases[ability] ?? 0 : 0;
  return preparedSpellCount(progression.preparedFormula, sheet.abilities.scores[ability] + increase, plan.toLevel);
};

const proposedMaxHp = (plan: LevelUpPlan, sheet: CharacterSheetV1, draft: Draft) => {
  if (plan.sourceSheetV2?.hitPointProgression.maximumOverride) {
    return plan.sourceSheetV2.hitPointProgression.maximumOverride.value;
  }
  const priorCon = sheet.abilities.scores.constitution;
  const conIncrease = draft.asiMode === 'ability-scores' ? draft.abilityIncreases.constitution ?? 0 : 0;
  const resultingCon = priorCon + conIncrease;
  const priorModifier = abilityModifier(priorCon);
  const resultingModifier = abilityModifier(resultingCon);
  const die = draft.hpMode === 'fixed-average' ? plan.fixedAverageHp : Number(draft.hpRoll || 0);
  return sheet.combat.hitPoints.max + Math.max(1, die + resultingModifier) +
    (resultingModifier - priorModifier) * plan.fromLevel + v2PerLevelHitPointBonus(plan, draft);
};

const v2PerLevelHitPointBonus = (plan: LevelUpPlan, draft: Draft) => {
  const source = plan.sourceSheetV2;
  if (!source) return 0;
  let bonus = source.identity.race.source === 'srd' && source.identity.race.index === 'hill-dwarf' ? 1 : 0;
  const subclassIndex = source.identity.subclass?.source === 'srd'
    ? source.identity.subclass.index
    : draft.subclassMode === 'srd' ? draft.subclassIndex : '';
  if (plan.classRule.index === 'sorcerer' && subclassIndex === 'draconic') bonus += 1;
  return bonus;
};

const v2Initiative = (
  plan: LevelUpPlan,
  scores: CharacterSheetV1['abilities']['scores'],
  proficiency: number,
) => {
  const source = plan.sourceSheetV2;
  if (!source) return null;
  if (source.combat.initiative.provenance.kind === 'manual-override') return source.combat.initiative.value;
  const jackOfAllTrades = plan.classRule.index === 'bard' && plan.toLevel >= 2 ? Math.floor(proficiency / 2) : 0;
  return abilityModifier(scores.dexterity) + jackOfAllTrades;
};

const v2PassivePerception = (
  plan: LevelUpPlan,
  draft: Draft,
  scores: CharacterSheetV1['abilities']['scores'],
  proficiency: number,
) => {
  const source = plan.sourceSheetV2;
  if (!source) return null;
  if (source.combat.passivePerception.provenance.kind === 'manual-override') return source.combat.passivePerception.value;
  let rank = source.proficiencies.perception;
  for (const [ruleID, choice] of Object.entries(draft.choices)) {
    if (!choice.optionIds.includes('skill-perception')) continue;
    rank = ruleID.includes('expertise') ? 'expertise' : rank === 'none' ? 'proficient' : rank;
  }
  return 10 + abilityModifier(scores.wisdom) + (rank === 'expertise' ? proficiency * 2 : rank === 'proficient' ? proficiency : 0);
};

const v2SelectedChoiceOptions = (plan: LevelUpPlan, draft: Draft) => new Set([
  ...(plan.sourceSheetV2?.ruleChoices.flatMap((choice) => choice.optionIds) ?? []),
  ...Object.values(draft.choices).flatMap((choice) => choice.optionIds),
]);

const v2ProposedArmorClass = (
  plan: LevelUpPlan,
  draft: Draft,
  scores: CharacterSheetV1['abilities']['scores'],
) => {
  const source = plan.sourceSheetV2;
  if (!source) return null;
  const defense = source.combat.defense;
  if (source.combat.armorClass.provenance.kind === 'manual-override' || defense.mode === 'manual') {
    return source.combat.armorClass.value;
  }
  const dexterity = abilityModifier(scores.dexterity);
  const choices = v2SelectedChoiceOptions(plan, draft);
  const shield = 'shieldIndex' in defense && defense.shieldIndex
    ? characterCreationRules.equipment.find((entry) => entry.index === defense.shieldIndex)?.armor?.shieldBonus ?? 0
    : 0;
  if (defense.mode === 'armor') {
    const armor = characterCreationRules.equipment.find((entry) => entry.index === defense.armorIndex)?.armor;
    if (!armor) return source.combat.armorClass.value;
    const dexterityBonus = armor.dexterityBonus
      ? Math.min(dexterity, armor.maximumDexterityBonus ?? dexterity)
      : 0;
    const styleBonus = choices.has('fighter-fighting-style-defense') ||
      choices.has('fighting-style-defense') || choices.has('ranger-fighting-style-defense') ? 1 : 0;
    return armor.baseArmorClass + dexterityBonus + shield + styleBonus;
  }
  switch (defense.formulaId) {
    case 'barbarian-unarmored-defense':
      return 10 + dexterity + abilityModifier(scores.constitution) + shield;
    case 'monk-unarmored-defense':
      return 10 + dexterity + abilityModifier(scores.wisdom);
    case 'draconic-resilience':
      return 13 + dexterity + shield;
    default:
      return 10 + dexterity + shield;
  }
};

const v2ProposedSpeed = (plan: LevelUpPlan) => {
  const source = plan.sourceSheetV2;
  if (!source) return null;
  if (source.combat.speedFt.provenance.kind === 'manual-override') return source.combat.speedFt.value;
  const wearingArmor = source.equipment.some((entry) => entry.source === 'srd' && entry.equipped &&
    characterCreationRules.equipment.find((item) => item.index === entry.index)?.armor?.category !== 'Shield');
  const wearingHeavyArmor = source.equipment.some((entry) => entry.source === 'srd' && entry.equipped &&
    characterCreationRules.equipment.find((item) => item.index === entry.index)?.armor?.category === 'Heavy');
  const usingShield = source.equipment.some((entry) => entry.source === 'srd' && entry.equipped && entry.index === 'shield');
  let speed = source.combat.speedFt.value;
  if (plan.classRule.index === 'barbarian' && plan.fromLevel < 5 && plan.toLevel >= 5 && !wearingHeavyArmor) speed += 10;
  if (plan.classRule.index === 'monk' && plan.fromLevel < 2 && plan.toLevel >= 2 && !wearingArmor && !usingShield) speed += 10;
  return speed;
};

const v2ProposedAttackBonuses = (
  plan: LevelUpPlan,
  scores: CharacterSheetV1['abilities']['scores'],
  proficiency: number,
) => {
  const source = plan.sourceSheetV2;
  if (!source) return null;
  if (source.attacks.length === 0) return 'No represented attacks';
  return source.attacks.map((attack) => {
    if (attack.attackBonusInput === null) return `${attack.name} ${formatSigned(attack.attackBonus.value)}`;
    const ability = attack.attackBonusInput.ability === 'spellcasting'
      ? plan.targetRule.spellcasting?.ability ?? plan.classRule.spellcastingAbility
      : attack.attackBonusInput.ability;
    const modifier = ability && ability in scores ? abilityModifier(scores[ability as AbilityName]) : 0;
    return `${attack.name} ${formatSigned(modifier + (attack.attackBonusInput.proficient ? proficiency : 0))}`;
  }).join(', ');
};

const buildReview = (plan: LevelUpPlan, sheet: CharacterSheetV1, draft: Draft) => {
  const maxHp = proposedMaxHp(plan, sheet, draft);
  const maxGain = maxHp - sheet.combat.hitPoints.max;
  const currentHp = draft.currentHpMode === 'increase-by-gain' ? Math.min(maxHp, sheet.combat.hitPoints.current + maxGain) : draft.currentHpMode === 'retain' ? sheet.combat.hitPoints.current : Number(draft.manualCurrentHp);
  const resultingScores = resultingAbilityScores(sheet, draft, plan);
  const canonicalProficiency = plan.targetRule.proficiencyBonus;
  const resultingProficiency = numberOverride(draft, 'proficiencyBonus') ?? canonicalProficiency;
  const canonicalInitiative = v2Initiative(plan, resultingScores, canonicalProficiency) ?? abilityModifier(resultingScores.dexterity);
  const resultingInitiative = numberOverride(draft, 'initiative') ?? canonicalInitiative;
  const reliableSkillChanges = reliableResultingSkills(plan, sheet, resultingScores, resultingProficiency);
  const perception = reliableSkillChanges.find((skill) => skill.name.trim().toLowerCase() === 'perception');
  const canonicalPassive = v2PassivePerception(plan, draft, resultingScores, resultingProficiency) ??
    (perception ? 10 + perception.proposed : sheet.combat.passivePerception.value);
  const resultingPassive = numberOverride(draft, 'passivePerception') ?? canonicalPassive;
  const v2ArmorClass = v2ProposedArmorClass(plan, draft, resultingScores);
  const v2Speed = v2ProposedSpeed(plan);
  const v2Attacks = v2ProposedAttackBonuses(plan, resultingScores, resultingProficiency);
  const rows = [
    { label: 'Class level', previous: String(plan.fromLevel), proposed: String(plan.toLevel), reason: 'Exactly one supported canonical transition.' },
    { label: 'Maximum HP', previous: String(sheet.combat.hitPoints.max), proposed: String(maxHp), reason: 'Hit die choice plus resulting Constitution modifier, including level-4 retroactive adjustment.' },
    { label: 'Current HP', previous: String(sheet.combat.hitPoints.current), proposed: String(currentHp), reason: `Confirmed ${draft.currentHpMode} behavior against final maximum.` },
    { label: 'Proficiency bonus', previous: formatSigned(sheet.combat.proficiencyBonus), proposed: formatSigned(resultingProficiency), reason: numberOverride(draft, 'proficiencyBonus') === null ? 'Canonical proficiency progression.' : 'Explicit typed manual override. The server records audit provenance.' },
    { label: 'Initiative', previous: formatSigned(sheet.combat.initiative), proposed: formatSigned(resultingInitiative), reason: numberOverride(draft, 'initiative') === null ? 'Derived from the resulting Dexterity modifier.' : 'Explicit typed manual override. The server records audit provenance.' },
    { label: 'Passive Perception', previous: auditedNumberText(sheet.combat.passivePerception.value), proposed: auditedNumberText(resultingPassive), reason: numberOverride(draft, 'passivePerception') !== null ? 'Explicit typed manual override with audited-number provenance.' : perception ? 'Derived from the reliable resulting Perception skill modifier.' : 'Retained because automatic calculation is not reliable for this sheet.' },
    { label: 'Armor Class', previous: String(sheet.combat.armorClass.value), proposed: v2ArmorClass === null ? 'Retained' : String(v2ArmorClass), reason: v2ArmorClass === null ? 'No reliable structured armor recalculation.' : 'Recalculated from the saved V2 defense, equipment, choices, and resulting abilities.' },
    { label: 'Speed', previous: `${sheet.combat.speed[0].feet} ft.`, proposed: v2Speed === null ? 'Retained' : `${v2Speed} ft.`, reason: v2Speed === null ? 'Existing movement and exceptions are preserved.' : 'Recalculated from the saved V2 Race, equipment, and active Class features.' },
    { label: 'Attacks', previous: `${sheet.actions.length} represented`, proposed: v2Attacks ?? 'Retained', reason: v2Attacks === null ? 'Attack sources cannot be established safely.' : 'Structured V2 attack bonuses are recalculated from their ability and proficiency inputs.' },
    { label: 'Equipment', previous: 'Represented equipment', proposed: 'Retained', reason: 'Equipment is outside the approved change set.' },
    { label: 'Manual and non-SRD content', previous: 'Existing content', proposed: 'Preserved', reason: 'Level up appends canonical content without replacing reviewed entries.' },
  ];
  if (reliableSkillChanges.some((skill) => skill.previous !== skill.proposed)) rows.push({
    label: 'Reliable skill modifiers',
    previous: reliableSkillChanges.filter((skill) => skill.previous !== skill.proposed).map((skill) => `${skill.name} ${formatSigned(skill.previous)}`).join(', '),
    proposed: reliableSkillChanges.filter((skill) => skill.previous !== skill.proposed).map((skill) => `${skill.name} ${formatSigned(skill.proposed)}`).join(', '),
    reason: 'Standard 2014 skill ability mappings are recalculated after ASI or proficiency progression. Manual and nonstandard skills stay unchanged.',
  });
  const needsSubclass = plan.toLevel >= plan.classRule.subclassDecisionLevel && !sheet.identity.classes[0].subclass;
  if (needsSubclass) rows.push({
    label: plan.classRule.subclasses[0]?.flavor ?? 'Subclass',
    previous: 'Missing',
    proposed: draft.subclassMode === 'srd' ? plan.classRule.subclasses.find((subclass) => subclass.index === draft.subclassIndex)?.name ?? draft.subclassIndex : draft.manualSubclassName.trim(),
    reason: draft.subclassMode === 'srd' ? 'Player-selected canonical SRD subclass.' : 'Reviewed manual subclass retained with needs-audit provenance.',
  });
  if (plan.targetRule.features.length) rows.push({ label: 'Class features', previous: 'Existing features', proposed: plan.targetRule.features.map((feature) => feature.name).join(', '), reason: `Unlocked by ${plan.classRule.name} level ${plan.toLevel}.` });
  const subclassFeatures = newlyAddedSubclassFeatures(plan, sheet, draft);
  if (subclassFeatures.length) rows.push({
    label: 'Subclass features',
    previous: needsSubclass ? 'Missing or incomplete subclass features' : 'Existing subclass features',
    proposed: subclassFeatures.map((feature) => feature.name).join(', '),
    reason: needsSubclass ? 'Adds every canonical subclass feature through the target level, including recovered earlier features.' : `Unlocked by the represented subclass at level ${plan.toLevel}.`,
  });
  if (plan.targetRule.abilityScoreImprovement) rows.push({ label: 'Level 4 choice', previous: 'No level-4 choice', proposed: draft.asiMode === 'feat-note' ? draft.featNote.trim() : Object.entries(draft.abilityIncreases).map(([ability, value]) => `${capitalize(ability)} +${value}`).join(', '), reason: draft.asiMode === 'feat-note' ? 'Reviewed manual feat note.' : 'Player-selected canonical ASI allocation.' });
  const selectedChoices = Object.entries(draft.choices).filter(([, value]) => value.optionIds.length > 0 || value.manualNote.trim());
  if (selectedChoices.length) rows.push({
    label: 'Class choices',
    previous: 'Missing required choices',
    proposed: selectedChoices.map(([id, value]) => `${humanizeRuleId(id)}: ${value.manualNote.trim() || value.optionIds.map((optionId) => canonicalChoiceOptionName(plan, id, optionId)).join(', ')}`).join('; '),
    reason: 'Earlier prerequisites and target-level class choices are submitted as bounded canonical IDs or reviewed manual notes.',
  });
  if (plan.targetRule.spellcasting) {
    const spellAbility = plan.targetRule.spellcasting.ability;
    const canonicalSaveDC = 8 + resultingProficiency + abilityModifier(resultingScores[spellAbility]);
    const canonicalAttack = resultingProficiency + abilityModifier(resultingScores[spellAbility]);
    rows.push(
      { label: 'Spell slots', previous: spellSlotsText(sheet), proposed: targetSpellSlotsText(plan.targetRule.spellcasting), reason: 'Canonical full-caster, half-caster, or Pact Magic progression. Existing used slots are preserved within the new maximum.' },
      { label: 'Spell save DC', previous: auditedNumberText(sheet.spellcasting?.spellSaveDC?.value), proposed: String(numberOverride(draft, 'spellSaveDC') ?? canonicalSaveDC), reason: numberOverride(draft, 'spellSaveDC') === null ? `8 + proficiency + ${capitalize(spellAbility)} modifier.` : 'Explicit typed manual override with audited-number provenance.' },
      { label: 'Spell attack bonus', previous: auditedNumberText(sheet.spellcasting?.spellAttackBonus?.value), proposed: formatSigned(numberOverride(draft, 'spellAttackBonus') ?? canonicalAttack), reason: numberOverride(draft, 'spellAttackBonus') === null ? `Proficiency + ${capitalize(spellAbility)} modifier.` : 'Explicit typed manual override with audited-number provenance.' },
    );
    const learnedNames = spellNames(draft.spellAdditions, sheet);
    if (learnedNames.length) rows.push({
      label: plan.targetRule.spellcasting.mode === 'pact-known'
        ? 'Pact Magic known spells'
        : plan.targetRule.spellcasting.mode === 'known'
          ? 'Known spells learned'
          : 'Learned spells',
      previous: 'Existing represented spells',
      proposed: learnedNames.join(', '),
      reason: 'Every normal SRD addition is named. Existing non-SRD and manually reviewed spells remain represented.',
    });
    if (draft.replacementRemoveSpellId && draft.replacementAddSpellId) rows.push({
      label: 'Spell replacement',
      previous: spellName(draft.replacementRemoveSpellId, sheet),
      proposed: `${spellName(draft.replacementRemoveSpellId, sheet)} → ${spellName(draft.replacementAddSpellId, sheet)}`,
      reason: 'The removed and replacement SRD spells are shown explicitly.',
    });
    if (draft.wizardSpellbookAdditions.length) rows.push({
      label: 'Wizard spellbook additions',
      previous: 'Existing represented spellbook',
      proposed: spellNames(draft.wizardSpellbookAdditions, sheet).join(', '),
      reason: 'Every new canonical Wizard spellbook entry is named.',
    });
    if (plan.targetRule.spellcasting.mode === 'prepared' || plan.targetRule.spellcasting.mode === 'spellbook-prepared') rows.push({
      label: 'Prepared spells',
      previous: sheet.spellcasting?.spells.filter((spell) => spell.preparedOrKnown === 'prepared' && spell.level > 0).map((spell) => spell.name).join(', ') || 'No represented prepared spells',
      proposed: spellNames(draft.preparedSpellIds, sheet).join(', ') || 'No selected prepared spells',
      reason: 'The complete player-selected prepared-spell list is named.',
    });
    const alwaysPrepared = newlyAlwaysPreparedSpells(plan, sheet, draft);
    if (alwaysPrepared.length) rows.push({
      label: 'Always-prepared subclass spells',
      previous: 'Not represented as automatically prepared',
      proposed: alwaysPrepared.map((spell) => spell.name).join(', '),
      reason: 'Canonical subclass spells added automatically through the target level are named separately.',
    });
  }
  const overrideLabels = Object.entries(draft.overrides).filter(([, value]) => value !== '').map(([key, value]) => `${humanizeRuleId(key)}: ${value}`);
  if (overrideLabels.length) rows.push({ label: 'Manual overrides', previous: 'Canonical suggestions', proposed: overrideLabels.join('; '), reason: 'Explicit typed values will be recorded as needing audit.' });
  return rows;
};

const selectedSubclass = (plan: LevelUpPlan, sheet: CharacterSheetV1, draft: Draft) => {
  const represented = sheet.identity.classes[0].subclass?.trim().toLowerCase();
  return plan.classRule.subclasses.find((subclass) => subclass.name.toLowerCase() === represented) ??
    (draft.subclassMode === 'srd' ? plan.classRule.subclasses.find((subclass) => subclass.index === draft.subclassIndex) : undefined);
};

const newlyAddedSubclassFeatures = (plan: LevelUpPlan, sheet: CharacterSheetV1, draft: Draft) => {
  const subclass = selectedSubclass(plan, sheet, draft);
  if (!subclass) return [];
  const recovering = !sheet.identity.classes[0].subclass;
  const representedIds = new Set(sheet.features.map((feature) => feature.id));
  return subclass.featuresByLevel
    .filter((featureLevel) => recovering ? featureLevel.level <= plan.toLevel : featureLevel.level === plan.toLevel)
    .flatMap((featureLevel) => featureLevel.features)
    .filter((feature) => !representedIds.has(feature.index));
};

const newlyAlwaysPreparedSpells = (plan: LevelUpPlan, sheet: CharacterSheetV1, draft: Draft) => {
  const subclass = selectedSubclass(plan, sheet, draft);
  if (!subclass) return [];
  const resultingFeatureIds = new Set([
    ...sheet.features.map((feature) => feature.id),
    ...plan.targetRule.features.map((feature) => feature.index),
    ...newlyAddedSubclassFeatures(plan, sheet, draft).map((feature) => feature.index),
  ]);
  const representedSpellIds = new Set(sheet.spellcasting?.spells.map((spell) => spell.id) ?? []);
  return canonicalSpells.filter((spell) => !representedSpellIds.has(spell.index) && spell.subclassMemberships.some((membership) =>
    membership.classIndex === plan.classRule.index &&
    membership.subclassIndex === subclass.index &&
    membership.kind === 'always-prepared' &&
    membership.classLevel <= plan.toLevel &&
    membership.requiredFeatureIndexes.every((id) => resultingFeatureIds.has(id)),
  ));
};

const spellName = (id: string, sheet: CharacterSheetV1) =>
  canonicalSpells.find((spell) => spell.index === id)?.name ??
  sheet.spellcasting?.spells.find((spell) => spell.id === id)?.name ?? id;

const spellNames = (ids: readonly string[], sheet: CharacterSheetV1) => [...new Set(ids)].map((id) => spellName(id, sheet));

const resultingAbilityScores = (
  sheet: CharacterSheetV1,
  draft: Draft,
  plan: LevelUpPlan,
) => {
  const scores = { ...sheet.abilities.scores };
  if (plan.targetRule.abilityScoreImprovement && draft.asiMode === 'ability-scores') {
    for (const [ability, increase] of Object.entries(draft.abilityIncreases)) {
      scores[ability as AbilityName] += increase ?? 0;
    }
  }
  return scores;
};

const reliableResultingSkills = (
  plan: LevelUpPlan,
  sheet: CharacterSheetV1,
  scores: CharacterSheetV1['abilities']['scores'],
  proficiency: number,
) => sheet.proficiencies.skills.flatMap((skill) => {
  const ability = standardSkillAbilities[skill.name.trim().toLowerCase()];
  if (!ability || skill.needsConfirmation || skill.note?.trim()) return [];
  const priorExpected = abilityModifier(sheet.abilities.scores[ability]) +
    (skill.proficient ? sheet.combat.proficiencyBonus : 0);
  const currentCanonicalProficiency = plan.currentRule.proficiencyBonus;
  if (sheet.combat.proficiencyBonus !== currentCanonicalProficiency || skill.modifier !== priorExpected) return [];
  return [{
    name: skill.name,
    previous: skill.modifier,
    proposed: abilityModifier(scores[ability]) + (skill.proficient ? proficiency : 0),
  }];
});

const numberOverride = (draft: Draft, name: OverrideName) => {
  const raw = draft.overrides[name];
  return raw === '' ? null : Number(raw);
};

const auditedNumberText = (value: number | undefined) => value === undefined ? 'Not represented' : String(value);

const spellSlotsText = (sheet: CharacterSheetV1) => {
  const slots = sheet.spellcasting?.slots ?? [];
  return slots.length === 0 ? 'No represented slots' : slots.map((slot) => `Level ${slot.level}: ${slot.max - slot.used}/${slot.max}`).join(', ');
};

const targetSpellSlotsText = (progression: CanonicalSpellcastingRule) => {
  if (progression.mode === 'pact-known') {
    return `${progression.pactSlots} Pact Magic slots at spell level ${progression.pactSlotLevel}`;
  }
  return (progression.slots ?? []).map((maximum, index) => `Level ${index + 1}: ${maximum}`).join(', ');
};

const canonicalChoiceOptionName = (plan: LevelUpPlan, ruleId: string, optionId: string) => plan.classRule.choices
  .find((choice) => choice.id === ruleId)
  ?.options.find((option) => option.index === optionId)
  ?.name ?? optionId;

const deduplicateSpells = <Spell extends { index: string }>(spells: readonly Spell[]) => Array.from(new Map(spells.map((spell) => [spell.index, spell])).values());
const formatSigned = (value: number) => value >= 0 ? `+${value}` : String(value);
const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

export type LevelUpDraft = Draft;
export type CanonicalLevelUpSpell = CanonicalSpell;
/* eslint-disable react-refresh/only-export-components -- Pure state and request helpers support fast contract tests without DOM walkthroughs. */
export const createLevelUpDraft = createDraft;
export const validateLevelUpDraft = validateAllSteps;
export const buildLevelUpRequest = buildRequest;
export const buildLevelUpReview = buildReview;
export const eligibleLevelUpSpells = eligibleSpells;
export const isAlwaysPreparedLevelUpSpell = isAlwaysPrepared;
export const preparedLevelUpSpellCount = preparedCountFor;
export const targetLevelUpChoiceRules = targetChoiceRules;
/* eslint-enable react-refresh/only-export-components */
export const LevelUpReviewStep = ReviewStep;
export const LevelUpClassChoiceStep = ClassChoiceStep;
