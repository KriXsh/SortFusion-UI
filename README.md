# SortFusion

Watch **Quick**, **Merge**, **Heap**, **Shell**, **Insertion**, **Selection**, **Bubble** and **Cocktail Shaker** sort compare, swap and merge their way to order. Pause at any step, scrub back and forth through the run, follow along in the pseudocode, or sort your own numbers.

**Live demo:** [sort-fusion-ui.vercel.app](https://sort-fusion-ui.vercel.app)

Built with Next.js (App Router), Framer Motion and Tailwind CSS v4.

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
npm run lint
npm run format   # prettier, using .prettierrc
```

See [INSTALLATION.md](INSTALLATION.md) for requirements, deployment and troubleshooting.

## Features

- **8 algorithms** with best / average / worst complexity, space, stability and in-place badges.
- **Step-by-step playback**: play, pause, step forward and back, or drag the timeline to any point in the run.
- **Live pseudocode**: the line that produced the current step is highlighted as it runs.
- **Plain-English narration** of every step ("Comparing a[3] = 42 with a[7] = 26").
- **Live metrics**: comparisons, swaps and writes so far, next to what the whole run will take.
- **Data presets**: random, nearly sorted, reversed, few unique and already sorted. These show each algorithm's best and worst cases.
- **Your own numbers**: paste up to 200 values, including decimals and negatives.
- **Optional sound**: each step plays a tone pitched by bar height.
- Adjustable array size (4–200 bars, capped to what fits on screen) and speed (2 to 2,000 steps per second).

## Controls

| Action | How |
| --- | --- |
| Sort / pause / replay | `Space` or the main button |
| Step back / forward | `←` / `→` |
| Back to start | `R` |
| New array | `S` |
| Sound on / off | `M` |
| Jump anywhere | Drag the timeline under the bars |

### Colour key

| Colour | Meaning |
| --- | --- |
| Violet → cyan | Unsorted, shaded by height |
| Amber | Being compared |
| Rose | Being swapped or written |
| Fuchsia | Pivot (quick sort) or current minimum (selection sort) |
| Green | In its final position |
| Faded | Outside the sub-array being worked on (merge and quick sort) |

## How it works

```
src/components/sorting/
├── engine/
│   ├── algorithms.ts   the 8 sorts, each recording its steps into a Recorder
│   ├── constants.ts    op types, algorithm metadata + pseudocode, presets
│   ├── arrays.ts       preset generators, custom-input parsing
│   ├── controller.ts   replay loop, stepping, seeking, speed
│   └── sound.ts        Web Audio tones
├── Bars.tsx            the bars, step narration and timeline
├── ControlBar.tsx      glass toolbar
├── Panels.tsx          live metrics, algorithm card, legend, custom input
├── GlassSelect.tsx     accessible dropdown
└── SortingVisualizer.tsx
```

Each algorithm sorts a copy of the array up front, which takes a few milliseconds even for 200 bars. As it runs, it records every compare, swap, write, pivot and "this bar is done" as an op, along with the pseudocode line that produced it. The animation is a replay of those ops, paced by `requestAnimationFrame` against the current speed slider, so changing speed mid-run never restarts it.

Because the run is a recording, stepping back or scrubbing the timeline replays the ops from the start up to the chosen point. That costs O(steps) and takes a few milliseconds at worst. A test run across 1,800+ arrays checks that every recording ends fully sorted, and that every bar marked green really is in its final place.

Theme tokens and the `sf-*` colours live in `src/app/globals.css` (Tailwind v4 has no `tailwind.config.js`). The design system is shared with [Pathfinding Visualizer](https://github.com/KriXsh/Pathfinding-Visualizer) and [krish.dev](https://krish-portfolio-six.vercel.app).
