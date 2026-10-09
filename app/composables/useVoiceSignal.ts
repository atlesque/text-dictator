// app/composables/useVoiceSignal.ts

// Browsers do not expose the audio of speech synthesis, so the visualizer
// cannot run a real FFT on it. Instead this models a speech-like signal from
// the text being spoken: each character is mapped to a rough spectral profile
// across five bands (low to high), walked at the speaking rate, re-synced to
// the engine's word boundaries and gated by whether the engine is speaking.

export const BAND_COUNT = 5

type Profile = readonly [number, number, number, number, number]

const SILENCE: Profile = [0, 0, 0, 0, 0]
const OPEN_VOWEL: Profile = [1, 0.85, 0.4, 0.15, 0.05]
const FRONT_VOWEL: Profile = [0.65, 0.8, 0.9, 0.4, 0.12]
const NASAL: Profile = [0.85, 0.6, 0.3, 0.12, 0.04]
const PLOSIVE: Profile = [0.6, 0.55, 0.55, 0.6, 0.45]
const FRICATIVE: Profile = [0.2, 0.3, 0.5, 0.75, 0.6]
const SIBILANT: Profile = [0.12, 0.18, 0.4, 0.85, 1]
const DIGIT: Profile = [0.8, 0.8, 0.6, 0.35, 0.2]

function profileFor(character: string): Profile {
  const c = character.toLowerCase()
  if ('aou'.includes(c)) return OPEN_VOWEL
  if ('eiy'.includes(c)) return FRONT_VOWEL
  if ('mnlrwj'.includes(c)) return NASAL
  if ('pbtdkgq'.includes(c)) return PLOSIVE
  if ('fvh'.includes(c)) return FRICATIVE
  if ('szcx'.includes(c)) return SIBILANT
  if (/\d/u.test(c)) return DIGIT
  if (/\p{L}/u.test(c)) return OPEN_VOWEL
  return SILENCE
}

function durationFor(character: string): number {
  if (/\s/u.test(character)) return 0.06
  if (/[.,!?;:]/u.test(character)) return 0.16
  if ('pbtdkgq'.includes(character.toLowerCase())) return 0.05
  return 0.085
}

export interface VoiceSignalInput {
  text: string
  isSpeaking: boolean
  rate: number
  boundaryIndex: number
}

export function createVoiceSignal() {
  // Two smoothing stages per band give an S-shaped ease in and out
  const raw = new Float32Array(BAND_COUNT)
  const eased = new Float32Array(BAND_COUNT)
  const bands = new Float32Array(BAND_COUNT)
  let amplitude = 0
  let amplitudeEased = 0

  let text = ''
  let cursor = 0
  let charTime = 0
  let lastBoundary = 0
  let held: Profile = SILENCE
  let time = 0

  function update(input: VoiceSignalInput, dt: number) {
    time += dt

    if (input.text !== text) {
      text = input.text
      cursor = 0
      charTime = 0
      lastBoundary = 0
      held = SILENCE
    }

    // Jump to the word the engine says it is on, so long sentences stay in sync
    if (input.boundaryIndex !== lastBoundary) {
      lastBoundary = input.boundaryIndex
      if (input.boundaryIndex > cursor) {
        cursor = input.boundaryIndex
        charTime = 0
      }
    }

    let target: Profile = SILENCE
    let gain = 0

    if (input.isSpeaking && text) {
      const rate = Math.max(input.rate, 0.1)
      if (cursor < text.length) {
        const character = text[cursor] ?? ''
        target = profileFor(character)
        if (target !== SILENCE) held = target
        charTime += dt * rate
        if (charTime >= durationFor(character)) {
          charTime = 0
          cursor++
        }
        gain = 1
      } else {
        // The engine is still talking after the text walk ran out (spelled
        // letters take longer than their one character): sustain the last sound
        target = held === SILENCE ? OPEN_VOWEL : held
        gain = 0.75
      }
      // Syllable-like flutter so a held sound still breathes
      gain *= 0.78 + 0.22 * Math.sin(time * 11) * Math.sin(time * 3.7 + 1)
    }

    let sum = 0
    for (let i = 0; i < BAND_COUNT; i++) {
      const goal = (target[i] ?? 0) * gain
      const current = raw[i] ?? 0
      const tau = goal > current ? 0.14 : 0.4
      raw[i] = current + (goal - current) * (1 - Math.exp(-dt / tau))
      eased[i] = (eased[i] ?? 0) + ((raw[i] ?? 0) - (eased[i] ?? 0)) * (1 - Math.exp(-dt / 0.18))
      bands[i] = eased[i] ?? 0
      sum += (bands[i] ?? 0) * (i < 3 ? 1.2 : 0.8)
    }

    const loudness = Math.min(1, sum / 3.2)
    const ampTau = loudness > amplitude ? 0.16 : 0.45
    amplitude += (loudness - amplitude) * (1 - Math.exp(-dt / ampTau))
    amplitudeEased += (amplitude - amplitudeEased) * (1 - Math.exp(-dt / 0.2))

    return { bands, amplitude: amplitudeEased }
  }

  return { update }
}
