'use client';

import {AnimatePresence, motion} from 'framer-motion';
import {
  ChartNoAxesColumnIncreasing,
  Columns3,
  Database,
  Gauge,
  Pause,
  Play,
  RotateCcw,
  Shuffle,
  SkipBack,
  StepBack,
  StepForward,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {cn} from '@/lib/utils';
import {
  ALGORITHMS,
  type AlgorithmId,
  MIN_SIZE,
  PRESETS,
  type PresetId,
} from './engine/constants';
import {
  type Controller,
  opsPerSecond,
  type UiSnapshot,
} from './engine/controller';
import {GlassSelect, type SelectOption} from './GlassSelect';

const ALGORITHM_OPTIONS: SelectOption<AlgorithmId>[] = (
  Object.keys(ALGORITHMS) as AlgorithmId[]
).map(id => {
  const a = ALGORITHMS[id];
  return {
    value: id,
    label: a.name,
    hint: a.blurb,
    badges: [a.average, a.stable ? 'stable' : 'unstable'],
  };
});

const PRESET_OPTIONS: SelectOption<PresetId>[] = (
  Object.keys(PRESETS) as PresetId[]
).map(id => ({value: id, label: PRESETS[id].name, hint: PRESETS[id].hint}));

/** Hover/focus label with an optional keyboard hint. */
function Tip({
  label,
  kbd,
  children,
}: {
  label: string;
  kbd?: string;
  children: React.ReactNode;
}) {
  return (
    <span className="group/tip relative inline-flex">
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute top-[calc(100%+10px)] left-1/2 z-50 flex -translate-x-1/2 translate-y-1 items-center gap-2 rounded-lg border border-border bg-sf-panel px-2.5 py-1.5 text-xs font-medium whitespace-nowrap text-foreground opacity-0 shadow-lg transition-all duration-200 group-hover/tip:translate-y-0 group-hover/tip:opacity-100 group-has-[:focus-visible]/tip:translate-y-0 group-has-[:focus-visible]/tip:opacity-100"
      >
        {label}
        {kbd && (
          <kbd className="rounded border border-border bg-ink/5 px-1.5 font-mono text-[10px] text-muted-foreground">
            {kbd}
          </kbd>
        )}
      </span>
    </span>
  );
}

function IconButton({
  label,
  kbd,
  onClick,
  disabled,
  pressed,
  children,
}: {
  label: string;
  kbd?: string;
  onClick: () => void;
  disabled?: boolean;
  pressed?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Tip label={label} kbd={kbd}>
      <motion.button
        type="button"
        aria-label={label}
        aria-pressed={pressed}
        onClick={onClick}
        disabled={disabled}
        whileHover={{y: -1}}
        whileTap={{scale: 0.92}}
        className={cn(
          'flex size-10 items-center justify-center rounded-xl border border-border bg-ink/[0.03] text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/[0.08] hover:text-foreground disabled:pointer-events-none disabled:opacity-40',
          pressed &&
            'border-primary/40 bg-primary/15 text-foreground shadow-[0_0_16px_-4px_rgb(99_102_241/0.6)]',
        )}
      >
        {children}
      </motion.button>
    </Tip>
  );
}

function PlayButton({ui, onClick}: {ui: UiSnapshot; onClick: () => void}) {
  const mode =
    ui.status === 'sorting'
      ? 'pause'
      : ui.status === 'paused'
        ? 'resume'
        : ui.status === 'sorted'
          ? 'replay'
          : 'play';
  const text = {
    play: 'Sort',
    pause: 'Pause',
    resume: 'Resume',
    replay: 'Replay',
  }[mode];
  const Icon = mode === 'pause' ? Pause : mode === 'replay' ? RotateCcw : Play;
  return (
    <Tip label={text} kbd="Space">
      <motion.button
        type="button"
        onClick={onClick}
        whileHover={{scale: 1.03}}
        whileTap={{scale: 0.96}}
        transition={{type: 'spring', stiffness: 300, damping: 20}}
        className="relative flex h-10 min-w-[7.5rem] items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-primary via-violet to-primary bg-[length:200%_100%] px-4 text-sm font-semibold text-white shadow-[0_8px_24px_-8px_rgb(99_102_241/0.8)] transition-[background-position] duration-500 hover:bg-[position:100%_0]"
      >
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={mode}
            initial={{scale: 0.3, rotate: -90, opacity: 0}}
            animate={{scale: 1, rotate: 0, opacity: 1}}
            exit={{scale: 0.3, rotate: 90, opacity: 0}}
            transition={{type: 'spring', stiffness: 300, damping: 20}}
            className="flex"
          >
            <Icon
              aria-hidden
              className="size-4"
              fill={mode === 'replay' ? 'none' : 'currentColor'}
            />
          </motion.span>
        </AnimatePresence>
        <span className="relative">{text}</span>
      </motion.button>
    </Tip>
  );
}

function formatRate(ops: number) {
  return ops >= 1000 ? `${(ops / 1000).toFixed(1)}k/s` : `${Math.round(ops)}/s`;
}

function Slider({
  icon,
  label,
  min,
  max,
  value,
  onChange,
  display,
  valueText,
  className,
}: {
  icon: React.ReactNode;
  label: string;
  min: number;
  max: number;
  value: number;
  onChange: (v: number) => void;
  display: string;
  valueText: string;
  className?: string;
}) {
  const fill = ((value - min) / (max - min || 1)) * 100;
  return (
    <label
      className={cn(
        'flex h-10 items-center gap-3 rounded-xl border border-border bg-ink/[0.03] px-3',
        className,
      )}
    >
      {icon}
      <span className="sr-only">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        aria-valuetext={valueText}
        className="sf-range min-w-0 flex-1"
        style={{'--sf-fill': `${fill}%`} as React.CSSProperties}
      />
      <span className="w-14 shrink-0 text-right font-mono text-[11px] text-muted-foreground tabular-nums">
        {display}
      </span>
    </label>
  );
}

export function ControlBar({
  controller,
  ui,
}: {
  controller: Controller;
  ui: UiSnapshot;
}) {
  const atStart = ui.cursor === 0;
  const atEnd = ui.status === 'sorted';
  const rate = opsPerSecond(ui.speed);
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-sf-surface/85 p-2 shadow-[0_20px_50px_-24px_var(--color-shadow)] backdrop-blur-xl md:gap-2.5 md:p-2.5">
      <GlassSelect
        label="Algorithm"
        icon={<ChartNoAxesColumnIncreasing aria-hidden className="size-4" />}
        value={ui.algorithm}
        options={ALGORITHM_OPTIONS}
        onChange={a => controller.setAlgorithm(a)}
        className="w-full sm:w-60"
      />
      <PlayButton ui={ui} onClick={() => controller.toggle()} />
      <IconButton
        label="Step back"
        kbd="←"
        onClick={() => controller.stepBack()}
        disabled={atStart}
      >
        <StepBack aria-hidden className="size-4" />
      </IconButton>
      <IconButton
        label="Step forward"
        kbd="→"
        onClick={() => controller.stepForward()}
        disabled={atEnd}
      >
        <StepForward aria-hidden className="size-4" />
      </IconButton>
      <IconButton
        label="Back to start"
        kbd="R"
        onClick={() => controller.reset()}
        disabled={atStart}
      >
        <SkipBack aria-hidden className="size-4" />
      </IconButton>
      <IconButton
        label="New array"
        kbd="S"
        onClick={() => controller.shuffle()}
      >
        <Shuffle aria-hidden className="size-4" />
      </IconButton>

      <span aria-hidden className="mx-1 hidden h-6 w-px bg-border lg:block" />

      <GlassSelect
        label="Data"
        icon={<Database aria-hidden className="size-4" />}
        value={ui.preset === 'custom' ? undefined : ui.preset}
        placeholder="Custom"
        options={PRESET_OPTIONS}
        onChange={p => controller.setPreset(p)}
        className="w-full sm:w-48"
      />
      <Slider
        icon={<Columns3 aria-hidden className="size-4 shrink-0 text-violet" />}
        label="Number of bars"
        min={MIN_SIZE}
        max={ui.maxSize}
        value={Math.min(ui.size, ui.maxSize)}
        onChange={v => controller.setSize(v)}
        display={`${ui.size} bars`}
        valueText={`${ui.size} bars`}
        className="w-full sm:w-44"
      />
      <Slider
        icon={<Gauge aria-hidden className="size-4 shrink-0 text-cyan" />}
        label="Animation speed"
        min={0}
        max={100}
        value={ui.speed}
        onChange={v => controller.setSpeed(v)}
        display={formatRate(rate)}
        valueText={`${formatRate(rate)} operations per second`}
        className="min-w-0 flex-1 sm:w-44 sm:flex-none"
      />
      <IconButton
        label={ui.sound ? 'Mute' : 'Sound on'}
        kbd="M"
        pressed={ui.sound}
        onClick={() => controller.toggleSound()}
      >
        {ui.sound ? (
          <Volume2 aria-hidden className="size-4" />
        ) : (
          <VolumeX aria-hidden className="size-4" />
        )}
      </IconButton>
    </div>
  );
}
