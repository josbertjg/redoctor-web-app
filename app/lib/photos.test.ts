import { describe, expect, it } from 'vitest';

import { sizedPhotoUrl } from './photos';

describe('sizedPhotoUrl', () => {
  it('asks Google for the size the page draws', () => {
    expect(
      sizedPhotoUrl('https://lh3.googleusercontent.com/a/ACg8oc=s96-c', 440),
    ).toBe('https://lh3.googleusercontent.com/a/ACg8oc=s440-c');
  });

  it('leaves any other photo untouched', () => {
    const storage =
      'https://firebasestorage.googleapis.com/v0/b/redoctor/o/a.jpg?alt=media';
    expect(sizedPhotoUrl(storage, 440)).toBe(storage);
    expect(
      sizedPhotoUrl('https://lh3.googleusercontent.com/a/no-size', 440),
    ).toBe('https://lh3.googleusercontent.com/a/no-size');
    expect(sizedPhotoUrl('not a url', 440)).toBe('not a url');
  });
});
