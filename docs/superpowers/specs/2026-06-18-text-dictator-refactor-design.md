# Text Dictator — Refactor Design

## Goal

Refactor the monolithic `index.vue` page into a clean architecture of composables and focused components, preserving all existing visuals and behavior, while adopting Nuxt UI components throughout.

## File Structure

```
app/
├── pages/
│   └── index.vue              ← thin orchestrator (~50 lines)
├── components/
│   ├── DictationControls.vue  ← input + settings + action buttons
│   ├── KaraokePreview.vue     ← segment display with highlighting
│   └── PlaybackSummary.vue    ← stats sidebar
└── composables/
    ├── useSpeechSynthesis.ts  ← Web Speech API wrapper
    └── useDictation.ts        ← segment logic + playback orchestration
```

## Composable: `useSpeechSynthesis`

**Responsibility:** Low-level wrapper around the Web Speech API. No knowledge of dictation modes, segments, or cycles.

**State:**

- `voices: SpeechSynthesisVoice[]`
- `isSpeaking: Ref<boolean>`

**Methods:**

- `loadVoices()` — loads and sorts available voices
- `speak(text: string, rate: number, voice?: SpeechSynthesisVoice)` — speaks a single utterance, returns a Promise that resolves on end/error
- `cancel()` — cancels all pending speech
- `onVoicesChanged` — callback registration for voice list changes

**Lifecycle:** Handles `onvoiceschanged` listener, cleanup on unmount.

## Composable: `useDictation`

**Responsibility:** Dictation domain logic — text management, segment computation, playback orchestration. Uses `useSpeechSynthesis` internally.

**State:**

- `text: Ref<string>` — input text
- `mode: Ref<DictationMode>` — `'characters' | 'sentences'`
- `rate: Ref<number>` — speech rate (0.5–2)
- `repeatCount: Ref<number>` — repeat count (1–25)
- `loopPlayback: Ref<boolean>` — continuous loop flag
- `selectedVoice: Ref<string>` — selected voice URI
- `voices: Ref<SpeechSynthesisVoice[]>` — available voices (from useSpeechSynthesis)
- `segments: ComputedRef<Segment[]>` — computed segments for current text+mode
- `currentIndex: Ref<number | null>` — currently speaking segment index
- `isPlaying: Ref<boolean>` — playback active flag
- `completedCycles: Ref<number>` — completed cycle count
- `canStart: ComputedRef<boolean>` — can start playback
- `progressText: ComputedRef<string>` — status text

**Methods:**

- `startPlayback()` — start or resume from current position
- `stopPlayback()` — stop and keep position
- `resetPlayback()` — stop and reset position
- `clearInput()` — reset everything and clear text

**Side effects:** Watches for text/mode changes to reset playback. Watches currentIndex to scroll active segment into view.

## Component: `DictationControls.vue`

**Props:**

- `text: string`
- `mode: DictationMode`
- `rate: number`
- `repeatCount: number`
- `loopPlayback: boolean`
- `voices: SpeechSynthesisVoice[]`
- `selectedVoice: string`
- `isPlaying: boolean`
- `canStart: boolean`
- `currentIndex: number | null`
- `progressText: string`

**Emits:**

- `update:text`, `update:mode`, `update:rate`, `update:repeatCount`, `update:loopPlayback`, `update:selectedVoice`
- `start`, `stop`, `reset`, `clear`

**Nuxt UI Components Used:**

- `UTextarea` for text input
- `USelect` for voice selection
- `USlider` for speed slider
- `UInputNumber` for repeat count
- `UCheckbox` for loop toggle
- `UButton` for action buttons

**Template sections:**

1. Text input area
2. Controls grid: mode toggle, voice select, speed slider, repeat count
3. Loop checkbox
4. Action buttons (Start/Resume, Stop, Reset, Clear)

## Component: `KaraokePreview.vue`

**Props:**

- `segments: Segment[]`
- `currentIndex: number | null`

**Emits:** None (display-only)

**Behavior:**

- Renders each segment as an inline span
- Active segment gets `dictation-segment--active` class
- Completed segments get `dictation-segment--complete` class
- Scrolls active segment into view via watcher

**Template sections:**

1. Header with title + progress text
2. Segments container with empty state

## Component: `PlaybackSummary.vue`

**Props:**

- `segmentCount: number`
- `completedCycles: number`
- `loopPlayback: boolean`
- `repeatCount: number`

**Emits:** None (display-only)

**Template sections:**

1. Stats cards (segments, completed rounds, playback type)
2. "Best for mixed input" tip card

## Component Boundaries

| Component           | Props In                                                         | Events Out                                    |
| ------------------- | ---------------------------------------------------------------- | --------------------------------------------- |
| `DictationControls` | All settings state                                               | `update:*`, `start`, `stop`, `reset`, `clear` |
| `KaraokePreview`    | `segments`, `currentIndex`                                       | None                                          |
| `PlaybackSummary`   | `segmentCount`, `completedCycles`, `loopPlayback`, `repeatCount` | None                                          |

## Data Flow

```
index.vue
  ├── useSpeechSynthesis() → { voices, speak, cancel }
  ├── useDictation(speech) → {
  │     text, mode, rate, repeatCount, loopPlayback,
  │     selectedVoice, segments, currentIndex, isPlaying,
  │     completedCycles, canStart, progressText,
  │     startPlayback, stopPlayback, resetPlayback, clearInput
  │   }
  │
  ├── DictationControls (receives state, emits mutations + actions)
  ├── KaraokePreview (receives segments + currentIndex)
  └── PlaybackSummary (receives summary stats)
```

## Styling

- Scoped CSS in `KaraokePreview.vue` uses the existing `dictation-segment`, `dictation-segment--active`, `dictation-segment--complete` class names with identical styles
- All other styling uses Nuxt UI theme tokens via component props (`color`, `variant`, etc.) and minimal Tailwind classes
- Layout structure (grid, gap, padding) preserved from original

## TypeScript

- `DictationMode`: `'characters' | 'sentences'`
- `Segment`: `{ display: string; speech: string; start: number; end: number }`
- All composables and components strictly typed with explicit interfaces
- No `any` or loose typing

## What Stays the Same

- All visuals, colors, spacing, layout proportions
- All keyboard/screen reader accessibility
- All behavior — character/sentence modes, playback controls, karaoke preview, stats
- The `characterNames` mapping for special characters
- Nuxt UI v4 version and Tailwind v4
