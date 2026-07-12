type InviteFragmentContext = {
  location: {
    hash: string;
    pathname: string;
    search: string;
  };
  history: {
    state: unknown;
    replaceState: (data: unknown, unused: string, url?: string | URL | null) => void;
  };
};

const inviteTokenPattern = /^[A-Za-z0-9_-]{43}$/;

export const captureAndScrubInviteFragment = ({
  location,
  history,
}: InviteFragmentContext): string | null => {
  const fragment = location.hash;
  history.replaceState(history.state, '', `${location.pathname}${location.search}`);

  if (!fragment.startsWith('#')) {
    return null;
  }

  const token = fragment.slice(1);
  return inviteTokenPattern.test(token) ? token : null;
};
