export const canonicalHostingHost = 'sigmyp.web.app';
export const legacyHostingHost = 'facturacion-electronica-a73e3.web.app';

export function canonicalHostingUrl(value) {
  const url = new URL(value);
  if (url.hostname !== legacyHostingHost) return null;
  url.hostname = canonicalHostingHost;
  return url.href;
}
