import { describe, expect, it } from 'vitest';
import { parseApiBaseUrl } from './apiBaseUrl';

describe('parseApiBaseUrl', () => {
  it.each([
    ['missing', undefined],
    ['empty', ''],
    ['blank', '   '],
  ])('rejects %s configuration', (_name, configured) => {
    expect(parseApiBaseUrl(configured, false)).toBe('');
  });

  it.each([
    ['canonical origin', 'https://api.hunin.example', 'https://api.hunin.example'],
    ['trailing slash', 'https://api.hunin.example/', 'https://api.hunin.example'],
    ['default HTTPS port', 'https://api.hunin.example:443/', 'https://api.hunin.example'],
    ['non-default port', 'https://api.hunin.example:8443', 'https://api.hunin.example:8443'],
  ])('accepts and canonicalizes a production HTTPS %s', (_name, configured, expected) => {
    expect(parseApiBaseUrl(configured, true)).toBe(expected);
  });

  it.each([
    'http://api.hunin.example',
    'http://localhost:8080',
    'http://127.0.0.1:8080',
    'http://[::1]:8080',
  ])('rejects HTTP in production: %s', (configured) => {
    expect(parseApiBaseUrl(configured, true)).toBe('');
  });

  it('accepts HTTPS in development', () => {
    expect(parseApiBaseUrl('https://api.hunin.example/', false)).toBe(
      'https://api.hunin.example',
    );
  });

  it.each([
    ['localhost', 'http://localhost:8080/', 'http://localhost:8080'],
    ['IPv4 loopback', 'http://127.0.0.1:8080', 'http://127.0.0.1:8080'],
    ['IPv6 loopback', 'http://[::1]:8080/', 'http://[::1]:8080'],
    ['default HTTP port', 'http://localhost:80/', 'http://localhost'],
  ])('accepts development HTTP for %s', (_name, configured, expected) => {
    expect(parseApiBaseUrl(configured, false)).toBe(expected);
  });

  it.each([
    'http://example.com',
    'http://localhost.example.com',
    'http://example.localhost',
    'http://127.0.0.1.example.com',
  ])('rejects development HTTP for non-loopback host %s', (configured) => {
    expect(parseApiBaseUrl(configured, false)).toBe('');
  });

  it.each([
    ['username', 'https://user@api.hunin.example'],
    ['password', 'https://user:password@api.hunin.example'],
    ['path', 'https://api.hunin.example/api'],
    ['query', 'https://api.hunin.example?source=test'],
    ['fragment', 'https://api.hunin.example#section'],
  ])('rejects a URL containing %s', (_name, configured) => {
    expect(parseApiBaseUrl(configured, false)).toBe('');
  });

  it.each([
    ['malformed URL', 'https://[::1'],
    ['relative URL', '/api'],
    ['protocol-relative URL', '//api.hunin.example'],
    ['extra scheme slashes', 'https:////api.hunin.example'],
    ['backslash separators', 'https:\\\\api.hunin.example'],
    ['dot-segment path', 'https://api.hunin.example/.'],
    ['encoded dot-segment path', 'https://api.hunin.example/%2e'],
    ['double-slash path', 'https://api.hunin.example//'],
    ['missing scheme slash', 'https:/api.hunin.example'],
    ['wildcard', '*'],
    ['wildcard host', 'https://*'],
    ['literal null', 'null'],
    ['embedded whitespace', 'https://api. hunin.example'],
  ])('rejects %s', (_name, configured) => {
    expect(parseApiBaseUrl(configured, false)).toBe('');
  });

  it.each([
    'file:///tmp/hunin',
    'javascript:alert(1)',
    'data:text/plain,hunin',
    'ftp://api.hunin.example',
    'ws://localhost:8080',
    'wss://api.hunin.example',
  ])('rejects unsupported scheme %s', (configured) => {
    expect(parseApiBaseUrl(configured, false)).toBe('');
  });
});
