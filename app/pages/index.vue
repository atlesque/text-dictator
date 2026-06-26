<script setup lang="ts">
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
</script>

<template>
  <main class="min-h-screen bg-default text-default">
    <div class="mx-auto flex min-h-screen max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-6">
      <section
        class="grid gap-4 rounded-3xl border border-default bg-elevated/80 p-4 shadow-sm backdrop-blur lg:p-5"
      >
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

      <section class="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
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
