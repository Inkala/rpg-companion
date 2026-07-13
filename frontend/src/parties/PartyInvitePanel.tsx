import { useEffect, useRef, useState } from 'react';
import type { PartyInviteDTO, PartyRoleDTO } from './apiTypes';
import './parties.css';

type CreateInvite = (partyId: string) => Promise<PartyInviteDTO>;
type BuildInviteURL = (path: string) => string;
type CopyText = (text: string) => Promise<void>;

type PartyInvitePanelProps = {
  partyId: string;
  currentUserRole: PartyRoleDTO;
  createInvite: CreateInvite;
  buildInviteURL: BuildInviteURL;
  copyText: CopyText;
};

type InviteContextKey = {
  requestedPartyId: string;
  requestedRole: PartyRoleDTO;
  requestedCreator: CreateInvite;
  requestedURLBuilder: BuildInviteURL;
};

type InviteState = InviteContextKey & (
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'loaded'; inviteURL: string; expiresAt: string }
);

type CopyContextKey = InviteContextKey & {
  requestedCopyText: CopyText;
  requestedInviteURL: string;
};

type CopyState = CopyContextKey & {
  status: 'idle' | 'copying' | 'success' | 'error';
};

export const PartyInvitePanel = ({
  partyId,
  currentUserRole,
  createInvite,
  buildInviteURL,
  copyText,
}: PartyInvitePanelProps) => {
  const currentInviteKey: InviteContextKey = {
    requestedPartyId: partyId,
    requestedRole: currentUserRole,
    requestedCreator: createInvite,
    requestedURLBuilder: buildInviteURL,
  };
  const [inviteState, setInviteState] = useState<InviteState>({
    status: 'idle',
    ...currentInviteKey,
  });
  const visibleInviteState = inviteKeysMatch(inviteState, currentInviteKey)
    ? inviteState
    : ({ status: 'idle', ...currentInviteKey } as InviteState);
  const displayedInviteURL =
    currentUserRole === 'gm' && visibleInviteState.status === 'loaded'
      ? visibleInviteState.inviteURL
      : null;
  const currentCopyKey: CopyContextKey | null = displayedInviteURL
    ? {
      ...currentInviteKey,
      requestedCopyText: copyText,
      requestedInviteURL: displayedInviteURL,
    }
    : null;
  const [copyState, setCopyState] = useState<CopyState | null>(null);
  const visibleCopyState =
    currentCopyKey && copyState && copyKeysMatch(copyState, currentCopyKey)
      ? copyState
      : null;
  const currentInviteKeyRef = useRef(currentInviteKey);
  const currentCopyKeyRef = useRef(currentCopyKey);
  const activeGenerationRef = useRef<InviteContextKey | null>(null);
  const activeCopyRef = useRef<CopyContextKey | null>(null);
  const isMountedRef = useRef(true);
  currentInviteKeyRef.current = currentInviteKey;
  currentCopyKeyRef.current = currentCopyKey;

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const generateInvite = async () => {
    if (
      activeGenerationRef.current &&
      inviteKeysMatch(activeGenerationRef.current, currentInviteKey)
    ) {
      return;
    }

    const generationKey = currentInviteKey;
    activeGenerationRef.current = generationKey;
    setInviteState({ status: 'loading', ...generationKey });
    setCopyState(null);

    try {
      const invite = await createInvite(partyId);
      if (
        !isMountedRef.current ||
        !inviteKeysMatch(currentInviteKeyRef.current, generationKey)
      ) {
        return;
      }

      const inviteURL = buildInviteURL(`/parties/join#${invite.token}`);
      setInviteState({
        status: 'loaded',
        inviteURL,
        expiresAt: invite.expiresAt,
        ...generationKey,
      });
    } catch {
      if (
        isMountedRef.current &&
        inviteKeysMatch(currentInviteKeyRef.current, generationKey)
      ) {
        setInviteState({ status: 'error', ...generationKey });
      }
    } finally {
      if (
        activeGenerationRef.current &&
        inviteKeysMatch(activeGenerationRef.current, generationKey)
      ) {
        activeGenerationRef.current = null;
      }
    }
  };

  const copyInvite = async () => {
    if (!currentCopyKey) {
      return;
    }

    if (activeCopyRef.current && copyKeysMatch(activeCopyRef.current, currentCopyKey)) {
      return;
    }

    const copyKey = currentCopyKey;
    activeCopyRef.current = copyKey;
    setCopyState({ status: 'copying', ...copyKey });

    try {
      await copyText(copyKey.requestedInviteURL);
      if (
        isMountedRef.current &&
        currentCopyKeyRef.current &&
        copyKeysMatch(currentCopyKeyRef.current, copyKey)
      ) {
        setCopyState({ status: 'success', ...copyKey });
      }
    } catch {
      if (
        isMountedRef.current &&
        currentCopyKeyRef.current &&
        copyKeysMatch(currentCopyKeyRef.current, copyKey)
      ) {
        setCopyState({ status: 'error', ...copyKey });
      }
    } finally {
      if (activeCopyRef.current && copyKeysMatch(activeCopyRef.current, copyKey)) {
        activeCopyRef.current = null;
      }
    }
  };

  if (currentUserRole !== 'gm') {
    return null;
  }

  if (visibleInviteState.status === 'loading') {
    return (
      <InvitePanelLayout>
        <p role="status">Creating invite link...</p>
        <button type="button" className="button button--primary" disabled>
          Generating invite link...
        </button>
      </InvitePanelLayout>
    );
  }

  if (visibleInviteState.status === 'error') {
    return (
      <InvitePanelLayout>
        <p role="alert">Could not create an invite link. Please try again.</p>
        <button type="button" className="button button--secondary" onClick={generateInvite}>
          Retry
        </button>
      </InvitePanelLayout>
    );
  }

  if (visibleInviteState.status === 'loaded') {
    return (
      <InvitePanelLayout>
        <label className="party-invite-panel__field">
          <span className="party-invite-panel__label">Shareable invite URL</span>
          <input
            className="party-invite-panel__url"
            type="text"
            readOnly
            value={visibleInviteState.inviteURL}
            aria-label="Shareable invite URL"
          />
        </label>
        <p>
          Expires:{' '}
          <time dateTime={visibleInviteState.expiresAt}>
            {formatExpiration(visibleInviteState.expiresAt)}
          </time>
        </p>
        <button
          type="button"
          className="button button--primary"
          onClick={copyInvite}
          disabled={visibleCopyState?.status === 'copying'}
        >
          {visibleCopyState?.status === 'copying' ? 'Copying invite link...' : 'Copy invite link'}
        </button>
        {visibleCopyState?.status === 'success' ? (
          <p role="status">Invite link copied.</p>
        ) : visibleCopyState?.status === 'error' ? (
          <p role="alert">Could not copy the invite link. Copy it manually instead.</p>
        ) : null}
        <p>Regenerating invalidates the previous link.</p>
        <button type="button" className="button button--secondary" onClick={generateInvite}>
          Regenerate invite link
        </button>
      </InvitePanelLayout>
    );
  }

  return (
    <InvitePanelLayout>
      <p>Create a shareable link and send it manually to your players.</p>
      <button type="button" className="button button--primary" onClick={generateInvite}>
        Generate invite link
      </button>
    </InvitePanelLayout>
  );
};

const InvitePanelLayout = ({ children }: { children: React.ReactNode }) => (
  <section className="party-invite-panel" aria-labelledby="party-invite-panel-title">
    <h2 id="party-invite-panel-title" className="party-invite-panel__title">
      Invite players
    </h2>
    {children}
  </section>
);

const inviteKeysMatch = (left: InviteContextKey, right: InviteContextKey) => {
  return (
    left.requestedPartyId === right.requestedPartyId &&
    left.requestedRole === right.requestedRole &&
    left.requestedCreator === right.requestedCreator &&
    left.requestedURLBuilder === right.requestedURLBuilder
  );
};

const copyKeysMatch = (left: CopyContextKey, right: CopyContextKey) => {
  return (
    inviteKeysMatch(left, right) &&
    left.requestedCopyText === right.requestedCopyText &&
    left.requestedInviteURL === right.requestedInviteURL
  );
};

const formatExpiration = (expiresAt: string) => {
  return new Date(expiresAt).toLocaleString();
};
