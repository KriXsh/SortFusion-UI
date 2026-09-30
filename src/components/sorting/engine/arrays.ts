import {MAX_SIZE, MIN_SIZE, type PresetId} from './constants';

/** Small seeded PRNG, so the first array is identical on the server and client. */
export function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(a: number[], rand: () => number) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Values 1..n in the shape a preset describes. */
export function generate(preset: PresetId, n: number, rand = Math.random) {
  const ramp = Array.from({length: n}, (_, i) => i + 1);
  switch (preset) {
    case 'sorted':
      return ramp;
    case 'reversed':
      return ramp.reverse();
    case 'nearly-sorted': {
      // ~6% of values nudged up to three places away.
      for (let k = Math.max(1, Math.round(n * 0.06)); k > 0; k--) {
        const i = Math.floor(rand() * n);
        const j = Math.min(n - 1, i + 1 + Math.floor(rand() * 3));
        [ramp[i], ramp[j]] = [ramp[j], ramp[i]];
      }
      return ramp;
    }
    case 'few-unique':
      return shuffle(
        ramp.map(v => Math.ceil((Math.ceil((v / n) * 4) / 4) * n)),
        rand,
      );
    default:
      return shuffle(ramp, rand);
  }
}

export type ParseResult = {values: number[]} | {error: string};

/** Numbers separated by commas, spaces or new lines. */
export function parseCustom(text: string): ParseResult {
  const tokens = text.split(/[\s,;]+/).filter(Boolean);
  const values: number[] = [];
  for (const t of tokens) {
    const v = Number(t);
    if (!Number.isFinite(v)) return {error: `"${t}" isn't a number.`};
    values.push(v);
  }
  if (values.length < MIN_SIZE)
    return {error: `Enter at least ${MIN_SIZE} numbers.`};
  if (values.length > MAX_SIZE)
    return {error: `Up to ${MAX_SIZE} numbers, you entered ${values.length}.`};
  return {values};
}

/** Short label for a bar: integers as-is, decimals to two places. */
export const formatValue = (v: number) =>
  Number.isInteger(v) ? String(v) : String(Number(v.toFixed(2)));
