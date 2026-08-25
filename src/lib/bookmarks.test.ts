import { describe, expect, it } from 'vitest';
import {
  formatBookmark,
  generateSlug,
  normalizeUrl,
  parseStoredBookmarks,
  type Bookmark,
} from './bookmarks';

describe('normalizeUrl', () => {
  it('normalizes a URL without a scheme the same as one with https://', () => {
    expect(normalizeUrl('example.com')).toBe(normalizeUrl('https://example.com'));
    expect(normalizeUrl('example.com')).toBe('https://example.com/');
  });

  it('preserves an explicit scheme', () => {
    expect(normalizeUrl('http://example.com')).toBe('http://example.com/');
  });

  it('trims surrounding whitespace', () => {
    expect(normalizeUrl('  example.com  ')).toBe('https://example.com/');
  });

  it('returns null for empty or unparsable input', () => {
    expect(normalizeUrl('')).toBeNull();
    expect(normalizeUrl('   ')).toBeNull();
    expect(normalizeUrl('not a url')).toBeNull();
  });
});

describe('generateSlug', () => {
  it('produces a "mona-" prefixed base62 slug', () => {
    const slug = generateSlug(() => 0.42);
    expect(slug).toMatch(/^mona-[0-9a-zA-Z]{4}$/);
  });

  it('is deterministic for a given random source', () => {
    const random = () => 0.5;
    expect(generateSlug(random)).toBe(generateSlug(random));
  });
});

describe('formatBookmark', () => {
  it('formats as "<url> :: <slug>" with the exact separator', () => {
    const bookmark: Bookmark = { url: 'https://www.example.com/', slug: 'mona-7fk2' };
    expect(formatBookmark(bookmark)).toBe('https://www.example.com/ :: mona-7fk2');
  });
});

describe('parseStoredBookmarks', () => {
  it('returns an empty array for null/undefined/empty values', () => {
    expect(parseStoredBookmarks(null)).toEqual([]);
    expect(parseStoredBookmarks(undefined)).toEqual([]);
    expect(parseStoredBookmarks('')).toEqual([]);
  });

  it('recovers from corrupted (invalid JSON) values', () => {
    expect(parseStoredBookmarks('{not valid json')).toEqual([]);
  });

  it('recovers from legacy/non-array shapes', () => {
    expect(parseStoredBookmarks('{"url":"https://example.com/","slug":"mona-abcd"}')).toEqual([]);
    expect(parseStoredBookmarks('"just a string"')).toEqual([]);
    expect(parseStoredBookmarks('42')).toEqual([]);
  });

  it('drops malformed entries but keeps well-formed ones', () => {
    const raw = JSON.stringify([
      { url: 'https://example.com/', slug: 'mona-abcd' },
      { url: 'https://missing-slug.com/' },
      { slug: 'mona-noUrl' },
      null,
      'not-an-object',
      42,
      { url: '', slug: 'mona-empty-url' },
      { url: 'https://example.com/', slug: '' },
    ]);
    expect(parseStoredBookmarks(raw)).toEqual([{ url: 'https://example.com/', slug: 'mona-abcd' }]);
  });

  it('round-trips a valid array unchanged', () => {
    const bookmarks: Bookmark[] = [
      { url: 'https://example.com/', slug: 'mona-abcd' },
      { url: 'https://example.org/', slug: 'mona-wxyz' },
    ];
    expect(parseStoredBookmarks(JSON.stringify(bookmarks))).toEqual(bookmarks);
  });
});
