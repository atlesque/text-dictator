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
const settingsOpen = ref(false)

const playButtonLabel = computed(() => {
  if (props.isPlaying) return 'Stop dictation'
  return props.currentIndex === null ? 'Start dictation' : 'Resume dictation'
})

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
  <div class="glass-panel @container min-w-0 p-4 sm:p-6">
    <div class="grid min-w-0 gap-5">
      <div class="grid min-w-0 gap-2.5">
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

      <!-- On phones the settings move into a bottom sheet behind the settings button -->
      <DictationSettings
        class="hidden md:block"
        :mode="mode"
        :rate="rate"
        :repeat-count="repeatCount"
        :loop-playback="loopPlayback"
        :languages="languages"
        :selected-language="selectedLanguage"
        :voices="filteredVoices"
        :selected-voice="selectedVoice"
        @update:mode="emit('update:mode', $event)"
        @update:rate="emit('update:rate', $event)"
        @update:repeat-count="emit('update:repeatCount', $event)"
        @update:loop-playback="emit('update:loopPlayback', $event)"
        @update:selected-language="selectedLanguage = $event"
        @update:selected-voice="emit('update:selectedVoice', $event)"
      />

      <div class="flex items-center gap-3 border-t border-default pt-5">
        <!-- One button that toggles between starting and stopping playback -->
        <UButton
          :icon="isPlaying ? 'i-lucide-square' : 'i-lucide-play'"
          size="xl"
          class="gradient-action flex-1 justify-center rounded-full px-6 md:flex-none"
          :disabled="!isPlaying && !canStart"
          @click="isPlaying ? emit('stop') : emit('start')"
        >
          {{ playButtonLabel }}
        </UButton>

        <UButton
          icon="i-lucide-settings-2"
          color="neutral"
          variant="soft"
          size="xl"
          class="rounded-full md:hidden"
          aria-label="Settings"
          @click="settingsOpen = true"
        />

        <div class="hidden gap-2 md:flex">
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

    <UDrawer
      v-model:open="settingsOpen"
      title="Settings"
      description="Choose how your text is dictated."
      :ui="{ content: 'max-h-[90dvh] bg-default/85 backdrop-blur-2xl md:hidden', body: 'overflow-y-auto pb-8' }"
    >
      <template #body>
        <div class="grid gap-5">
          <DictationSettings
            :mode="mode"
            :rate="rate"
            :repeat-count="repeatCount"
            :loop-playback="loopPlayback"
            :languages="languages"
            :selected-language="selectedLanguage"
            :voices="filteredVoices"
            :selected-voice="selectedVoice"
            @update:mode="emit('update:mode', $event)"
            @update:rate="emit('update:rate', $event)"
            @update:repeat-count="emit('update:repeatCount', $event)"
            @update:loop-playback="emit('update:loopPlayback', $event)"
            @update:selected-language="selectedLanguage = $event"
            @update:selected-voice="emit('update:selectedVoice', $event)"
          />

          <div class="grid grid-cols-2 gap-3 border-t border-default pt-5">
            <UButton
              icon="i-lucide-rotate-ccw"
              color="neutral"
              variant="soft"
              size="lg"
              class="justify-center rounded-full"
              @click="emit('reset')"
            >
              Reset
            </UButton>
            <UButton
              icon="i-lucide-eraser"
              color="error"
              variant="soft"
              size="lg"
              class="justify-center rounded-full"
              @click="emit('clear')"
            >
              Clear text
            </UButton>
          </div>
        </div>
      </template>
    </UDrawer>
  </div>
</template>
