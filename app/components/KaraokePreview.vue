<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  isPlaying: boolean
  isSpeaking: boolean
  speechText: string
  spokenCharIndex: number
  rate: number
  currentIndex: number | null
  segmentCount: number
  progressText: string
}>()

const progress = computed(() => {
  if (props.currentIndex === null || !props.segmentCount) return 0
  return ((props.currentIndex + 1) / props.segmentCount) * 100
})
</script>

<template>
  <div
    class="glass-panel visualizer-stage relative order-first h-40 min-w-0 overflow-hidden sm:h-64 lg:order-none lg:h-auto lg:min-h-96"
    :class="{ 'visualizer-stage--active': isPlaying }"
  >
    <VoiceVisualizer
      class="absolute inset-0"
      :is-playing="isPlaying"
      :is-speaking="isSpeaking"
      :speech-text="speechText"
      :spoken-char-index="spokenCharIndex"
      :rate="rate"
    />

    <div class="absolute inset-x-10 bottom-6 h-px overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
      <div
        class="h-full bg-linear-to-r from-violet-400 via-fuchsia-400 to-sky-400 transition-[width] duration-300 ease-out"
        :style="{ width: `${progress}%` }"
      />
    </div>

    <p class="sr-only" aria-live="polite">{{ progressText }}</p>
  </div>
</template>

<style scoped>
.visualizer-stage {
  background:
    radial-gradient(120% 80% at 50% 50%, rgb(76 54 255 / 0.04), transparent 60%),
    var(--stage-bg);
}

.visualizer-stage::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  border-radius: inherit;
  box-shadow: inset 0 0 80px rgb(120 90 255 / 0.06);
  transition: box-shadow 600ms ease;
}

.visualizer-stage--active::after {
  box-shadow: inset 0 0 120px rgb(150 100 255 / 0.12);
}
</style>
