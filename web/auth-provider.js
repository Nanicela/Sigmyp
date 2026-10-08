export const allowedSignInProviders = new Set(['password', 'google.com']);

export function allowedSignInProvider(provider) {
  return allowedSignInProviders.has(provider);
}
