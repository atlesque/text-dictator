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
  <main class="min-h-screen bg-default text-default">
    <div class="mx-auto flex min-h-screen max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      <section
        class="grid gap-6 rounded-3xl border border-default bg-elevated/80 p-6 shadow-sm backdrop-blur lg:grid-cols-[1.05fr_0.95fr] lg:p-8"
      >
        <div class="space-y-4">
          <p
            class="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold tracking-[0.3em] text-primary uppercase"
          >
            Nuxt UI dictation tool
          </p>
          <div class="space-y-3">
            <h1 class="text-4xl font-semibold tracking-tight text-highlighted sm:text-5xl">
              Dictate any text your way
            </h1>
            <p class="max-w-2xl text-base leading-7 text-muted sm:text-lg">
              Switch between character-by-character spelling and sentence playback, choose a voice,
              tune the speed, and follow every spoken part with a karaoke-style guide.
            </p>
          </div>
          <div class="grid gap-3 sm:grid-cols-3">
            <div class="rounded-2xl border border-default bg-default/80 p-4">
              <p class="text-sm text-muted">Current mode</p>
              <p class="mt-1 text-lg font-semibold text-highlighted">
                {{ mode === 'characters' ? 'Letters' : 'Sentences' }}
              </p>
            </div>
            <div class="rounded-2xl border border-default bg-default/80 p-4">
              <p class="text-sm text-muted">Speech rate</p>
              <p class="mt-1 text-lg font-semibold text-highlighted">{{ rate.toFixed(1) }}x</p>
            </div>
            <div class="rounded-2xl border border-default bg-default/80 p-4">
              <p class="text-sm text-muted">Voice</p>
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
