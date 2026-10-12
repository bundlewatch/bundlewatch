// oxlint-disable-next-line typescript/triple-slash-reference -- Source consumers need the ambient dependency declaration too.
/// <reference path="./jsonpack.d.ts" />
import jsonpack from 'jsonpack/main.js';

const { pack, unpack } = jsonpack;

import type { AnalyzeResult, ResultsDetails, ResultsPayload } from './types.ts';

// Every results link ever posted to a GitHub status encodes its data with
// jsonpack in the `d` query parameter. Both directions must keep working:
// links from 0.x CLIs on the new service, and links from this CLI on
// self-hosted 0.x services. Keep 1.1.5: 2.0.0's packer crashes on strings
// such as `constructor`. results-url.test.ts checks compatibility.

/**
 * What the results page needs. Per-file messages aren't shown, so they're
 * dropped. An unlimited maxSize is sent as null: 0.x sent Infinity, which
 * 0.x services reject, so those results pages never rendered.
 */
export const createResultsPayload = (
  results: AnalyzeResult,
  details: ResultsDetails,
): ResultsPayload => ({
  details,
  results: {
    ...results,
    fullResults: results.fullResults.map(({ message: _message, ...rest }) =>
      typeof rest.maxSize === 'number' && !Number.isFinite(rest.maxSize)
        ? { ...rest, maxSize: null }
        : rest,
    ),
  },
});

/** Builds the long `<host>/results?d=…` link. */
export const createResultsUrl = ({
  host,
  results,
  details,
}: {
  host: string;
  results: AnalyzeResult;
  details: ResultsDetails;
}): string =>
  `${host}/results?d=${encodeURIComponent(pack(createResultsPayload(results, details)))}`;

/** Decodes an already URL-decoded `d` parameter. Throws on malformed input. */
export const decodeResultsData = (data: string): unknown => unpack(data);
