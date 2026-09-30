import {record, type Recorder} from './algorithms';
import {generate, mulberry32} from './arrays';
import {
  type AlgorithmId,
  CMP,
  isCostly,
  MAX_SIZE,
  MIN_SIZE,
  type OpKind,
  PIVOT,
  type PresetId,
  RANGE,
  SORTED,
  type Status,
  SWAP,
  WRITE,
} from './constants';
import {Tone} from './sound';

export type Active = {kind: OpKind; a: number; b: number} | null;

export type UiSnapshot = {
  values: readonly number[];
  /** Bumped whenever a new array arrives, so the bars can animate in. */
  dataId: number;
  sorted: readonly boolean[];
  min: number;
  max: number;
  status: Status;
  algorithm: AlgorithmId;
  preset: PresetId | 'custom';
  size: number;
  maxSize: number;
  speed: number;
  sound: boolean;
  comparisons: number;
  swaps: number;
  writes: number;
  /** What the whole run will cost, for "done / total" readouts. */
  totals: {comparisons: number; swaps: number; writes: number};
  /** Ops applied so far, out of `total`. */
  cursor: number;
  total: number;
  timeMs: number;
  active: Active;
  pivot: number;
  range: readonly [number, number] | null;
  line: number;
};

/** Slider 0-100 → operations per second, roughly 2 to 2,000 on a log scale. */
export const opsPerSecond = (speed: number) => 2 * Math.pow(1000, speed / 100);

const clamp = (x: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, x));

/**
 * Owns the array, the recorded ops and the replay loop. Sorting itself takes
 * a few milliseconds; the user watches a replay paced by requestAnimationFrame
 * against the *current* speed, so the slider never restarts a run, and any
 * point in the run can be reached by replaying ops from the start.
 */
export class Controller {
  private algorithm: AlgorithmId = 'quick';
  private preset: PresetId | 'custom' = 'random';
  private size = 48;
  private maxSize = MAX_SIZE;
  private speed = 62;
  private sound = false;
  private status: Status = 'idle';

  private initial: number[];
  private dataId = 0;
  private values: number[] = [];
  private sortedMask: boolean[] = [];
  private min = 0;
  private max = 1;
  private rec!: Recorder;
  private timeMs = 0;

  private cursor = 0;
  private comparisons = 0;
  private swaps = 0;
  private writes = 0;
  private active: Active = null;
  private pivot = -1;
  private range: [number, number] | null = null;
  private line = -1;

  /** 'sweep' is the victory lap that turns every bar green after the last op. */
  private phase: 'play' | 'sweep' | null = null;
  private sweep = 0;
  private budget = 0;
  private raf = 0;
  private last = 0;
  private tone = new Tone();

  private listeners = new Set<() => void>();
  private snap: UiSnapshot;

  constructor() {
    // Seeded, so the server-rendered first array matches the client's.
    this.initial = generate(this.preset as PresetId, this.size, mulberry32(7));
    this.prepare();
    this.snap = this.buildSnapshot();
  }

  // --- external store ------------------------------------------------------

  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => void this.listeners.delete(fn);
  };

  getSnapshot = () => this.snap;

  // Copies, not the live arrays: the React Compiler memoises on identity.
  private buildSnapshot(): UiSnapshot {
    return {
      values: this.values.slice(),
      dataId: this.dataId,
      sorted: this.sortedMask.slice(),
      min: this.min,
      max: this.max,
      status: this.status,
      algorithm: this.algorithm,
      preset: this.preset,
      size: this.initial.length,
      maxSize: this.maxSize,
      speed: this.speed,
      sound: this.sound,
      comparisons: this.comparisons,
      swaps: this.swaps,
      writes: this.writes,
      totals: {
        comparisons: this.rec.comparisons,
        swaps: this.rec.swaps,
        writes: this.rec.writes,
      },
      cursor: this.cursor,
      total: this.rec.length,
      timeMs: this.timeMs,
      active: this.active,
      pivot: this.pivot,
      range: this.range,
      line: this.line,
    };
  }

  private emit() {
    this.snap = this.buildSnapshot();
    this.listeners.forEach(fn => fn());
  }

  get playing() {
    return this.status === 'sorting';
  }

  // --- data ----------------------------------------------------------------

  /** Record the current algorithm over the current array and rewind to the start. */
  private prepare() {
    this.stopLoop();
    this.min = Math.min(...this.initial);
    this.max = Math.max(...this.initial);
    const {rec, timeMs} = record(this.algorithm, this.initial);
    this.rec = rec;
    this.timeMs = timeMs;
    this.rewind();
    this.status = 'idle';
  }

  private rewind() {
    this.values = this.initial.slice();
    this.sortedMask = this.initial.map(() => false);
    this.cursor = this.comparisons = this.swaps = this.writes = 0;
    this.active = this.range = null;
    this.pivot = this.line = -1;
    this.phase = null;
  }

  setAlgorithm(a: AlgorithmId) {
    if (a === this.algorithm) return;
    this.algorithm = a;
    this.prepare();
    this.emit();
  }

  setPreset(p: PresetId) {
    this.preset = p;
    this.shuffle();
  }

  /** A fresh array in the current preset (custom data falls back to random). */
  shuffle() {
    if (this.preset === 'custom') this.preset = 'random';
    this.initial = generate(this.preset, this.size);
    this.dataId++;
    this.prepare();
    this.emit();
  }

  setSize(n: number) {
    this.size = clamp(Math.round(n), MIN_SIZE, this.maxSize);
    this.shuffle();
  }

  /** Cap the bar count to what the stage can draw legibly. */
  setMaxSize(m: number) {
    const max = clamp(Math.floor(m), MIN_SIZE * 4, MAX_SIZE);
    if (max === this.maxSize) return;
    this.maxSize = max;
    if (this.size > max && this.preset !== 'custom') this.setSize(max);
    else this.emit();
  }

  setCustom(values: number[]) {
    this.preset = 'custom';
    this.initial = values.slice();
    this.dataId++;
    this.size = clamp(values.length, MIN_SIZE, MAX_SIZE);
    this.prepare();
    this.emit();
  }

  setSpeed(s: number) {
    this.speed = s;
    this.emit();
  }

  toggleSound() {
    this.sound = !this.sound;
    if (this.sound) this.tone.enable();
    this.emit();
  }

  // --- playback --------------------------------------------------------------

  /** The main button: play, pause, resume or replay depending on state. */
  toggle() {
    if (this.status === 'sorting') return this.pause();
    if (this.status === 'sorted') this.seek(0);
    this.play();
  }

  play() {
    if (this.sound) this.tone.enable();
    this.status = 'sorting';
    this.phase = this.cursor >= this.rec.length ? 'sweep' : 'play';
    this.startLoop();
    this.emit();
  }

  pause() {
    if (this.status !== 'sorting') return;
    // Pausing mid-sweep just finishes it: there's nothing left to inspect.
    if (this.phase === 'sweep') return this.seek(this.rec.length);
    this.stopLoop();
    this.phase = null;
    this.status = 'paused';
    this.emit();
  }

  /** Back to the unsorted array, keeping the recording. */
  reset() {
    this.seek(0);
  }

  /** Apply ops up to and including the next compare, swap or write. */
  stepForward() {
    this.stopLoop();
    const {rec} = this;
    if (this.cursor >= rec.length) return this.seek(rec.length);
    while (this.cursor < rec.length) {
      const costly = isCostly(rec.kind[this.cursor]);
      this.apply(this.cursor++);
      if (costly) break;
    }
    this.playTone();
    this.settle();
    this.emit();
  }

  /** Undo back to just after the previous compare, swap or write. */
  stepBack() {
    const {kind} = this.rec;
    let j = this.cursor - 1;
    while (j >= 0 && !isCostly(kind[j])) j--;
    j--;
    while (j >= 0 && !isCostly(kind[j])) j--;
    this.seek(j + 1);
    this.playTone();
  }

  /** Jump anywhere in the run by replaying from the start: O(ops), a few ms at worst. */
  seek(k: number) {
    this.stopLoop();
    const target = clamp(Math.round(k), 0, this.rec.length);
    if (target < this.cursor) this.rewind();
    while (this.cursor < target) this.apply(this.cursor++);
    this.phase = null;
    this.settle();
    this.emit();
  }

  dispose() {
    this.stopLoop();
    this.tone.dispose();
  }

  /** Status after a manual move: idle at 0, sorted at the end, else paused. */
  private settle() {
    if (this.cursor >= this.rec.length) this.finish();
    else this.status = this.cursor === 0 ? 'idle' : 'paused';
  }

  private finish() {
    this.sortedMask.fill(true);
    this.active = this.range = null;
    this.pivot = -1;
    this.status = 'sorted';
  }

  private apply(k: number) {
    const {rec, values} = this;
    const a = rec.a[k];
    const b = rec.b[k];
    const kind = rec.kind[k];
    switch (kind) {
      case CMP:
        this.comparisons++;
        break;
      case SWAP:
        [values[a], values[b]] = [values[b], values[a]];
        this.swaps++;
        break;
      case WRITE:
        values[a] = b;
        this.writes++;
        break;
      case SORTED:
        this.sortedMask[a] = true;
        break;
      case PIVOT:
        this.pivot = a;
        break;
      case RANGE:
        this.range = a < 0 ? null : [a, b];
        break;
    }
    if (isCostly(kind)) this.active = {kind, a, b};
    if (rec.line[k] >= 0) this.line = rec.line[k];
  }

  private playTone() {
    if (!this.sound || !this.active) return;
    const v = this.values[this.active.a];
    this.tone.play((v - this.min) / (this.max - this.min || 1));
  }

  // --- loop ------------------------------------------------------------------

  private startLoop() {
    this.stopLoop();
    this.last = performance.now();
    this.budget = 0;
    this.raf = requestAnimationFrame(this.tick);
  }

  // Guarded: prepare() runs during server rendering, where there's no rAF.
  private stopLoop() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  private tick = (now: number) => {
    // Clamp so a backgrounded tab doesn't dump thousands of ops at once.
    const dt = Math.min(now - this.last, 64);
    this.last = now;
    if (this.phase === 'play') this.stepPlay(dt);
    else if (this.phase === 'sweep') this.stepSweep(dt);
    if (this.phase) this.raf = requestAnimationFrame(this.tick);
    this.emit();
  };

  private stepPlay(dt: number) {
    const {rec} = this;
    this.budget += (dt * opsPerSecond(this.speed)) / 1000;
    let worked = false;
    while (this.cursor < rec.length) {
      const costly = isCostly(rec.kind[this.cursor]);
      if (costly && this.budget < 1) break;
      this.apply(this.cursor++);
      if (costly) {
        this.budget--;
        worked = true;
      }
    }
    // One blip per frame at most: at 2,000 ops/s a blip per op is just noise.
    if (worked) this.playTone();
    if (this.cursor >= rec.length) {
      this.active = this.range = null;
      this.pivot = -1;
      this.phase = 'sweep';
      this.sweep = 0;
    }
  }

  private stepSweep(dt: number) {
    const n = this.values.length;
    const from = Math.floor(this.sweep);
    // Left to right in ~0.7 s whatever the size.
    this.sweep = Math.min(n, this.sweep + (dt * n) / 700);
    const to = Math.floor(this.sweep);
    for (let i = from; i < to; i++) this.sortedMask[i] = true;
    if (this.sound && to > from)
      this.tone.play(
        (this.values[to - 1] - this.min) / (this.max - this.min || 1),
        0.05,
      );
    if (to >= n) {
      this.phase = null;
      this.finish();
    }
  }
}
