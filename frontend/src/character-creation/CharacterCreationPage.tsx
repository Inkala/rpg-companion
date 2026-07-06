import { useState } from 'react';
import {
  initialCharacterCreationDraft,
  type CharacterCreationDraft,
  type CharacterCreationMode,
} from './characterCreationTypes';
import './characterCreation.css';

type CharacterCreationPageProps = {
  onBack: () => void;
};

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
    description: 'For starting with guidance before the full questionnaire exists.',
  },
];

export const CharacterCreationPage = ({ onBack }: CharacterCreationPageProps) => {
  const [draft, setDraft] = useState<CharacterCreationDraft>(
    initialCharacterCreationDraft,
  );

  const chooseMode = (mode: Exclude<CharacterCreationMode, null>) => {
    setDraft((currentDraft) => ({
      ...currentDraft,
      mode,
    }));
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
            Choose how you want to begin. This foundation keeps a temporary
            draft in memory only: saving, full questions, and manual sheet
            fields come later.
          </p>
        </div>

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
              <dd>{draft.mode ?? 'Not chosen'}</dd>
            </div>
            <div>
              <dt>Name</dt>
              <dd>{draft.name || 'Not added yet'}</dd>
            </div>
            <div>
              <dt>Concept</dt>
              <dd>{draft.concept || 'Not added yet'}</dd>
            </div>
            <div>
              <dt>Selected build</dt>
              <dd>{draft.selectedBuild ?? 'Not chosen'}</dd>
            </div>
          </dl>
        </section>
      </section>
    </main>
  );
};
