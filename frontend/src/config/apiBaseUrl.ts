export const parseApiBaseUrl = (
  configured: string | undefined,
  isProduction: boolean,
): string => {
  const value = configured?.trim() ?? '';
  if (value === '' || value === 'null' || value === '*' || /\s/u.test(value)) {
    return '';
  }

  if (!/^https?:\/\/[^/?#\\]+\/?$/iu.test(value)) {
    return '';
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return '';
  }

  const authority = value.slice(value.indexOf('//') + 2).split(/[/?#]/u, 1)[0];
  if (
    url.origin === 'null' ||
    url.username !== '' ||
    url.password !== '' ||
    authority.includes('@') ||
    url.pathname !== '/' ||
    url.search !== '' ||
    url.hash !== '' ||
    url.hostname.includes('*') ||
    !isNormalHostname(url.hostname)
  ) {
    return '';
  }

  if (url.protocol === 'https:') {
    return url.origin;
  }

  if (url.protocol === 'http:' && !isProduction && isLoopback(url.hostname)) {
    return url.origin;
  }

  return '';
};

export const getApiBaseUrl = (): string => {
  return parseApiBaseUrl(import.meta.env.VITE_API_BASE_URL, import.meta.env.PROD);
};

const isLoopback = (hostname: string): boolean => {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
};

const isNormalHostname = (hostname: string): boolean => {
  if (hostname.startsWith('[') && hostname.endsWith(']')) {
    return hostname.length > 2;
  }

  if (/^\d+(?:\.\d+){3}$/u.test(hostname)) {
    return true;
  }

  return hostname.split('.').every((label) => {
    return (
      label.length >= 1 &&
      label.length <= 63 &&
      /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/iu.test(label)
    );
  });
};
