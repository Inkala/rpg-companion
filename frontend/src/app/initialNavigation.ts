import { captureAndScrubInviteFragment } from '../parties/inviteFragment';
import type { AppRoute } from './appTypes';
import { parseAppRoute } from './router';

type InitialNavigationContext = Parameters<typeof captureAndScrubInviteFragment>[0];

export type InitialNavigationResult = {
  route: AppRoute;
  inviteToken: string | null;
};

export const prepareInitialNavigation = (
  context: InitialNavigationContext,
): InitialNavigationResult => {
  const route = parseAppRoute(context.location.pathname);
  const capturedToken = captureAndScrubInviteFragment(context);

  return {
    route,
    inviteToken: route.name === 'join-party' ? capturedToken : null,
  };
};
