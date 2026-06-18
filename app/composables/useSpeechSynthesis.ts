// app/composables/useSpeechSynthesis.ts
import { onBeforeUnmount, onMounted, ref, type Ref } from 'vue'

export function useSpeechSynthesis(): {
  voices: Ref<SpeechSynthesisVoice[]>
  isSpeaking: Ref<boolean>
  loadVoices: () => void
  speak: (text: string, rate: number, voiceURI?: string) => Promise<void>
  cancel: () => void
} {
  const voices = ref<SpeechSynthesisVoice[]>([])
  const isSpeaking = ref(false)

  function loadVoices(): void {
    if (!import.meta.client) {
      return
    }

    const availableVoices = window.speechSynthesis
      .getVoices()
      .slice()
      .sort((first, second) => first.name.localeCompare(second.name))

    voices.value = availableVoices
  }

  function speak(text: string, rate: number, voiceURI?: string): Promise<void> {
    const clampedRate = Math.max(0.1, Math.min(10, rate))
    isSpeaking.value = true

    return new Promise((resolve, reject) => {
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = clampedRate

      if (voiceURI) {
        const voice = voices.value.find(v => v.voiceURI === voiceURI)

        if (voice) {
          utterance.voice = voice
        }
      }

      utterance.onend = () => {
        isSpeaking.value = false
        resolve()
      }

      utterance.onerror = (event) => {
        isSpeaking.value = false
        reject(new Error(`Speech synthesis error: ${event.error}`))
      }

      window.speechSynthesis.speak(utterance)
    })
  }

  function cancel(): void {
    isSpeaking.value = false
    window.speechSynthesis.cancel()
  }

  function onVoicesChanged(): void {
    loadVoices()
  }

  onMounted(() => {
    loadVoices()

    if (import.meta.client) {
      window.speechSynthesis.addEventListener('voiceschanged', onVoicesChanged)
    }
  })

  onBeforeUnmount(() => {
    cancel()

    if (import.meta.client) {
      window.speechSynthesis.removeEventListener('voiceschanged', onVoicesChanged)
    }
  })

  return {
    voices,
    isSpeaking,
    loadVoices,
    speak,
    cancel
  }
}
