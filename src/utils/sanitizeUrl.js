/**
 * sanitizeUrl.js — URL validation for user-submitted content.
 *
 * Prevents rendering javascript:, data:, or other dangerous URI schemes
 * in <img src>, <iframe src>, and similar attributes.
 */

/**
 * Returns true if the URL is safe to render (https:// or http://).
 * Returns false for javascript:, data:, blob:, or any other scheme.
 */
export function isSafeUrl(url) {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim().toLowerCase();
  return trimmed.startsWith('https://') || trimmed.startsWith('http://');
}
