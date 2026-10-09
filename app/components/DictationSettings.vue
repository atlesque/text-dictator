<!-- app/components/DictationSettings.vue -->
<script setup lang="ts">
import { computed } from 'vue'
import type { DictationMode } from '~/composables/useDictation'

const props = defineProps<{
  mode: DictationMode
  rate: number
  repeatCount: number
  loopPlayback: boolean
  languages: string[]
  selectedLanguage: string
  voices: SpeechSynthesisVoice[]
  selectedVoice: string
}>()

const emit = defineEmits<{
  'update:mode': [value: DictationMode]
  'update:rate': [value: number]
  'update:repeatCount': [value: number]
  'update:loopPlayback': [value: boolean]
  'update:selectedLanguage': [value: string]
  'update:selectedVoice': [value: string]
}>()

const voiceItems = computed(() => props.voices.map(v => ({ label: v.name, value: v.voiceURI })))
</script>

<template>
  <div class="@container min-w-0">
    <!-- Split into two columns only when the panel itself is wide enough -->
    <div class="grid grid-cols-1 gap-5 @lg:grid-cols-2">
      <div class="grid min-w-0 content-start gap-4">
        <div class="grid gap-2">
          <span class="field-label">Dictation mode</span>
          <UTabs
            :model-value="mode"
            :items="[
              { label: 'Sentences', value: 'sentences', icon: 'i-lucide-text' },
              { label: 'Letters', value: 'characters', icon: 'i-lucide-case-sensitive' }
            ]"
            variant="pill"
            :content="false"
            :ui="{
              root: 'min-w-0',
              list: 'w-full rounded-full bg-elevated/60 ring-1 ring-default p-1',
              indicator: 'rounded-full gradient-action',
              trigger: 'min-w-0 flex-1 justify-center rounded-full data-[state=active]:text-white',
              label: 'truncate'
            }"
            @update:model-value="emit('update:mode', $event as DictationMode)"
          />
        </div>

        <div class="grid gap-2">
          <span class="field-label">Language</span>
          <USelect
            :model-value="selectedLanguage"
            :items="languages"
            icon="i-lucide-globe"
            placeholder="All languages"
            class="w-full min-w-0"
            @update:model-value="emit('update:selectedLanguage', $event)"
          />
        </div>
        <div class="grid gap-2">
          <span class="field-label">Voice</span>
          <USelect
            :model-value="selectedVoice"
            :items="voiceItems"
            icon="i-lucide-audio-lines"
            placeholder="Select a voice"
            class="w-full min-w-0"
            @update:model-value="emit('update:selectedVoice', $event)"
          />
        </div>
      </div>

      <div class="grid min-w-0 content-start gap-4">
        <div class="grid gap-2">
          <div class="flex items-center justify-between gap-3">
            <span class="field-label">Dictation speed</span>
            <span class="font-mono text-sm tabular-nums gradient-text">{{ rate.toFixed(1) }}x</span>
          </div>
          <USlider
            :model-value="rate"
            :min="0.5"
            :max="2"
            :step="0.1"
            class="py-2"
            :ui="{
              range: 'bg-linear-to-r from-violet-500 via-indigo-500 to-fuchsia-500',
              thumb: 'ring-primary bg-white shadow-[0_0_12px_rgb(139_92_246/0.8)]'
            }"
            @update:model-value="emit('update:rate', $event ?? 1)"
          />
        </div>

        <div class="grid gap-2">
          <span class="field-label">Repeat count</span>
          <UInputNumber
            :model-value="repeatCount"
            :min="1"
            :max="25"
            :disabled="loopPlayback"
            class="w-full"
            @update:model-value="emit('update:repeatCount', $event ?? 1)"
          />
        </div>

        <USwitch
          :model-value="loopPlayback"
          label="Loop continuously"
          description="Keep repeating until you stop playback"
          @update:model-value="emit('update:loopPlayback', $event === true)"
        />
      </div>
    </div>
  </div>
</template>
