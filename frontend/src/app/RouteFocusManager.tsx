import { useEffect, useRef } from 'react';

type RouteFocusManagerProps = {
  routeKey: string;
};

export const RouteFocusManager = ({ routeKey }: RouteFocusManagerProps) => {
  const previousRouteKeyRef = useRef(routeKey);

  useEffect(() => {
    if (previousRouteKeyRef.current === routeKey) {
      return;
    }

    previousRouteKeyRef.current = routeKey;
    const main = document.querySelector('main');
    const heading = main?.querySelector<HTMLElement>('h1')
      ?? main?.querySelector<HTMLElement>('h2');

    if (heading) {
      heading.tabIndex = -1;
      heading.focus();
    }
  }, [routeKey]);

  return null;
};
