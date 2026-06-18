<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

type DictationMode = 'characters' | 'sentences'

type Segment = {
  display: string
  speech: string
  start: number
  end: number
}

const sampleText = 'Agent 47 arrives at Gate B12. Boarding starts in 15 minutes!'

const text = ref(sampleText)
const mode = ref<DictationMode>('characters')
const rate = ref(1)
const repeatCount = ref(1)
const loopPlayback = ref(false)
const voices = ref<SpeechSynthesisVoice[]>([])
const selectedVoice = ref('')
const currentIndex = ref<number | null>(null)
const completedCycles = ref(0)
const isPlaying = ref(false)
const segmentRefs = ref<Array<HTMLElement | undefined>>([])

let playbackToken = 0

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

const segments = computed(() => {
  if (!text.value) {
    return []
  }

  if (mode.value === 'characters') {
    const items: Segment[] = []
    let start = 0

    for (const character of text.value) {
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

  for (let index = 0; index < text.value.length; index++) {
    const character = text.value[index] || ''
    const isSentenceEnd = '.!?'.includes(character)
    const isLastCharacter = index === text.value.length - 1

    if (!isSentenceEnd && !isLastCharacter) {
      continue
    }

    let end = isLastCharacter ? index + 1 : index + 1

    while (end < text.value.length) {
      const whitespaceCharacter = text.value[end]

      if (!whitespaceCharacter || !/\s/u.test(whitespaceCharacter)) {
        break
      }

      end++
    }

    const value = text.value.slice(start, end)

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

  if (!items.length && text.value.trim()) {
    items.push({
      display: text.value,
      speech: text.value.trim(),
      start: 0,
      end: text.value.length
    })
  }

  return items
})

const canStart = computed(() => segments.value.length > 0 && !isPlaying.value)
const selectedVoiceName = computed(() => voices.value.find(voice => voice.voiceURI === selectedVoice.value)?.name || 'System default')
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

const resetPlayback = () => {
  playbackToken++
  isPlaying.value = false
  completedCycles.value = 0
  currentIndex.value = null

  if (import.meta.client) {
    window.speechSynthesis.cancel()
  }
}

const stopPlayback = () => {
  playbackToken++
  isPlaying.value = false

  if (import.meta.client) {
    window.speechSynthesis.cancel()
  }
}

const speakSegment = (index: number, token: number) => {
  if (!import.meta.client || token !== playbackToken) {
    return
  }

  const segment = segments.value[index]

  if (!segment) {
    resetPlayback()
    return
  }

  currentIndex.value = index

  const utterance = new SpeechSynthesisUtterance(segment.speech)
  utterance.rate = rate.value

  const voice = voices.value.find(item => item.voiceURI === selectedVoice.value)

  if (voice) {
    utterance.voice = voice
  }

  utterance.onend = () => {
    if (token !== playbackToken) {
      return
    }

    if (index < segments.value.length - 1) {
      speakSegment(index + 1, token)
      return
    }

    completedCycles.value++

    if (loopPlayback.value || completedCycles.value < repeatCount.value) {
      speakSegment(0, token)
      return
    }

    isPlaying.value = false
    currentIndex.value = null
  }

  utterance.onerror = () => {
    if (token !== playbackToken) {
      return
    }

    resetPlayback()
  }

  window.speechSynthesis.speak(utterance)
}

const startPlayback = () => {
  if (!segments.value.length || isPlaying.value || !import.meta.client) {
    return
  }

  const shouldRestart = currentIndex.value === null || currentIndex.value >= segments.value.length
  const nextToken = playbackToken + 1
  playbackToken = nextToken
  isPlaying.value = true

  if (shouldRestart) {
    completedCycles.value = 0
  }

  window.speechSynthesis.cancel()
  speakSegment(shouldRestart ? 0 : (currentIndex.value ?? 0), nextToken)
}

const clearInput = () => {
  resetPlayback()
  text.value = ''
}

const loadVoices = () => {
  if (!import.meta.client) {
    return
  }

  const availableVoices = window.speechSynthesis
    .getVoices()
    .slice()
    .sort((first, second) => first.name.localeCompare(second.name))

  voices.value = availableVoices

  if (!availableVoices.length) {
    selectedVoice.value = ''
    return
  }

  const existingVoice = availableVoices.find(voice => voice.voiceURI === selectedVoice.value)

  if (existingVoice) {
    return
  }

  const fallbackVoice = availableVoices.find(voice => voice.default) || availableVoices[0]

  if (fallbackVoice) {
    selectedVoice.value = fallbackVoice.voiceURI
  }
}

const setSegmentRef = (element: Element | null, index: number) => {
  if (element instanceof HTMLElement) {
    segmentRefs.value[index] = element
    return
  }

  segmentRefs.value[index] = undefined
}

const setSegmentRefAt = (index: number) => {
  return (element: Element | null) => setSegmentRef(element, index)
}

watch([text, mode], () => {
  resetPlayback()
  segmentRefs.value = []
})

watch(currentIndex, async (value) => {
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

onMounted(() => {
  loadVoices()

  if (import.meta.client) {
    window.speechSynthesis.onvoiceschanged = loadVoices
  }
})

onBeforeUnmount(() => {
  resetPlayback()

  if (import.meta.client) {
    window.speechSynthesis.onvoiceschanged = null
  }
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

        <div class="rounded-3xl border border-(--ui-border) bg-(--ui-bg)/85 p-5 shadow-sm">
          <div class="grid gap-5">
            <label class="grid gap-2">
              <span class="text-sm font-medium text-highlighted">Text to dictate</span>
              <textarea
                v-model="text"
                class="min-h-44 rounded-2xl border border-(--ui-border) bg-(--ui-bg-elevated) px-4 py-3 text-base outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="Type any text, codes, names, or mixed alphanumeric phrases here."
              />
            </label>

            <div class="grid gap-4 md:grid-cols-2">
              <div class="grid gap-2">
                <span class="text-sm font-medium text-highlighted">Dictation mode</span>
                <div class="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    class="rounded-2xl border px-4 py-3 text-sm font-medium transition"
                    :class="mode === 'characters'
                      ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                      : 'border-(--ui-border) bg-(--ui-bg-elevated) text-muted hover:text-highlighted'"
                    @click="mode = 'characters'"
                  >
                    Letters
                  </button>
                  <button
                    type="button"
                    class="rounded-2xl border px-4 py-3 text-sm font-medium transition"
                    :class="mode === 'sentences'
                      ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                      : 'border-(--ui-border) bg-(--ui-bg-elevated) text-muted hover:text-highlighted'"
                    @click="mode = 'sentences'"
                  >
                    Sentences
                  </button>
                </div>
              </div>

              <label class="grid gap-2">
                <span class="text-sm font-medium text-highlighted">Voice</span>
                <select
                  v-model="selectedVoice"
                  class="rounded-2xl border border-(--ui-border) bg-(--ui-bg-elevated) px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">
                    System default
                  </option>
                  <option
                    v-for="voice in voices"
                    :key="voice.voiceURI"
                    :value="voice.voiceURI"
                  >
                    {{ voice.name }} ({{ voice.lang }})
                  </option>
                </select>
              </label>

              <label class="grid gap-2">
                <div class="flex items-center justify-between gap-3">
                  <span class="text-sm font-medium text-highlighted">Dictation speed</span>
                  <span class="text-sm text-muted">{{ rate.toFixed(1) }}x</span>
                </div>
                <input
                  v-model.number="rate"
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.1"
                  class="accent-primary"
                >
              </label>

              <label class="grid gap-2">
                <span class="text-sm font-medium text-highlighted">Repeat count</span>
                <input
                  v-model.number="repeatCount"
                  type="number"
                  min="1"
                  max="25"
                  class="rounded-2xl border border-(--ui-border) bg-(--ui-bg-elevated) px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  :disabled="loopPlayback"
                >
              </label>
            </div>

            <label class="inline-flex items-center gap-3 text-sm text-muted">
              <input
                v-model="loopPlayback"
                type="checkbox"
                class="size-4 rounded border-(--ui-border) accent-primary"
              >
              Loop continuously until you stop playback
            </label>

            <div class="flex flex-wrap gap-3">
              <UButton
                icon="i-lucide-play"
                size="lg"
                :disabled="!canStart"
                @click="startPlayback"
              >
                {{ currentIndex === null ? 'Start dictation' : 'Resume dictation' }}
              </UButton>
              <UButton
                icon="i-lucide-square"
                color="neutral"
                variant="subtle"
                :disabled="!isPlaying"
                @click="stopPlayback"
              >
                Stop
              </UButton>
              <UButton
                icon="i-lucide-rotate-ccw"
                color="neutral"
                variant="outline"
                @click="resetPlayback"
              >
                Reset
              </UButton>
              <UButton
                icon="i-lucide-eraser"
                color="error"
                variant="outline"
                @click="clearInput"
              >
                Clear
              </UButton>
            </div>
          </div>
        </div>
      </section>

      <section class="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
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

        <aside class="grid gap-6">
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
                  {{ segments.length }}
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
        </aside>
      </section>
    </div>
  </main>
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
