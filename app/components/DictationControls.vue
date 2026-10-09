<!-- app/components/DictationControls.vue -->
<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
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

const selectedLanguage = ref('')

// Remember the last voice the user picked for each language
const lastVoicePerLanguage = reactive<Record<string, string>>({})

const languages = computed(() => {
  return [...new Set(props.voices.map(v => v.lang))].sort()
})

const filteredVoices = computed(() => {
  if (!selectedLanguage.value) return props.voices
  return props.voices.filter(v => v.lang === selectedLanguage.value)
})

// Record voice changes so we can restore them when switching languages
watch(
  () => props.selectedVoice,
  voiceURI => {
    if (!voiceURI) return
    const voice = props.voices.find(v => v.voiceURI === voiceURI)
    if (voice) {
      lastVoicePerLanguage[voice.lang] = voiceURI
    }
  }
)

watch(
  () => props.voices,
  newVoices => {
    if (!newVoices.length) return

    // Set initial language from currently selected voice, or first available
    const currentVoice = newVoices.find(v => v.voiceURI === props.selectedVoice)
    selectedLanguage.value = currentVoice?.lang || newVoices[0]?.lang || ''
  },
  { immediate: true }
)

watch(selectedLanguage, lang => {
  if (!lang) return

  // Don't override if the current voice already matches this language
  const currentVoice = props.voices.find(v => v.voiceURI === props.selectedVoice)
  if (currentVoice?.lang === lang) return

  // Restore the last-used voice for this language, or pick the first available
  const savedVoiceURI = lastVoicePerLanguage[lang]
  if (savedVoiceURI) {
    const savedVoice = props.voices.find(v => v.voiceURI === savedVoiceURI)
    if (savedVoice) {
      emit('update:selectedVoice', savedVoice.voiceURI)
      return
    }
  }

  const firstVoice = props.voices.find(v => v.lang === lang)
  if (firstVoice) {
    emit('update:selectedVoice', firstVoice.voiceURI)
  }
})
</script>

<template>
  <div class="glass-panel p-5 sm:p-6">
    <div class="grid gap-5">
      <div class="grid gap-2.5">
        <span class="field-label">Text to dictate</span>
        <UTextarea
          :model-value="text"
          :rows="4"
          autoresize
          variant="none"
          class="w-full rounded-xl bg-elevated/50 ring-1 ring-default transition focus-within:ring-primary/60 focus-within:shadow-[0_0_0_4px_rgb(139_92_246/0.15)]"
          :ui="{ base: 'text-base py-3 px-4' }"
          placeholder="Type any text, codes, names, or mixed alphanumeric phrases here."
          @update:model-value="emit('update:text', $event)"
        />
      </div>

      <div class="grid gap-5 md:grid-cols-2">
        <div class="grid content-start gap-4">
          <div class="grid gap-2">
            <span class="field-label">Dictation mode</span>
            <UTabs
              :model-value="mode"
              :items="[
                { label: 'Letters', value: 'characters', icon: 'i-lucide-case-sensitive' },
                { label: 'Sentences', value: 'sentences', icon: 'i-lucide-text' }
              ]"
              variant="pill"
              :content="false"
              :ui="{
                list: 'rounded-full bg-elevated/60 ring-1 ring-default p-1',
                indicator: 'rounded-full gradient-action',
                trigger: 'rounded-full data-[state=active]:text-white'
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
              class="w-full"
              @update:model-value="selectedLanguage = $event"
            />
          </div>
          <div class="grid gap-2">
            <span class="field-label">Voice</span>
            <USelect
              :model-value="selectedVoice"
              :items="filteredVoices.map(v => ({ label: v.name, value: v.voiceURI }))"
              icon="i-lucide-audio-lines"
              placeholder="Select a voice"
              class="w-full"
              @update:model-value="emit('update:selectedVoice', $event)"
            />
          </div>
        </div>

        <div class="grid content-start gap-4">
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

      <div class="flex flex-wrap items-center gap-3 border-t border-default pt-5">
        <UButton
          icon="i-lucide-play"
          size="xl"
          class="gradient-action rounded-full px-6"
          :disabled="!canStart"
          @click="emit('start')"
        >
          {{ currentIndex === null ? 'Start dictation' : 'Resume dictation' }}
        </UButton>
        <div class="flex gap-2">
          <UTooltip text="Stop">
            <UButton
              icon="i-lucide-square"
              color="neutral"
              variant="soft"
              size="xl"
              class="rounded-full"
              aria-label="Stop"
              :disabled="!isPlaying"
              @click="emit('stop')"
            />
          </UTooltip>
          <UTooltip text="Reset">
            <UButton
              icon="i-lucide-rotate-ccw"
              color="neutral"
              variant="soft"
              size="xl"
              class="rounded-full"
              aria-label="Reset"
              @click="emit('reset')"
            />
          </UTooltip>
          <UTooltip text="Clear text">
            <UButton
              icon="i-lucide-eraser"
              color="error"
              variant="soft"
              size="xl"
              class="rounded-full"
              aria-label="Clear text"
              @click="emit('clear')"
            />
          </UTooltip>
        </div>
      </div>
    </div>
  </div>
</template>
