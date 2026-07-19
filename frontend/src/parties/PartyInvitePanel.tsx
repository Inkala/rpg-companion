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
  | { status: 'loaded'; inviteURL: string; code: string; expiresAt: string }
);

type CopyContextKey = InviteContextKey & {
  requestedCopyText: CopyText;
  requestedKind: 'code' | 'link';
  requestedValue: string;
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
  const [copyState, setCopyState] = useState<CopyState | null>(null);
  const currentInviteKeyRef = useRef(currentInviteKey);
  const activeGenerationRef = useRef<InviteContextKey | null>(null);
  const activeCopyRef = useRef<CopyContextKey | null>(null);
  const isMountedRef = useRef(true);
  currentInviteKeyRef.current = currentInviteKey;

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const nextInviteKey: InviteContextKey = {
      requestedPartyId: partyId,
      requestedRole: currentUserRole,
      requestedCreator: createInvite,
      requestedURLBuilder: buildInviteURL,
    };
    if (inviteKeysMatch(inviteState, nextInviteKey)) {
      return;
    }

    activeGenerationRef.current = null;
    activeCopyRef.current = null;
    setInviteState({ status: 'idle', ...nextInviteKey });
    setCopyState(null);
  }, [
    buildInviteURL,
    createInvite,
    currentUserRole,
    inviteState,
    partyId,
  ]);

  const generateInvite = async () => {
    if (
      activeGenerationRef.current &&
      inviteKeysMatch(activeGenerationRef.current, currentInviteKey)
    ) {
      return;
    }

    const generationKey = currentInviteKey;
    activeGenerationRef.current = generationKey;
    activeCopyRef.current = null;
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
        code: invite.code,
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

  const copyCredential = async (kind: 'code' | 'link', value: string) => {
    if (visibleInviteState.status !== 'loaded') {
      return;
    }

    const currentCopyKey: CopyContextKey = {
      ...currentInviteKey,
      requestedCopyText: copyText,
      requestedKind: kind,
      requestedValue: value,
    };

    if (activeCopyRef.current && copyKeysMatch(activeCopyRef.current, currentCopyKey)) {
      return;
    }

    const copyKey = currentCopyKey;
    activeCopyRef.current = copyKey;
    setCopyState({ status: 'copying', ...copyKey });

    try {
      await copyText(copyKey.requestedValue);
      if (
        isMountedRef.current &&
        activeCopyRef.current &&
        copyKeysMatch(activeCopyRef.current, copyKey) &&
        inviteKeysMatch(currentInviteKeyRef.current, copyKey)
      ) {
        setCopyState({ status: 'success', ...copyKey });
      }
    } catch {
      if (
        isMountedRef.current &&
        activeCopyRef.current &&
        copyKeysMatch(activeCopyRef.current, copyKey) &&
        inviteKeysMatch(currentInviteKeyRef.current, copyKey)
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
        <p role="status">Creating invitation...</p>
        <button type="button" className="button button--primary" disabled>
          Generating invitation...
        </button>
      </InvitePanelLayout>
    );
  }

  if (visibleInviteState.status === 'error') {
    return (
      <InvitePanelLayout>
        <p role="alert">Could not create an invitation. Please try again.</p>
        <button type="button" className="button button--secondary" onClick={generateInvite}>
          Retry
        </button>
      </InvitePanelLayout>
    );
  }

  if (visibleInviteState.status === 'loaded') {
    const codeCopyKey: CopyContextKey = {
      ...currentInviteKey,
      requestedCopyText: copyText,
      requestedKind: 'code',
      requestedValue: visibleInviteState.code,
    };
    const linkCopyKey: CopyContextKey = {
      ...currentInviteKey,
      requestedCopyText: copyText,
      requestedKind: 'link',
      requestedValue: visibleInviteState.inviteURL,
    };
    const codeCopyState = copyState && copyKeysMatch(copyState, codeCopyKey)
      ? copyState
      : null;
    const linkCopyState = copyState && copyKeysMatch(copyState, linkCopyKey)
      ? copyState
      : null;
    const visibleCopyState = codeCopyState ?? linkCopyState;
    return (
      <InvitePanelLayout>
        <p className="party-invite-panel__notice">
          This code and link are shown only once. Save them now. If you lose them, regenerate the invitation.
        </p>
        <div className="party-invite-panel__credential">
          <span className="party-invite-panel__label">Invitation code</span>
          <code className="party-invite-panel__code" aria-label="Invitation code">
            {visibleInviteState.code}
          </code>
        </div>
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
        <div className="party-actions party-invite-panel__copy-actions">
          <button
            type="button"
            className="button button--primary"
            onClick={() => void copyCredential('code', visibleInviteState.code)}
            disabled={codeCopyState?.status === 'copying'}
          >
            {codeCopyState?.status === 'copying' ? 'Copying code...' : 'Copy code'}
          </button>
          <button
            type="button"
            className="button button--secondary"
            onClick={() => void copyCredential('link', visibleInviteState.inviteURL)}
            disabled={linkCopyState?.status === 'copying'}
          >
            {linkCopyState?.status === 'copying'
              ? 'Copying invitation link...'
              : 'Copy invitation link'}
          </button>
        </div>
        {visibleCopyState?.status === 'success' ? (
          <p role="status">
            {visibleCopyState.requestedKind === 'code'
              ? 'Invitation code copied.'
              : 'Invitation link copied.'}
          </p>
        ) : visibleCopyState?.status === 'error' ? (
          <p role="alert">
            {visibleCopyState.requestedKind === 'code'
              ? 'Could not copy the invitation code. Copy it manually instead.'
              : 'Could not copy the invitation link. Copy it manually instead.'}
          </p>
        ) : null}
        <p>Regenerating invalidates the previous code and link.</p>
        <button type="button" className="button button--secondary" onClick={generateInvite}>
          Regenerate invitation
        </button>
      </InvitePanelLayout>
    );
  }

  return (
    <InvitePanelLayout>
      <p>
        Generate a code and invitation link to share. They are shown only once and cannot be recovered after you leave this page.
      </p>
      <button type="button" className="button button--primary" onClick={generateInvite}>
        Generate invitation
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
    left.requestedKind === right.requestedKind &&
    left.requestedValue === right.requestedValue
  );
};

const formatExpiration = (expiresAt: string) => {
  return new Date(expiresAt).toLocaleString();
};
