export function getGoogleApiKey() {
  return (import.meta.env.VITE_GOOGLE_API_KEY || '').trim();
}

export function hasGoogleApiKey() {
  return getGoogleApiKey().length > 0;
}
