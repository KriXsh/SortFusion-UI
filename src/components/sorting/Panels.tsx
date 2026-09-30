'use client';

import {useState} from 'react';
import {AnimatePresence, motion} from 'framer-motion';
import {
  ArrowLeftRight,
  CornerDownLeft,
  PenLine,
  Scale,
  Timer,
} from 'lucide-react';
import {cn} from '@/lib/utils';
import {parseCustom} from './engine/arrays';
import {ALGORITHMS, MAX_SIZE, PRESETS, type Status} from './engine/constants';
import type {Controller, UiSnapshot} from './engine/controller';

const STATUS: Record<
  Status,
  {label: string; tone: string; dot: string; live?: boolean}
> = {
  idle: {
    label: 'Ready',
    tone: 'border-border text-muted-foreground',
    dot: 'bg-subtle',
  },
  sorting: {
    label: 'Sorting',
    tone: 'border-cyan/30 bg-cyan/10 text-cyan',
    dot: 'bg-cyan',
    live: true,
  },
  paused: {
    label: 'Paused',
    tone: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
    dot: 'bg-amber-500',
  },
  sorted: {
    label: 'Sorted',
    tone: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
    dot: 'bg-emerald-500',
  },
};

export function StatusBadge({status}: {status: Status}) {
  const s = STATUS[status];
  return (
    <motion.span
      layout
      role="status"
      aria-live="polite"
      className={cn(
        'inline-flex items-center gap-2 overflow-hidden rounded-full border px-3 py-1 font-mono text-[11px] font-medium tracking-wider uppercase transition-colors',
        s.tone,
      )}
    >
      <span
        className={cn(
          'size-1.5 rounded-full',
          s.dot,
          s.live && 'animate-sf-blink',
        )}
      />
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={status}
          initial={{y: 10, opacity: 0}}
          animate={{y: 0, opacity: 1}}
          exit={{y: -10, opacity: 0}}
          transition={{type: 'spring', stiffness: 300, damping: 20}}
        >
          {s.label}
        </motion.span>
      </AnimatePresence>
    </motion.span>
  );
}

function Stat({
  icon,
  label,
  value,
  total,
  unit,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  total?: string;
  unit?: string;
  accent: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-border bg-sf-canvas/60 p-3 transition-colors hover:border-border-strong">
      <div
        aria-hidden
        className={cn(
          'absolute -top-8 -right-8 size-16 rounded-full opacity-20 blur-2xl transition-opacity group-hover:opacity-40',
          accent,
        )}
      />
      <p className="flex items-center gap-1.5 font-mono text-[10px] tracking-[0.16em] text-subtle uppercase">
        {icon}
        {label}
      </p>
      <p className="mt-1.5 truncate font-mono text-xl font-medium text-foreground tabular-nums md:text-2xl">
        {value}
        {unit && (
          <span className="ml-1 text-xs text-muted-foreground">{unit}</span>
        )}
      </p>
      {total && (
        <p className="mt-0.5 font-mono text-[10.5px] text-subtle tabular-nums">
          of {total}
        </p>
      )}
    </div>
  );
}

export function MetricsPanel({ui}: {ui: UiSnapshot}) {
  const started = ui.cursor > 0 || ui.status !== 'idle';
  const progress = ui.total ? ui.cursor / ui.total : 0;
  return (
    <section aria-label="Live metrics" className="glass rounded-2xl p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="font-mono text-[11px] tracking-[0.22em] text-muted-foreground uppercase">
          Live metrics
        </h2>
        <StatusBadge status={ui.status} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Stat
          icon={<Scale aria-hidden className="size-3" />}
          label="Compares"
          value={ui.comparisons.toLocaleString()}
          total={ui.totals.comparisons.toLocaleString()}
          accent="bg-sf-compare"
        />
        <Stat
          icon={<ArrowLeftRight aria-hidden className="size-3" />}
          label="Swaps"
          value={ui.swaps.toLocaleString()}
          total={ui.totals.swaps.toLocaleString()}
          accent="bg-sf-swap"
        />
        <Stat
          icon={<PenLine aria-hidden className="size-3" />}
          label="Writes"
          value={ui.writes.toLocaleString()}
          total={ui.totals.writes.toLocaleString()}
          accent="bg-violet"
        />
        <Stat
          icon={<Timer aria-hidden className="size-3" />}
          label="Exec time"
          // Browsers coarsen performance.now() to ~0.1 ms, so finer digits would be noise.
          value={
            !started ? '—' : ui.timeMs < 0.1 ? '<0.1' : ui.timeMs.toFixed(1)
          }
          unit={started ? 'ms' : undefined}
          accent="bg-cyan"
        />
      </div>
      <div
        className="mt-3 h-1 overflow-hidden rounded-full bg-ink/[0.06]"
        aria-hidden
      >
        {/* scaleX, not width: stays on the compositor while the bars animate. */}
        <div
          className="h-full origin-left rounded-full bg-gradient-to-r from-violet via-primary to-cyan transition-transform duration-150 ease-linear"
          style={{
            transform: `scaleX(${ui.status === 'sorted' ? 1 : progress})`,
          }}
        />
      </div>
      <p className="mt-2 font-mono text-[10.5px] text-subtle">
        {ui.size} bars ·{' '}
        {ui.preset === 'custom' ? 'Custom data' : PRESETS[ui.preset].name} ·{' '}
        {ui.total.toLocaleString()} steps
      </p>
    </section>
  );
}

function Swatch({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <span
      className={cn('h-4 w-2.5 shrink-0 rounded-t-[3px]', className)}
      style={style}
    />
  );
}

const LEGEND = [
  {
    label: 'Unsorted',
    swatch: (
      <Swatch
        style={{
          background:
            'linear-gradient(to top, hsl(265 70% 50%), hsl(188 90% 70%))',
        }}
      />
    ),
  },
  {label: 'Comparing', swatch: <Swatch className="bg-sf-compare" />},
  {label: 'Swap / write', swatch: <Swatch className="bg-sf-swap" />},
  {label: 'Pivot / minimum', swatch: <Swatch className="bg-sf-pivot" />},
  {label: 'In final place', swatch: <Swatch className="bg-sf-sorted" />},
  {
    label: 'Outside current range',
    swatch: <Swatch className="bg-muted-foreground opacity-40" />,
  },
];

export function Legend({className}: {className?: string}) {
  return (
    <ul
      aria-label="Legend"
      className={cn('flex flex-wrap gap-x-5 gap-y-2.5', className)}
    >
      {LEGEND.map(l => (
        <li
          key={l.label}
          className="flex items-center gap-2 text-xs text-muted-foreground"
        >
          <span aria-hidden className="flex items-end">
            {l.swatch}
          </span>
          {l.label}
        </li>
      ))}
    </ul>
  );
}

const SHORTCUTS = [
  ['Space', 'Sort / pause'],
  ['← →', 'Step'],
  ['R', 'Back to start'],
  ['S', 'New array'],
  ['M', 'Sound'],
];

export function AlgorithmPanel({ui}: {ui: UiSnapshot}) {
  const a = ALGORITHMS[ui.algorithm];
  const showLine = ui.status !== 'idle' && ui.status !== 'sorted';
  return (
    <section
      aria-label="About this algorithm"
      className="glass rounded-2xl p-4"
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={ui.algorithm}
          initial={{opacity: 0, y: 8}}
          animate={{opacity: 1, y: 0}}
          exit={{opacity: 0, y: -8}}
          transition={{duration: 0.2}}
        >
          <h2 className="font-display text-lg font-bold text-foreground">
            {a.name}
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            {a.blurb}
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <span
              className={cn(
                'rounded-md border px-2 py-0.5 font-mono text-[10.5px]',
                a.stable
                  ? 'border-emerald-500/30 text-emerald-400'
                  : 'border-rose-500/30 text-rose-400',
              )}
            >
              {a.stable ? 'stable' : 'unstable'}
            </span>
            <span
              className={cn(
                'rounded-md border px-2 py-0.5 font-mono text-[10.5px]',
                a.inPlace
                  ? 'border-border text-muted-foreground'
                  : 'border-violet/30 text-violet',
              )}
            >
              {a.inPlace ? 'in-place' : 'extra memory'}
            </span>
          </div>

          <dl className="mt-3 grid grid-cols-4 overflow-hidden rounded-xl border border-border text-center">
            {(
              [
                ['Best', a.best],
                ['Average', a.average],
                ['Worst', a.worst],
                ['Space', a.space],
              ] as const
            ).map(([k, v], i) => (
              <div
                key={k}
                className={cn(
                  'bg-sf-canvas/60 px-1 py-2',
                  i && 'border-l border-border',
                )}
              >
                <dt className="font-mono text-[9.5px] tracking-[0.14em] text-subtle uppercase">
                  {k}
                </dt>
                <dd className="mt-1 font-mono text-[11.5px] text-foreground">
                  {v}
                </dd>
              </div>
            ))}
          </dl>

          <pre
            aria-label="Pseudocode"
            className="mt-3 overflow-x-auto rounded-xl border border-border bg-sf-canvas/70 py-2 font-mono text-[11.5px] leading-relaxed"
          >
            {a.code.map((line, i) => {
              const on = showLine && ui.line === i;
              return (
                <div
                  key={i}
                  className={cn(
                    'relative border-l-2 px-3 whitespace-pre transition-colors duration-150',
                    on
                      ? 'border-primary bg-primary/15 text-foreground'
                      : 'border-transparent text-muted-foreground',
                  )}
                >
                  {line}
                </div>
              );
            })}
          </pre>
        </motion.div>
      </AnimatePresence>
      <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-1.5 border-t border-border pt-3">
        {SHORTCUTS.map(([k, v]) => (
          <div
            key={k}
            className="flex items-center gap-2 text-xs text-muted-foreground"
          >
            <dt>
              <kbd className="rounded border border-border bg-ink/5 px-1.5 py-px font-mono text-[10px] text-foreground">
                {k}
              </kbd>
            </dt>
            <dd className="truncate">{v}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

const EXAMPLES = [
  '38, 27, 43, 3, 9, 82, 10',
  '5 1 4 2 8 0 2',
  '3.5, -2, 7, 0, 7, 1.25, -8, 4',
];

export function CustomInput({controller}: {controller: Controller}) {
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const apply = (value = text) => {
    const r = parseCustom(value);
    if ('error' in r) return setError(r.error);
    setError(null);
    controller.setCustom(r.values);
  };

  return (
    <section aria-label="Your own numbers" className="glass rounded-2xl p-4">
      <h2 className="font-mono text-[11px] tracking-[0.22em] text-muted-foreground uppercase">
        Your own numbers
      </h2>
      <form
        className="mt-3 flex gap-2"
        onSubmit={e => {
          e.preventDefault();
          apply();
        }}
      >
        <label className="min-w-0 flex-1">
          <span className="sr-only">Numbers separated by commas or spaces</span>
          <input
            value={text}
            onChange={e => {
              setText(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. 12, 4, 19, 7, 1"
            inputMode="decimal"
            aria-invalid={!!error}
            aria-describedby="custom-hint"
            className={cn(
              'h-10 w-full rounded-xl border bg-ink/[0.03] px-3 font-mono text-sm text-foreground outline-none transition-all placeholder:text-subtle',
              error
                ? 'border-rose-400/50 focus:border-rose-400'
                : 'border-border focus:border-primary/60 focus:shadow-[0_0_0_4px_rgb(99_102_241/0.12)]',
            )}
          />
        </label>
        <motion.button
          type="submit"
          whileTap={{scale: 0.95}}
          className="flex h-10 shrink-0 items-center gap-1.5 rounded-xl border border-primary/40 bg-primary/15 px-3.5 text-sm font-semibold text-foreground transition-colors hover:bg-primary/25"
        >
          Load
          <CornerDownLeft aria-hidden className="size-3.5" />
        </motion.button>
      </form>
      <p
        id="custom-hint"
        className={cn('mt-2 text-xs', error ? 'text-rose-400' : 'text-subtle')}
      >
        {error ??
          `Commas or spaces between values, up to ${MAX_SIZE}. Decimals and negatives work.`}
      </p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {EXAMPLES.map(ex => (
          <button
            key={ex}
            type="button"
            onClick={() => {
              setText(ex);
              apply(ex);
            }}
            className="rounded-lg border border-border bg-ink/[0.03] px-2 py-1 font-mono text-[10.5px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
          >
            {ex}
          </button>
        ))}
      </div>
    </section>
  );
}
