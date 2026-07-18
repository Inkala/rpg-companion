import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { toast } from 'sonner';
import { LevelUpFlow } from '../level-up/LevelUpFlow';
import { getLevelUpEligibility } from '../level-up/stateMachine';
import { getCharacterById, levelUpCharacter } from './api';
import type { CharacterDTO } from './apiTypes';
import { CharacterReference } from './CharacterReference';
import { characterSheetToReference } from './characterSheetToReference';
import { isCharacterSheetV1 } from './characterSheetValidation';
import './characters.css';

type SavedCharacterReferencePageProps = {
  characterId: string;
  isSignedIn: boolean;
  onBack: () => void;
  onSignIn: () => void;
};

type SavedCharacterState =
  | { status: 'signed-out' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'loaded'; character: CharacterDTO };

export const SavedCharacterReferencePage = ({
  characterId,
  isSignedIn,
  onBack,
  onSignIn,
}: SavedCharacterReferencePageProps) => {
  const [state, setState] = useState<SavedCharacterState>(
    isSignedIn ? { status: 'loading' } : { status: 'signed-out' },
  );
  const [isLevelUpOpen, setIsLevelUpOpen] = useState(false);
  const [reloadVersion, setReloadVersion] = useState(0);
  const levelUpTriggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    let isActive = true;

    if (!isSignedIn) {
      setState({ status: 'signed-out' });
      return () => {
        isActive = false;
      };
    }

    setState({ status: 'loading' });
    getCharacterById(characterId)
      .then((character) => {
        if (isActive) {
          setState({ status: 'loaded', character });
        }
      })
      .catch((error: unknown) => {
        const message =
          error instanceof Error && error.message
            ? error.message
            : 'Could not load this character.';

        if (isActive) {
          setState({ status: 'error', message });
        }
      });

    return () => {
      isActive = false;
    };
  }, [characterId, isSignedIn, reloadVersion]);

  if (state.status === 'signed-out') {
    return (
      <SavedCharacterStateLayout
        title="Sign in to open this character."
        copy="Saved characters are private to your account. Sign in, then open the character again."
        onBack={onBack}
      >
        <button type="button" className="button button--primary" onClick={onSignIn}>
          Sign in
        </button>
      </SavedCharacterStateLayout>
    );
  }

  if (state.status === 'loading') {
    return (
      <SavedCharacterStateLayout
        title="Loading character..."
        copy="Fetching the saved character sheet from Hunin."
        onBack={onBack}
      />
    );
  }

  if (state.status === 'error') {
    return (
      <SavedCharacterStateLayout
        title="Could not load character"
        copy={state.message}
        onBack={onBack}
      />
    );
  }

  if (!isCharacterSheetV1(state.character.referencePayload)) {
    return (
      <SavedCharacterStateLayout
        title="Character Reference is not available yet"
        copy="This character was saved, but its reference data is missing or uses an unsupported format."
        onBack={onBack}
      />
    );
  }

  const sheet = state.character.referencePayload;
  const eligibility = getLevelUpEligibility(state.character);

  const closeLevelUp = () => {
    setIsLevelUpOpen(false);
    window.setTimeout(() => levelUpTriggerRef.current?.focus(), 0);
  };

  const handleLevelUpSuccess = (updated: CharacterDTO) => {
    setState({ status: 'loaded', character: updated });
    setIsLevelUpOpen(false);
    toast.success('Character leveled up.');
    window.setTimeout(() => {
      document.querySelector<HTMLElement>('.reference-character')?.focus();
    }, 0);
  };

  const reloadCharacter = () => {
    setIsLevelUpOpen(false);
    setReloadVersion((value) => value + 1);
  };

  return (
    <>
      <CharacterReference
        character={characterSheetToReference(sheet)}
        onBack={onBack}
        backLabel="Back to My characters"
        primaryAction={eligibility.eligible ? (
          <button
            ref={levelUpTriggerRef}
            type="button"
            className="button button--primary"
            onClick={() => setIsLevelUpOpen(true)}
          >
            Level up
          </button>
        ) : eligibility.reason === 'not-owner' ? undefined : (
          <p className="level-up-unavailable" role="status">
            {levelUpUnavailableMessage(eligibility.reason)}
          </p>
        )}
      />
      {isLevelUpOpen && eligibility.eligible ? (
        <LevelUpFlow
          character={state.character}
          sheet={sheet}
          onClose={closeLevelUp}
          onSubmit={(request) => levelUpCharacter(state.character.id, request)}
          onSuccess={handleLevelUpSuccess}
          onReload={reloadCharacter}
        />
      ) : null}
    </>
  );
};

const levelUpUnavailableMessage = (reason: Exclude<ReturnType<typeof getLevelUpEligibility>, { eligible: true }>['reason']) => {
  switch (reason) {
    case 'level-cap':
      return 'Level up is unavailable because Hunin supports characters through level 5.';
    case 'multiclass':
      return 'Level up is unavailable for multiclass characters in this guided flow.';
    case 'unsupported-class':
      return 'Level up is unavailable for this class in the SRD 5.1 guided flow.';
    case 'ruleset-mismatch':
      return 'Level up is unavailable because this sheet does not use the supported 2014 rules.';
    case 'malformed-sheet':
    case 'level-mismatch':
      return 'Level up is unavailable because this saved sheet needs manual review.';
    case 'not-owner':
      return 'Level up is unavailable in this read-only reference.';
  }
};

const SavedCharacterStateLayout = ({
  title,
  copy,
  onBack,
  children,
}: {
  title: string;
  copy: string;
  onBack: () => void;
  children?: ReactNode;
}) => {
  return (
    <main className="app-shell reference-page">
      <header className="reference-nav">
        <button className="back-button" onClick={onBack}>
          Back
        </button>
        <span className="reference-nav__label" aria-hidden="true">
          Character Reference
        </span>
      </header>
      <section className="reference-summary" aria-labelledby="saved-reference-title">
        <p className="eyebrow">Character Reference</p>
        <h1 id="saved-reference-title">{title}</h1>
        <p>{copy}</p>
        {children ? <div className="creation-quiz__actions">{children}</div> : null}
      </section>
    </main>
  );
};
