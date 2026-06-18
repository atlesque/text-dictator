<!-- app/components/DictationControls.vue -->
<script setup lang="ts">
import type { DictationMode } from '~/composables/useDictation'

defineProps<{
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
}>()

const emit = defineEmits<{
  'update:text': [value: string]
  'update:mode': [value: DictationMode]
  'update:rate': [value: number]
  'update:repeatCount': [value: number]
  'update:loopPlayback': [value: boolean]
  'update:selectedVoice': [value: string]
  'start': []
  'stop': []
  'reset': []
  'clear': []
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
            @update:model-value="emit('update:rate', $event ?? 1)"
          />
        </div>

        <UInputNumber
          :model-value="repeatCount"
          label="Repeat count"
          :min="1"
          :max="25"
          :disabled="loopPlayback"
          @update:model-value="emit('update:repeatCount', $event ?? 1)"
        />
      </div>

      <UCheckbox
        :model-value="loopPlayback"
        label="Loop continuously until you stop playback"
        @update:model-value="emit('update:loopPlayback', $event === true)"
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
