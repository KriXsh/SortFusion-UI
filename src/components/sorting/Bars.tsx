'use client';

import {cn} from '@/lib/utils';
import {formatValue} from './engine/arrays';
import {CMP, SWAP, WRITE} from './engine/constants';
import {
  type Controller,
  opsPerSecond,
  type UiSnapshot,
} from './engine/controller';

type BarState = 'idle' | 'compare' | 'swap' | 'pivot' | 'sorted';

const STATE_CLASS: Record<Exclude<BarState, 'idle'>, string> = {
  compare:
    'bg-gradient-to-t from-amber-500 to-sf-compare shadow-[0_0_18px_-2px_rgb(251_191_36/0.8)]',
  swap: 'bg-gradient-to-t from-rose-600 to-sf-swap shadow-[0_0_18px_-2px_rgb(251_113_133/0.85)]',
  pivot:
    'bg-gradient-to-t from-fuchsia-600 to-sf-pivot shadow-[0_0_16px_-2px_rgb(232_121_249/0.8)]',
  sorted: 'bg-gradient-to-t from-emerald-600 to-sf-sorted',
};

const LABEL_CLASS: Record<BarState, string> = {
  idle: 'text-subtle',
  compare: 'text-sf-compare',
  swap: 'text-sf-swap',
  pivot: 'text-sf-pivot',
  sorted: 'text-sf-sorted',
};

/** Unsorted bars take a violet → cyan hue by height, so order shows at a glance. */
const idleFill = (t: number) => {
  const h = 265 - 77 * t;
  return `linear-gradient(to top, hsl(${h} 70% 50%), hsl(${h} 90% 70%))`;
};

function barState(ui: UiSnapshot, i: number): BarState {
  const {active} = ui;
  if (active && (active.a === i || (active.kind !== WRITE && active.b === i)))
    return active.kind === CMP ? 'compare' : 'swap';
  if (ui.pivot === i) return 'pivot';
  return ui.sorted[i] ? 'sorted' : 'idle';
}

export function Bars({ui}: {ui: UiSnapshot}) {
  const {values, min, max, range} = ui;
  const n = values.length;
  const span = max - min;
  const labels = n <= 32;
  const gap = n <= 24 ? 6 : n <= 60 ? 3 : n <= 120 ? 2 : 1;
  // Height eases between frames at slow speeds and snaps at fast ones.
  const dur = Math.min(180, 700 / opsPerSecond(ui.speed));

  return (
    <div
      key={ui.dataId}
      role="img"
      aria-label={`${n} bars, ${ui.status === 'sorted' ? 'sorted' : 'being sorted'} in ascending order`}
      className="relative flex h-[clamp(15rem,50vh,30rem)] items-end border-b border-sf-line pt-6"
      style={{gap}}
    >
      {values.map((v, i) => {
        const t = span ? (v - min) / span : 0.6;
        const state = barState(ui, i);
        const dim = range !== null && (i < range[0] || i > range[1]);
        return (
          <div
            key={i}
            className={cn(
              'flex h-full min-w-0 flex-1 flex-col items-center justify-end transition-opacity duration-150',
              dim && 'opacity-40',
            )}
          >
            {labels && (
              <span
                className={cn(
                  'mb-1 font-mono text-[10px] leading-none tabular-nums transition-colors',
                  LABEL_CLASS[state],
                )}
              >
                {formatValue(v)}
              </span>
            )}
            <div
              className={cn(
                'w-full origin-bottom animate-sf-rise',
                n <= 100 ? 'rounded-t-[4px]' : 'rounded-t-[1px]',
                state !== 'idle' && STATE_CLASS[state],
              )}
              style={{
                height: `${6 + 94 * t}%`,
                background: state === 'idle' ? idleFill(t) : undefined,
                transition: `height ${dur}ms ease-out`,
                animationDelay: `${Math.min(i * 8, 400)}ms`,
              }}
            />
          </div>
        );
      })}
    </div>
  );
}

/** One line of plain English about the op that just ran. */
export function Narration({ui}: {ui: UiSnapshot}) {
  const {active, values, status} = ui;
  let text: React.ReactNode;
  if (status === 'sorted') {
    text = (
      <>
        <span className="text-sf-sorted">Sorted</span> {values.length} values
        with {ui.comparisons.toLocaleString()} comparisons and{' '}
        {(ui.swaps + ui.writes).toLocaleString()} moves.
      </>
    );
  } else if (!active) {
    text = (
      <>
        Press <Kbd>Space</Kbd> to sort, or step through with <Kbd>←</Kbd>{' '}
        <Kbd>→</Kbd>.
      </>
    );
  } else if (active.kind === CMP) {
    text =
      ui.algorithm === 'merge' ? (
        <>
          <span className="text-sf-compare">Comparing</span> the next item of
          each half: positions {active.a} and {active.b}
        </>
      ) : (
        <>
          <span className="text-sf-compare">Comparing</span> a[{active.a}] ={' '}
          {formatValue(values[active.a])} with a[{active.b}] ={' '}
          {formatValue(values[active.b])}
        </>
      );
  } else if (active.kind === SWAP) {
    text = (
      <>
        <span className="text-sf-swap">Swapped</span> a[{active.a}] and a[
        {active.b}]
      </>
    );
  } else {
    text = (
      <>
        <span className="text-sf-swap">Wrote</span> {formatValue(active.b)} into
        a[{active.a}]
      </>
    );
  }
  return (
    <p
      aria-live="polite"
      className="min-h-8 font-mono sm:min-h-5 text-xs text-muted-foreground"
    >
      {text}
    </p>
  );
}

function Kbd({children}: {children: React.ReactNode}) {
  return (
    <kbd className="rounded border border-border bg-ink/5 px-1.5 py-px font-mono text-[10px] text-foreground">
      {children}
    </kbd>
  );
}

/** Scrub anywhere in the run; dragging pauses playback. */
export function Timeline({
  controller,
  ui,
}: {
  controller: Controller;
  ui: UiSnapshot;
}) {
  const pct = ui.total ? (ui.cursor / ui.total) * 100 : 0;
  return (
    <label className="flex items-center gap-3">
      <span className="sr-only">Timeline</span>
      <input
        type="range"
        min={0}
        max={ui.total}
        value={ui.cursor}
        disabled={!ui.total}
        onChange={e => controller.seek(Number(e.target.value))}
        aria-valuetext={`Step ${ui.cursor} of ${ui.total}`}
        className="sf-range min-w-0 flex-1"
        style={{'--sf-fill': `${pct}%`} as React.CSSProperties}
      />
      <span className="shrink-0 font-mono text-[11px] text-muted-foreground tabular-nums">
        {ui.cursor.toLocaleString()}
        <span className="text-subtle"> / {ui.total.toLocaleString()}</span>
      </span>
    </label>
  );
}
