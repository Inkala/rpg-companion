import { cloneElement, useEffect, useMemo, useRef, useState, type MouseEvent, type ReactElement, type ReactNode } from 'react';
import { CharactersApiError, createCharacter } from '../characters/api';
import type {
  AbilityName,
  CharacterAttackInput,
  CharacterEquipmentInput,
  CharacterSpellcastingInput,
  SpellSelectionInput,
  ValueProvenance,
} from '../characters/characterSheetV2';
import { buildCharacterSheetV2 } from '../characters/characterSheetV2Calculations';
import { characterCreationRules } from '../rules/generated/characterCreationRules';
import { levelUpRules } from '../rules/generated/levelUpRules';
import type { CharacterBuildId } from './characterCreationTypes';
import {
  availableRuleChoicesForDraft,
  availableSpellsForDraft,
  availableSubclassesForDraft,
  buildCreateCharacterV2Request,
  classOptions,
  createStructuredCharacterDraft,
  equipmentOptions,
  raceOptions,
  reconcileStructuredDraft,
  resetDraftAbilitiesToCalculated,
  spellMetadata,
  spellSlotsForDraft,
  validateStructuredCharacterDraft,
  type DraftValidationError,
  type StructuredCharacterDraft,
} from './characterSheetV2Draft';

type Props = {
  creationSource: 'guided' | 'manual-transfer';
  buildId?: CharacterBuildId;
  isSignedIn: boolean;
  onBack: () => void;
  onSignIn?: () => void;
  onCreateAccount?: () => void;
  onOpenCharacterReference?: (id: string) => void;
  continuation?: StructuredCharacterCreationContinuation | null;
  onContinuationChange?: (continuation: StructuredCharacterCreationContinuation) => void;
};

export type StructuredCharacterCreationContinuation = {
  draft: StructuredCharacterDraft;
  showReview: boolean;
};

type SaveState = { status: 'idle' | 'saving' | 'success' } | { status: 'error'; message: string };
const abilities: Array<{ key: AbilityName; label: string; short: string }> = [
  { key: 'strength', label: 'Strength', short: 'STR' },
  { key: 'dexterity', label: 'Dexterity', short: 'DEX' },
  { key: 'constitution', label: 'Constitution', short: 'CON' },
  { key: 'intelligence', label: 'Intelligence', short: 'INT' },
  { key: 'wisdom', label: 'Wisdom', short: 'WIS' },
  { key: 'charisma', label: 'Charisma', short: 'CHA' },
];

export const StructuredCharacterCreation = ({
  creationSource, buildId, isSignedIn, onBack, onSignIn, onCreateAccount, onOpenCharacterReference,
  continuation, onContinuationChange,
}: Props) => {
  const [draft, setDraft] = useState(() => continuation?.draft ?? createStructuredCharacterDraft(creationSource, buildId));
  const [errors, setErrors] = useState<DraftValidationError[]>([]);
  const [showReview, setShowReview] = useState(continuation?.showReview ?? false);
  const [saveState, setSaveState] = useState<SaveState>({ status: 'idle' });
  const [newEquipmentIndex, setNewEquipmentIndex] = useState('');
  const [announcement, setAnnouncement] = useState('');
  const formRef = useRef<HTMLFormElement | null>(null);
  const saveLockRef = useRef(false);
  const nextID = useRef(1);
  const previousClassLevel = useRef({ classKey: draft.classKey, level: draft.level });
  const previousReconciledDraft = useRef(structuredClone(draft));

  useEffect(() => {
    onContinuationChange?.({ draft: structuredClone(draft), showReview });
  }, [draft, onContinuationChange, showReview]);

  useEffect(() => {
    if (errors.length === 0 || showReview) return;
    const invalid = formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
    invalid?.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
    invalid?.focus({ preventScroll: true });
  }, [errors, showReview]);

  const update = (change: (next: StructuredCharacterDraft) => void, reconcile = false) => {
    setDraft((current) => {
      const next = structuredClone(current);
      change(next);
      return reconcile ? reconcileStructuredDraft(next) : next;
    });
    setErrors([]);
    setSaveState({ status: 'idle' });
  };

  const errorFor = (field: string) => errors.find((error) => error.field === field)?.message;
  const focusErrorField = (event: MouseEvent<HTMLAnchorElement>, field: string) => {
    event.preventDefault();
    const target = document.getElementById(fieldControlId(field));
    target?.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
    target?.focus({ preventScroll: true });
  };
  const derivedSheet = useMemo(() => {
    const preview = structuredClone(draft);
    if (!preview.name.trim()) preview.name = 'Character preview';
    if (!preview.gender) preview.gender = 'Other';
    if (!preview.background.trim()) preview.background = 'Adventurer';
    try {
      return buildCharacterSheetV2(buildCreateCharacterV2Request(preview));
    } catch {
      return null;
    }
  }, [draft]);
  const subclasses = availableSubclassesForDraft(draft);
  const ruleChoices = availableRuleChoicesForDraft(draft);
  const spellSlots = spellSlotsForDraft(draft);
  const supportsSpellcasting = draft.spellcasting.mode !== 'none';
  const armorOptions = characterCreationRules.equipment.filter((entry) => entry.armor && entry.armor.category !== 'Shield');
  const shieldOptions = characterCreationRules.equipment.filter((entry) => entry.armor?.category === 'Shield');

  useEffect(() => {
    const previous = previousClassLevel.current;
    if (previous.classKey === draft.classKey && previous.level === draft.level) return;
    previousClassLevel.current = { classKey: draft.classKey, level: draft.level };
    const availability = draft.classKey === 'manual'
      ? 'An optional Other Subclass is available.'
      : subclasses.length > 0 ? `Subclass selection is available and required at level ${draft.level}.` : `No Subclass selection is available at level ${draft.level}.`;
    const derived = derivedSheet
      ? `Calculated values refreshed: maximum HP ${derivedSheet.hitPointProgression.maximum.value}, Armor Class ${derivedSheet.combat.armorClass.value}, Speed ${derivedSheet.combat.speedFt.value} feet.`
      : 'Calculated values will refresh after the required choices are complete.';
    setAnnouncement(`${availability} ${derived}`);
  }, [derivedSheet, draft.classKey, draft.level, subclasses.length]);

  useEffect(() => {
    const previous = previousReconciledDraft.current;
    previousReconciledDraft.current = structuredClone(draft);
    const previousChoices = new Set(previous.ruleChoices.flatMap((choice) => choice.optionIds));
    const currentChoices = new Set(draft.ruleChoices.flatMap((choice) => choice.optionIds));
    const removedChoices = [...previousChoices].filter((id) => !currentChoices.has(id));
    const previousSpells = new Set(spellSelectionBucketsForAnnouncement(previous.spellcasting));
    const currentSpells = new Set(spellSelectionBucketsForAnnouncement(draft.spellcasting));
    const removedSpells = [...previousSpells].filter((id) => !currentSpells.has(id));
    const removedDefense = [previous.defense.armorIndex, previous.defense.shieldIndex]
      .filter((id) => id && id !== draft.defense.armorIndex && id !== draft.defense.shieldIndex);
    const parts = [
      removedChoices.length ? `${removedChoices.length} unavailable Class choice selection${removedChoices.length === 1 ? '' : 's'} removed.` : '',
      removedSpells.length ? `${removedSpells.length} unavailable spell selection${removedSpells.length === 1 ? '' : 's'} removed.` : '',
      removedDefense.length ? `${removedDefense.length} defense selection${removedDefense.length === 1 ? '' : 's'} cleared because its equipment is no longer equipped.` : '',
    ].filter(Boolean);
    if (parts.length) setAnnouncement(parts.join(' '));
  }, [draft]);

  const review = () => {
    const nextErrors = validateStructuredCharacterDraft(draft);
    if (nextErrors.length > 0) {
      setErrors(nextErrors);
      setShowReview(false);
      return;
    }
    setErrors([]);
    setShowReview(true);
  };

  const save = async () => {
    if (saveLockRef.current) return;
    let request;
    try {
      request = buildCreateCharacterV2Request(draft);
    } catch {
      setShowReview(false);
      setErrors(validateStructuredCharacterDraft(draft));
      return;
    }
    saveLockRef.current = true;
    setSaveState({ status: 'saving' });
    try {
      const character = await createCharacter(request);
      setSaveState({ status: 'success' });
      onOpenCharacterReference?.(character.id);
    } catch (error) {
      saveLockRef.current = false;
      setSaveState({ status: 'error', message: error instanceof CharactersApiError
        ? error.message : 'Could not save the character. Check your connection and try again.' });
    }
  };

  if (showReview) {
    const request = buildCreateCharacterV2Request(draft);
    const sheet = buildCharacterSheetV2(request);
    return (
      <section className="structured-creation structured-review" aria-labelledby="structured-review-title">
        <div className="creation-recommendation__header">
          <p className="eyebrow">Review</p>
          <h2 id="structured-review-title" className="creation-recommendation__title">Review structured character.</h2>
          <p>Confirm every choice, calculated value, override, and imported fallback before saving.</p>
        </div>
        <ReviewBlock title="Basics">
          <p><strong>{sheet.identity.name}</strong> · {displayRace(draft)} {displayClass(draft)} · Level {sheet.identity.level}</p>
          <p>{sheet.identity.gender} · {sheet.identity.background}{draft.subclassKey ? ` · ${displaySubclass(draft)}` : ''}</p>
        </ReviewBlock>
        <ReviewBlock title="Abilities and derived values">
          <ul className="structured-review__stats">
            {abilities.map(({ key, short }) => <li key={key}><strong>{short}</strong> {sheet.abilityScores.scores[key].value} ({signed(sheet.abilityScores.modifiers[key])})</li>)}
          </ul>
          <DerivedGrid sheet={sheet} />
          <p className="provenance-copy">Ability source: {sheet.abilityScores.input.mode === 'calculated' ? 'Calculated from base scores and canonical Race choices.' : `Imported: ${sheet.abilityScores.input.reason}`}</p>
          <p className="provenance-copy">New characters start at full HP: {sheet.hitPointProgression.maximum.value}/{sheet.hitPointProgression.maximum.value}.</p>
        </ReviewBlock>
        <ReviewBlock title="Attacks, spells, features, equipment, and Other">
          <ReviewList label="Attacks" values={sheet.attacks.map((entry) => `${entry.name}: ${signed(entry.attackBonus.value)} to hit`)} />
          <ReviewList label="Spells" values={sheet.spellcasting?.spells.map((entry) => `${entry.name} (${entry.state})`) ?? []} />
          <ReviewList label="Features and traits" values={sheet.features.map((entry) => `${entry.name} [${entry.category}]: ${entry.description} (${entry.provenance.kind})`)} />
          <ReviewList label="Equipment" values={sheet.equipment.map((entry) => `${entry.source === 'srd' ? equipmentName(entry.index) : entry.name} × ${entry.quantity}${entry.equipped ? ' (equipped)' : ''}`)} />
          <ReviewList label="Other" values={sheet.other.map((entry) => `${entry.title}: ${entry.description}`)} />
        </ReviewBlock>
        <div className="structured-creation__actions">
          <button type="button" className="button button--secondary" onClick={() => { setShowReview(false); setSaveState({ status: 'idle' }); }}>Back to edit</button>
          {isSignedIn ? (
            <button type="button" className="button button--primary" disabled={saveLockRef.current} onClick={save}>
              {saveState.status === 'saving' ? 'Saving character...' : 'Save character'}
            </button>
          ) : null}
        </div>
        <div className="creation-save-panel" aria-live="polite">
          {!isSignedIn ? <>
            <p className="creation-save-panel__notice">Sign in to save this character. Your structured preview remains available here.</p>
            <div className="creation-save-panel__auth-actions">
              <button type="button" className="button button--secondary" onClick={onSignIn}>Sign in</button>
              <button type="button" className="button button--ghost" onClick={onCreateAccount}>Create account</button>
            </div>
          </> : null}
          {saveState.status === 'error' ? <p className="creation-save-panel__error" role="alert">{saveState.message}</p> : null}
          {saveState.status === 'success' ? <p className="creation-save-panel__success">Character saved.</p> : null}
        </div>
      </section>
    );
  }

  return (
    <section className="structured-creation" aria-labelledby="structured-title">
      <div className="creation-recommendation__header">
        <p className="eyebrow">{creationSource === 'guided' ? 'Guided build' : 'Manual transfer'}</p>
        <h2 id="structured-title" className="creation-recommendation__title">Build your structured character.</h2>
        <p>All automated rules come from the local SRD 5.1 snapshot. Fields marked * are required.</p>
      </div>
      <nav className="structured-steps" aria-label="Creation steps">
        {['Basics', 'Abilities', 'Combat', 'Attacks', 'Spells', 'Features', 'Equipment', 'Other', 'Review'].map((label) =>
          <a key={label} href={`#creation-${label.toLowerCase()}`}>{label}</a>)}
      </nav>
      {errors.length > 0 ? <div className="structured-errors" role="alert" aria-live="assertive">
        <strong>Review {errors.length} field{errors.length === 1 ? '' : 's'}.</strong>
        <ul>{errors.map((error) => <li key={`${error.field}-${error.message}`}><a href={`#${fieldControlId(error.field)}`} onClick={(event) => focusErrorField(event, error.field)}>{error.message}</a></li>)}</ul>
      </div> : null}
      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">{announcement}</p>
      <form ref={formRef} noValidate onSubmit={(event) => { event.preventDefault(); review(); }}>
        <fieldset id="creation-basics" className="structured-section">
          <legend>Basics</legend>
          <div className="structured-grid">
            <Field field="name" label="Name" required error={errorFor('name')}><input name="name" value={draft.name} onChange={(event) => update((next) => { next.name = event.target.value; })} /></Field>
            <Field field="gender" label="Gender" required error={errorFor('gender')}><select name="gender" value={draft.gender} onChange={(event) => update((next) => { next.gender = event.target.value as StructuredCharacterDraft['gender']; })}>
              <option value="">Choose Gender</option><option>Male</option><option>Female</option><option>Other</option>
            </select></Field>
            <Field label="Race" field="raceKey" required error={errorFor('raceKey')}><select name="race" value={draft.raceKey} onChange={(event) => { update((next) => { next.raceKey = event.target.value; if (next.raceKey === 'manual') next.abilityMode = 'imported'; }, true); setAnnouncement('Race updated. Calculated ability, Speed, and hit point values refreshed where available.'); }}>
              {raceOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select></Field>
            {draft.raceKey === 'manual' ? <Field field="manualRaceName" label="Other Race name" required error={errorFor('manualRaceName')}><input name="manualRaceName" value={draft.manualRaceName} onChange={(event) => update((next) => { next.manualRaceName = event.target.value; })} /></Field> : null}
            <Field field="classKey" label="Class" required error={errorFor('classKey')}><select name="class" value={draft.classKey} onChange={(event) => update((next) => { next.classKey = event.target.value; }, true)}>
              {classOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select></Field>
            {draft.classKey === 'manual' ? <Field field="manualClassName" label="Other Class name" required error={errorFor('manualClassName')}><input name="manualClassName" value={draft.manualClassName} onChange={(event) => update((next) => { next.manualClassName = event.target.value; })} /></Field> : null}
            <Field field="level" label="Level" required><select name="level" value={draft.level} onChange={(event) => update((next) => { next.level = Number(event.target.value); }, true)}>
              {[1, 2, 3, 4, 5].map((level) => <option key={level} value={level}>{level}</option>)}
            </select></Field>
            {subclasses.length > 0 ? <Field field="subclassKey" label="Subclass" required={draft.classKey !== 'manual'} error={errorFor('subclassKey')}><select name="subclass" value={draft.subclassKey} onChange={(event) => update((next) => { next.subclassKey = event.target.value; }, true)}>
              {subclasses.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select></Field> : null}
            {draft.subclassKey === 'manual' ? <Field field="manualSubclassName" label="Other Subclass name" required error={errorFor('manualSubclassName')}><input name="manualSubclassName" value={draft.manualSubclassName} onChange={(event) => update((next) => { next.manualSubclassName = event.target.value; })} /></Field> : null}
            <Field field="background" label="Background" required error={errorFor('background')}><input name="background" value={draft.background} onChange={(event) => update((next) => { next.background = event.target.value; })} /></Field>
          </div>
          <p className="structured-live">{draft.classKey === 'manual' ? 'An optional Other Subclass may be entered without automation.' : subclasses.length > 0 ? `Subclass is now required at level ${draft.level}.` : 'Subclass is not available at this Class level.'}</p>
        </fieldset>

        <fieldset id="creation-abilities" className="structured-section">
          <legend>Abilities and rule choices</legend>
          <fieldset className="segmented-control creation-mode-group"><legend className="creation-mode-group__legend">Ability score source</legend>
            <label><input type="radio" name="abilityMode" checked={draft.abilityMode === 'calculated'} disabled={draft.raceKey === 'manual'} onChange={() => update((next) => { next.abilityMode = 'calculated'; })} /> Calculated base scores</label>
            <label><input id={fieldControlId('abilityMode')} type="radio" name="abilityMode" checked={draft.abilityMode === 'imported'} aria-invalid={Boolean(errorFor('abilityMode'))} aria-describedby={errorFor('abilityMode') ? `${fieldControlId('abilityMode')}-error` : undefined} onChange={() => update((next) => { next.abilityMode = 'imported'; })} /> Imported final scores</label>
            {errorFor('abilityMode') ? <span className="structured-field__error" id={`${fieldControlId('abilityMode')}-error`}>{errorFor('abilityMode')}</span> : null}
          </fieldset>
          <div className="structured-grid structured-grid--abilities">
            {abilities.map(({ key, label }) => <Field key={key} label={label} required><input type="number" min="1" max="30" name={key} value={(draft.abilityMode === 'calculated' ? draft.baseScores : draft.importedScores)[key]} onChange={(event) => update((next) => {
              const value = Number(event.target.value);
              if (next.abilityMode === 'calculated') { next.baseScores[key] = value; next.retainedBaseScores[key] = value; } else next.importedScores[key] = value;
            })} /></Field>)}
          </div>
          {derivedSheet ? <div className="derived-panel">
            <h3>Final ability scores</h3>
            <ul className="structured-review__stats">{abilities.map(({ key, short }) => <li key={key}><strong>{short}</strong> {derivedSheet.abilityScores.scores[key].value} ({signed(derivedSheet.abilityScores.modifiers[key])}) <small>{provenanceLabel(derivedSheet.abilityScores.scores[key].provenance)}</small></li>)}</ul>
          </div> : null}
          {draft.abilityMode === 'imported' ? <div className="override-panel">
            <Field field="importedReason" label="Imported score reason" required error={errorFor('importedReason')}><input name="importedReason" value={draft.importedReason} onChange={(event) => update((next) => { next.importedReason = event.target.value; })} /></Field>
            {draft.raceKey !== 'manual' && resetDraftAbilitiesToCalculated(draft) ? <button type="button" className="button button--secondary" onClick={() => { const reset = resetDraftAbilitiesToCalculated(draft); if (reset) { setDraft(reset); setAnnouncement('Imported ability override reset. Calculated ability values restored.'); } }}>Reset to calculated</button> : null}
          </div> : null}
          {ruleChoices.map((choice) => choice.allowManual && choice.options.length === 0
            ? <Field key={choice.id} field={`ruleChoices.${choice.id}`} label={`${choice.label} imported choice`} required error={errorFor(`ruleChoices.${choice.id}`)}><input value={draft.ruleChoices.find((entry) => entry.ruleId === choice.id)?.manualNote ?? ''} onChange={(event) => update((next) => {
              const entry = next.ruleChoices.find((candidate) => candidate.ruleId === choice.id);
              if (entry) entry.manualNote = event.target.value;
            })} /></Field>
            : <Field key={choice.id} field={`ruleChoices.${choice.id}`} label={`${choice.label} (choose ${choice.count})`} required error={errorFor(`ruleChoices.${choice.id}`)}>
            <select multiple size={Math.min(6, Math.max(2, choice.options.length))} value={draft.ruleChoices.find((entry) => entry.ruleId === choice.id)?.optionIds ?? []} onChange={(event) => update((next) => {
              const selected = [...event.target.selectedOptions].map((option) => option.value).slice(0, choice.count);
              const entry = next.ruleChoices.find((candidate) => candidate.ruleId === choice.id);
              if (entry) entry.optionIds = selected;
            }, true)}>{choice.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
          </Field>)}
          <Field label="Perception proficiency"><select name="perception" value={draft.perception} onChange={(event) => update((next) => { next.perception = event.target.value as StructuredCharacterDraft['perception']; })}>
            <option value="none">None</option><option value="proficient">Proficient</option><option value="expertise">Expertise</option>
          </select></Field>
        </fieldset>

        <fieldset id="creation-combat" className="structured-section">
          <legend>HP and combat calculations</legend>
          <p>Current HP is not entered. New characters start at full HP after maximum HP is resolved.</p>
          {draft.levelGains.map((gain, index) => <div className="repeatable-row" key={gain.level}>
            <strong>Level {gain.level} HP</strong>
            <select aria-label={`Level ${gain.level} HP method`} value={gain.mode} onChange={(event) => update((next) => { next.levelGains[index] = event.target.value === 'rolled' ? { level: gain.level, mode: 'rolled', roll: 1 } : { level: gain.level, mode: 'fixed-average' }; })}>
              <option value="fixed-average">Fixed average</option><option value="rolled">Rolled</option>
            </select>
            {gain.mode === 'rolled' ? <input aria-label={`Level ${gain.level} HP roll`} type="number" min="1" value={gain.roll} onChange={(event) => update((next) => { const current = next.levelGains[index]; if (current.mode === 'rolled') current.roll = Number(event.target.value); })} /> : null}
          </div>)}
          <OverrideControl field="maximumOverride" label="Maximum HP override" minimum={1} maximum={9999} value={draft.maximumOverride} errorFor={errorFor} onChange={(value) => update((next) => { next.maximumOverride = value; })} announce={setAnnouncement} />
          <Field field="defense.mode" label="Defense mode" required><select name="defenseMode" value={draft.defense.mode} onChange={(event) => update((next) => { next.defense.mode = event.target.value as StructuredCharacterDraft['defense']['mode']; }, true)}>
            <option value="unarmored">Unarmored formula</option><option value="armor">Canonical armor</option><option value="manual">Manual Armor Class</option>
          </select></Field>
          {draft.defense.mode === 'armor' ? <div className="structured-grid">
            <Field field="defense.armorIndex" label="Armor" required error={errorFor('defense.armorIndex')}><select name="armor" value={draft.defense.armorIndex} onChange={(event) => update((next) => { next.defense.armorIndex = event.target.value; ensureEquipped(next, event.target.value); }, true)}><option value="">Choose armor</option>{armorOptions.map((entry) => <option key={entry.index} value={entry.index}>{entry.name}</option>)}</select></Field>
            <Field label="Shield"><select name="shield" value={draft.defense.shieldIndex} onChange={(event) => update((next) => { next.defense.shieldIndex = event.target.value; if (event.target.value) ensureEquipped(next, event.target.value); }, true)}><option value="">No shield</option>{shieldOptions.map((entry) => <option key={entry.index} value={entry.index}>{entry.name}</option>)}</select></Field>
          </div> : null}
          {draft.defense.mode === 'unarmored' ? <div className="structured-grid">
            <Field label="Unarmored formula" required><select name="unarmoredFormula" value={draft.defense.formulaId} onChange={(event) => update((next) => { next.defense.formulaId = event.target.value as StructuredCharacterDraft['defense']['formulaId']; }, true)}>
              <option value="standard-unarmored">Standard: 10 + Dexterity</option>
              {draft.classKey === 'barbarian' ? <option value="barbarian-unarmored-defense">Barbarian Unarmored Defense</option> : null}
              {draft.classKey === 'monk' ? <option value="monk-unarmored-defense">Monk Unarmored Defense</option> : null}
              {draft.classKey === 'sorcerer' && draft.subclassKey === 'draconic' ? <option value="draconic-resilience">Draconic Resilience</option> : null}
            </select></Field>
            <Field label="Unarmored shield"><select name="unarmoredShield" disabled={draft.defense.formulaId === 'monk-unarmored-defense'} value={draft.defense.shieldIndex} onChange={(event) => update((next) => { next.defense.shieldIndex = event.target.value; if (event.target.value) ensureEquipped(next, event.target.value); }, true)}><option value="">No shield</option>{shieldOptions.map((entry) => <option key={entry.index} value={entry.index}>{entry.name}</option>)}</select></Field>
          </div> : null}
          {draft.defense.mode === 'manual' ? <div className="structured-grid">
            <Field label="Manual Armor Class" required><input name="manualArmorClass" type="number" min="0" value={draft.defense.armorClass} onChange={(event) => update((next) => { next.defense.armorClass = Number(event.target.value); })} /></Field>
            <Field field="defense.reason" label="Armor Class override reason" required error={errorFor('defense.reason')}><input name="defenseReason" value={draft.defense.reason} onChange={(event) => update((next) => { next.defense.reason = event.target.value; })} /></Field>
          </div> : null}
          <OverrideControl field="initiativeOverride" label="Initiative override" minimum={-100} maximum={100} value={draft.initiativeOverride} errorFor={errorFor} onChange={(value) => update((next) => { next.initiativeOverride = value; })} announce={setAnnouncement} />
          <OverrideControl field="passivePerceptionOverride" label="Passive Perception override" minimum={0} maximum={100} value={draft.passivePerceptionOverride} errorFor={errorFor} onChange={(value) => update((next) => { next.passivePerceptionOverride = value; })} announce={setAnnouncement} />
          <OverrideControl field="speedOverride" label="Speed override" minimum={0} maximum={1000} value={draft.speedOverride} errorFor={errorFor} onChange={(value) => update((next) => { next.speedOverride = value; })} announce={setAnnouncement} />
          {derivedSheet ? <div className="derived-panel"><h3>Calculated values</h3><DerivedGrid sheet={derivedSheet} /></div> : <p className="structured-live">Complete the required structured choices to see calculated values.</p>}
        </fieldset>

        <fieldset id="creation-attacks" className="structured-section">
          <legend>Attacks</legend>
          <p>Choose the ability and proficiency explicitly. Hunin never infers them from the attack name.</p>
          <ul className="repeatable-list">{draft.attacks.map((attack, index) => <li key={attack.id}><AttackEditor attack={attack} fieldPrefix={`attacks.${index}`} errorFor={(field) => errorFor(`attacks.${index}.${field}`)} result={derivedSheet?.attacks.find((entry) => entry.id === attack.id)?.attackBonus.value} onChange={(value) => update((next) => { next.attacks[index] = value; })} onRemove={() => update((next) => { next.attacks.splice(index, 1); })} /></li>)}</ul>
          <button type="button" className="button button--secondary" onClick={() => update((next) => { next.attacks.push(newAttack(`attack-${nextID.current++}`)); })}>Add attack</button>
        </fieldset>

        <fieldset id="creation-spells" className="structured-section">
          <legend>Spells</legend>
          {supportsSpellcasting ? <div className="spell-slots" aria-label="Spell slots"><strong>Spell slots:</strong> {spellSlots.map((slot) => `Level ${slot.level}: ${slot.max}`).join(' · ') || 'Cantrips only'}
            {spellSlots.map((slot) => {
              const override = draft.slotOverride.find((entry) => entry.level === slot.level);
              return <fieldset className="override-panel" key={slot.level}><legend>Level {slot.level} slot override</legend><p>Resolved maximum: {slot.max}. Canonical Class progression.</p><label className="toggle-row"><input type="checkbox" checked={Boolean(override)} onChange={(event) => { update((next) => { if (event.target.checked) next.slotOverride.push({ level: slot.level, max: slot.max, reason: '' }); else next.slotOverride = next.slotOverride.filter((entry) => entry.level !== slot.level); }); setAnnouncement(`Level ${slot.level} slot override ${event.target.checked ? 'activated' : 'reset to canonical progression'}.`); }} /> Use override</label>{override ? <div className="structured-grid"><Field field={`slotOverride.${slot.level}.max`} label={`Level ${slot.level} slot maximum`} required><input type="number" min="0" value={override.max} onChange={(event) => update((next) => { const entry = next.slotOverride.find((candidate) => candidate.level === slot.level); if (entry) entry.max = Number(event.target.value); })} /></Field><Field field={`slotOverride.${slot.level}.reason`} label={`Level ${slot.level} slot override reason`} required error={errorFor(`slotOverride.${slot.level}.reason`)}><input value={override.reason} onChange={(event) => update((next) => { const entry = next.slotOverride.find((candidate) => candidate.level === slot.level); if (entry) entry.reason = event.target.value; })} /></Field></div> : null}</fieldset>;
            })}
          </div> : <p>This Class has no supported spellcasting at the selected level.</p>}
          {supportsSpellcasting ? <SpellDecisionFields draft={draft} errorFor={errorFor} nextID={nextID} onChange={(spellcasting) => update((next) => { next.spellcasting = spellcasting; })} announce={setAnnouncement} />
            : draft.classKey === 'manual' ? <p>Manual Class spellcasting is outside the approved V2 contract.</p> : <p>This Class has no supported spellcasting at the selected level.</p>}
        </fieldset>

        <fieldset id="creation-features" className="structured-section">
          <legend>Features and traits</legend>
          <p>Canonical Race, Class, and Subclass features are included automatically from the local rules.</p>
          <ul className="canonical-list">{canonicalFeatures(draft).map((feature) => <li key={feature.id}>{feature.name} <span className="provenance-badge">Calculated SRD</span></li>)}</ul>
          <ul className="repeatable-list">{draft.manualFeatures.map((feature, index) => <li key={feature.id} className="repeatable-row repeatable-row--stacked">
            <Field field={`features.${index}.name`} label={`Manual feature ${index + 1} name`} required error={errorFor(`features.${index}.name`)}><input value={feature.name} onChange={(event) => update((next) => { next.manualFeatures[index].name = event.target.value; })} /></Field>
            <Field field={`features.${index}.category`} label={`Manual feature ${index + 1} category`} required error={errorFor(`features.${index}.category`)}><input value={feature.category} onChange={(event) => update((next) => { next.manualFeatures[index].category = event.target.value; })} /></Field>
            <Field field={`features.${index}.description`} label={`Manual feature ${index + 1} description`} required error={errorFor(`features.${index}.description`)}><textarea value={feature.description} onChange={(event) => update((next) => { next.manualFeatures[index].description = event.target.value; })} /></Field>
            <span className="provenance-badge">Imported</span><button type="button" className="button button--ghost" onClick={() => update((next) => { next.manualFeatures.splice(index, 1); })}>Remove feature</button>
          </li>)}</ul>
          <button type="button" className="button button--secondary" onClick={() => update((next) => { next.manualFeatures.push({ source: 'manual', id: `manual-feature-${nextID.current++}`, name: '', category: '', description: '' }); })}>Add manual feature</button>
        </fieldset>

        <fieldset id="creation-equipment" className="structured-section">
          <legend>Equipment</legend>
          <p>Only canonical equipped equipment can affect calculations. Manual equipment remains inert.</p>
          <div className="structured-add-row"><Field label="SRD equipment"><select value={newEquipmentIndex} onChange={(event) => setNewEquipmentIndex(event.target.value)}><option value="">Choose equipment</option>{equipmentOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></Field>
            <button type="button" className="button button--secondary" disabled={!newEquipmentIndex} onClick={() => { const name = equipmentName(newEquipmentIndex); update((next) => { if (!next.equipment.some((entry) => entry.source === 'srd' && entry.index === newEquipmentIndex)) next.equipment.push({ source: 'srd', index: newEquipmentIndex, quantity: 1, equipped: false }); }); setNewEquipmentIndex(''); setAnnouncement(`${name} added to equipment.`); }}>Add equipment</button></div>
          <ul className="repeatable-list">{draft.equipment.map((entry, index) => <li key={entry.source === 'srd' ? entry.index : entry.id}><EquipmentEditor entry={entry} index={index} fieldPrefix={`equipment.${index}`} errorFor={(field) => errorFor(`equipment.${index}.${field}`)} onChange={(value) => update((next) => { next.equipment[index] = value; }, true)} onRemove={() => { const name = entry.source === 'srd' ? equipmentName(entry.index) : entry.name || 'Other equipment'; update((next) => { next.equipment.splice(index, 1); }, true); setAnnouncement(`${name} removed from equipment.`); }} /></li>)}</ul>
          <button type="button" className="button button--secondary" onClick={() => { update((next) => { next.equipment.push({ source: 'manual', id: `manual-equipment-${nextID.current++}`, name: '', category: '', quantity: 1, equipped: false }); }); setAnnouncement('Other equipment entry added.'); }}>Add Other equipment</button>
        </fieldset>

        <fieldset id="creation-other" className="structured-section">
          <legend>Other</legend><p>Dedicated structured entries for details that do not belong in another section.</p>
          <ul className="repeatable-list">{draft.other.map((entry, index) => <li key={entry.id} className="repeatable-row repeatable-row--stacked"><Field field={`other.${index}.title`} label={`Other ${index + 1} title`} required error={errorFor(`other.${index}.title`)}><input value={entry.title} onChange={(event) => update((next) => { next.other[index].title = event.target.value; })} /></Field><Field field={`other.${index}.description`} label={`Other ${index + 1} description`} required error={errorFor(`other.${index}.description`)}><textarea value={entry.description} onChange={(event) => update((next) => { next.other[index].description = event.target.value; })} /></Field><button type="button" className="button button--ghost" onClick={() => update((next) => { next.other.splice(index, 1); })}>Remove Other entry</button></li>)}</ul>
          <button type="button" className="button button--secondary" onClick={() => update((next) => { next.other.push({ id: `other-${nextID.current++}`, title: '', description: '' }); })}>Add Other entry</button>
        </fieldset>
        <div id="creation-review" className="structured-creation__actions"><button type="button" className="button button--secondary" onClick={onBack}>Back</button><button id={fieldControlId('review')} type="submit" className="button button--primary">Review character</button></div>
      </form>
    </section>
  );
};

const fieldControlId = (field: string) => `field-${field.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

const Field = ({ label, field = label, required, error, children }: { label: string; field?: string; required?: boolean; error?: string; children: ReactElement<Record<string, unknown>> }) => {
  const id = fieldControlId(field);
  return <div className="structured-field"><label htmlFor={id}>{label}{required ? <span aria-hidden="true"> *</span> : null}</label>{withFieldProps(children, id, required, error)}{error ? <span className="structured-field__error" id={`${id}-error`}>{error}</span> : null}</div>;
};

const withFieldProps = (child: ReactElement<Record<string, unknown>>, id: string, required?: boolean, error?: string) => cloneElement(child, { id, required, 'aria-invalid': Boolean(error), 'aria-describedby': error ? `${id}-error` : undefined });

const OverrideControl = ({ field, label, minimum, maximum, value, errorFor, onChange, announce }: {
  field: string;
  label: string;
  minimum: number;
  maximum: number;
  value: { enabled: boolean; value: number; reason: string };
  errorFor: (field: string) => string | undefined;
  onChange: (value: { enabled: boolean; value: number; reason: string }) => void;
  announce: (message: string) => void;
}) => {
  const enabledField = `${field}.enabled`;
  const enabledID = fieldControlId(enabledField);
  const enabledError = errorFor(enabledField);
  return <fieldset className="override-panel"><legend>{label}</legend>
    <label className="toggle-row"><input id={enabledID} type="checkbox" checked={value.enabled} aria-invalid={Boolean(enabledError)} aria-describedby={enabledError ? `${enabledID}-error` : undefined} onChange={(event) => { onChange({ ...value, enabled: event.target.checked }); announce(`${label} ${event.target.checked ? 'activated' : 'reset to calculated value'}.`); }} /> Use override</label>
    {enabledError ? <span className="structured-field__error" id={`${enabledID}-error`}>{enabledError}</span> : null}
    {value.enabled ? <div className="structured-grid"><Field field={`${field}.value`} label={`${label} value`} required error={errorFor(`${field}.value`)}><input type="number" min={minimum} max={maximum} value={value.value} onChange={(event) => onChange({ ...value, value: Number(event.target.value) })} /></Field><Field field={`${field}.reason`} label={`${label} reason`} required error={errorFor(`${field}.reason`)}><input value={value.reason} onChange={(event) => onChange({ ...value, reason: event.target.value })} /></Field></div> : null}
  </fieldset>;
};

const AttackEditor = ({ attack, fieldPrefix, result, errorFor, onChange, onRemove }: { attack: CharacterAttackInput; fieldPrefix: string; result?: number; errorFor: (field: string) => string | undefined; onChange: (attack: CharacterAttackInput) => void; onRemove: () => void }) => {
  const calculatedBonus = attack.attackBonus.mode === 'calculated' ? attack.attackBonus : null;
  const manualBonus = attack.attackBonus.mode === 'manual-override' ? attack.attackBonus : null;
  return <fieldset className="repeatable-row repeatable-row--stacked"><legend>{attack.name || 'New attack'}</legend><Field field={`${fieldPrefix}.name`} label={`Attack ${attack.id} name`} required error={errorFor('name')}><input value={attack.name} onChange={(event) => onChange({ ...attack, name: event.target.value })} /></Field><Field field={`${fieldPrefix}.attackBonus.mode`} label={`Attack ${attack.id} bonus source`} required><select value={manualBonus ? 'manual' : calculatedBonus?.ability} onChange={(event) => onChange({ ...attack, attackBonus: event.target.value === 'manual' ? { mode: 'manual-override', value: 0, reason: '' } : { mode: 'calculated', ability: event.target.value as 'strength' | 'dexterity' | 'spellcasting', proficient: true } })}><option value="strength">Strength</option><option value="dexterity">Dexterity</option><option value="spellcasting">Spellcasting</option><option value="manual">Manual override</option></select></Field><p className="provenance-copy">Attack result: {result === undefined ? 'Complete the attack to calculate it.' : signed(result)}. {manualBonus ? 'Manual override.' : 'Calculated from the selected ability and proficiency decision.'}</p>{calculatedBonus ? <label className="toggle-row"><input type="checkbox" checked={calculatedBonus.proficient} onChange={(event) => onChange({ ...attack, attackBonus: { ...calculatedBonus, proficient: event.target.checked } })} /> Add proficiency bonus</label> : manualBonus ? <div className="structured-grid"><Field field={`${fieldPrefix}.attackBonus.value`} label={`Attack ${attack.id} manual bonus`} required><input type="number" value={manualBonus.value} onChange={(event) => onChange({ ...attack, attackBonus: { ...manualBonus, value: Number(event.target.value) } })} /></Field><Field field={`${fieldPrefix}.attackBonus.reason`} label={`Attack ${attack.id} override reason`} required error={errorFor('attackBonus.reason')}><input value={manualBonus.reason} onChange={(event) => onChange({ ...attack, attackBonus: { ...manualBonus, reason: event.target.value } })} /></Field></div> : null}{attack.damage.map((damage, index) => <div className="structured-grid" key={`${attack.id}-damage-${index}`}><Field field={`${fieldPrefix}.damage.${index}.dice`} label={`Attack ${attack.id} damage dice ${index + 1}`} required error={errorFor(`damage.${index}.dice`)}><input value={damage.dice} onChange={(event) => { const next = structuredClone(attack); next.damage[index].dice = event.target.value; onChange(next); }} /></Field><Field field={`${fieldPrefix}.damage.${index}.bonus`} label={`Attack ${attack.id} damage bonus ${index + 1}`} required><input type="number" value={damage.bonus} onChange={(event) => { const next = structuredClone(attack); next.damage[index].bonus = Number(event.target.value); onChange(next); }} /></Field><Field field={`${fieldPrefix}.damage.${index}.type`} label={`Attack ${attack.id} damage type ${index + 1}`} required error={errorFor(`damage.${index}.type`)}><input value={damage.type} onChange={(event) => { const next = structuredClone(attack); next.damage[index].type = event.target.value; onChange(next); }} /></Field>{attack.damage.length > 1 ? <button type="button" className="button button--ghost" onClick={() => { const next = structuredClone(attack); next.damage.splice(index, 1); onChange(next); }}>Remove damage</button> : null}</div>)}<div className="repeatable-actions"><button type="button" className="button button--ghost" onClick={() => onChange({ ...attack, damage: [...attack.damage, { dice: '1d6', bonus: 0, type: 'bludgeoning' }] })}>Add damage</button><button type="button" className="button button--ghost" onClick={onRemove}>Remove attack</button></div></fieldset>;
};

const SpellDecisionFields = ({ draft, errorFor, nextID, onChange, announce }: {
  draft: StructuredCharacterDraft;
  errorFor: (field: string) => string | undefined;
  nextID: { current: number };
  onChange: (spellcasting: CharacterSpellcastingInput) => void;
  announce: (message: string) => void;
}) => {
  const input = draft.spellcasting;
  if (input.mode === 'none') return null;
  const selectedClass = levelUpRules.classes.find((entry) => entry.index === draft.classKey);
  const target = selectedClass?.levels.find((entry) => entry.level === draft.level)?.spellcasting;
  const updateBucket = (change: (next: Exclude<CharacterSpellcastingInput, { mode: 'none' }>) => void) => {
    const next = structuredClone(input);
    change(next);
    if (next.mode === 'spellbook-prepared') {
      const spellbookIDs = new Set([...next.initialSpellbook, ...next.additions.flatMap((entry) => entry.spells)].map((spell) => spell.id));
      next.preparedSpellIds = next.preparedSpellIds.filter((id) => spellbookIDs.has(id));
    }
    onChange(next);
  };
  const cantripCount = target?.cantripsKnown ?? 0;
  const cantripBucket = <SpellBucket
    fieldKey="cantrips"
    label={`Cantrips (choose exactly ${cantripCount})`}
    requiredCount={cantripCount}
    draft={draft}
    acquisitionLevel={draft.level}
    cantrip
    spells={input.cantrips}
    nextID={nextID}
    errorFor={errorFor}
    announce={announce}
    onChange={(spells) => updateBucket((next) => { next.cantrips = spells; })}
  />;
  if (input.mode === 'prepared') return <>{cantripBucket}<SpellBucket
    fieldKey="prepared"
    label={`Prepared spells (${target && 'preparedFormula' in target ? target.preparedFormula : 'canonical Class formula'})`}
    draft={draft} acquisitionLevel={draft.level} spells={input.prepared} nextID={nextID} errorFor={errorFor}
    announce={announce}
    onChange={(spells) => updateBucket((next) => { if (next.mode === 'prepared') next.prepared = spells; })}
  /></>;
  if (input.mode === 'known' || input.mode === 'pact-known') {
    const priorIDs: string[] = [];
    return <>{cantripBucket}{input.levels.map((decision, index) => {
      const rule = selectedClass?.levels.find((entry) => entry.level === decision.level)?.spellcasting;
      const previousKnown = index === 0 ? 0 : selectedClass?.levels.find((entry) => entry.level === input.levels[index - 1].level)?.spellcasting?.spellsKnown ?? 0;
      const learnedCount = Math.max(0, (rule?.spellsKnown ?? 0) - previousKnown);
      const removable = [...priorIDs];
      for (const replacement of decision.replacements) {
        const position = priorIDs.indexOf(replacement.removeSpellId);
        if (position >= 0) priorIDs.splice(position, 1, replacement.add.id);
      }
      for (const learned of decision.learned) {
        if (!priorIDs.includes(learned.id)) priorIDs.push(learned.id);
      }
      const replacementOptionIDs = new Set([...removable, ...decision.learned.map((spell) => spell.id)]);
      return <fieldset className="override-panel" key={decision.level}><legend>Class level {decision.level} spell decisions</legend>
        <SpellBucket fieldKey={`known.level-${decision.level}.learned`} label={`Learned spells (choose exactly ${learnedCount})`} requiredCount={learnedCount} draft={draft} acquisitionLevel={decision.level} spells={decision.learned} nextID={nextID} errorFor={errorFor}
          announce={announce}
          onChange={(spells) => updateBucket((next) => { if (next.mode === 'known' || next.mode === 'pact-known') next.levels[index].learned = spells; })} />
        {(rule?.replacementLimit ?? 0) > 0 ? <label className="toggle-row"><input type="checkbox" checked={decision.replacements.length > 0} onChange={(event) => updateBucket((next) => {
          if (next.mode !== 'known' && next.mode !== 'pact-known') return;
          next.levels[index].replacements = event.target.checked && removable[0]
            ? [{ removeSpellId: removable[0], add: { id: 'spell-missing-replacement', source: 'srd', index: '' } }] : [];
        })} /> Replace one previously known spell</label> : null}
        {decision.replacements.map((replacement, replacementIndex) => <div className="structured-grid" key={`${decision.level}-${replacementIndex}`}>
          <Field field={`spellcasting.known.level-${decision.level}.replacement.remove`} label={`Level ${decision.level} spell to replace`} required error={errorFor(`spellcasting.known.level-${decision.level}.replacement.remove`)}><select value={replacement.removeSpellId} onChange={(event) => updateBucket((next) => { if (next.mode === 'known' || next.mode === 'pact-known') next.levels[index].replacements[replacementIndex].removeSpellId = event.target.value; })}>{removable.map((id) => <option key={id} value={id}>{id}</option>)}</select></Field>
          <Field field={`spellcasting.known.level-${decision.level}.replacement.add`} label={`Level ${decision.level} replacement spell`} required error={errorFor(`spellcasting.known.level-${decision.level}.replacement.add`)}><select value={replacement.add.source === 'srd' ? replacement.add.index : ''} onChange={(event) => updateBucket((next) => { if (next.mode === 'known' || next.mode === 'pact-known') next.levels[index].replacements[replacementIndex].add = canonicalSpellInput(event.target.value); })}><option value="">Choose replacement</option>{availableSpellsForDraft(draft, decision.level).filter((spell) => spell.level > 0 && !replacementOptionIDs.has(`spell-${spell.index}`)).map((spell) => <option key={spell.index} value={spell.index}>{spell.name} · level {spell.level}</option>)}</select></Field>
        </div>)}
      </fieldset>;
    })}</>;
  }
  const spellbook = [...input.initialSpellbook, ...input.additions.flatMap((entry) => entry.spells)];
  return <>{cantripBucket}<SpellBucket fieldKey="spellbook.initial" label="Initial spellbook (choose exactly 6 level 1 spells)" requiredCount={6} draft={draft} acquisitionLevel={1} spells={input.initialSpellbook} nextID={nextID} errorFor={errorFor}
    announce={announce}
    onChange={(spells) => updateBucket((next) => { if (next.mode === 'spellbook-prepared') next.initialSpellbook = spells; })} />
  {input.additions.map((addition, index) => <SpellBucket key={addition.level} fieldKey={`spellbook.level-${addition.level}.additions`} label={`Class level ${addition.level} spellbook additions (choose exactly 2)`} requiredCount={2} draft={draft} acquisitionLevel={addition.level} spells={addition.spells} nextID={nextID} errorFor={errorFor}
    announce={announce}
    onChange={(spells) => updateBucket((next) => { if (next.mode === 'spellbook-prepared') next.additions[index].spells = spells; })} />)}
  {spellbook.length > 0
    ? <Field field="spellcasting.spellbook.prepared" label="Prepared spellbook spells" required error={errorFor('spellcasting.spellbook.prepared')}><select multiple size={Math.min(8, Math.max(2, spellbook.length))} value={input.preparedSpellIds} onChange={(event) => { const selected = [...event.target.selectedOptions].map((option) => option.value); updateBucket((next) => { if (next.mode === 'spellbook-prepared') next.preparedSpellIds = selected; }); announce(`${selected.length} spellbook spell${selected.length === 1 ? '' : 's'} prepared.`); }}>{spellbook.map((spell) => <option key={spell.id} value={spell.id}>{spellLabel(spell)}</option>)}</select></Field>
    : <p>Select the required spellbook spells before choosing which ones are prepared.</p>}</>;
};

const SpellBucket = ({ fieldKey, label, requiredCount, draft, acquisitionLevel, cantrip = false, spells, nextID, errorFor, onChange, announce }: {
  fieldKey: string;
  label: string;
  requiredCount?: number;
  draft: StructuredCharacterDraft;
  acquisitionLevel: number;
  cantrip?: boolean;
  spells: SpellSelectionInput[];
  nextID: { current: number };
  errorFor: (field: string) => string | undefined;
  onChange: (spells: SpellSelectionInput[]) => void;
  announce: (message: string) => void;
}) => {
  if (requiredCount === 0) return null;
  const options = availableSpellsForDraft(draft, acquisitionLevel).filter((spell) => cantrip ? spell.level === 0 : spell.level > 0);
  const selected = spells.filter((spell) => spell.source === 'srd').map((spell) => spell.index);
  const manual = spells.filter((spell): spell is Extract<SpellSelectionInput, { source: 'manual' }> => spell.source === 'manual');
  const selectionField = `spellcasting.${fieldKey}`;
  const selectionError = errorFor(selectionField);
  const selectionID = fieldControlId(selectionField);
  return <fieldset className="repeatable-row repeatable-row--stacked"><legend>{label}</legend>
    <select id={selectionID} aria-label={label} aria-invalid={Boolean(selectionError)} aria-describedby={selectionError ? `${selectionID}-error` : undefined} multiple size={Math.min(8, Math.max(3, options.length))} value={selected} onChange={(event) => {
      const canonical = [...event.target.selectedOptions].map((option) => canonicalSpellInput(option.value));
      onChange([...canonical, ...manual]);
      const added = canonical.filter((spell) => !spells.some((entry) => entry.source === 'srd' && entry.index === spell.index));
      const removed = spells.filter((spell) => spell.source === 'srd' && !canonical.some((entry) => entry.index === spell.index));
      if (added.length || removed.length) announce(`${added.length ? `${added.length} spell${added.length === 1 ? '' : 's'} added` : ''}${added.length && removed.length ? '; ' : ''}${removed.length ? `${removed.length} spell${removed.length === 1 ? '' : 's'} removed` : ''} from ${label}.`);
    }}>{options.map((spell) => <option key={spell.index} value={spell.index}>{spell.name} · level {spell.level}</option>)}</select>
    {selectionError ? <span className="structured-field__error" id={`${selectionID}-error`}>{selectionError}</span> : null}
    {spells.filter((spell) => spell.source === 'srd').map((spell) => <SpellEditor key={spell.id} spell={spell} errorFor={() => undefined} onChange={() => undefined} onRemove={() => { onChange(spells.filter((entry) => entry.id !== spell.id)); announce(`${spellLabel(spell)} removed from ${label}.`); }} />)}
    {manual.map((spell) => <SpellEditor key={spell.id} spell={spell} errorFor={(field) => errorFor(`spellcasting.${fieldKey}.spell.${spell.id}.${field}`)} fieldPrefix={`spellcasting.${fieldKey}.spell.${spell.id}`} onChange={(value) => onChange(spells.map((entry) => entry.id === spell.id ? value : entry))} onRemove={() => { onChange(spells.filter((entry) => entry.id !== spell.id)); announce(`${spellLabel(spell)} removed from ${label}.`); }} />)}
    <button type="button" className="button button--secondary" onClick={() => { onChange([...spells, newManualSpell(`manual-spell-${nextID.current++}`, cantrip ? 0 : 1)]); announce(`Imported spell entry added to ${label}.`); }}>Add imported spell</button>
  </fieldset>;
};

const SpellEditor = ({ spell, fieldPrefix, errorFor, onChange, onRemove }: { spell: SpellSelectionInput; fieldPrefix?: string; errorFor: (field: string) => string | undefined; onChange: (spell: SpellSelectionInput) => void; onRemove: () => void }) => {
  const metadata = spell.source === 'srd'
    ? spellMetadata(spell.index)
    : {
        name: spell.name,
        level: spell.level,
        school: spell.school,
        castingTime: spell.castingTime,
        range: spell.range,
        components: spell.components,
        material: spell.materialComponent ?? null,
        duration: spell.duration,
        concentration: spell.concentration,
        ritual: spell.ritual,
        description: spell.description,
        higherLevel: spell.higherLevelText ?? null,
      };
  if (!metadata) return null;
  return <fieldset className="repeatable-row repeatable-row--stacked"><legend>{metadata.name || 'Manual spell'} <span className="provenance-badge">{spell.source === 'srd' ? 'Calculated SRD' : 'Imported'}</span></legend>{spell.source === 'manual' ? <ManualSpellFields spell={spell} fieldPrefix={fieldPrefix ?? `spellcasting.spell.${spell.id}`} errorFor={errorFor} onChange={onChange} /> : null}<dl className="spell-metadata"><div><dt>Level and school</dt><dd>{metadata.level} · {metadata.school}</dd></div><div><dt>Casting time</dt><dd>{metadata.castingTime}</dd></div><div><dt>Range</dt><dd>{metadata.range}</dd></div><div><dt>Components</dt><dd>{metadata.components.join(', ')}{metadata.material ? ` (${metadata.material})` : ''}</dd></div><div><dt>Duration</dt><dd>{metadata.duration}</dd></div><div><dt>Concentration / ritual</dt><dd>{metadata.concentration ? 'Concentration' : 'No concentration'} · {metadata.ritual ? 'Ritual' : 'Not ritual'}</dd></div><div><dt>Description</dt><dd>{metadata.description}</dd></div>{metadata.higherLevel ? <div><dt>At higher levels</dt><dd>{metadata.higherLevel}</dd></div> : null}</dl><button type="button" className="button button--ghost" onClick={onRemove}>Remove spell</button></fieldset>;
};

const ManualSpellFields = ({ spell, fieldPrefix, errorFor, onChange }: { spell: Extract<SpellSelectionInput, { source: 'manual' }>; fieldPrefix: string; errorFor: (field: string) => string | undefined; onChange: (spell: SpellSelectionInput) => void }) => <div className="structured-grid"><Field field={`${fieldPrefix}.name`} label={`Spell ${spell.id} name`} required error={errorFor('name')}><input value={spell.name} onChange={(event) => onChange({ ...spell, name: event.target.value })} /></Field><Field field={`${fieldPrefix}.level`} label={`Spell ${spell.id} level`} required error={errorFor("level")}><input type="number" min="0" max="3" value={spell.level} onChange={(event) => onChange({ ...spell, level: Number(event.target.value) })} /></Field><Field field={`${fieldPrefix}.school`} label={`Spell ${spell.id} school`} required error={errorFor('school')}><input value={spell.school} onChange={(event) => onChange({ ...spell, school: event.target.value })} /></Field><Field field={`${fieldPrefix}.castingTime`} label={`Spell ${spell.id} casting time`} required error={errorFor('castingTime')}><input value={spell.castingTime} onChange={(event) => onChange({ ...spell, castingTime: event.target.value })} /></Field><Field field={`${fieldPrefix}.range`} label={`Spell ${spell.id} range`} required error={errorFor('range')}><input value={spell.range} onChange={(event) => onChange({ ...spell, range: event.target.value })} /></Field><Field field={`${fieldPrefix}.components`} label={`Spell ${spell.id} components`} required error={errorFor('components')}><input value={spell.components.join(', ')} onChange={(event) => onChange({ ...spell, components: event.target.value.split(',').map((value) => value.trim()).filter(Boolean) })} /></Field><Field label={`Spell ${spell.id} material component`}><input value={spell.materialComponent ?? ''} onChange={(event) => onChange({ ...spell, materialComponent: event.target.value || undefined })} /></Field><Field field={`${fieldPrefix}.duration`} label={`Spell ${spell.id} duration`} required error={errorFor('duration')}><input value={spell.duration} onChange={(event) => onChange({ ...spell, duration: event.target.value })} /></Field><label className="toggle-row"><input type="checkbox" checked={spell.concentration} onChange={(event) => onChange({ ...spell, concentration: event.target.checked })} /> Concentration</label><label className="toggle-row"><input type="checkbox" checked={spell.ritual} onChange={(event) => onChange({ ...spell, ritual: event.target.checked })} /> Ritual</label><Field field={`${fieldPrefix}.description`} label={`Spell ${spell.id} description`} required error={errorFor('description')}><textarea value={spell.description} onChange={(event) => onChange({ ...spell, description: event.target.value })} /></Field><Field label={`Spell ${spell.id} higher-level text`}><textarea value={spell.higherLevelText ?? ''} onChange={(event) => onChange({ ...spell, higherLevelText: event.target.value || undefined })} /></Field><Field field={`${fieldPrefix}.importReason`} label={`Spell ${spell.id} import reason`} required error={errorFor('importReason')}><input value={spell.importReason} onChange={(event) => onChange({ ...spell, importReason: event.target.value })} /></Field></div>;

const EquipmentEditor = ({ entry, index, fieldPrefix, errorFor, onChange, onRemove }: { entry: CharacterEquipmentInput; index: number; fieldPrefix: string; errorFor: (field: string) => string | undefined; onChange: (entry: CharacterEquipmentInput) => void; onRemove: () => void }) => <fieldset className="repeatable-row"><legend>{entry.source === 'srd' ? equipmentName(entry.index) : entry.name || 'Other equipment'}</legend>{entry.source === 'manual' ? <><Field field={`${fieldPrefix}.name`} label={`Other equipment ${index + 1} name`} required error={errorFor('name')}><input value={entry.name} onChange={(event) => onChange({ ...entry, name: event.target.value })} /></Field><Field field={`${fieldPrefix}.category`} label={`Other equipment ${index + 1} category`} required error={errorFor('category')}><input value={entry.category} onChange={(event) => onChange({ ...entry, category: event.target.value })} /></Field><span className="provenance-badge">Manual and inert</span></> : <span className="provenance-badge">Canonical SRD</span>}<Field field={`${fieldPrefix}.quantity`} label={`Equipment ${index + 1} quantity`} required error={errorFor('quantity')}><input type="number" min="1" value={entry.quantity} onChange={(event) => onChange({ ...entry, quantity: Number(event.target.value) })} /></Field><label className="toggle-row"><input type="checkbox" checked={entry.equipped} onChange={(event) => onChange({ ...entry, equipped: event.target.checked })} /> Equipped</label><button type="button" className="button button--ghost" onClick={onRemove}>Remove equipment</button></fieldset>;

const spellSelectionBucketsForAnnouncement = (spellcasting: CharacterSpellcastingInput): string[] => {
  if (spellcasting.mode === 'none') return [];
  if (spellcasting.mode === 'known' || spellcasting.mode === 'pact-known') return [
    ...spellcasting.cantrips.map((spell) => spell.id),
    ...spellcasting.levels.flatMap((level) => [...level.learned.map((spell) => spell.id), ...level.replacements.map((replacement) => replacement.add.id)]),
  ];
  if (spellcasting.mode === 'prepared') return [...spellcasting.cantrips, ...spellcasting.prepared].map((spell) => spell.id);
  return [...spellcasting.cantrips, ...spellcasting.initialSpellbook, ...spellcasting.additions.flatMap((addition) => addition.spells)].map((spell) => spell.id);
};

const DerivedGrid = ({ sheet }: { sheet: ReturnType<typeof buildCharacterSheetV2> }) => <dl className="derived-grid"><DerivedValue label="Maximum HP" value={sheet.hitPointProgression.maximum.value} provenance={sheet.hitPointProgression.maximum.provenance} /><DerivedValue label="Armor Class" value={sheet.combat.armorClass.value} provenance={sheet.combat.armorClass.provenance} /><DerivedValue label="Speed" value={`${sheet.combat.speedFt.value} ft.`} provenance={sheet.combat.speedFt.provenance} /><DerivedValue label="Proficiency" value={signed(sheet.combat.proficiencyBonus.value)} provenance={sheet.combat.proficiencyBonus.provenance} /><DerivedValue label="Initiative" value={signed(sheet.combat.initiative.value)} provenance={sheet.combat.initiative.provenance} /><DerivedValue label="Passive Perception" value={sheet.combat.passivePerception.value} provenance={sheet.combat.passivePerception.provenance} />{sheet.spellcasting.spellSaveDC && sheet.spellcasting.spellAttackBonus ? <><DerivedValue label="Spell save DC" value={sheet.spellcasting.spellSaveDC.value} provenance={sheet.spellcasting.spellSaveDC.provenance} /><DerivedValue label="Spell attack" value={signed(sheet.spellcasting.spellAttackBonus.value)} provenance={sheet.spellcasting.spellAttackBonus.provenance} /></> : null}</dl>;
const DerivedValue = ({ label, value, provenance }: { label: string; value: string | number; provenance: ValueProvenance }) => <div><dt>{label}</dt><dd>{value}</dd><small>{provenanceLabel(provenance)}</small></div>;
const provenanceLabel = (provenance: ValueProvenance) => provenance.kind === 'calculated' ? `Calculated: ${provenance.ruleId}` : provenance.kind === 'manual-override' ? `Manual override: ${provenance.reason}` : `Imported${provenance.note ? `: ${provenance.note}` : ''}`;
const ReviewBlock = ({ title, children }: { title: string; children: ReactNode }) => <section className="structured-review__block"><h3>{title}</h3>{children}</section>;
const ReviewList = ({ label, values }: { label: string; values: string[] }) => <div><h4>{label}</h4>{values.length ? <ul>{values.map((value, index) => <li key={`${label}-${index}`}>{value}</li>)}</ul> : <p>None.</p>}</div>;
const newAttack = (id: string): CharacterAttackInput => ({ id, name: '', attackBonus: { mode: 'calculated', ability: 'strength', proficient: true }, damage: [{ dice: '1d6', bonus: 0, type: 'bludgeoning' }] });
const canonicalSpellInput = (index: string): Extract<SpellSelectionInput, { source: 'srd' }> => ({ id: `spell-${index}`, source: 'srd', index });
const spellLabel = (spell: SpellSelectionInput) => spell.source === 'srd' ? spellMetadata(spell.index)?.name ?? spell.index : spell.name || 'Imported spell';
const newManualSpell = (id: string, level: number): Extract<SpellSelectionInput, { source: 'manual' }> => ({ source: 'manual', id, name: '', level, school: '', castingTime: '', range: '', components: ['V'], duration: '', concentration: false, ritual: false, description: '', importReason: '' });
const ensureEquipped = (draft: StructuredCharacterDraft, index: string) => { if (!index) return; const existing = draft.equipment.find((entry) => entry.source === 'srd' && entry.index === index); if (existing) existing.equipped = true; else draft.equipment.push({ source: 'srd', index, quantity: 1, equipped: true }); };
const equipmentName = (index: string) => characterCreationRules.equipment.find((entry) => entry.index === index)?.name ?? index;
const displayRace = (draft: StructuredCharacterDraft) => draft.raceKey === 'manual' ? draft.manualRaceName : raceOptions.find((option) => option.value === draft.raceKey)?.label ?? draft.raceKey;
const displayClass = (draft: StructuredCharacterDraft) => draft.classKey === 'manual' ? draft.manualClassName : classOptions.find((option) => option.value === draft.classKey)?.label ?? draft.classKey;
const displaySubclass = (draft: StructuredCharacterDraft) => draft.subclassKey === 'manual' ? draft.manualSubclassName : availableSubclassesForDraft(draft).find((option) => option.value === draft.subclassKey)?.label ?? draft.subclassKey;
const signed = (value: number) => value >= 0 ? `+${value}` : String(value);
const canonicalFeatures = (draft: StructuredCharacterDraft) => {
  const race = characterCreationRules.races.find((entry) => entry.index === draft.raceKey);
  const subrace = characterCreationRules.subraces.find((entry) => entry.index === draft.raceKey);
  const parentRace = subrace ? characterCreationRules.races.find((entry) => entry.index === subrace.raceIndex) : race;
  const traitIDs = [...(parentRace?.traitIndexes ?? []), ...(subrace?.traitIndexes ?? [])];
  const raceFeatures = traitIDs.flatMap((id) => {
    const trait = characterCreationRules.raceTraits.find((entry) => entry.index === id);
    return trait ? [{ id: trait.index, name: trait.name }] : [];
  });
  const selectedClass = levelUpRules.classes.find((entry) => entry.index === draft.classKey);
  const classFeatures = (selectedClass?.levels ?? []).filter(({ level }) => level <= draft.level)
    .flatMap(({ features }) => features.map((feature) => ({ id: feature.index, name: feature.name })));
  const subclassFeatures = (selectedClass?.subclasses.find((entry) => entry.index === draft.subclassKey)?.featuresByLevel ?? [])
    .filter(({ level }) => level <= draft.level).flatMap(({ features }) => features.map((feature) => ({ id: feature.index, name: feature.name })));
  return [...raceFeatures, ...classFeatures, ...subclassFeatures];
};
