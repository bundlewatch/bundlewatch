import { randomInt } from 'node:crypto';

import type { ResultsStore } from './stores/results-store.ts';
import type { ResultsData } from './validators.ts';

const ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const ID_LENGTH = 22;
const MAX_ATTEMPTS = 5;
const DAY_SECONDS = 24 * 60 * 60;

// 1.0.0 created 12-character ids. Those links keep working, so the
// route accepts both lengths.
export const SHORT_LINK_ID: RegExp = /^(?:[0-9A-Za-z]{22}|[0-9A-Za-z]{12})$/;

/**
 * 22 base62 characters: 131 bits. A link can only be opened by someone who
 * has it, and two links can't get the same id in practice; a taken id is
 * still retried.
 */
export const generateShortLinkId = (): string => {
  let id = '';
  for (let i = 0; i < ID_LENGTH; i++) {
    id += ALPHABET[randomInt(ALPHABET.length)];
  }
  return id;
};

/** Stores results under a new id and returns the id. */
export const saveShortLink = async ({
  store,
  repo,
  payload,
  now,
  retentionDays,
  generateId = generateShortLinkId,
}: {
  store: ResultsStore;
  repo: string;
  payload: ResultsData;
  now: number;
  retentionDays?: number | undefined;
  generateId?: () => string;
}): Promise<string> => {
  const expiresAt = retentionDays
    ? Math.floor(now / 1000) + retentionDays * DAY_SECONDS
    : undefined;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const id = generateId();
    // A retry only happens when the previous id was taken.
    // oxlint-disable-next-line no-await-in-loop
    const created = await store.create({
      id,
      repo,
      createdAt: new Date(now).toISOString(),
      expiresAt,
      payload,
    });
    if (created) {
      return id;
    }
  }
  throw new Error(`No free short link id after ${MAX_ATTEMPTS} attempts`);
};
