# Text Dictator Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the monolithic `index.vue` (~400 lines) into focused composables and components while preserving all behavior.

**Architecture:** Extract Web Speech API concerns into `useSpeechSynthesis` composable, dictation domain logic into `useDictation` composable, and split the template into three child components (`DictationControls`, `KaraokePreview`, `PlaybackSummary`). The page becomes a thin orchestrator wiring composables to components via props/emits.

**Tech Stack:** Nuxt 4, Nuxt UI v4 (UButton, UTextarea, USelect, USlider, UInputNumber, UCheckbox, UCard), Tailwind v4, TypeScript 6

**File Structure (created):**
- `app/composables/useSpeechSynthesis.ts`
- `app/composables/useDictation.ts`
- `app/components/DictationControls.vue`
- `app/components/KaraokePreview.vue`
- `app/components/PlaybackSummary.vue`

**File Structure (modified):**
- `app/pages/index.vue`

---

### Task 1: Create `useSpeechSynthesis` composable

**Files:**
- Create: `app/composables/useSpeechSynthesis.ts`

- [ ] **Step 1: Create the composable file**

```typescript
// app/composables/useSpeechSynthesis.ts
import { onBeforeUnmount, onMounted, ref } from 'vue'

export function useSpeechSynthesis() {
  const voices = ref<SpeechSynthesisVoice[]>([])
  const isSpeaking = ref(false)

  function loadVoices() {
    if (!import.meta.client) {
      return
    }

    const availableVoices = window.speechSynthesis
      .getVoices()
      .slice()
      .sort((first, second) => first.name.localeCompare(second.name))

    voices.value = availableVoices
  }

  function speak(text: string, rate: number, voiceURI?: string): Promise<void> {
    isSpeaking.value = true

    return new Promise((resolve, reject) => {
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = rate

      if (voiceURI) {
        const voice = voices.value.find(v => v.voiceURI === voiceURI)

        if (voice) {
          utterance.voice = voice
        }
      }

      utterance.onend = () => {
        isSpeaking.value = false
        resolve()
      }

      utterance.onerror = () => {
        isSpeaking.value = false
        reject(new Error('Speech synthesis error'))
      }

      window.speechSynthesis.speak(utterance)
    })
  }

  function cancel() {
    isSpeaking.value = false
    window.speechSynthesis.cancel()
  }

  onMounted(() => {
    loadVoices()

    if (import.meta.client) {
      window.speechSynthesis.onvoiceschanged = loadVoices
    }
  })

  onBeforeUnmount(() => {
    cancel()

    if (import.meta.client) {
      window.speechSynthesis.onvoiceschanged = null
    }
  })

  return {
    voices,
    isSpeaking,
    loadVoices,
    speak,
    cancel
  }
}
```

---

### Task 2: Create `useDictation` composable

**Files:**
- Create: `app/composables/useDictation.ts`

- [ ] **Step 1: Create the composable file with types and helper**

```typescript
// app/composables/useDictation.ts
import { computed, nextTick, ref, watch } from 'vue'
import { useSpeechSynthesis } from './useSpeechSynthesis'

export type DictationMode = 'characters' | 'sentences'

export interface Segment {
  display: string
  speech: string
  start: number
  end: number
}

const characterNames: Record<string, string> = {
  ' ': 'space',
  '\n': 'new line',
  '\t': 'tab',
  '.': 'period',
  ',': 'comma',
  ':': 'colon',
  ';': 'semicolon',
  '!': 'exclamation mark',
  '?': 'question mark',
  '-': 'dash',
  '_': 'underscore',
  '/': 'slash',
  '\\': 'backslash',
  '@': 'at sign',
  '#': 'hash',
  '&': 'ampersand',
  '%': 'percent',
  '+': 'plus',
  '=': 'equals',
  '(': 'open parenthesis',
  ')': 'close parenthesis'
}

function computeSegments(text: string, mode: DictationMode): Segment[] {
  if (!text) {
    return []
  }

  if (mode === 'characters') {
    const items: Segment[] = []
    let start = 0

    for (const character of text) {
      const end = start + character.length
      items.push({
        display: character,
        speech: characterNames[character] || character,
        start,
        end
      })
      start = end
    }

    return items
  }

  const items: Segment[] = []
  let start = 0

  for (let index = 0; index < text.length; index++) {
    const character = text[index] || ''
    const isSentenceEnd = '.!?'.includes(character)
    const isLastCharacter = index === text.length - 1

    if (!isSentenceEnd && !isLastCharacter) {
      continue
    }

    let end = index + 1

    while (end < text.length) {
      const whitespaceCharacter = text[end]

      if (!whitespaceCharacter || !/\s/u.test(whitespaceCharacter)) {
        break
      }

      end++
    }

    const value = text.slice(start, end)

    if (value.trim()) {
      items.push({
        display: value,
        speech: value.trim(),
        start,
        end
      })
    }

    start = end
    index = end - 1
  }

  if (!items.length && text.trim()) {
    items.push({
      display: text,
      speech: text.trim(),
      start: 0,
      end: text.length
    })
  }

  return items
}

export function useDictation() {
  const speech = useSpeechSynthesis()

  const sampleText = 'Agent 47 arrives at Gate B12. Boarding starts in 15 minutes!'

  const text = ref(sampleText)
  const mode = ref<DictationMode>('characters')
  const rate = ref(1)
  const repeatCount = ref(1)
  const loopPlayback = ref(false)
  const selectedVoice = ref('')
  const currentIndex = ref<number | null>(null)
  const completedCycles = ref(0)
  const isPlaying = ref(false)

  let playbackToken = 0

  const segments = computed(() => computeSegments(text.value, mode.value))

  const canStart = computed(() => segments.value.length > 0 && !isPlaying.value)

  const progressText = computed(() => {
    if (!segments.value.length) {
      return 'Enter some text to begin dictation.'
    }

    if (isPlaying.value && currentIndex.value !== null) {
      return `Speaking ${currentIndex.value + 1} of ${segments.value.length} in ${mode.value === 'characters' ? 'letter mode' : 'sentence mode'}.`
    }

    if (currentIndex.value !== null) {
      return 'Playback paused. Resume from the current position or reset to start again.'
    }

    return 'Ready to dictate your text.'
  })

  function resetPlayback() {
    playbackToken++
    isPlaying.value = false
    completedCycles.value = 0
    currentIndex.value = null
    speech.cancel()
  }

  function stopPlayback() {
    playbackToken++
    isPlaying.value = false
    speech.cancel()
  }

  async function speakSegment(index: number, token: number) {
    if (token !== playbackToken) {
      return
    }

    const segment = segments.value[index]

    if (!segment) {
      resetPlayback()
      return
    }

    currentIndex.value = index

    try {
      await speech.speak(segment.speech, rate.value, selectedVoice.value || undefined)

      if (token !== playbackToken) {
        return
      }

      if (index < segments.value.length - 1) {
        await speakSegment(index + 1, token)
        return
      }

      completedCycles.value++

      if (loopPlayback.value || completedCycles.value < repeatCount.value) {
        await speakSegment(0, token)
        return
      }

      isPlaying.value = false
      currentIndex.value = null
    } catch {
      if (token !== playbackToken) {
        return
      }

      resetPlayback()
    }
  }

  function startPlayback() {
    if (!segments.value.length || isPlaying.value) {
      return
    }

    const shouldRestart = currentIndex.value === null || currentIndex.value >= segments.value.length
    const nextToken = playbackToken + 1
    playbackToken = nextToken
    isPlaying.value = true

    if (shouldRestart) {
      completedCycles.value = 0
    }

    speech.cancel()
    speakSegment(shouldRestart ? 0 : (currentIndex.value ?? 0), nextToken)
  }

  function clearInput() {
    resetPlayback()
    text.value = ''
  }

  // Set initial voice after voices load
  watch(() => speech.voices.value, (availableVoices) => {
    if (!availableVoices.length) {
      selectedVoice.value = ''
      return
    }

    const existingVoice = availableVoices.find(v => v.voiceURI === selectedVoice.value)

    if (existingVoice) {
      return
    }

    const fallbackVoice = availableVoices.find(v => v.default) || availableVoices[0]

    if (fallbackVoice) {
      selectedVoice.value = fallbackVoice.voiceURI
    }
  }, { immediate: true })

  watch([text, mode], () => {
    resetPlayback()
  })

  watch(loopPlayback, (enabled) => {
    if (enabled) {
      repeatCount.value = Math.max(repeatCount.value, 1)
    }
  })

  watch(rate, (value) => {
    rate.value = Math.min(Math.max(value || 0.5, 0.5), 2)
  })

  watch(repeatCount, (value) => {
    repeatCount.value = Math.min(Math.max(Math.round(value || 1), 1), 25)
  })

  // Expose voices from speech synthesis for the template
  const voices = computed(() => speech.voices.value)

  return {
    text,
    mode,
    rate,
    repeatCount,
    loopPlayback,
    selectedVoice,
    voices,
    segments,
    currentIndex,
    isPlaying,
    completedCycles,
    canStart,
    progressText,
    startPlayback,
    stopPlayback,
    resetPlayback,
    clearInput
  }
}
```

---

### Task 3: Create `DictationControls.vue`

**Files:**
- Create: `app/components/DictationControls.vue`

- [ ] **Step 1: Create the controls component**

The component receives all state as props and emits mutations as events. Uses Nuxt UI v4 components.

```vue
<!-- app/components/DictationControls.vue -->
<script setup lang="ts">
import type { DictationMode } from '~/composables/useDictation'

const props = defineProps<{
  text: string
  mode: DictationMode
  rate: number
  repeatCount: number
  loopPlayback: boolean
  voices: SpeechSynthesisVoice[]
  selectedVoice: string
  isPlaying: boolean
  canStart: boolean
  currentIndex: number | null
  progressText: string
  selectedVoiceName: string
}>()

const emit = defineEmits<{
  'update:text': [value: string]
  'update:mode': [value: DictationMode]
  'update:rate': [value: number]
  'update:repeatCount': [value: number]
  'update:loopPlayback': [value: boolean]
  'update:selectedVoice': [value: string]
  start: []
  stop: []
  reset: []
  clear: []
}>()
</script>

<template>
  <div class="rounded-3xl border border-(--ui-border) bg-(--ui-bg)/85 p-5 shadow-sm">
    <div class="grid gap-5">
      <UTextarea
        :model-value="text"
        class="min-h-44"
        label="Text to dictate"
        placeholder="Type any text, codes, names, or mixed alphanumeric phrases here."
        @update:model-value="emit('update:text', $event)"
      />

      <div class="grid gap-4 md:grid-cols-2">
        <div class="grid gap-2">
          <span class="text-sm font-medium text-highlighted">Dictation mode</span>
          <div class="grid grid-cols-2 gap-2">
            <UButton
              :variant="mode === 'characters' ? 'solid' : 'ghost'"
              :color="mode === 'characters' ? 'primary' : 'neutral'"
              size="lg"
              @click="emit('update:mode', 'characters')"
            >
              Letters
            </UButton>
            <UButton
              :variant="mode === 'sentences' ? 'solid' : 'ghost'"
              :color="mode === 'sentences' ? 'primary' : 'neutral'"
              size="lg"
              @click="emit('update:mode', 'sentences')"
            >
              Sentences
            </UButton>
          </div>
        </div>

        <USelect
          :model-value="selectedVoice"
          label="Voice"
          :items="voices.map(v => ({ label: `${v.name} (${v.lang})`, value: v.voiceURI }))"
          placeholder="System default"
          @update:model-value="emit('update:selectedVoice', $event)"
        />

        <div class="grid gap-2">
          <div class="flex items-center justify-between gap-3">
            <span class="text-sm font-medium text-highlighted">Dictation speed</span>
            <span class="text-sm text-muted">{{ rate.toFixed(1) }}x</span>
          </div>
          <USlider
            :model-value="rate"
            :min="0.5"
            :max="2"
            :step="0.1"
            @update:model-value="emit('update:rate', $event)"
          />
        </div>

        <UInputNumber
          :model-value="repeatCount"
          label="Repeat count"
          :min="1"
          :max="25"
          :disabled="loopPlayback"
          @update:model-value="emit('update:repeatCount', $event)"
        />
      </div>

      <UCheckbox
        :model-value="loopPlayback"
        label="Loop continuously until you stop playback"
        @update:model-value="emit('update:loopPlayback', $event)"
      />

      <div class="flex flex-wrap gap-3">
        <UButton
          icon="i-lucide-play"
          size="lg"
          :disabled="!canStart"
          @click="emit('start')"
        >
          {{ currentIndex === null ? 'Start dictation' : 'Resume dictation' }}
        </UButton>
        <UButton
          icon="i-lucide-square"
          color="neutral"
          variant="subtle"
          :disabled="!isPlaying"
          @click="emit('stop')"
        >
          Stop
        </UButton>
        <UButton
          icon="i-lucide-rotate-ccw"
          color="neutral"
          variant="outline"
          @click="emit('reset')"
        >
          Reset
        </UButton>
        <UButton
          icon="i-lucide-eraser"
          color="error"
          variant="outline"
          @click="emit('clear')"
        >
          Clear
        </UButton>
      </div>
    </div>
  </div>
</template>
```

---

### Task 4: Create `KaraokePreview.vue`

**Files:**
- Create: `app/components/KaraokePreview.vue`

- [ ] **Step 1: Create the karaoke preview component**

This is a display-only component that renders segments with active/complete highlighting. Holds the scoped CSS for dictation-segment classes.

```vue
<!-- app/components/KaraokePreview.vue -->
<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import type { Segment } from '~/composables/useDictation'

const props = defineProps<{
  segments: Segment[]
  currentIndex: number | null
  progressText: string
}>()

const segmentRefs = ref<(HTMLElement | undefined)[]>([])

function setSegmentRefAt(index: number) {
  return (element: Element | null) => {
    if (element instanceof HTMLElement) {
      segmentRefs.value[index] = element
    } else {
      segmentRefs.value[index] = undefined
    }
  }
}

watch(() => props.currentIndex, async (value) => {
  if (value === null) {
    return
  }

  await nextTick()
  segmentRefs.value[value]?.scrollIntoView({
    behavior: 'smooth',
    block: 'nearest',
    inline: 'center'
  })
})
</script>

<template>
  <div class="rounded-3xl border border-(--ui-border) bg-(--ui-bg-elevated)/85 p-6 shadow-sm">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 class="text-xl font-semibold text-highlighted">
          Karaoke preview
        </h2>
        <p class="text-sm text-muted">
          The active letter or sentence is underlined and enlarged while it is being spoken.
        </p>
      </div>
      <span class="rounded-full border border-(--ui-border) bg-(--ui-bg) px-3 py-1 text-sm text-muted">
        {{ progressText }}
      </span>
    </div>

    <div class="mt-5 min-h-64 rounded-3xl border border-dashed border-(--ui-border) bg-(--ui-bg)/90 p-5">
      <p
        v-if="segments.length"
        class="flex flex-wrap gap-y-3 whitespace-pre-wrap text-xl leading-9 text-highlighted"
      >
        <span
          v-for="(segment, index) in segments"
          :key="`${segment.start}-${segment.end}`"
          :ref="setSegmentRefAt(index)"
          class="dictation-segment"
          :class="{
            'dictation-segment--active': currentIndex === index,
            'dictation-segment--complete': currentIndex !== null && index < currentIndex
          }"
        >
          {{ segment.display }}
        </span>
      </p>
      <p
        v-else
        class="flex min-h-52 items-center justify-center text-center text-base text-muted"
      >
        Paste or type text above to see the karaoke-style guide before you start playback.
      </p>
    </div>
  </div>
</template>

<style scoped>
.dictation-segment {
  border-radius: 0.75rem;
  padding: 0 0.15em;
  text-decoration-thickness: 0.12em;
  text-underline-offset: 0.28em;
  transition:
    transform 220ms ease,
    color 220ms ease,
    background-color 220ms ease,
    text-decoration-color 220ms ease,
    box-shadow 220ms ease;
}

.dictation-segment--active {
  background: color-mix(in srgb, var(--ui-primary) 16%, transparent);
  color: var(--ui-text-highlighted);
  text-decoration: underline;
  text-decoration-color: var(--ui-primary);
  transform: scale(1.08);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--ui-primary) 25%, transparent);
}

.dictation-segment--complete {
  color: var(--ui-text-muted);
}
</style>
```

---

### Task 5: Create `PlaybackSummary.vue`

**Files:**
- Create: `app/components/PlaybackSummary.vue`

- [ ] **Step 1: Create the summary component**

```vue
<!-- app/components/PlaybackSummary.vue -->
<script setup lang="ts">
defineProps<{
  segmentCount: number
  completedCycles: number
  loopPlayback: boolean
  repeatCount: number
}>()
</script>

<template>
  <div class="grid gap-6">
    <div class="rounded-3xl border border-(--ui-border) bg-(--ui-bg-elevated)/85 p-6 shadow-sm">
      <h2 class="text-xl font-semibold text-highlighted">
        Playback summary
      </h2>
      <dl class="mt-4 grid gap-4 text-sm">
        <div class="rounded-2xl border border-(--ui-border) bg-(--ui-bg)/90 p-4">
          <dt class="text-muted">
            Segments
          </dt>
          <dd class="mt-1 text-2xl font-semibold text-highlighted">
            {{ segmentCount }}
          </dd>
        </div>
        <div class="rounded-2xl border border-(--ui-border) bg-(--ui-bg)/90 p-4">
          <dt class="text-muted">
            Completed rounds
          </dt>
          <dd class="mt-1 text-2xl font-semibold text-highlighted">
            {{ completedCycles }}
          </dd>
        </div>
        <div class="rounded-2xl border border-(--ui-border) bg-(--ui-bg)/90 p-4">
          <dt class="text-muted">
            Playback type
          </dt>
          <dd class="mt-1 text-lg font-semibold text-highlighted">
            {{ loopPlayback ? 'Looping continuously' : `Repeat ${repeatCount} time${repeatCount === 1 ? '' : 's'}` }}
          </dd>
        </div>
      </dl>
    </div>

    <div class="rounded-3xl border border-primary/20 bg-primary/5 p-6">
      <h2 class="text-xl font-semibold text-highlighted">
        Best for mixed input
      </h2>
      <p class="mt-3 text-sm leading-7 text-muted">
        Letter mode spells out IDs, room numbers, and codes like A12B or Z9-44. Sentence mode is better for phrases, directions, and longer notes.
      </p>
    </div>
  </div>
</template>
```

---

### Task 6: Refactor `index.vue` into a thin orchestrator

**Files:**
- Modify: `app/pages/index.vue` (full replacement)

- [ ] **Step 1: Replace the entire file with the orchestrator**

```vue
<!-- app/pages/index.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import { useDictation } from '~/composables/useDictation'

const {
  text,
  mode,
  rate,
  repeatCount,
  loopPlayback,
  selectedVoice,
  voices,
  segments,
  currentIndex,
  isPlaying,
  completedCycles,
  canStart,
  progressText,
  startPlayback,
  stopPlayback,
  resetPlayback,
  clearInput
} = useDictation()

const selectedVoiceName = computed(() => {
  const voice = voices.value.find(v => v.voiceURI === selectedVoice.value)
  return voice?.name || 'System default'
})
</script>

<template>
  <main class="min-h-screen bg-(--ui-bg) text-(--ui-text)">
    <div class="mx-auto flex min-h-screen max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      <section class="grid gap-6 rounded-3xl border border-(--ui-border) bg-(--ui-bg-elevated)/80 p-6 shadow-sm backdrop-blur lg:grid-cols-[1.05fr_0.95fr] lg:p-8">
        <div class="space-y-4">
          <p class="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-primary">
            Nuxt UI dictation tool
          </p>
          <div class="space-y-3">
            <h1 class="text-4xl font-semibold tracking-tight text-highlighted sm:text-5xl">
              Dictate any text your way
            </h1>
            <p class="max-w-2xl text-base leading-7 text-muted sm:text-lg">
              Switch between character-by-character spelling and sentence playback, choose a voice, tune the speed, and follow every spoken part with a karaoke-style guide.
            </p>
          </div>
          <div class="grid gap-3 sm:grid-cols-3">
            <div class="rounded-2xl border border-(--ui-border) bg-(--ui-bg)/80 p-4">
              <p class="text-sm text-muted">
                Current mode
              </p>
              <p class="mt-1 text-lg font-semibold text-highlighted">
                {{ mode === 'characters' ? 'Letters' : 'Sentences' }}
              </p>
            </div>
            <div class="rounded-2xl border border-(--ui-border) bg-(--ui-bg)/80 p-4">
              <p class="text-sm text-muted">
                Speech rate
              </p>
              <p class="mt-1 text-lg font-semibold text-highlighted">
                {{ rate.toFixed(1) }}x
              </p>
            </div>
            <div class="rounded-2xl border border-(--ui-border) bg-(--ui-bg)/80 p-4">
              <p class="text-sm text-muted">
                Voice
              </p>
              <p class="mt-1 truncate text-lg font-semibold text-highlighted">
                {{ selectedVoiceName }}
              </p>
            </div>
          </div>
        </div>

        <DictationControls
          :text="text"
          :mode="mode"
          :rate="rate"
          :repeat-count="repeatCount"
          :loop-playback="loopPlayback"
          :voices="voices"
          :selected-voice="selectedVoice"
          :is-playing="isPlaying"
          :can-start="canStart"
          :current-index="currentIndex"
          :progress-text="progressText"
          :selected-voice-name="selectedVoiceName"
          @update:text="text = $event"
          @update:mode="mode = $event"
          @update:rate="rate = $event"
          @update:repeat-count="repeatCount = $event"
          @update:loop-playback="loopPlayback = $event"
          @update:selected-voice="selectedVoice = $event"
          @start="startPlayback"
          @stop="stopPlayback"
          @reset="resetPlayback"
          @clear="clearInput"
        />
      </section>

      <section class="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <KaraokePreview
          :segments="segments"
          :current-index="currentIndex"
          :progress-text="progressText"
        />

        <PlaybackSummary
          :segment-count="segments.length"
          :completed-cycles="completedCycles"
          :loop-playback="loopPlayback"
          :repeat-count="repeatCount"
        />
      </section>
    </div>
  </main>
</template>
```

---

### Task 7: TypeScript typecheck and verify

- [ ] **Step 1: Run the typecheck**

```bash
cd /Users/alex/Atlesque/Atlesque\ Tools/text-dictator && pnpm typecheck
```

Expected: No TypeScript errors. If errors appear, fix them and re-run.

- [ ] **Step 2: Run the dev server to verify the app works**

```bash
cd /Users/alex/Atlesque/Atlesque\ Tools/text-dictator && pnpm dev
```

Expected: Dev server starts without errors. Open the page and verify controls render, text can be typed, modes switch, playback works.
