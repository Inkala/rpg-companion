import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { getCharacterById } from './api';
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
  }, [characterId, isSignedIn]);

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

  return (
    <CharacterReference
      character={characterSheetToReference(state.character.referencePayload)}
      onBack={onBack}
    />
  );
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
