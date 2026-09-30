'use client';

import {useEffect, useRef, useState, useSyncExternalStore} from 'react';
import {motion} from 'framer-motion';
import {Bars, Narration, Timeline} from './Bars';
import {ControlBar} from './ControlBar';
import {Controller} from './engine/controller';
import {AlgorithmPanel, CustomInput, Legend, MetricsPanel} from './Panels';

/** Keep bars at least ~4px wide, so a phone tops out near 80 of them. */
const maxBarsFor = (width: number) => Math.floor(width / 4);

export default function SortingVisualizer() {
  const [controller] = useState(() => new Controller());
  const ui = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot,
  );
  const stage = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = stage.current!;
    const fit = () => controller.setMaxSize(maxBarsFor(el.clientWidth));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [controller]);

  useEffect(() => () => controller.dispose(), [controller]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target instanceof Element ? e.target : null;
      if (
        e.metaKey ||
        e.ctrlKey ||
        e.altKey ||
        t?.closest(
          'input:not([type=range]), textarea, select, [role=listbox], [contenteditable=true]',
        )
      )
        return;
      // Space on a focused button should press that button, not the shortcut;
      // arrows on a focused slider should move the slider.
      if (e.key === ' ' && t?.closest('button')) return;
      if (e.key.startsWith('Arrow') && t?.closest('input')) return;
      const k = e.key.toLowerCase();
      if (k === ' ') controller.toggle();
      else if (k === 'arrowright') controller.stepForward();
      else if (k === 'arrowleft') controller.stepBack();
      else if (k === 'r') controller.reset();
      else if (k === 's') controller.shuffle();
      else if (k === 'm') controller.toggleSound();
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [controller]);

  return (
    <div className="flex flex-col gap-4">
      {/* Sticky only where it fits on one or two rows; on phones it would bury the stage. */}
      <div className="relative z-30 md:sticky md:top-3">
        <ControlBar controller={controller} ui={ui} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="order-2 flex min-w-0 flex-col gap-4 xl:order-1">
          <motion.div
            initial={{opacity: 0, y: 16}}
            animate={{opacity: 1, y: 0}}
            transition={{duration: 0.6, ease: [0.16, 1, 0.3, 1]}}
            className="relative rounded-3xl border border-border bg-sf-surface p-3 shadow-[0_30px_80px_-40px_var(--color-shadow)] sm:p-5"
          >
            <div
              aria-hidden
              className="pointer-events-none absolute -inset-px -z-10 rounded-3xl bg-gradient-to-br from-primary/25 via-transparent to-cyan/20 blur-xl"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-3xl grid-lines opacity-40 mask-fade-b"
            />
            <div ref={stage} className="relative">
              <Bars ui={ui} />
            </div>
            <div className="relative mt-4 flex flex-col gap-3">
              <Narration ui={ui} />
              <Timeline controller={controller} ui={ui} />
              <Legend className="pt-1" />
            </div>
          </motion.div>
          <CustomInput controller={controller} />
        </div>

        <div className="order-1 flex flex-col gap-4 xl:order-2">
          <MetricsPanel ui={ui} />
          <div className="hidden xl:block">
            <AlgorithmPanel ui={ui} />
          </div>
        </div>
        <div className="order-3 xl:hidden">
          <AlgorithmPanel ui={ui} />
        </div>
      </div>
    </div>
  );
}
