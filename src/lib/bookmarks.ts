// Pure helpers for the bookmarks feature.
//
// Nothing in this module touches browser-only APIs (localStorage, DOM, etc.)
// except `loadBookmarks` / `saveBookmarks`, which are thin wrappers around
// `localStorage`. Everything else is pure and safe to unit test with plain
// Node.js — no browser or Astro runtime required.

export const STORAGE_KEY = 'mona-bookmarks';

export interface Bookmark {
  url: string;
  slug: string;
}

const BASE62_ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const SLUG_LENGTH = 4;

/**
 * Normalizes user-entered URL text so that equivalent inputs (with or
 * without a scheme) are saved identically. Returns `null` when the value
 * can't be parsed as a URL at all.
 */
export function normalizeUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  // Allow bare "example.com" input by defaulting to https://.
  const hasScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed);
  const withScheme = hasScheme ? trimmed : `https://${trimmed}`;

  try {
    return new URL(withScheme).toString();
  } catch {
    return null;
  }
}

function toBase62(input: number): string {
  if (input <= 0) return BASE62_ALPHABET[0];
  let value = input;
  let result = '';
  while (value > 0) {
    result = BASE62_ALPHABET[value % 62] + result;
    value = Math.floor(value / 62);
  }
  return result;
}

/**
 * Generates a short base62 slug with a "mona-" prefix, e.g. "mona-7fk2".
 * Accepts a `random` source (defaults to `Math.random`) so tests can assert
 * on the output shape deterministically.
 */
export function generateSlug(random: () => number = Math.random): string {
  const max = 62 ** SLUG_LENGTH;
  const value = Math.floor(random() * max);
  const encoded = toBase62(value).padStart(SLUG_LENGTH, '0');
  return `mona-${encoded}`;
}

/**
 * Generates a slug guaranteed not to collide with any of the `existing`
 * bookmarks' slugs.
 */
export function generateUniqueSlug(
  existing: readonly Bookmark[],
  random: () => number = Math.random,
): string {
  let slug = generateSlug(random);
  while (existing.some((bookmark) => bookmark.slug === slug)) {
    slug = generateSlug(random);
  }
  return slug;
}

/** Formats a bookmark for display as "<url> :: <slug>". */
export function formatBookmark(bookmark: Bookmark): string {
  return `${bookmark.url} :: ${bookmark.slug}`;
}

function isBookmark(value: unknown): value is Bookmark {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.url === 'string' &&
    candidate.url.trim().length > 0 &&
    typeof candidate.slug === 'string' &&
    candidate.slug.trim().length > 0
  );
}

/**
 * Parses a raw (untrusted) localStorage value into a list of bookmarks.
 * Never throws: empty, corrupted, legacy, or non-array values all resolve
 * to a safe result, dropping any entries that aren't well-formed
 * `{ url, slug }` objects instead of letting them flow into rendering.
 */
export function parseStoredBookmarks(raw: string | null | undefined): Bookmark[] {
  if (!raw) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }

  if (!Array.isArray(parsed)) return [];
  return parsed.filter(isBookmark);
}

/** Reads and validates the saved bookmarks from `localStorage`. */
export function loadBookmarks(): Bookmark[] {
  try {
    return parseStoredBookmarks(localStorage.getItem(STORAGE_KEY));
  } catch {
    // localStorage can throw (e.g. disabled, private-mode quota errors).
    return [];
  }
}

/** Persists the given bookmarks to `localStorage`. */
export function saveBookmarks(bookmarks: readonly Bookmark[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks));
  } catch {
    // Ignore storage failures (quota exceeded, disabled, etc.).
  }
}
