import { useEffect, useRef, useState } from 'react';
import { createCharacter, CharactersApiError } from '../characters/api';
import {
  initialFantasyBucketScores,
  initialCharacterCreationDraft,
  type CharacterBuildId,
  type CharacterCreationDraft,
  type CharacterCreationMode,
  type FantasyBucket,
  type FantasyBucketScores,
} from './characterCreationTypes';
import {
  buildGeneratedFighterCreateRequest,
  generatedFighterBuilds,
} from './generatedFighterBuilds';
import {
  buildManualCharacterCreateRequest,
  validateManualCharacterEntryDraft,
  type ManualCharacterCreateRequest,
  type ManualCharacterEntryDraftV1,
  type ManualCharacterEntryValidationError,
} from './manualCharacterEntry';
import './characterCreation.css';

type CharacterCreationPageProps = {
  onBack: () => void;
  isSignedIn?: boolean;
  onSignIn?: () => void;
  onCreateAccount?: () => void;
  onOpenCharacterReference?: (characterId: string) => void;
  savedCharacterActionLabel?: string;
};

type SaveState =
  | { status: 'idle' }
  | { status: 'saving' }
  | { status: 'error'; message: string }
  | { status: 'success'; characterId: string; characterName: string };

const ordinarySavedCharacterActionLabel = 'Open Character Reference';

const requiredManualFields = new Set([
  'name',
  'className',
  'level',
  'ancestry',
  'background',
  'hitPoints.current',
  'hitPoints.max',
  'armorClass',
  'speedFt',
  'proficiencyBonus',
  'abilityScores.strength',
  'abilityScores.dexterity',
  'abilityScores.constitution',
  'abilityScores.intelligence',
  'abilityScores.wisdom',
  'abilityScores.charisma',
]);

const modeChoices: {
  mode: Exclude<CharacterCreationMode, null>;
  label: string;
  description: string;
}[] = [
  {
    mode: 'manual',
    label: 'Fill the sheet myself',
    description: 'For bringing in a character you already know or have on paper.',
  },
  {
    mode: 'guided',
    label: 'Help me choose',
    description: 'For a quick fantasy preference quiz with an honest Fighter-only result.',
  },
];

const initialManualCharacterEntryDraft = (): ManualCharacterEntryDraftV1 => ({
  name: '',
  className: '',
  subclassName: '',
  level: '',
  ancestry: '',
  background: '',
  concept: '',
  notes: '',
  hitPoints: {
    current: '',
    max: '',
  },
  armorClass: '',
  speedFt: '',
  proficiencyBonus: '',
  initiative: '',
  passivePerception: '',
  abilityScores: {
    strength: '',
    dexterity: '',
    constitution: '',
    intelligence: '',
    wisdom: '',
    charisma: '',
  },
  action: {
    name: '',
    actionType: '',
    attackBonus: '',
    damage: '',
    range: '',
    summary: '',
  },
  feature: {
    name: '',
    category: '',
    summary: '',
  },
});

const abilityScoreFields: {
  field: keyof ManualCharacterEntryDraftV1['abilityScores'];
  label: string;
  shortLabel: string;
}[] = [
  { field: 'strength', label: 'Strength', shortLabel: 'STR' },
  { field: 'dexterity', label: 'Dexterity', shortLabel: 'DEX' },
  { field: 'constitution', label: 'Constitution', shortLabel: 'CON' },
  { field: 'intelligence', label: 'Intelligence', shortLabel: 'INT' },
  { field: 'wisdom', label: 'Wisdom', shortLabel: 'WIS' },
  { field: 'charisma', label: 'Charisma', shortLabel: 'CHA' },
];

const buildContent: Record<
  CharacterBuildId,
  {
    label: string;
    resultCopy: string;
    secondaryNote: string;
  }
> = {
  'strength-melee-fighter': {
    label: 'Strength melee Fighter',
    resultCopy:
      'Your closest supported match is a Strength melee Fighter: a level-1 Human Fighter who stands up front, protects allies, and handles danger face to face. This build uses chain mail, a shield, and a longsword, with strong defense and a simple, sturdy combat plan.',
    secondaryNote:
      'Good fit if you want your character to feel brave, durable, and direct.',
  },
  'dexterity-archer-fighter': {
    label: 'Dexterity archer Fighter',
    resultCopy:
      'Your closest supported match is a Dexterity archer Fighter: a level-1 Human Fighter who fights from range, moves for a better angle, and solves problems with accurate shots. This build uses a longbow, lighter armor, and positioning, with a strong ranged attack.',
    secondaryNote:
      'Good fit if you want your character to feel alert, flexible, and precise.',
  },
};

const futurePathMessages: Record<
  Exclude<
    FantasyBucket,
    'strengthMelee' | 'dexterityArcher'
  >,
  string
> = {
  futureMagic:
    'Your answers have a spark of magic in them. This first version does not build spellcasters yet, so the recommendation below is the closest beginner Fighter style available right now.',
  futureHealingSupport:
    'Your answers lean toward protecting or supporting allies. This first version does not build healers yet, so the recommendation below keeps you useful in the supported Fighter paths.',
  futureStealthTrickery:
    'Your answers enjoy sneaky or tricky solutions. This first version does not build rogue-style characters yet, so the recommendation below picks the closest supported Fighter style.',
  futureSocialCleverChaos:
    'Your answers like clever, dramatic, or social chaos. This first version does not build social specialists yet, so the recommendation below chooses the closest supported Fighter style.',
};

type QuizAnswer = {
  id: string;
  label: string;
  bucket: FantasyBucket;
  fallbackBuild: CharacterBuildId;
};

type QuizQuestion = {
  id: string;
  prompt: string;
  answers: QuizAnswer[];
};

const quizQuestions: QuizQuestion[] = [
  {
    id: 'danger-appears',
    prompt: 'Danger appears. What is your first instinct?',
    answers: [
      {
        id: 'danger-stand-front',
        label: 'Stand in front and take the pressure.',
        bucket: 'strengthMelee',
        fallbackBuild: 'strength-melee-fighter',
      },
      {
        id: 'danger-clean-shot',
        label: 'Find a clean shot from a safer angle.',
        bucket: 'dexterityArcher',
        fallbackBuild: 'dexterity-archer-fighter',
      },
      {
        id: 'danger-impossible-power',
        label: 'Reach for impossible power or a strange sign.',
        bucket: 'futureMagic',
        fallbackBuild: 'dexterity-archer-fighter',
      },
      {
        id: 'danger-everyone-breathing',
        label: 'Get everyone breathing and back on their feet.',
        bucket: 'futureHealingSupport',
        fallbackBuild: 'strength-melee-fighter',
      },
    ],
  },
  {
    id: 'best-place',
    prompt: 'Where do you picture your hero doing their best work?',
    answers: [
      {
        id: 'place-crush',
        label: 'In the crush, shield high and feet planted.',
        bucket: 'strengthMelee',
        fallbackBuild: 'strength-melee-fighter',
      },
      {
        id: 'place-range',
        label: 'At range, reading the field and picking targets.',
        bucket: 'dexterityArcher',
        fallbackBuild: 'dexterity-archer-fighter',
      },
      {
        id: 'place-out-of-sight',
        label: 'Out of sight, setting up the moment no one sees coming.',
        bucket: 'futureStealthTrickery',
        fallbackBuild: 'dexterity-archer-fighter',
      },
      {
        id: 'place-causing-scene',
        label: 'In the middle of the plan, distracting, bargaining, or causing a scene.',
        bucket: 'futureSocialCleverChaos',
        fallbackBuild: 'dexterity-archer-fighter',
      },
    ],
  },
  {
    id: 'ally-trouble',
    prompt: 'An ally is in trouble. How do you help?',
    answers: [
      {
        id: 'ally-make-space',
        label: 'Rush in and make space for them.',
        bucket: 'strengthMelee',
        fallbackBuild: 'strength-melee-fighter',
      },
      {
        id: 'ally-drop-enemy',
        label: 'Drop the enemy pressuring them.',
        bucket: 'dexterityArcher',
        fallbackBuild: 'dexterity-archer-fighter',
      },
      {
        id: 'ally-patch-up',
        label: 'Patch them up or keep them standing.',
        bucket: 'futureHealingSupport',
        fallbackBuild: 'strength-melee-fighter',
      },
      {
        id: 'ally-look-wrong-way',
        label: 'Trick the threat into looking the wrong way.',
        bucket: 'futureStealthTrickery',
        fallbackBuild: 'dexterity-archer-fighter',
      },
    ],
  },
  {
    id: 'risky-obstacle',
    prompt: 'A risky obstacle blocks the way. What sounds most like your hero?',
    answers: [
      {
        id: 'obstacle-force-open',
        label: 'Force it open and keep moving.',
        bucket: 'strengthMelee',
        fallbackBuild: 'strength-melee-fighter',
      },
      {
        id: 'obstacle-careful-route',
        label: 'Look for a careful route around it.',
        bucket: 'dexterityArcher',
        fallbackBuild: 'dexterity-archer-fighter',
      },
      {
        id: 'obstacle-impossible-shortcut',
        label: 'Use a spell, omen, or impossible shortcut.',
        bucket: 'futureMagic',
        fallbackBuild: 'dexterity-archer-fighter',
      },
      {
        id: 'obstacle-talk-bluff',
        label: 'Talk, bluff, or improvise until the room changes.',
        bucket: 'futureSocialCleverChaos',
        fallbackBuild: 'dexterity-archer-fighter',
      },
    ],
  },
  {
    id: 'victory-feels',
    prompt: 'What should victory feel like?',
    answers: [
      {
        id: 'victory-held-line',
        label: 'Everyone is safe because you held the line.',
        bucket: 'strengthMelee',
        fallbackBuild: 'strength-melee-fighter',
      },
      {
        id: 'victory-perfect-shot',
        label: 'The perfect shot landed at the perfect time.',
        bucket: 'dexterityArcher',
        fallbackBuild: 'dexterity-archer-fighter',
      },
      {
        id: 'victory-reality-bent',
        label: 'Reality bent just enough to save the day.',
        bucket: 'futureMagic',
        fallbackBuild: 'dexterity-archer-fighter',
      },
      {
        id: 'victory-ridiculous-plan',
        label: 'The plan was ridiculous, dramatic, and somehow worked.',
        bucket: 'futureSocialCleverChaos',
        fallbackBuild: 'dexterity-archer-fighter',
      },
    ],
  },
];

const getBuildLabel = (build: CharacterBuildId | null) => {
  return build ? buildContent[build].label : 'Not chosen';
};

const formatSignedNumber = (value: number) => {
  return value >= 0 ? `+${value}` : String(value);
};

const findAnswer = (answerId: string) => {
  return quizQuestions.flatMap((question) => question.answers).find(
    (answer) => answer.id === answerId,
  );
};

const scoreAnswers = (answers: CharacterCreationDraft['questionnaireAnswers']) => {
  const fantasyBucketScores: FantasyBucketScores = initialFantasyBucketScores();
  const fallbackScores: Record<CharacterBuildId, number> = {
    'strength-melee-fighter': 0,
    'dexterity-archer-fighter': 0,
  };
  let finalAnsweredFallback: CharacterBuildId | null = null;

  quizQuestions.forEach((question) => {
    const answerId = answers[question.id];
    if (!answerId) {
      return;
    }

    const answer = findAnswer(answerId);
    if (!answer) {
      return;
    }

    fantasyBucketScores[answer.bucket] += 1;
    fallbackScores[answer.fallbackBuild] += 1;
    finalAnsweredFallback = answer.fallbackBuild;
  });

  return { fantasyBucketScores, fallbackScores, finalAnsweredFallback };
};

const getUnsupportedFantasyBuckets = (scores: FantasyBucketScores) => {
  const unsupportedBuckets: Exclude<
    FantasyBucket,
    'strengthMelee' | 'dexterityArcher'
  >[] = [
    'futureMagic',
    'futureHealingSupport',
    'futureStealthTrickery',
    'futureSocialCleverChaos',
  ];
  const highestScore = Math.max(...Object.values(scores));

  if (highestScore === 0) {
    return [];
  }

  return unsupportedBuckets
    .filter((bucket) => scores[bucket] === highestScore)
    .slice(0, 2);
};

const getRecommendedBuild = (
  answers: CharacterCreationDraft['questionnaireAnswers'],
): CharacterBuildId | null => {
  if (quizQuestions.some((question) => !answers[question.id])) {
    return null;
  }

  const { fantasyBucketScores, fallbackScores, finalAnsweredFallback } =
    scoreAnswers(answers);

  if (fallbackScores['strength-melee-fighter'] > fallbackScores['dexterity-archer-fighter']) {
    return 'strength-melee-fighter';
  }

  if (fallbackScores['dexterity-archer-fighter'] > fallbackScores['strength-melee-fighter']) {
    return 'dexterity-archer-fighter';
  }

  if (fantasyBucketScores.strengthMelee > fantasyBucketScores.dexterityArcher) {
    return 'strength-melee-fighter';
  }

  if (fantasyBucketScores.dexterityArcher > fantasyBucketScores.strengthMelee) {
    return 'dexterity-archer-fighter';
  }

  return finalAnsweredFallback ?? 'strength-melee-fighter';
};

export const CharacterCreationPage = ({
  onBack,
  isSignedIn = false,
  onSignIn,
  onCreateAccount,
  onOpenCharacterReference,
  savedCharacterActionLabel,
}: CharacterCreationPageProps) => {
  const [draft, setDraft] = useState<CharacterCreationDraft>(
    initialCharacterCreationDraft,
  );
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isShowingRecommendation, setIsShowingRecommendation] = useState(false);
  const [isShowingReview, setIsShowingReview] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>({ status: 'idle' });
  const [manualDraft, setManualDraft] = useState<ManualCharacterEntryDraftV1>(
    initialManualCharacterEntryDraft,
  );
  const [manualErrors, setManualErrors] = useState<ManualCharacterEntryValidationError[]>([]);
  const [manualReviewRequest, setManualReviewRequest] =
    useState<ManualCharacterCreateRequest | null>(null);
  const manualEntryRef = useRef<HTMLElement | null>(null);
  const hasCustomSavedCharacterAction = savedCharacterActionLabel !== undefined;
  const resolvedSavedCharacterActionLabel =
    savedCharacterActionLabel ?? ordinarySavedCharacterActionLabel;

  useEffect(() => {
    if (manualErrors.length === 0 || manualReviewRequest !== null) {
      return;
    }

    const firstInvalidField = manualEntryRef.current?.querySelector<HTMLInputElement>(
      '.manual-entry-field input[aria-invalid="true"]',
    );

    if (!firstInvalidField) {
      return;
    }

    firstInvalidField.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
    firstInvalidField.focus({ preventScroll: true });
  }, [manualErrors, manualReviewRequest]);

  const chooseMode = (mode: Exclude<CharacterCreationMode, null>) => {
    setDraft((currentDraft) => ({
      ...currentDraft,
      mode,
    }));

    if (mode === 'guided') {
      setCurrentQuestionIndex(0);
      setIsShowingRecommendation(false);
      setIsShowingReview(false);
      setSaveState({ status: 'idle' });
    }

    if (mode === 'manual') {
      setManualErrors([]);
      setManualReviewRequest(null);
      setSaveState({ status: 'idle' });
    }
  };

  const answerQuestion = (questionId: string, answerId: string) => {
    setDraft((currentDraft) => {
      const questionnaireAnswers = {
        ...currentDraft.questionnaireAnswers,
        [questionId]: answerId,
      };
      const { fantasyBucketScores } = scoreAnswers(questionnaireAnswers);
      const recommendedBuild = getRecommendedBuild(questionnaireAnswers);
      const unsupportedFantasyBuckets = getUnsupportedFantasyBuckets(
        fantasyBucketScores,
      );
      const recommendationWasOverridden =
        recommendedBuild !== null &&
        currentDraft.selectedBuild !== null &&
        currentDraft.selectedBuild !== recommendedBuild;

      return {
        ...currentDraft,
        questionnaireAnswers,
        fantasyBucketScores,
        unsupportedFantasyBuckets,
        recommendedBuild,
        recommendationWasOverridden,
      };
    });
  };

  const goBack = () => {
    if (isShowingReview) {
      setIsShowingReview(false);
      setSaveState({ status: 'idle' });
      setIsShowingRecommendation(true);
      return;
    }

    if (isShowingRecommendation) {
      setIsShowingRecommendation(false);
      setCurrentQuestionIndex(quizQuestions.length - 1);
      return;
    }

    setCurrentQuestionIndex((index) => Math.max(index - 1, 0));
  };

  const goNext = () => {
    const currentQuestion = quizQuestions[currentQuestionIndex];
    const selectedAnswer = draft.questionnaireAnswers[currentQuestion.id];

    if (!selectedAnswer) {
      return;
    }

    if (currentQuestionIndex === quizQuestions.length - 1) {
      const { fantasyBucketScores } = scoreAnswers(draft.questionnaireAnswers);
      const recommendedBuild = getRecommendedBuild(draft.questionnaireAnswers);

      setDraft((currentDraft) => ({
        ...currentDraft,
        fantasyBucketScores,
        recommendedBuild,
        unsupportedFantasyBuckets: getUnsupportedFantasyBuckets(fantasyBucketScores),
        recommendationWasOverridden:
          recommendedBuild !== null &&
          currentDraft.selectedBuild !== null &&
          currentDraft.selectedBuild !== recommendedBuild,
      }));
      setIsShowingRecommendation(true);
      return;
    }

    setCurrentQuestionIndex((index) => index + 1);
  };

  const chooseBuild = (build: CharacterBuildId) => {
    setDraft((currentDraft) => ({
      ...currentDraft,
      selectedBuild: build,
      recommendationWasOverridden:
        currentDraft.recommendedBuild !== null &&
        currentDraft.recommendedBuild !== build,
    }));
    setIsShowingReview(true);
    setSaveState({ status: 'idle' });
  };

  const updateName = (name: string) => {
    setDraft((currentDraft) => ({
      ...currentDraft,
      name,
    }));
    if (saveState.status !== 'idle') {
      setSaveState({ status: 'idle' });
    }
  };

  const updateManualField = (
    field: keyof Omit<
      ManualCharacterEntryDraftV1,
      'hitPoints' | 'abilityScores' | 'action' | 'feature'
    >,
    value: string,
  ) => {
    setManualDraft((currentDraft) => ({
      ...currentDraft,
      [field]: value,
    }));
    clearManualErrors();
  };

  const updateManualHitPoints = (
    field: keyof ManualCharacterEntryDraftV1['hitPoints'],
    value: string,
  ) => {
    setManualDraft((currentDraft) => ({
      ...currentDraft,
      hitPoints: {
        ...currentDraft.hitPoints,
        [field]: value,
      },
    }));
    clearManualErrors();
  };

  const updateManualAbilityScore = (
    field: keyof ManualCharacterEntryDraftV1['abilityScores'],
    value: string,
  ) => {
    setManualDraft((currentDraft) => ({
      ...currentDraft,
      abilityScores: {
        ...currentDraft.abilityScores,
        [field]: value,
      },
    }));
    clearManualErrors();
  };

  const updateManualAction = (
    field: keyof ManualCharacterEntryDraftV1['action'],
    value: string,
  ) => {
    setManualDraft((currentDraft) => ({
      ...currentDraft,
      action: {
        ...currentDraft.action,
        [field]: value,
      },
    }));
    clearManualErrors();
  };

  const updateManualFeature = (
    field: keyof ManualCharacterEntryDraftV1['feature'],
    value: string,
  ) => {
    setManualDraft((currentDraft) => ({
      ...currentDraft,
      feature: {
        ...currentDraft.feature,
        [field]: value,
      },
    }));
    clearManualErrors();
  };

  const clearManualErrors = () => {
    if (manualErrors.length > 0) {
      setManualErrors([]);
    }
  };

  const getManualError = (field: string) => {
    return manualErrors.find((error) => error.field === field)?.message;
  };

  const reviewManualCharacter = () => {
    const validationErrors = validateManualCharacterEntryDraft(manualDraft);

    if (validationErrors.length > 0) {
      setManualErrors(validationErrors);
      setManualReviewRequest(null);
      return;
    }

    const result = buildManualCharacterCreateRequest(manualDraft);
    if (!result.ok) {
      setManualErrors(result.errors);
      setManualReviewRequest(null);
      return;
    }

    setManualErrors([]);
    setManualReviewRequest(result.value);
  };

  const saveGeneratedCharacter = async () => {
    if (!draft.selectedBuild || saveState.status === 'saving') {
      return;
    }

    setSaveState({ status: 'saving' });

    try {
      const request = buildGeneratedFighterCreateRequest(
        draft.selectedBuild,
        draft.name,
      );
      const character = await createCharacter(request);
      setSaveState({
        status: 'success',
        characterId: character.id,
        characterName: character.name,
      });
      if (onOpenCharacterReference && !hasCustomSavedCharacterAction) {
        onOpenCharacterReference(character.id);
      }
    } catch (error) {
      const message =
        error instanceof CharactersApiError
          ? error.message
          : 'Could not save the character. Check your connection and try again.';
      setSaveState({ status: 'error', message });
    }
  };

  const saveManualCharacter = async () => {
    if (!manualReviewRequest || saveState.status === 'saving') {
      return;
    }

    setSaveState({ status: 'saving' });

    try {
      const character = await createCharacter(manualReviewRequest);
      setSaveState({
        status: 'success',
        characterId: character.id,
        characterName: character.name,
      });
      if (onOpenCharacterReference && !hasCustomSavedCharacterAction) {
        onOpenCharacterReference(character.id);
      }
    } catch (error) {
      const message =
        error instanceof CharactersApiError
          ? error.message
          : 'Could not save the character. Check your connection and try again.';
      setSaveState({ status: 'error', message });
    }
  };

  const renderManualTextField = ({
    field,
    label,
    value,
    onChange,
    inputMode,
  }: {
    field: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
    inputMode?: 'numeric';
  }) => {
    const error = getManualError(field);
    const isRequired = requiredManualFields.has(field);

    return (
      <label key={field} className="manual-entry-field">
        <span>
          {label}
          {isRequired ? (
            <span className="manual-entry-field__required" aria-hidden="true">
              {' '}*
            </span>
          ) : null}
        </span>
        <input
          type="text"
          aria-label={label}
          inputMode={inputMode}
          value={value}
          required={isRequired}
          aria-invalid={error ? 'true' : undefined}
          onChange={(event) => onChange(event.target.value)}
        />
        {error ? <span className="manual-entry-field__error">{error}</span> : null}
      </label>
    );
  };

  const renderManualForm = () => {
    return (
      <section
        ref={manualEntryRef}
        className="manual-entry"
        aria-labelledby="manual-entry-title"
      >
        <div className="creation-review__header">
          <p className="eyebrow">Fill the sheet myself</p>
          <h2 id="manual-entry-title" className="creation-recommendation__title">
            Fill the sheet yourself.
          </h2>
          <p className="creation-shell__copy">
            Transfer the core facts from an existing sheet. Hunin checks form
            shape only, not full D&D legality.
          </p>
          <p className="manual-entry__required-note">* Required</p>
        </div>

        {manualErrors.length > 0 ? (
          <p className="creation-save-panel__error" role="alert">
            Fix the highlighted fields before reviewing.
          </p>
        ) : null}

        <fieldset className="manual-entry-section">
          <legend>Basics</legend>
          <div className="manual-entry-grid">
            {renderManualTextField({
              field: 'name',
              label: 'Name',
              value: manualDraft.name,
              onChange: (value) => updateManualField('name', value),
            })}
            {renderManualTextField({
              field: 'className',
              label: 'Class',
              value: manualDraft.className,
              onChange: (value) => updateManualField('className', value),
            })}
            {renderManualTextField({
              field: 'subclassName',
              label: 'Subclass',
              value: manualDraft.subclassName,
              onChange: (value) => updateManualField('subclassName', value),
            })}
            {renderManualTextField({
              field: 'level',
              label: 'Level',
              value: manualDraft.level,
              inputMode: 'numeric',
              onChange: (value) => updateManualField('level', value),
            })}
            {renderManualTextField({
              field: 'ancestry',
              label: 'Ancestry',
              value: manualDraft.ancestry,
              onChange: (value) => updateManualField('ancestry', value),
            })}
            {renderManualTextField({
              field: 'background',
              label: 'Background',
              value: manualDraft.background,
              onChange: (value) => updateManualField('background', value),
            })}
            {renderManualTextField({
              field: 'concept',
              label: 'Concept',
              value: manualDraft.concept,
              onChange: (value) => updateManualField('concept', value),
            })}
            {renderManualTextField({
              field: 'notes',
              label: 'Notes',
              value: manualDraft.notes,
              onChange: (value) => updateManualField('notes', value),
            })}
          </div>
        </fieldset>

        <fieldset className="manual-entry-section">
          <legend>Ability scores</legend>
          <div className="manual-entry-grid manual-entry-grid--six">
            {abilityScoreFields.map((ability) => renderManualTextField({
              field: `abilityScores.${ability.field}`,
              label: ability.label,
              value: manualDraft.abilityScores[ability.field],
              inputMode: 'numeric',
              onChange: (value) => updateManualAbilityScore(ability.field, value),
            }))}
          </div>
        </fieldset>

        <fieldset className="manual-entry-section">
          <legend>Combat stats</legend>
          <div className="manual-entry-grid">
            {renderManualTextField({
              field: 'hitPoints.current',
              label: 'Current HP',
              value: manualDraft.hitPoints.current,
              inputMode: 'numeric',
              onChange: (value) => updateManualHitPoints('current', value),
            })}
            {renderManualTextField({
              field: 'hitPoints.max',
              label: 'Maximum HP',
              value: manualDraft.hitPoints.max,
              inputMode: 'numeric',
              onChange: (value) => updateManualHitPoints('max', value),
            })}
            {renderManualTextField({
              field: 'armorClass',
              label: 'Armor Class',
              value: manualDraft.armorClass,
              inputMode: 'numeric',
              onChange: (value) => updateManualField('armorClass', value),
            })}
            {renderManualTextField({
              field: 'speedFt',
              label: 'Speed',
              value: manualDraft.speedFt,
              inputMode: 'numeric',
              onChange: (value) => updateManualField('speedFt', value),
            })}
            {renderManualTextField({
              field: 'proficiencyBonus',
              label: 'Proficiency bonus',
              value: manualDraft.proficiencyBonus,
              inputMode: 'numeric',
              onChange: (value) => updateManualField('proficiencyBonus', value),
            })}
            {renderManualTextField({
              field: 'initiative',
              label: 'Initiative',
              value: manualDraft.initiative,
              onChange: (value) => updateManualField('initiative', value),
            })}
            {renderManualTextField({
              field: 'passivePerception',
              label: 'Passive Perception',
              value: manualDraft.passivePerception,
              inputMode: 'numeric',
              onChange: (value) => updateManualField('passivePerception', value),
            })}
          </div>
        </fieldset>

        <fieldset className="manual-entry-section">
          <legend>Optional action</legend>
          <div className="manual-entry-grid">
            {renderManualTextField({
              field: 'action.name',
              label: 'Action name',
              value: manualDraft.action.name,
              onChange: (value) => updateManualAction('name', value),
            })}
            {renderManualTextField({
              field: 'action.actionType',
              label: 'Action type',
              value: manualDraft.action.actionType,
              onChange: (value) => updateManualAction('actionType', value),
            })}
            {renderManualTextField({
              field: 'action.attackBonus',
              label: 'Attack bonus',
              value: manualDraft.action.attackBonus,
              onChange: (value) => updateManualAction('attackBonus', value),
            })}
            {renderManualTextField({
              field: 'action.damage',
              label: 'Damage',
              value: manualDraft.action.damage,
              onChange: (value) => updateManualAction('damage', value),
            })}
            {renderManualTextField({
              field: 'action.range',
              label: 'Range',
              value: manualDraft.action.range,
              onChange: (value) => updateManualAction('range', value),
            })}
            {renderManualTextField({
              field: 'action.summary',
              label: 'Action summary',
              value: manualDraft.action.summary,
              onChange: (value) => updateManualAction('summary', value),
            })}
          </div>
        </fieldset>

        <fieldset className="manual-entry-section">
          <legend>Optional feature / note</legend>
          <div className="manual-entry-grid">
            {renderManualTextField({
              field: 'feature.name',
              label: 'Feature name',
              value: manualDraft.feature.name,
              onChange: (value) => updateManualFeature('name', value),
            })}
            {renderManualTextField({
              field: 'feature.category',
              label: 'Feature category',
              value: manualDraft.feature.category,
              onChange: (value) => updateManualFeature('category', value),
            })}
            {renderManualTextField({
              field: 'feature.summary',
              label: 'Feature summary',
              value: manualDraft.feature.summary,
              onChange: (value) => updateManualFeature('summary', value),
            })}
          </div>
        </fieldset>

        <div className="creation-quiz__actions">
          <button
            type="button"
            className="button button--primary"
            onClick={reviewManualCharacter}
          >
            Review character
          </button>
        </div>
      </section>
    );
  };

  const renderManualReview = () => {
    if (!manualReviewRequest) {
      return renderManualForm();
    }

    const sheet = manualReviewRequest.referencePayload;
    const characterClass = sheet.identity.classes[0];
    const action = sheet.actions[0];
    const feature = sheet.features[0];
    const isSaving = saveState.status === 'saving';

    return (
      <section className="creation-review" aria-labelledby="manual-review-title">
        <div className="creation-review__header">
          <p className="eyebrow">Manual character review</p>
          <h2 id="manual-review-title" className="creation-recommendation__title">
            Review manual character.
          </h2>
          <p className="creation-shell__copy">
            This preview uses the same manual mapper that will save the
            character in the next slice.
          </p>
        </div>

        <div className="creation-review__summary" aria-label="Manual character summary">
          <div>
            <p className="eyebrow">Character</p>
            <h3>{sheet.identity.name}</h3>
            <p>{sheet.summary.displayLine}</p>
            {characterClass?.subclass ? <p>{sheet.summary.supportingLine}</p> : null}
          </div>
          <dl className="creation-review__stats">
            <div>
              <dt>Ancestry</dt>
              <dd>{manualReviewRequest.ancestry}</dd>
            </div>
            <div>
              <dt>Class</dt>
              <dd>{manualReviewRequest.className}</dd>
            </div>
            <div>
              <dt>Level</dt>
              <dd>{manualReviewRequest.level}</dd>
            </div>
            <div>
              <dt>Background</dt>
              <dd>{manualReviewRequest.background}</dd>
            </div>
            {characterClass?.subclass ? (
              <div>
                <dt>Subclass</dt>
                <dd>{characterClass.subclass}</dd>
              </div>
            ) : null}
            <div>
              <dt>HP</dt>
              <dd>
                {manualReviewRequest.hitPoints.current}/{manualReviewRequest.hitPoints.max}
              </dd>
            </div>
            <div>
              <dt>AC</dt>
              <dd>{manualReviewRequest.armorClass}</dd>
            </div>
            <div>
              <dt>Speed</dt>
              <dd>{manualReviewRequest.speedFt} ft.</dd>
            </div>
            <div>
              <dt>Proficiency</dt>
              <dd>{formatSignedNumber(sheet.combat.proficiencyBonus)}</dd>
            </div>
          </dl>
        </div>

        <div className="creation-review__details">
          <div>
            <p className="eyebrow">Ability scores</p>
            <ul className="manual-review-list manual-review-list--inline">
              {abilityScoreFields.map((ability) => (
                <li key={ability.field}>
                  {ability.shortLabel} {manualReviewRequest.abilityScores[ability.field]}
                </li>
              ))}
            </ul>
          </div>

          {action ? (
            <div>
              <p className="eyebrow">Actions / Attacks</p>
              <h3 className="manual-review-heading">{action.name}</h3>
              <p>{action.meta.join(' - ')}</p>
              <p>{action.summary}</p>
            </div>
          ) : null}

          {feature ? (
            <div>
              <p className="eyebrow">Features / Notes</p>
              <h3 className="manual-review-heading">{feature.name}</h3>
              <p>{feature.category}</p>
              <p>{feature.summary}</p>
            </div>
          ) : null}
        </div>

        {isSignedIn ? (
          <div className="creation-save-panel" aria-live="polite">
            {saveState.status === 'error' ? (
              <p className="creation-save-panel__error" role="alert">
                {saveState.message}
              </p>
            ) : null}
            {saveState.status === 'success' ? (
              <p className="creation-save-panel__success">
                {saveState.characterName} is saved. You can return home to see
                it in My characters.
              </p>
            ) : null}
            <div className="creation-quiz__actions">
              <button
                type="button"
                className="back-button"
                onClick={() => {
                  setManualReviewRequest(null);
                  setSaveState({ status: 'idle' });
                }}
              >
                Back to edit
              </button>
              <button
                type="button"
                className="button button--primary"
                disabled={isSaving}
                onClick={saveManualCharacter}
              >
                {isSaving ? 'Saving character...' : 'Save character'}
              </button>
              {saveState.status === 'success' &&
              onOpenCharacterReference &&
              hasCustomSavedCharacterAction ? (
                <button
                  type="button"
                  className="button button--secondary"
                  onClick={() => onOpenCharacterReference(saveState.characterId)}
                >
                  {resolvedSavedCharacterActionLabel}
                </button>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="creation-save-panel" aria-live="polite">
            <p className="creation-save-panel__notice">
              Sign in to save this manual character and show it in My
              characters. You can still review it here.
            </p>
            <div className="creation-quiz__actions">
              <button
                type="button"
                className="back-button"
                onClick={() => setManualReviewRequest(null)}
              >
                Back to edit
              </button>
              {onSignIn ? (
                <button type="button" className="button button--primary" onClick={onSignIn}>
                  Sign in
                </button>
              ) : null}
              {onCreateAccount ? (
                <button
                  type="button"
                  className="button button--secondary"
                  onClick={onCreateAccount}
                >
                  Create account
                </button>
              ) : null}
            </div>
          </div>
        )}
      </section>
    );
  };

  const renderQuiz = () => {
    const currentQuestion = quizQuestions[currentQuestionIndex];
    const selectedAnswer = draft.questionnaireAnswers[currentQuestion.id];

    return (
      <section className="creation-quiz" aria-labelledby="quiz-title">
        <div className="creation-quiz__intro">
          <p className="eyebrow">Help me choose</p>
          <h2 id="quiz-title" className="creation-draft-summary__title">
            Follow your character instinct.
          </h2>
          <p className="creation-shell__copy">
            Answer five quick fantasy questions. This first version can only
            recommend two beginner level-1 Human Fighter styles, and it will
            say honestly when your answers point toward a future path.
          </p>
        </div>

        <fieldset className="creation-question" aria-describedby="question-progress">
          <legend className="creation-question__legend">
            <span id="question-progress" className="creation-question__progress">
              Question {currentQuestionIndex + 1} of {quizQuestions.length}
            </span>
            <span>{currentQuestion.prompt}</span>
          </legend>

          <div className="creation-answer-grid">
            {currentQuestion.answers.map((answer) => {
              const isSelected = selectedAnswer === answer.id;

              return (
                <label
                  key={answer.id}
                  className="creation-answer-card"
                  data-selected={isSelected ? 'true' : 'false'}
                >
                  <input
                    type="radio"
                    name={currentQuestion.id}
                    value={answer.id}
                    checked={isSelected}
                    onChange={() => answerQuestion(currentQuestion.id, answer.id)}
                  />
                  <span className="creation-answer-card__body">
                    <span className="creation-answer-card__label">
                      {answer.label}
                    </span>
                    {isSelected ? (
                      <span className="creation-answer-card__selected">
                        Selected
                      </span>
                    ) : null}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className="creation-quiz__actions">
          <button
            type="button"
            className="back-button"
            disabled={currentQuestionIndex === 0}
            onClick={goBack}
          >
            Back
          </button>
          <button
            type="button"
            className="button button--primary"
            disabled={!selectedAnswer}
            onClick={goNext}
          >
            {currentQuestionIndex === quizQuestions.length - 1
              ? 'See recommendation'
              : 'Next'}
          </button>
        </div>
      </section>
    );
  };

  const renderRecommendation = () => {
    const recommendedBuild =
      draft.recommendedBuild ?? getRecommendedBuild(draft.questionnaireAnswers);

    if (!recommendedBuild) {
      return renderQuiz();
    }

    const otherBuild: CharacterBuildId =
      recommendedBuild === 'strength-melee-fighter'
        ? 'dexterity-archer-fighter'
        : 'strength-melee-fighter';
    const recommendation = buildContent[recommendedBuild];

    return (
      <section className="creation-recommendation" aria-labelledby="recommendation-title">
        <div className="creation-recommendation__content">
          <p className="eyebrow">Closest supported match</p>
          <h2 id="recommendation-title" className="creation-recommendation__title">
            {recommendation.label}
          </h2>

          {draft.unsupportedFantasyBuckets.length > 0 ? (
            <div className="creation-future-notes" aria-label="Future path notes">
              {draft.unsupportedFantasyBuckets.map((bucket) => (
                <p key={bucket} className="creation-future-note">
                  {futurePathMessages[bucket]}
                </p>
              ))}
            </div>
          ) : null}

          <p className="creation-shell__copy">{recommendation.resultCopy}</p>
          <p className="creation-recommendation__note">
            {recommendation.secondaryNote}
          </p>
          <p className="creation-scope-note">
            Prefer the other supported Fighter style? No problem. This
            recommendation is guidance, not a lock.
          </p>
        </div>

        <div className="creation-quiz__actions">
          <button type="button" className="back-button" onClick={goBack}>
            Back
          </button>
          <button
            type="button"
            className="button button--primary"
            onClick={() => chooseBuild(recommendedBuild)}
          >
            Use {recommendation.label}
          </button>
          <button
            type="button"
            className="button button--secondary"
            onClick={() => chooseBuild(otherBuild)}
          >
            Choose {buildContent[otherBuild].label}
          </button>
        </div>
      </section>
    );
  };

  const renderReview = () => {
    if (!draft.selectedBuild) {
      return renderRecommendation();
    }

    const build = generatedFighterBuilds[draft.selectedBuild];
    const request = buildGeneratedFighterCreateRequest(draft.selectedBuild, draft.name);
    const sheet = request.referencePayload;
    const mainAttack = sheet.actions[0];
    const mainAttackSummary = mainAttack
      ? [mainAttack.name, ...mainAttack.meta.slice(1)].join(' - ')
      : 'Not generated';
    const keyFeatures = sheet.features
      .filter((feature) => feature.includeInReference)
      .map((feature) => feature.name);
    const isSaving = saveState.status === 'saving';

    return (
      <section className="creation-review" aria-labelledby="review-title">
        <div className="creation-review__header">
          <p className="eyebrow">Generated character review</p>
          <h2 id="review-title" className="creation-recommendation__title">
            Review before saving.
          </h2>
          <p className="creation-shell__copy">
            This is a fixed beginner build from Help me choose. You can rename
            the character now; deeper rules choices come in later slices.
          </p>
        </div>

        <label className="creation-review__field">
          <span>Name</span>
          <input
            type="text"
            value={draft.name}
            placeholder={build.defaultName}
            onChange={(event) => updateName(event.target.value)}
          />
        </label>

        <div className="creation-review__summary" aria-label="Generated character summary">
          <div>
            <p className="eyebrow">Class/build</p>
            <h3>{sheet.summary.displayLine}</h3>
            <p>{sheet.summary.supportingLine}</p>
          </div>
          <dl className="creation-review__stats">
            <div>
              <dt>Ancestry</dt>
              <dd>{request.ancestry}</dd>
            </div>
            <div>
              <dt>Background</dt>
              <dd>{request.background}</dd>
            </div>
            <div>
              <dt>HP</dt>
              <dd>{request.hitPoints.current}/{request.hitPoints.max}</dd>
            </div>
            <div>
              <dt>AC</dt>
              <dd>{request.armorClass}</dd>
            </div>
            <div>
              <dt>Speed</dt>
              <dd>{request.speedFt} ft.</dd>
            </div>
          </dl>
        </div>

        <div className="creation-review__details">
          <div>
            <p className="eyebrow">Main attack</p>
            <p>{mainAttackSummary}</p>
          </div>
          <div>
            <p className="eyebrow">Key features</p>
            <ul>
              {keyFeatures.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
          </div>
        </div>

        <p className="creation-scope-note">
          Fixed beginner build: Hunin is not running full D&D character
          creation rules yet.
        </p>

        {isSignedIn ? (
          <div className="creation-save-panel" aria-live="polite">
            {saveState.status === 'error' ? (
              <p className="creation-save-panel__error" role="alert">
                {saveState.message}
              </p>
            ) : null}
            {saveState.status === 'success' ? (
              <p className="creation-save-panel__success">
                {saveState.characterName} is saved. You can return home to see
                it in My characters.
              </p>
            ) : null}
            <div className="creation-quiz__actions">
              <button type="button" className="back-button" onClick={goBack}>
                Back
              </button>
              <button
                type="button"
                className="button button--primary"
                disabled={isSaving}
                onClick={saveGeneratedCharacter}
              >
                {isSaving ? 'Saving character...' : 'Save character'}
              </button>
              {saveState.status === 'success' &&
              onOpenCharacterReference &&
              hasCustomSavedCharacterAction ? (
                <button
                  type="button"
                  className="button button--secondary"
                  onClick={() => onOpenCharacterReference(saveState.characterId)}
                >
                  {resolvedSavedCharacterActionLabel}
                </button>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="creation-save-panel" aria-live="polite">
            <p className="creation-save-panel__notice">
              Sign in to save this character and show it in My characters. You
              can still preview the generated build here.
            </p>
            <div className="creation-quiz__actions">
              <button type="button" className="back-button" onClick={goBack}>
                Back
              </button>
              {onSignIn ? (
                <button type="button" className="button button--primary" onClick={onSignIn}>
                  Sign in
                </button>
              ) : null}
              {onCreateAccount ? (
                <button
                  type="button"
                  className="button button--secondary"
                  onClick={onCreateAccount}
                >
                  Create account
                </button>
              ) : null}
            </div>
          </div>
        )}
      </section>
    );
  };

  return (
    <main className="app-shell character-creation-page">
      <header className="reference-nav">
        <button className="back-button" onClick={onBack}>
          Back
        </button>
      </header>

      <section className="creation-shell" aria-labelledby="creation-title">
        <div className="creation-shell__intro">
          <p className="eyebrow">Create character</p>
          <h1 id="creation-title" className="creation-shell__title">
            Start a character draft.
          </h1>
          <p className="creation-shell__copy">
            Choose how you want to begin. This draft stays in memory only:
            saving, full review, and manual sheet fields come later.
          </p>
        </div>

        {draft.mode === 'manual' ? (
          renderManualReview()
        ) : draft.mode === 'guided' ? (
          isShowingReview ? renderReview() : isShowingRecommendation ? renderRecommendation() : renderQuiz()
        ) : (
          <fieldset className="creation-mode-group">
            <legend className="creation-mode-group__legend">Choose a mode</legend>
            <div className="creation-mode-grid">
              {modeChoices.map((choice) => (
                <button
                  key={choice.mode}
                  type="button"
                  className="creation-mode-card"
                  aria-pressed={draft.mode === choice.mode}
                  onClick={() => chooseMode(choice.mode)}
                >
                  <span className="creation-mode-card__label">{choice.label}</span>
                  <span className="creation-mode-card__description">
                    {choice.description}
                  </span>
                </button>
              ))}
            </div>
          </fieldset>
        )}

        <section className="creation-draft-summary" aria-labelledby="draft-title">
          <div>
            <p className="eyebrow">Draft state</p>
            <h2 id="draft-title" className="creation-draft-summary__title">
              Not saving yet
            </h2>
            <p className="creation-shell__copy">
              This draft is only the entry foundation. Save later will connect
              this flow to character data once the creation steps are built.
            </p>
          </div>

          <dl className="creation-draft-list" aria-label="Current draft fields">
            <div>
              <dt>Mode</dt>
              <dd>
                {draft.mode === 'guided'
                  ? 'Help me choose'
                  : draft.mode === 'manual'
                    ? 'Fill the sheet myself'
                    : 'Not chosen'}
              </dd>
            </div>
            <div>
              <dt>Name</dt>
              <dd>
                {draft.name ||
                  (draft.selectedBuild
                    ? generatedFighterBuilds[draft.selectedBuild].defaultName
                    : 'Not added yet')}
              </dd>
            </div>
            <div>
              <dt>Concept</dt>
              <dd>{draft.concept || 'Not added yet'}</dd>
            </div>
            <div>
              <dt>Answers</dt>
              <dd>
                {Object.keys(draft.questionnaireAnswers).length} of{' '}
                {quizQuestions.length}
              </dd>
            </div>
            <div>
              <dt>Recommended build</dt>
              <dd>
                {isShowingRecommendation
                  ? getBuildLabel(draft.recommendedBuild)
                  : 'Shown after the quiz'}
              </dd>
            </div>
            <div>
              <dt>Selected build</dt>
              <dd>{getBuildLabel(draft.selectedBuild)}</dd>
            </div>
            <div>
              <dt>Recommendation overridden</dt>
              <dd>{draft.recommendationWasOverridden ? 'Yes' : 'No'}</dd>
            </div>
          </dl>
        </section>
      </section>
    </main>
  );
};
