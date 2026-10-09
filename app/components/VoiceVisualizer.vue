<!-- app/components/VoiceVisualizer.vue -->
<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { BAND_COUNT, createVoiceSignal } from '~/composables/useVoiceSignal'

const props = defineProps<{
  isPlaying: boolean
  isSpeaking: boolean
  speechText: string
  spokenCharIndex: number
  rate: number
}>()

const canvas = ref<HTMLCanvasElement>()
const webglFailed = ref(false)
const colorMode = useColorMode()

const vertexSource = `
attribute vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`

// Iridescent light bar. Each of the five strands is one frequency band (low
// bands are long slow waves, high bands are fine fast ripples) and its height
// follows that band's energy. Overall amplitude widens the bar outward from
// the center and grows the orb behind it.
const fragmentSource = `
precision highp float;

#define BANDS ${BAND_COUNT}

uniform vec2 uResolution;
uniform float uTime;
uniform float uBands[BANDS];
uniform float uAmplitude;
uniform float uReach;
uniform float uLight;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

vec3 spectrum(float t) {
  t = clamp(t, 0.0, 1.0);
  vec3 c = mix(vec3(1.0, 0.82, 0.32), vec3(0.45, 1.0, 0.55), smoothstep(0.0, 0.18, t));
  c = mix(c, vec3(0.22, 0.42, 1.0), smoothstep(0.18, 0.38, t));
  c = mix(c, vec3(0.9, 0.3, 1.0), smoothstep(0.38, 0.55, t));
  c = mix(c, vec3(0.25, 0.65, 1.0), smoothstep(0.55, 0.75, t));
  return mix(c, vec3(0.2, 1.0, 0.75), smoothstep(0.75, 1.0, t));
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution) / uResolution.y;
  float halfWidth = 0.5 * uResolution.x / uResolution.y;
  float xn = uv.x / halfWidth;
  float edgeFade = smoothstep(1.0, 0.72, abs(xn));
  float paletteX = xn * 0.5 + 0.5;

  // Energy spreads outward from the center as the voice gets louder
  float spread = 0.16 + 0.5 * uAmplitude;
  float envelope = exp(-(xn * xn) / (spread * spread));

  vec3 color = vec3(0.0);

  // Thin resting line that spans the full width
  float ay = abs(uv.y);
  color += spectrum(paletteX) * (exp(-ay / 0.0016) * 0.55 + exp(-ay / 0.02) * 0.08) * edgeFade;

  // Orb at the center, larger and brighter with amplitude
  vec2 orbUv = uv * vec2(0.85, 1.0);
  float orbRadius = 0.025 + 0.17 * uAmplitude;
  float orbDist = length(orbUv);
  float orb = exp(-max(orbDist - orbRadius, 0.0) / (0.03 + 0.06 * uAmplitude));
  float orbFill = smoothstep(orbRadius, 0.0, orbDist);
  color += spectrum(0.45 + 0.1 * sin(uTime * 0.3)) * (orb * (0.06 + 0.3 * uAmplitude) + orbFill * 0.12 * uAmplitude);

  // Strands and sparkles only live near the band, so skip the work elsewhere
  if (ay < uReach) {
    float leading = 0.0;
    for (int i = 0; i < BANDS; i++) {
      float fi = float(i);
      float energy = uBands[i];
      float amp = (0.008 + 0.22 * energy) * envelope;
      float frequency = 2.4 + fi * 1.7;
      float phase = uTime * (0.7 + 0.45 * fi) + fi * 1.9;
      float y = amp * sin(xn * frequency + phase) * (0.75 + 0.25 * sin(uTime * 0.6 + fi * 2.3));
      if (i == 0) leading = y;

      float d = abs(uv.y - y);
      float thickness = 0.0016 + 0.0045 * energy * envelope;
      float core = exp(-d / thickness);
      float halo = 0.12 * exp(-d / 0.035) * envelope * (0.25 + energy);
      color += spectrum(paletteX + (fi - 2.0) * 0.06) * (core * 0.75 + halo) * edgeFade;
    }

    // Filled ribbon under the low band
    float ribbon = uv.y / (leading + sign(leading) * 0.0001);
    if (ribbon > 0.0 && ribbon < 1.0) {
      color += spectrum(paletteX - 0.05) * 0.32 * ribbon * ribbon * envelope * edgeFade;
    }

    // Sparkles follow the high bands, so sibilants fizz
    vec2 grid = uv * 170.0;
    vec2 cell = floor(grid);
    float h = hash(cell);
    float drift = hash(cell + 17.0);
    vec2 local = fract(grid) - 0.5 - 0.3 * vec2(sin(uTime + drift * 6.28), cos(uTime * 1.3 + h * 6.28));
    float speck = smoothstep(0.22, 0.0, length(local));
    float bandHeight = (0.01 + 0.24 * uAmplitude) * envelope;
    float band = exp(-pow(uv.y / (bandHeight * 1.6 + 0.01), 2.0));
    float twinkle = 0.5 + 0.5 * sin(uTime * (3.0 + drift * 5.0) + h * 40.0);
    float fizz = 0.25 + uBands[3] + uBands[4];
    color += spectrum(paletteX + (drift - 0.5) * 0.3) * step(0.93, h) * speck * band * twinkle * fizz * edgeFade;
  }

  color = 1.0 - exp(-color * 1.5);
  float alpha = clamp(max(color.r, max(color.g, color.b)), 0.0, 1.0);

  // On light backgrounds additive white cores vanish, so keep the hue and
  // let alpha carry the intensity instead.
  vec3 hue = color / (alpha + 0.0001);
  float lightAlpha = pow(alpha, 0.75);
  vec3 lightColor = hue * mix(0.5, 0.8, 1.0 - alpha * 0.5) * lightAlpha;
  gl_FragColor = vec4(mix(color, lightColor, uLight), mix(alpha, lightAlpha, uLight));
}
`

const signal = createVoiceSignal()

let gl: WebGLRenderingContext | null = null
let frame = 0
let lastTime = 0
let elapsed = 0
let visible = true
let resizeObserver: ResizeObserver | undefined
let intersectionObserver: IntersectionObserver | undefined
const uniforms: Record<string, WebGLUniformLocation | null> = {}

const prefersReducedMotion = import.meta.client
  ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
  : false

function compile(context: WebGLRenderingContext, type: number, source: string) {
  const shader = context.createShader(type)
  if (!shader) return null
  context.shaderSource(shader, source)
  context.compileShader(shader)
  if (!context.getShaderParameter(shader, context.COMPILE_STATUS)) {
    console.error(context.getShaderInfoLog(shader))
    context.deleteShader(shader)
    return null
  }
  return shader
}

function setup(): boolean {
  const element = canvas.value
  if (!element) return false

  gl = element.getContext('webgl', { premultipliedAlpha: true, antialias: false })
  if (!gl) return false

  const vertex = compile(gl, gl.VERTEX_SHADER, vertexSource)
  const fragment = compile(gl, gl.FRAGMENT_SHADER, fragmentSource)
  if (!vertex || !fragment) return false

  const program = gl.createProgram()
  if (!program) return false
  gl.attachShader(program, vertex)
  gl.attachShader(program, fragment)
  gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return false
  gl.useProgram(program)

  const buffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
  const position = gl.getAttribLocation(program, 'aPosition')
  gl.enableVertexAttribArray(position)
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)
  gl.clearColor(0, 0, 0, 0)

  for (const name of ['uResolution', 'uTime', 'uBands', 'uAmplitude', 'uReach', 'uLight']) {
    uniforms[name] = gl.getUniformLocation(program, name)
  }

  return true
}

function resize() {
  const element = canvas.value
  if (!element || !gl) return
  // The glow is soft, so rendering above 1.5x density costs fill rate for no visible gain
  const ratio = Math.min(window.devicePixelRatio || 1, 1.5)
  element.width = Math.max(1, Math.round(element.clientWidth * ratio))
  element.height = Math.max(1, Math.round(element.clientHeight * ratio))
  gl.viewport(0, 0, element.width, element.height)
  gl.uniform2f(uniforms.uResolution!, element.width, element.height)
}

function render(now: number) {
  frame = requestAnimationFrame(render)
  if (!gl || !visible) {
    lastTime = now
    return
  }

  const dt = Math.min((now - (lastTime || now)) / 1000, 0.1)
  lastTime = now

  const { bands, amplitude } = signal.update(
    {
      text: props.speechText,
      isSpeaking: props.isSpeaking && props.isPlaying,
      rate: props.rate,
      boundaryIndex: props.spokenCharIndex
    },
    dt
  )

  const speed = prefersReducedMotion ? 0.25 : 0.55 + amplitude * 1.4
  elapsed += dt * speed

  let loudestBand = 0
  for (const value of bands) loudestBand = Math.max(loudestBand, value)
  const reach = Math.max(0.008 + 0.22 * loudestBand, 0.01 + 0.24 * amplitude) * 1.6 + 0.08

  gl.clear(gl.COLOR_BUFFER_BIT)
  gl.uniform1f(uniforms.uTime!, elapsed)
  gl.uniform1fv(uniforms.uBands!, bands)
  gl.uniform1f(uniforms.uAmplitude!, amplitude)
  gl.uniform1f(uniforms.uReach!, reach)
  gl.uniform1f(uniforms.uLight!, colorMode.value === 'dark' ? 0 : 1)
  gl.drawArrays(gl.TRIANGLES, 0, 3)
}

onMounted(() => {
  if (!setup()) {
    webglFailed.value = true
    return
  }
  resize()
  resizeObserver = new ResizeObserver(resize)
  intersectionObserver = new IntersectionObserver(([entry]) => {
    visible = entry?.isIntersecting ?? true
  })
  if (canvas.value) {
    resizeObserver.observe(canvas.value)
    intersectionObserver.observe(canvas.value)
  }
  frame = requestAnimationFrame(render)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(frame)
  resizeObserver?.disconnect()
  intersectionObserver?.disconnect()
  gl?.getExtension('WEBGL_lose_context')?.loseContext()
})
</script>

<template>
  <div class="relative size-full">
    <canvas v-show="!webglFailed" ref="canvas" class="block size-full" aria-hidden="true" />
    <div
      v-if="webglFailed"
      class="visualizer-fallback absolute inset-x-[10%] top-1/2 h-1 -translate-y-1/2 rounded-full"
      :class="{ 'visualizer-fallback--active': isSpeaking }"
      aria-hidden="true"
    />
  </div>
</template>

<style scoped>
.visualizer-fallback {
  background: linear-gradient(90deg, transparent, #ffd152, #72ff8c, #3a6bff, #e64dff, #40a6ff, #33ffbf, transparent);
  filter: blur(1px);
  box-shadow: 0 0 24px 4px color-mix(in srgb, #6b5bff 50%, transparent);
  transition: transform 300ms ease;
}

.visualizer-fallback--active {
  animation: fallback-pulse 1.2s ease-in-out infinite;
}

@keyframes fallback-pulse {
  50% {
    transform: translateY(-50%) scaleY(4);
  }
}
</style>
