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
  isSpeaking,
  hasStarted,
  spokenCharIndex,
  currentSpeech,
  canStart,
  progressText,
  startPlayback,
  stopPlayback,
  resetPlayback,
  clearInput
} = useDictation()
</script>

<template>
  <main class="relative z-10 text-default">
    <h1 class="sr-only">Text Dictator: hear any text read aloud, letter by letter or sentence by sentence</h1>
    <div class="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
      <section class="grid grid-cols-1 gap-4 lg:grid-cols-2">
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

        <KaraokePreview
          :is-playing="isPlaying"
          :is-speaking="isSpeaking"
          :has-started="hasStarted"
          :speech-text="currentSpeech"
          :spoken-char-index="spokenCharIndex"
          :rate="rate"
          :current-index="currentIndex"
          :segment-count="segments.length"
          :progress-text="progressText"
        />
      </section>
    </div>
  </main>
</template>
