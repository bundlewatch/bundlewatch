import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { SHORT_LINK_ID, generateShortLinkId } from './short-links.ts';

describe('generateShortLinkId', () => {
  test('ids have at least 128 bits of entropy', () => {
    const id = generateShortLinkId();
    assert.match(id, SHORT_LINK_ID);
    assert.ok(id.length * Math.log2(62) >= 128, `${id.length} base62 characters are too few`);
  });

  test('ids are distinct and drawn from the whole alphabet', () => {
    const ids = new Set<string>();
    const characters = new Set<string>();
    for (let i = 0; i < 10_000; i++) {
      const id = generateShortLinkId();
      assert.match(id, SHORT_LINK_ID);
      ids.add(id);
      for (const character of id) {
        characters.add(character);
      }
    }
    assert.equal(ids.size, 10_000);
    assert.equal(characters.size, 62);
  });
});
