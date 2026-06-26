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
  <div class="rounded-3xl border border-default bg-default/85 p-4 shadow-sm">
    <div class="grid gap-4">
      <div class="grid gap-2.5">
        <span class="text-sm font-medium text-highlighted">Text to dictate</span>
        <UTextarea
          :model-value="text"
          class="[&>textarea]:py-1!"
          placeholder="Type any text, codes, names, or mixed alphanumeric phrases here."
          @update:model-value="emit('update:text', $event)"
        />
      </div>

      <div class="grid gap-4 md:grid-cols-2">
        <div class="grid gap-4">
          <div class="grid gap-2">
            <span class="text-sm font-medium text-highlighted">Dictation mode</span>
            <UTabs
              :model-value="mode"
              :items="[
                { label: 'Letters', value: 'characters' },
                { label: 'Sentences', value: 'sentences' }
              ]"
              variant="pill"
              :content="false"
              @update:model-value="emit('update:mode', $event as DictationMode)"
            />
          </div>

          <div class="grid gap-3">
            <div class="grid gap-1.5">
              <span class="text-sm font-medium text-highlighted">Language</span>
              <USelect
                :model-value="selectedLanguage"
                :items="languages"
                placeholder="All languages"
                @update:model-value="selectedLanguage = $event"
              />
            </div>
            <div class="grid gap-1.5">
              <span class="text-sm font-medium text-highlighted">Voice</span>
              <USelect
                :model-value="selectedVoice"
                :items="filteredVoices.map(v => ({ label: v.name, value: v.voiceURI }))"
                placeholder="Select a voice"
                @update:model-value="emit('update:selectedVoice', $event)"
              />
            </div>
          </div>
        </div>

        <div class="flex flex-col gap-4">
          <div>
            <div class="flex items-center justify-between gap-3">
              <span class="text-sm font-medium text-highlighted">Dictation speed</span>
              <span class="text-sm text-muted">{{ rate.toFixed(1) }}x</span>
            </div>
            <USlider
              :model-value="rate"
              :min="0.5"
              :max="2"
              :step="0.1"
              class="mt-1.5"
              @update:model-value="emit('update:rate', $event ?? 1)"
            />
          </div>

          <div>
            <span class="block text-sm font-medium text-highlighted">Repeat count</span>
            <UInputNumber
              :model-value="repeatCount"
              :min="1"
              :max="25"
              :disabled="loopPlayback"
              class="mt-1.5"
              @update:model-value="emit('update:repeatCount', $event ?? 1)"
            />
          </div>
        </div>
      </div>

      <UCheckbox
        :model-value="loopPlayback"
        label="Loop continuously until you stop playback"
        @update:model-value="emit('update:loopPlayback', $event === true)"
      />

      <div class="flex flex-wrap gap-3">
        <UButton icon="i-lucide-play" size="lg" :disabled="!canStart" @click="emit('start')">
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
        <UButton icon="i-lucide-eraser" color="error" variant="outline" @click="emit('clear')">
          Clear
        </UButton>
      </div>
    </div>
  </div>
</template>
