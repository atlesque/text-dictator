<!-- app/components/VoiceVisualizer.vue -->
<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps<{
  isPlaying: boolean
  currentIndex: number | null
  segmentCount: number
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

// Iridescent light bar: a few glowing strands that swell into a hump around
// the segment being spoken, with a filled ribbon and sparkling particles.
const fragmentSource = `
precision highp float;

uniform vec2 uResolution;
uniform float uTime;
uniform float uEnergy;
uniform float uPulse;
uniform float uCenter;
uniform float uLight;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

vec3 spectrum(float t) {
  t = clamp(t, 0.0, 1.0);
  vec3 gold = vec3(1.0, 0.82, 0.32);
  vec3 lime = vec3(0.45, 1.0, 0.55);
  vec3 blue = vec3(0.22, 0.42, 1.0);
  vec3 magenta = vec3(0.9, 0.3, 1.0);
  vec3 azure = vec3(0.25, 0.65, 1.0);
  vec3 teal = vec3(0.2, 1.0, 0.75);
  vec3 c = mix(gold, lime, smoothstep(0.0, 0.18, t));
  c = mix(c, blue, smoothstep(0.18, 0.38, t));
  c = mix(c, magenta, smoothstep(0.38, 0.55, t));
  c = mix(c, azure, smoothstep(0.55, 0.75, t));
  c = mix(c, teal, smoothstep(0.75, 1.0, t));
  return c;
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution) / uResolution.y;
  float halfWidth = 0.5 * uResolution.x / uResolution.y;
  float xn = uv.x / halfWidth;

  float edgeFade = smoothstep(1.0, 0.72, abs(xn));
  float envelope = exp(-pow((xn - uCenter) * 2.4, 2.0));
  float amp = (0.012 + 0.2 * uEnergy + 0.07 * uPulse) * envelope;

  vec3 color = vec3(0.0);
  float firstStrand = 0.0;

  for (int i = 0; i < 5; i++) {
    float fi = float(i);
    float phase = uTime * (0.9 + 0.32 * fi) + fi * 1.7;
    float wobble = 0.6 + 0.4 * sin(uTime * 0.7 + fi * 2.1);
    float y = amp * wobble * sin(xn * (3.2 + fi * 0.85) + phase)
      + amp * 0.45 * sin(xn * 7.3 - phase * 1.3 + fi);
    if (i == 0) firstStrand = y;

    float d = abs(uv.y - y);
    float thickness = 0.0018 + 0.005 * envelope * (uEnergy + uPulse * 0.5);
    float core = exp(-d / thickness);
    float halo = 0.12 * exp(-d / 0.035) * envelope * (0.3 + uEnergy);
    vec3 strandColor = spectrum(xn * 0.5 + 0.5 + (fi - 2.0) * 0.05);
    color += strandColor * (core * 0.75 + halo) * edgeFade;
  }

  // Filled ribbon underneath the leading strand
  float ribbon = uv.y / (firstStrand + sign(firstStrand) * 0.0001);
  if (ribbon > 0.0 && ribbon < 1.0) {
    color += spectrum(xn * 0.5 + 0.45) * 0.35 * ribbon * ribbon * envelope * edgeFade;
  }

  // Thin resting line that spans the full width
  float baseline = exp(-abs(uv.y) / 0.0016) * 0.55 + exp(-abs(uv.y) / 0.02) * 0.08;
  color += spectrum(xn * 0.5 + 0.5) * baseline * edgeFade;

  // Soft orb glow behind the hump
  vec2 orbOffset = (uv - vec2(uCenter * halfWidth, 0.0)) * vec2(0.9, 2.6);
  color += spectrum(uCenter * 0.5 + 0.45) * (0.05 + 0.22 * uEnergy + 0.15 * uPulse)
    * exp(-length(orbOffset) / 0.16) * edgeFade;

  // Sparkling particles scattered around the band
  vec2 grid = uv * 170.0;
  vec2 cell = floor(grid);
  float h = hash(cell);
  float drift = hash(cell + 17.0);
  vec2 local = fract(grid) - 0.5 - 0.3 * vec2(sin(uTime + drift * 6.28), cos(uTime * 1.3 + h * 6.28));
  float speck = smoothstep(0.22, 0.0, length(local));
  float band = exp(-pow(uv.y / (amp * 1.6 + 0.01), 2.0));
  float twinkle = 0.5 + 0.5 * sin(uTime * (3.0 + drift * 5.0) + h * 40.0);
  float sparkle = step(0.93, h) * speck * band * twinkle * (0.35 + uEnergy) * edgeFade;
  color += spectrum(xn * 0.5 + 0.5 + (drift - 0.5) * 0.3) * sparkle * 1.4;

  color = 1.0 - exp(-color * 1.5);
  float alpha = clamp(max(color.r, max(color.g, color.b)), 0.0, 1.0);

  // On light backgrounds additive white cores vanish, so keep the hue and
  // let alpha carry the intensity instead.
  vec3 hue = color / (alpha + 0.0001);
  vec3 lightColor = hue * mix(0.5, 0.8, 1.0 - alpha * 0.5);
  float lightAlpha = pow(alpha, 0.75);
  float outAlpha = mix(alpha, lightAlpha, uLight);
  vec3 rgb = mix(color, lightColor * lightAlpha, uLight);
  gl_FragColor = vec4(rgb, outAlpha);
}
`

let gl: WebGLRenderingContext | null = null
let program: WebGLProgram | null = null
let frame = 0
let lastTime = 0
let elapsed = 0
let energy = 0.08
let pulse = 0
let center = 0
let resizeObserver: ResizeObserver | undefined
const uniforms: Record<string, WebGLUniformLocation | null> = {}

const prefersReducedMotion = import.meta.client
  ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
  : false

watch(
  () => props.currentIndex,
  value => {
    if (value !== null) {
      pulse = 1
    }
  }
)

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

  gl = element.getContext('webgl', { premultipliedAlpha: true, antialias: true })
  if (!gl) return false

  const vertex = compile(gl, gl.VERTEX_SHADER, vertexSource)
  const fragment = compile(gl, gl.FRAGMENT_SHADER, fragmentSource)
  if (!vertex || !fragment) return false

  program = gl.createProgram()
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

  for (const name of ['uResolution', 'uTime', 'uEnergy', 'uPulse', 'uCenter', 'uLight']) {
    uniforms[name] = gl.getUniformLocation(program, name)
  }

  return true
}

function resize() {
  const element = canvas.value
  if (!element || !gl) return
  const ratio = Math.min(window.devicePixelRatio || 1, 2)
  element.width = Math.max(1, Math.round(element.clientWidth * ratio))
  element.height = Math.max(1, Math.round(element.clientHeight * ratio))
  gl.viewport(0, 0, element.width, element.height)
}

function render(now: number) {
  frame = requestAnimationFrame(render)
  if (!gl || !canvas.value) return

  const dt = Math.min((now - (lastTime || now)) / 1000, 0.1)
  lastTime = now

  const hasPosition = props.currentIndex !== null && props.segmentCount > 0
  const targetEnergy = props.isPlaying ? 0.55 : hasPosition ? 0.18 : 0.06
  const targetCenter =
    hasPosition && props.segmentCount > 1
      ? -0.5 + ((props.currentIndex ?? 0) / (props.segmentCount - 1)) * 1.0
      : 0

  energy += (targetEnergy - energy) * Math.min(1, dt * 2.5)
  center += (targetCenter - center) * Math.min(1, dt * 3)
  pulse *= Math.exp(-dt * 3.2)

  const speed = prefersReducedMotion ? 0.25 : 0.7 + energy * 1.8
  elapsed += dt * speed

  gl.clearColor(0, 0, 0, 0)
  gl.clear(gl.COLOR_BUFFER_BIT)
  gl.uniform2f(uniforms.uResolution!, canvas.value.width, canvas.value.height)
  gl.uniform1f(uniforms.uTime!, elapsed)
  gl.uniform1f(uniforms.uEnergy!, energy)
  gl.uniform1f(uniforms.uPulse!, prefersReducedMotion ? 0 : pulse)
  gl.uniform1f(uniforms.uCenter!, center)
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
  if (canvas.value) resizeObserver.observe(canvas.value)
  frame = requestAnimationFrame(render)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(frame)
  resizeObserver?.disconnect()
  gl?.getExtension('WEBGL_lose_context')?.loseContext()
})
</script>

<template>
  <div class="relative size-full">
    <canvas v-show="!webglFailed" ref="canvas" class="block size-full" aria-hidden="true" />
    <div
      v-if="webglFailed"
      class="visualizer-fallback absolute inset-x-[10%] top-1/2 h-1 -translate-y-1/2 rounded-full"
      :class="{ 'visualizer-fallback--active': isPlaying }"
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
