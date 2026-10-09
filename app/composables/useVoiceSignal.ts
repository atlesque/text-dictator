// app/composables/useVoiceSignal.ts

// Browsers do not expose the audio of speech synthesis, so the visualizer
// cannot run a real FFT on it. Instead this models a speech-like signal from
// the text being spoken, the way text-driven lip sync does:
//
// 1. The text is split into rough phonemes (with common English digraphs and
//    spelled-out letter and digit names), each with a spectral profile over
//    seven bands (voicing, two first-formant bands, two second-formant bands,
//    frication and sibilance) and a typical duration.
// 2. A playhead walks that timeline at the speaking rate. Word boundary events
//    from the engine re-sync it, adapt its tempo to the voice's real pace and
//    hold each word's onset until the engine reaches it.
// 3. Within a phoneme the level follows its articulation: stops close to
//    near-silence and then burst, and vowels glide into the next sound.
// 4. Each band runs through an envelope follower (fast attack, short release,
//    as in a peak meter) and then a lightly underdamped spring, which keeps
//    onsets quick but lets the motion overshoot a touch so it feels alive.
// 5. Onsets are measured as positive spectral flux of the target, giving a
//    transient pulse that the visualizer uses for sharp kicks.

export const BAND_COUNT = 7

type Profile = readonly [number, number, number, number, number, number, number]
type Kind = 'vowel' | 'sonorant' | 'stop' | 'fricative' | 'gap'

const SILENCE: Profile = [0, 0, 0, 0, 0, 0, 0]
const VOWEL_A: Profile = [0.85, 0.75, 1, 0.65, 0.3, 0.1, 0.04]
const VOWEL_BACK: Profile = [0.95, 1, 0.6, 0.32, 0.16, 0.05, 0.02]
const VOWEL_FRONT: Profile = [0.8, 0.7, 0.38, 0.72, 0.95, 0.3, 0.08]
const VOWEL_MID: Profile = [0.85, 0.8, 0.75, 0.6, 0.5, 0.15, 0.05]
const NASAL: Profile = [1, 0.68, 0.24, 0.14, 0.12, 0.04, 0.02]
const LIQUID: Profile = [0.85, 0.85, 0.55, 0.48, 0.28, 0.07, 0.02]
const VOICED_STOP: Profile = [0.55, 0.5, 0.48, 0.52, 0.45, 0.32, 0.18]
const VOICELESS_STOP: Profile = [0.12, 0.18, 0.32, 0.5, 0.62, 0.66, 0.5]
const BREATH: Profile = [0.15, 0.26, 0.4, 0.48, 0.42, 0.3, 0.18]
const SOFT_FRICATIVE: Profile = [0.08, 0.1, 0.16, 0.3, 0.45, 0.62, 0.55]
const VOICED_FRICATIVE: Profile = [0.6, 0.4, 0.22, 0.32, 0.45, 0.55, 0.45]
const SIBILANT: Profile = [0.06, 0.08, 0.12, 0.26, 0.5, 0.92, 1]
const VOICED_SIBILANT: Profile = [0.55, 0.32, 0.16, 0.26, 0.5, 0.85, 0.85]
const POSTALVEOLAR: Profile = [0.08, 0.12, 0.22, 0.55, 0.96, 0.82, 0.5]

interface Sound {
  profile: Profile
  kind: Kind
  duration: number
}

const sound = (profile: Profile, kind: Kind, duration: number): Sound => ({ profile, kind, duration })

const GRAPHEMES: Record<string, Sound> = {
  a: sound(VOWEL_A, 'vowel', 0.1),
  e: sound(VOWEL_FRONT, 'vowel', 0.085),
  i: sound(VOWEL_FRONT, 'vowel', 0.08),
  y: sound(VOWEL_FRONT, 'vowel', 0.08),
  o: sound(VOWEL_BACK, 'vowel', 0.1),
  u: sound(VOWEL_BACK, 'vowel', 0.09),
  m: sound(NASAL, 'sonorant', 0.07),
  n: sound(NASAL, 'sonorant', 0.06),
  ng: sound(NASAL, 'sonorant', 0.08),
  l: sound(LIQUID, 'sonorant', 0.065),
  r: sound(LIQUID, 'sonorant', 0.065),
  w: sound(LIQUID, 'sonorant', 0.06),
  wh: sound(LIQUID, 'sonorant', 0.06),
  b: sound(VOICED_STOP, 'stop', 0.065),
  d: sound(VOICED_STOP, 'stop', 0.06),
  g: sound(VOICED_STOP, 'stop', 0.065),
  p: sound(VOICELESS_STOP, 'stop', 0.075),
  t: sound(VOICELESS_STOP, 'stop', 0.07),
  k: sound(VOICELESS_STOP, 'stop', 0.075),
  ck: sound(VOICELESS_STOP, 'stop', 0.075),
  q: sound(VOICELESS_STOP, 'stop', 0.075),
  c: sound(VOICELESS_STOP, 'stop', 0.075),
  h: sound(BREATH, 'fricative', 0.05),
  f: sound(SOFT_FRICATIVE, 'fricative', 0.09),
  ph: sound(SOFT_FRICATIVE, 'fricative', 0.09),
  th: sound(SOFT_FRICATIVE, 'fricative', 0.08),
  v: sound(VOICED_FRICATIVE, 'fricative', 0.07),
  s: sound(SIBILANT, 'fricative', 0.1),
  z: sound(VOICED_SIBILANT, 'fricative', 0.085),
  x: sound(SIBILANT, 'fricative', 0.12),
  sh: sound(POSTALVEOLAR, 'fricative', 0.11),
  ch: sound(POSTALVEOLAR, 'fricative', 0.1),
  j: sound(POSTALVEOLAR, 'fricative', 0.085),
  gh: sound(BREATH, 'fricative', 0.03)
}

// Vowel pairs read as one longer vowel that glides between two qualities
const VOWEL_PAIRS: Record<string, [Profile, Profile]> = {
  ee: [VOWEL_FRONT, VOWEL_FRONT],
  ea: [VOWEL_FRONT, VOWEL_FRONT],
  ie: [VOWEL_FRONT, VOWEL_FRONT],
  ei: [VOWEL_MID, VOWEL_FRONT],
  ai: [VOWEL_MID, VOWEL_FRONT],
  ay: [VOWEL_MID, VOWEL_FRONT],
  oo: [VOWEL_BACK, VOWEL_BACK],
  ou: [VOWEL_A, VOWEL_BACK],
  ow: [VOWEL_A, VOWEL_BACK],
  oa: [VOWEL_BACK, VOWEL_BACK],
  oi: [VOWEL_BACK, VOWEL_FRONT],
  oy: [VOWEL_BACK, VOWEL_FRONT],
  au: [VOWEL_BACK, VOWEL_BACK],
  aw: [VOWEL_BACK, VOWEL_BACK]
}

// Single letters are spoken by name, so model the name rather than the letter
const LETTER_NAMES: Record<string, string> = {
  a: 'ay', b: 'bee', c: 'see', d: 'dee', e: 'ee', f: 'ef', g: 'jee', h: 'aych',
  i: 'ay ee', j: 'jay', k: 'kay', l: 'el', m: 'em', n: 'en', o: 'oh', p: 'pee',
  q: 'kyoo', r: 'ar', s: 'es', t: 'tee', u: 'yoo', v: 'vee', w: 'dubel yoo',
  x: 'eks', y: 'way', z: 'zee'
}

const DIGIT_NAMES = ['zeero', 'won', 'too', 'three', 'for', 'fayv', 'siks', 'seven', 'ayt', 'nayn']

interface Unit {
  profile: Profile
  glideTo: Profile | null
  kind: Kind
  start: number
  duration: number
  gain: number
  charIndex: number
}

function hash(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}

export function tokenize(text: string): Unit[] {
  const units: Unit[] = []
  let time = 0
  let word = 0

  const push = (profile: Profile, kind: Kind, duration: number, charIndex: number, glideTo: Profile | null = null) => {
    // Each word gets its own stress so a sentence does not pulse evenly
    const stress = kind === 'gap' ? 1 : 0.82 + 0.3 * hash(word * 7.13 + units.length * 0.37)
    units.push({ profile, glideTo, kind, start: time, duration, gain: stress, charIndex })
    time += duration
  }

  const pushWord = (spelling: string, charIndex: number) => {
    for (let k = 0; k < spelling.length; ) {
      const pair = spelling.slice(k, k + 2)
      const vowelPair = VOWEL_PAIRS[pair]
      if (vowelPair) {
        push(vowelPair[0], 'vowel', 0.14, charIndex, vowelPair[1])
        k += 2
        continue
      }
      const digraph = pair.length === 2 ? GRAPHEMES[pair] : undefined
      if (digraph) {
        push(digraph.profile, digraph.kind, digraph.duration, charIndex)
        k += 2
        continue
      }
      const c = spelling[k] ?? ''
      // Doubled consonants are one sound
      if (c === spelling[k - 1] && !'aeiou'.includes(c)) {
        k++
        continue
      }
      const single = GRAPHEMES[c]
      if (single) {
        // A silent final e barely sounds
        const silentE = c === 'e' && k === spelling.length - 1 && k > 1
        push(single.profile, single.kind, silentE ? 0.03 : single.duration, charIndex)
      } else if (c === ' ') {
        push(SILENCE, 'gap', 0.03, charIndex)
      }
      k++
    }
  }

  const trimmed = text.trim().toLowerCase()
  if (trimmed.length === 1 && LETTER_NAMES[trimmed]) {
    pushWord(LETTER_NAMES[trimmed] ?? '', 0)
    return units
  }

  let index = 0
  while (index < text.length) {
    const character = text[index] ?? ''

    if (/\s/u.test(character)) {
      push(SILENCE, 'gap', 0.045, index)
      word++
      index++
    } else if (/[,;:]/u.test(character)) {
      push(SILENCE, 'gap', 0.2, index)
      index++
    } else if (/[.!?]/u.test(character)) {
      push(SILENCE, 'gap', 0.32, index)
      index++
    } else if (/\d/u.test(character)) {
      pushWord(DIGIT_NAMES[Number(character)] ?? '', index)
      push(SILENCE, 'gap', 0.03, index)
      index++
    } else if (/\p{L}/u.test(character)) {
      // Read the whole word at once so digraphs can span letters
      let end = index
      while (end < text.length && /[\p{L}']/u.test(text[end] ?? '')) end++
      const spelling = text.slice(index, end).toLowerCase().normalize('NFD').replace(/[^a-z]/gu, '')
      const before = units.length
      pushWord(spelling, index)
      // Letters outside a-z (other scripts) still need to sound like something
      if (units.length === before) {
        for (let k = index; k < end; k++) {
          const quality = hash(k) > 0.5 ? VOWEL_MID : NASAL
          push(quality, 'vowel', 0.09, k)
        }
      }
      for (let k = before; k < units.length; k++) {
        const unit = units[k]
        if (unit) unit.charIndex = index
      }
      index = end
    } else {
      push(SILENCE, 'gap', 0.04, index)
      index++
    }
  }

  // Phrases fall in loudness toward their end
  let phraseStart = 0
  for (let k = 0; k <= units.length; k++) {
    const unit = units[k]
    if (!unit || (unit.kind === 'gap' && unit.duration > 0.15)) {
      const count = k - phraseStart
      for (let m = phraseStart; m < k; m++) {
        const u = units[m]
        if (u) u.gain *= 1 - 0.22 * ((m - phraseStart) / Math.max(1, count - 1))
      }
      phraseStart = k + 1
    }
  }

  return units
}

export interface VoiceSignalInput {
  text: string
  isSpeaking: boolean
  hasStarted: boolean
  rate: number
  boundaryIndex: number
}

const ATTACK = 0.008
const RELEASE = 0.055
const SPRING_OMEGA = 40
const SPRING_DAMPING = 0.62
const TRANSIENT_DECAY = 0.075
// Without an onstart event, assume the voice has begun after this long
const START_FALLBACK = 0.35
// How long a word onset waits for the engine's boundary before moving on
const ONSET_HOLD = 0.3

export function createVoiceSignal() {
  const target = new Float32Array(BAND_COUNT)
  const previousTarget = new Float32Array(BAND_COUNT)
  const envelope = new Float32Array(BAND_COUNT)
  const position = new Float32Array(BAND_COUNT)
  const velocity = new Float32Array(BAND_COUNT)
  const bands = new Float32Array(BAND_COUNT)
  let amplitude = 0
  let amplitudeVelocity = 0
  let transient = 0

  let text = ''
  let units: Unit[] = []
  let playhead = 0
  let tempo = 1
  let lastBoundary = 0
  let lastBoundaryTime = 0
  let lastBoundaryWall = -1
  let seenBoundary = false
  let speakingFor = 0
  let held = 0
  let lastUnit = -1
  let tail = 0
  let time = 0

  function reset() {
    playhead = 0
    lastBoundary = 0
    lastBoundaryTime = 0
    lastBoundaryWall = -1
    seenBoundary = false
    speakingFor = 0
    held = 0
    lastUnit = -1
    tail = 0
  }

  function unitAt(t: number): number {
    // Units are few and sorted, a linear scan from the last hit is enough
    let k = Math.max(0, lastUnit)
    if ((units[k]?.start ?? 0) > t) k = 0
    while (k < units.length - 1 && (units[k + 1]?.start ?? Infinity) <= t) k++
    return k
  }

  function wordStartAfter(t: number): number | null {
    for (let k = 1; k < units.length; k++) {
      const unit = units[k]
      if (unit && unit.start > t + 1e-6 && unit.kind !== 'gap' && units[k - 1]?.kind === 'gap') return unit.start
    }
    return null
  }

  function onBoundary(charIndex: number) {
    const unit = units.find(u => u.charIndex >= charIndex && u.kind !== 'gap')
    if (!unit) return
    const now = time
    if (lastBoundaryWall >= 0 && unit.start > lastBoundaryTime) {
      // Learn how fast this voice really speaks compared to the model
      const wall = now - lastBoundaryWall
      const implied = (unit.start - lastBoundaryTime) / Math.max(wall, 0.01)
      if (implied > 0.4 && implied < 2.5) tempo += (implied - tempo) * 0.5
    }
    lastBoundaryTime = unit.start
    lastBoundaryWall = now
    seenBoundary = true
    held = 0
    playhead = unit.start
  }

  function update(input: VoiceSignalInput, dt: number) {
    time += dt

    if (input.text !== text) {
      text = input.text
      units = tokenize(text)
      reset()
    }

    if (!input.isSpeaking) {
      speakingFor = 0
      if (playhead > 0 || lastUnit >= 0) reset()
    } else {
      speakingFor += dt
    }

    if (input.boundaryIndex !== lastBoundary) {
      lastBoundary = input.boundaryIndex
      if (input.isSpeaking) onBoundary(input.boundaryIndex)
    }

    previousTarget.set(target)
    target.fill(0)
    const voiceOn = input.isSpeaking && (input.hasStarted || speakingFor > START_FALLBACK) && units.length > 0
    const total = units.length ? (units[units.length - 1]?.start ?? 0) + (units[units.length - 1]?.duration ?? 0) : 0

    if (voiceOn) {
      const rate = Math.max(input.rate, 0.1)
      let next = playhead + dt * rate * tempo

      // Once the engine reports boundaries, hold each word onset until it
      // arrives so onsets land on the real ones
      if (seenBoundary) {
        const onset = wordStartAfter(lastBoundaryTime)
        if (onset !== null && next >= onset) {
          held += dt
          if (held < ONSET_HOLD) next = Math.min(next, onset - 1e-4)
        }
      }
      playhead = Math.max(playhead, next)

      if (playhead < total) {
        tail = 0
        const k = unitAt(playhead)
        const unit = units[k]
        if (unit) {
          lastUnit = k
          const phase = Math.min(1, (playhead - unit.start) / unit.duration)
          let level = unit.gain
          const from = unit.profile
          let to: Profile | null = unit.glideTo

          if (unit.kind === 'stop') {
            // Closure, then a burst that fades into the next sound
            if (phase < 0.5) {
              level *= unit.profile[0] > 0.3 ? 0.22 : 0.05
            } else {
              level *= 1.15 * Math.exp(-(phase - 0.5) * 3)
            }
          } else if (unit.kind === 'gap') {
            level = 0
          } else if (unit.kind === 'vowel' || unit.kind === 'sonorant') {
            // Coarticulate: glide toward whatever voiced sound comes next
            const following = units[k + 1]
            if (!to && following && following.kind !== 'gap') to = following.profile
          }

          const blend = to ? Math.max(0, (phase - 0.55) / 0.45) * (unit.glideTo ? 1 : 0.4) : 0
          for (let i = 0; i < BAND_COUNT; i++) {
            const a = from[i] ?? 0
            const b = to ? (to[i] ?? 0) : a
            target[i] = (a + (b - a) * blend) * level
          }
        }
      } else {
        // The engine is still talking after the modeled walk ran out:
        // sustain a soft voiced murmur that slowly fades
        tail += dt
        const fade = 0.55 * Math.exp(-tail / 0.6)
        for (let i = 0; i < BAND_COUNT; i++) target[i] = (VOWEL_MID[i] ?? 0) * fade
      }

      // Micro variation so even a held vowel breathes, per band
      for (let i = 0; i < BAND_COUNT; i++) {
        const shimmer = 1 + 0.07 * Math.sin(time * (5.3 + i * 1.37) + i * 2.1) * Math.sin(time * (2.1 + i * 0.6))
        target[i] = (target[i] ?? 0) * shimmer
      }
    }

    // Spectral flux of the target marks onsets the instant they happen
    let flux = 0
    for (let i = 0; i < BAND_COUNT; i++) {
      flux += Math.max(0, (target[i] ?? 0) - (previousTarget[i] ?? 0)) * (i >= 4 ? 1.3 : 1)
    }
    transient *= Math.exp(-dt / TRANSIENT_DECAY)
    // Small changes between neighbouring sounds are not onsets
    transient = Math.max(transient, Math.min(1, Math.max(0, flux - 0.3) / 1.4))

    // Envelope follower then spring, per band
    const attack = 1 - Math.exp(-dt / ATTACK)
    const release = 1 - Math.exp(-dt / RELEASE)
    let loudness = 0
    for (let i = 0; i < BAND_COUNT; i++) {
      const goal = target[i] ?? 0
      const current = envelope[i] ?? 0
      envelope[i] = current + (goal - current) * (goal > current ? attack : release)
      loudness += (envelope[i] ?? 0) * (i < 4 ? 1.15 : 0.75)
    }
    loudness = Math.min(1, loudness / 4.2)

    // Integrate the springs in small steps so large frame gaps stay stable
    const steps = Math.max(1, Math.ceil(dt * 240))
    const h = dt / steps
    for (let s = 0; s < steps; s++) {
      for (let i = 0; i < BAND_COUNT; i++) {
        const x = position[i] ?? 0
        const v = velocity[i] ?? 0
        const accel = SPRING_OMEGA * SPRING_OMEGA * ((envelope[i] ?? 0) - x) - 2 * SPRING_DAMPING * SPRING_OMEGA * v
        velocity[i] = v + accel * h
        position[i] = x + (velocity[i] ?? 0) * h
      }
      const accel = 30 * 30 * (loudness - amplitude) - 2 * 0.72 * 30 * amplitudeVelocity
      amplitudeVelocity += accel * h
      amplitude += amplitudeVelocity * h
    }

    for (let i = 0; i < BAND_COUNT; i++) bands[i] = Math.max(0, Math.min(1.2, position[i] ?? 0))

    return { bands, amplitude: Math.max(0, Math.min(1.1, amplitude)), transient }
  }

  return { update }
}
