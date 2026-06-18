// app/composables/useDictation.ts
import { computed, ref, watch } from 'vue'
import { useSpeechSynthesis } from './useSpeechSynthesis'

export type DictationMode = 'characters' | 'sentences'

export interface Segment {
  display: string
  speech: string
  start: number
  end: number
}

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

function computeSegments(text: string, mode: DictationMode): Segment[] {
  if (!text) {
    return []
  }

  if (mode === 'characters') {
    const items: Segment[] = []
    let start = 0

    for (const character of text) {
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

  for (let index = 0; index < text.length; index++) {
    const character = text[index] || ''
    const isSentenceEnd = '.!?'.includes(character)
    const isLastCharacter = index === text.length - 1

    if (!isSentenceEnd && !isLastCharacter) {
      continue
    }

    let end = index + 1

    while (end < text.length) {
      const whitespaceCharacter = text[end]

      if (!whitespaceCharacter || !/\s/u.test(whitespaceCharacter)) {
        break
      }

      end++
    }

    const value = text.slice(start, end)

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

  if (!items.length && text.trim()) {
    items.push({
      display: text,
      speech: text.trim(),
      start: 0,
      end: text.length
    })
  }

  return items
}

export function useDictation() {
  const speech = useSpeechSynthesis()

  const sampleText = 'Agent 47 arrives at Gate B12. Boarding starts in 15 minutes!'

  const text = ref(sampleText)
  const mode = ref<DictationMode>('characters')

  const _rate = ref(1)
  const rate = computed({
    get: () => _rate.value,
    set: (value) => { _rate.value = Math.min(Math.max(value || 0.5, 0.5), 2) }
  })

  const _repeatCount = ref(1)
  const repeatCount = computed({
    get: () => _repeatCount.value,
    set: (value) => { _repeatCount.value = Math.min(Math.max(Math.round(value || 1), 1), 25) }
  })

  const loopPlayback = ref(false)
  const selectedVoice = ref('')
  const currentIndex = ref<number | null>(null)
  const completedCycles = ref(0)
  const isPlaying = ref(false)

  let playbackToken = 0

  const segments = computed(() => computeSegments(text.value, mode.value))

  const canStart = computed(() => segments.value.length > 0 && !isPlaying.value)

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

  function resetPlayback() {
    playbackToken++
    isPlaying.value = false
    completedCycles.value = 0
    currentIndex.value = null
    speech.cancel()
  }

  function stopPlayback() {
    playbackToken++
    isPlaying.value = false
    speech.cancel()
  }

  async function speakSegment(index: number, token: number) {
    if (token !== playbackToken) {
      return
    }

    const segment = segments.value[index]

    if (!segment) {
      resetPlayback()
      return
    }

    currentIndex.value = index

    try {
      await speech.speak(segment.speech, rate.value, selectedVoice.value || undefined)

      if (token !== playbackToken) {
        return
      }

      if (index < segments.value.length - 1) {
        await speakSegment(index + 1, token)
        return
      }

      completedCycles.value++

      if (loopPlayback.value || completedCycles.value < repeatCount.value) {
        await speakSegment(0, token)
        return
      }

      isPlaying.value = false
      currentIndex.value = null
    } catch {
      if (token !== playbackToken) {
        return
      }

      resetPlayback()
    }
  }

  function startPlayback() {
    if (!segments.value.length || isPlaying.value) {
      return
    }

    const shouldRestart = currentIndex.value === null || currentIndex.value >= segments.value.length
    const nextToken = playbackToken + 1
    playbackToken = nextToken
    isPlaying.value = true

    if (shouldRestart) {
      completedCycles.value = 0
    }

    speech.cancel()
    speakSegment(shouldRestart ? 0 : (currentIndex.value ?? 0), nextToken)
  }

  function clearInput() {
    resetPlayback()
    text.value = ''
  }

  // Set initial voice after voices load
  watch(() => speech.voices.value, (availableVoices) => {
    if (!availableVoices.length) {
      selectedVoice.value = ''
      return
    }

    const existingVoice = availableVoices.find(v => v.voiceURI === selectedVoice.value)

    if (existingVoice) {
      return
    }

    const fallbackVoice = availableVoices.find(v => v.default) || availableVoices[0]

    if (fallbackVoice) {
      selectedVoice.value = fallbackVoice.voiceURI
    }
  }, { immediate: true })

  watch([text, mode], () => {
    resetPlayback()
  })

  watch(loopPlayback, (enabled) => {
    if (enabled) {
      repeatCount.value = Math.max(repeatCount.value, 1)
    }
  })

  // Expose voices from speech synthesis for the template
  const voices = computed(() => speech.voices.value)

  return {
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
  }
}
