// Shared vocabulary for the sorting engine. Every algorithm runs to completion
// up front and records what it did as a list of ops; the visualiser replays
// that list, so the animation can pause, step, scrub and change speed freely.

/** Read two bars and compare them. */
export const CMP = 0;
/** Exchange two bars. */
export const SWAP = 1;
/** Overwrite one bar with a value (merge sort's copy-back). */
export const WRITE = 2;
/** A bar has reached its final position. */
export const SORTED = 3;
/** Highlight a pivot / current minimum, or clear it with -1. */
export const PIVOT = 4;
/** Narrow the focus to a sub-array [a, b], or clear it with -1. */
export const RANGE = 5;
export type OpKind =
  | typeof CMP
  | typeof SWAP
  | typeof WRITE
  | typeof SORTED
  | typeof PIVOT
  | typeof RANGE;

/** Ops that do real work and so cost animation time; the rest ride along free. */
export const isCostly = (kind: number) => kind <= WRITE;

export const MIN_SIZE = 4;
export const MAX_SIZE = 200;

export type AlgorithmId =
  | 'bubble'
  | 'cocktail'
  | 'selection'
  | 'insertion'
  | 'shell'
  | 'merge'
  | 'quick'
  | 'heap';
export type PresetId =
  'random' | 'nearly-sorted' | 'reversed' | 'few-unique' | 'sorted';
export type Status = 'idle' | 'sorting' | 'paused' | 'sorted';

export type AlgorithmInfo = {
  name: string;
  short: string;
  best: string;
  average: string;
  worst: string;
  space: string;
  stable: boolean;
  inPlace: boolean;
  blurb: string;
  /** Pseudocode; ops carry the index of the line that produced them. */
  code: string[];
};

export const ALGORITHMS: Record<AlgorithmId, AlgorithmInfo> = {
  bubble: {
    name: 'Bubble Sort',
    short: 'Bubble',
    best: 'O(n)',
    average: 'O(n²)',
    worst: 'O(n²)',
    space: 'O(1)',
    stable: true,
    inPlace: true,
    blurb:
      'Walks the array swapping neighbours that are out of order. Each pass floats the largest remaining value to the end.',
    code: [
      'for i ← 0 to n − 2',
      '  for j ← 0 to n − 2 − i',
      '    if a[j] > a[j + 1]',
      '      swap a[j], a[j + 1]',
      '  mark a[n − 1 − i] sorted',
      '  if no swaps this pass: stop',
    ],
  },
  cocktail: {
    name: 'Cocktail Shaker Sort',
    short: 'Cocktail',
    best: 'O(n)',
    average: 'O(n²)',
    worst: 'O(n²)',
    space: 'O(1)',
    stable: true,
    inPlace: true,
    blurb:
      'Bubble sort in both directions: big values sink right, then small values rise left, so "turtles" move quickly too.',
    code: [
      'while swaps happen',
      '  for i ← lo to hi − 1',
      '    if a[i] > a[i + 1]: swap them',
      '  mark a[hi] sorted, hi ← hi − 1',
      '  for i ← hi down to lo + 1',
      '    if a[i − 1] > a[i]: swap them',
      '  mark a[lo] sorted, lo ← lo + 1',
      'mark the rest sorted',
    ],
  },
  selection: {
    name: 'Selection Sort',
    short: 'Selection',
    best: 'O(n²)',
    average: 'O(n²)',
    worst: 'O(n²)',
    space: 'O(1)',
    stable: false,
    inPlace: true,
    blurb:
      'Scans the unsorted part for its minimum and swaps it into place. Few swaps, but always n²/2 comparisons.',
    code: [
      'for i ← 0 to n − 2',
      '  min ← i',
      '  for j ← i + 1 to n − 1',
      '    if a[j] < a[min]: min ← j',
      '  swap a[i], a[min]',
      '  mark a[i] sorted',
    ],
  },
  insertion: {
    name: 'Insertion Sort',
    short: 'Insertion',
    best: 'O(n)',
    average: 'O(n²)',
    worst: 'O(n²)',
    space: 'O(1)',
    stable: true,
    inPlace: true,
    blurb:
      'Grows a sorted prefix, sliding each new value left until it fits. Excellent on small or nearly sorted data.',
    code: [
      'for i ← 1 to n − 1',
      '  j ← i',
      '  while j > 0 and a[j − 1] > a[j]',
      '    swap a[j − 1], a[j]',
      '    j ← j − 1',
    ],
  },
  shell: {
    name: 'Shell Sort',
    short: 'Shell',
    best: 'O(n log n)',
    average: 'O(n^1.25)',
    worst: 'O(n²)',
    space: 'O(1)',
    stable: false,
    inPlace: true,
    blurb:
      'Insertion sort over shrinking gaps. Long-distance moves early on leave little work for the final gap-1 pass.',
    code: [
      'for gap ← n / 2 down to 1, halving',
      '  for i ← gap to n − 1',
      '    j ← i',
      '    while j ≥ gap and a[j − gap] > a[j]',
      '      swap a[j − gap], a[j]',
      '      j ← j − gap',
    ],
  },
  merge: {
    name: 'Merge Sort',
    short: 'Merge',
    best: 'O(n log n)',
    average: 'O(n log n)',
    worst: 'O(n log n)',
    space: 'O(n)',
    stable: true,
    inPlace: false,
    blurb:
      'Splits the array in half, sorts each half, then merges them. Predictable n log n, at the cost of a buffer.',
    code: [
      'mergeSort(lo, hi):',
      '  if lo ≥ hi: return',
      '  mid ← ⌊(lo + hi) / 2⌋',
      '  mergeSort(lo, mid); mergeSort(mid + 1, hi)',
      '  copy a[lo..hi] into aux',
      '  while both halves have items',
      '    compare aux[i] with aux[j]',
      '    write the smaller to a[k]',
      '  copy the leftovers into a[k..hi]',
    ],
  },
  quick: {
    name: 'Quick Sort',
    short: 'Quick',
    best: 'O(n log n)',
    average: 'O(n log n)',
    worst: 'O(n²)',
    space: 'O(log n)',
    stable: false,
    inPlace: true,
    blurb:
      'Picks a pivot, partitions smaller values to its left and larger to its right, then recurses on each side.',
    code: [
      'quickSort(lo, hi):',
      '  if lo ≥ hi: return',
      '  move the middle item to hi as pivot',
      '  i ← lo',
      '  for j ← lo to hi − 1',
      '    if a[j] < pivot: swap a[i], a[j]; i++',
      '  swap a[i], a[hi]  (pivot lands in place)',
      '  quickSort(lo, i − 1); quickSort(i + 1, hi)',
    ],
  },
  heap: {
    name: 'Heap Sort',
    short: 'Heap',
    best: 'O(n log n)',
    average: 'O(n log n)',
    worst: 'O(n log n)',
    space: 'O(1)',
    stable: false,
    inPlace: true,
    blurb:
      'Arranges the array into a max-heap, then repeatedly moves the root (the largest value) to the back.',
    code: [
      'build a max-heap from a',
      'for end ← n − 1 down to 1',
      '  swap a[0], a[end]  (largest to the back)',
      '  mark a[end] sorted',
      '  siftDown(0, end):',
      '    child ← the larger of the two children',
      '    if a[child] > a[node]: swap, continue down',
    ],
  },
};

export const PRESETS: Record<PresetId, {name: string; hint: string}> = {
  random: {name: 'Random', hint: 'A shuffled staircase of distinct values'},
  'nearly-sorted': {
    name: 'Nearly sorted',
    hint: 'A few values out of place: best case for insertion',
  },
  reversed: {name: 'Reversed', hint: 'Descending: worst case for many sorts'},
  'few-unique': {
    name: 'Few unique',
    hint: 'Only four distinct heights, lots of ties',
  },
  sorted: {name: 'Already sorted', hint: 'Shows which sorts notice early'},
};
