import { useRef, useState, type FormEvent } from 'react';
import { PartiesApiError } from './api';
import type { CreatePartyRequestDTO, CreatePartyResponseDTO } from './apiTypes';
import { validatePartyName } from './validation';

type CreatePartyPageProps = {
  createParty: (input: CreatePartyRequestDTO) => Promise<CreatePartyResponseDTO>;
  onPartyCreated: (partyId: string) => void;
  onCancel?: () => void;
};

const partyNameErrorId = 'party-name-error';

export const CreatePartyPage = ({
  createParty,
  onPartyCreated,
  onCancel,
}: CreatePartyPageProps) => {
  const [partyName, setPartyName] = useState('');
  const [partyNameError, setPartyNameError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);
  const partyNameInputRef = useRef<HTMLInputElement | null>(null);

  const submitParty = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmittingRef.current) {
      return;
    }

    setServerError(null);
    const validation = validatePartyName(partyName);
    if (!validation.valid) {
      setPartyNameError(validation.error);
      partyNameInputRef.current?.focus();
      return;
    }

    setPartyNameError(null);
    isSubmittingRef.current = true;
    setIsSubmitting(true);

    try {
      const party = await createParty({ name: validation.value });
      onPartyCreated(party.id);
    } catch (error) {
      setServerError(
        error instanceof PartiesApiError
          ? error.message
          : 'Could not create the party. Please try again.',
      );
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const updatePartyName = (nextPartyName: string) => {
    setPartyName(nextPartyName);
    setPartyNameError(null);
    setServerError(null);
  };

  return (
    <main className="app-shell account-page">
      <section className="account-card" aria-labelledby="create-party-title">
        <p className="eyebrow">Parties</p>
        <h1 id="create-party-title" className="account-title">
          Create a party
        </h1>

        <form
          className="account-form"
          onSubmit={submitParty}
          noValidate
          aria-busy={isSubmitting}
        >
          <label className="form-field">
            <span>Party name</span>
            <input
              ref={partyNameInputRef}
              type="text"
              autoComplete="off"
              value={partyName}
              onChange={(event) => updatePartyName(event.target.value)}
              aria-invalid={partyNameError ? 'true' : undefined}
              aria-describedby={partyNameError ? partyNameErrorId : undefined}
            />
          </label>

          {partyNameError ? (
            <p id={partyNameErrorId} className="form-error" role="alert">
              {partyNameError}
            </p>
          ) : null}

          {serverError ? (
            <p className="form-error" role="alert">
              {serverError}
            </p>
          ) : null}

          <button type="submit" className="button button--primary" disabled={isSubmitting}>
            {isSubmitting ? 'Creating party...' : 'Create party'}
          </button>

          {onCancel ? (
            <button
              type="button"
              className="button button--secondary"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </button>
          ) : null}
        </form>
      </section>
    </main>
  );
};
