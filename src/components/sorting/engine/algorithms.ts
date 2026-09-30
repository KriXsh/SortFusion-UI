import {
  type AlgorithmId,
  CMP,
  type OpKind,
  PIVOT,
  RANGE,
  SORTED,
  SWAP,
  WRITE,
} from './constants';

/**
 * Sorts a private copy of the input and records every step. Ops are stored as
 * four parallel arrays (kind, a, b, pseudocode line) so a 200-bar bubble sort,
 * ~30k ops, stays a few flat arrays rather than 30k objects.
 */
export class Recorder {
  readonly kind: OpKind[] = [];
  readonly a: number[] = [];
  readonly b: number[] = [];
  readonly line: number[] = [];
  readonly arr: number[];
  comparisons = 0;
  swaps = 0;
  writes = 0;

  constructor(input: readonly number[]) {
    this.arr = input.slice();
  }

  get length() {
    return this.kind.length;
  }

  private push(kind: OpKind, a: number, b: number, line: number) {
    this.kind.push(kind);
    this.a.push(a);
    this.b.push(b);
    this.line.push(line);
  }

  /** Compare bars i and j; returns < 0, 0 or > 0 like a comparator. `x`/`y`
      override the values read, for merge sort comparing its buffer. */
  cmp(i: number, j: number, line: number, x = this.arr[i], y = this.arr[j]) {
    this.comparisons++;
    this.push(CMP, i, j, line);
    return x - y;
  }

  swap(i: number, j: number, line: number) {
    if (i === j) return;
    const {arr} = this;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    this.swaps++;
    this.push(SWAP, i, j, line);
  }

  write(i: number, value: number, line: number) {
    this.arr[i] = value;
    this.writes++;
    this.push(WRITE, i, value, line);
  }

  sorted(i: number, line: number) {
    this.push(SORTED, i, 0, line);
  }

  pivot(i: number, line: number) {
    this.push(PIVOT, i, 0, line);
  }

  range(lo: number, hi: number, line: number) {
    this.push(RANGE, lo, hi, line);
  }
}

type Sorter = (r: Recorder) => void;

const bubble: Sorter = r => {
  const n = r.arr.length;
  for (let i = 0; i < n - 1; i++) {
    let swapped = false;
    for (let j = 0; j < n - 1 - i; j++) {
      if (r.cmp(j, j + 1, 2) > 0) {
        r.swap(j, j + 1, 3);
        swapped = true;
      }
    }
    r.sorted(n - 1 - i, 4);
    if (!swapped) {
      for (let k = n - 2 - i; k >= 0; k--) r.sorted(k, 5);
      return;
    }
  }
  r.sorted(0, 4);
};

const cocktail: Sorter = r => {
  let lo = 0;
  let hi = r.arr.length - 1;
  while (lo < hi) {
    let swapped = false;
    for (let i = lo; i < hi; i++) {
      if (r.cmp(i, i + 1, 2) > 0) {
        r.swap(i, i + 1, 2);
        swapped = true;
      }
    }
    r.sorted(hi--, 3);
    if (!swapped) break;
    swapped = false;
    for (let i = hi; i > lo; i--) {
      if (r.cmp(i - 1, i, 5) > 0) {
        r.swap(i - 1, i, 5);
        swapped = true;
      }
    }
    r.sorted(lo++, 6);
    if (!swapped) break;
  }
  for (let k = lo; k <= hi; k++) r.sorted(k, 7);
};

const selection: Sorter = r => {
  const n = r.arr.length;
  for (let i = 0; i < n - 1; i++) {
    let min = i;
    r.pivot(min, 1);
    for (let j = i + 1; j < n; j++) {
      if (r.cmp(j, min, 3) < 0) {
        min = j;
        r.pivot(min, 3);
      }
    }
    r.swap(i, min, 4);
    r.pivot(-1, 4);
    r.sorted(i, 5);
  }
  r.sorted(n - 1, 5);
};

const insertion: Sorter = r => {
  const n = r.arr.length;
  for (let i = 1; i < n; i++) {
    for (let j = i; j > 0 && r.cmp(j - 1, j, 2) > 0; j--) r.swap(j - 1, j, 3);
  }
};

const shell: Sorter = r => {
  const n = r.arr.length;
  for (let gap = n >> 1; gap > 0; gap >>= 1) {
    for (let i = gap; i < n; i++) {
      for (let j = i; j >= gap && r.cmp(j - gap, j, 3) > 0; j -= gap)
        r.swap(j - gap, j, 4);
    }
  }
};

const merge: Sorter = r => {
  const {arr} = r;
  const aux = new Array<number>(arr.length);
  const sort = (lo: number, hi: number) => {
    if (lo >= hi) return;
    const mid = (lo + hi) >> 1;
    sort(lo, mid);
    sort(mid + 1, hi);
    r.range(lo, hi, 4);
    for (let k = lo; k <= hi; k++) aux[k] = arr[k];
    let i = lo;
    let j = mid + 1;
    let k = lo;
    // Highlights i and j as the two candidates; `<=` keeps equal values in order.
    while (i <= mid && j <= hi) {
      if (r.cmp(i, j, 6, aux[i], aux[j]) <= 0) r.write(k++, aux[i++], 7);
      else r.write(k++, aux[j++], 7);
    }
    while (i <= mid) r.write(k++, aux[i++], 8);
    while (j <= hi) r.write(k++, aux[j++], 8);
  };
  sort(0, arr.length - 1);
  r.range(-1, -1, 0);
};

const quick: Sorter = r => {
  const sort = (lo: number, hi: number) => {
    if (lo > hi) return;
    if (lo === hi) return r.sorted(lo, 1);
    r.range(lo, hi, 0);
    // Middle pivot, so sorted and reversed input don't hit the n² worst case.
    r.swap((lo + hi) >> 1, hi, 2);
    r.pivot(hi, 2);
    let i = lo;
    for (let j = lo; j < hi; j++) {
      if (r.cmp(j, hi, 5) < 0) r.swap(i++, j, 5);
    }
    r.swap(i, hi, 6);
    r.pivot(-1, 6);
    r.sorted(i, 6);
    sort(lo, i - 1);
    sort(i + 1, hi);
  };
  sort(0, r.arr.length - 1);
  r.range(-1, -1, 7);
};

const heap: Sorter = r => {
  const n = r.arr.length;
  const siftDown = (node: number, size: number, building: boolean) => {
    for (;;) {
      let child = 2 * node + 1;
      if (child >= size) return;
      if (child + 1 < size && r.cmp(child + 1, child, building ? 0 : 5) > 0)
        child++;
      if (r.cmp(child, node, building ? 0 : 6) <= 0) return;
      r.swap(child, node, building ? 0 : 6);
      node = child;
    }
  };
  for (let i = (n >> 1) - 1; i >= 0; i--) siftDown(i, n, true);
  for (let end = n - 1; end > 0; end--) {
    r.swap(0, end, 2);
    r.sorted(end, 3);
    siftDown(0, end, false);
  }
  r.sorted(0, 3);
};

const SORTERS: Record<AlgorithmId, Sorter> = {
  bubble,
  cocktail,
  selection,
  insertion,
  shell,
  merge,
  quick,
  heap,
};

export type SortResult = {rec: Recorder; timeMs: number};

export function record(id: AlgorithmId, input: readonly number[]): SortResult {
  const rec = new Recorder(input);
  const t0 = performance.now();
  SORTERS[id](rec);
  return {rec, timeMs: performance.now() - t0};
}
