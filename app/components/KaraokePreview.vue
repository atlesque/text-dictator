<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import type { Segment } from '~/composables/useDictation'

const props = defineProps<{
  segments: Segment[]
  currentIndex: number | null
  progressText: string
}>()

const segmentRefs = ref<(HTMLElement | undefined)[]>([])

function setSegmentRefAt(index: number) {
  return (element: Element | null) => {
    if (element instanceof HTMLElement) {
      segmentRefs.value[index] = element
    } else {
      segmentRefs.value[index] = undefined
    }
  }
}

watch(
  () => props.currentIndex,
  async value => {
    if (value === null) {
      return
    }

    await nextTick()
    segmentRefs.value[value]?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center'
    })
  }
)
</script>

<template>
  <div class="rounded-3xl border border-default bg-elevated/85 p-4 shadow-sm">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 class="text-xl font-semibold text-highlighted">Karaoke preview</h2>
        <p class="text-sm text-muted">
          The active letter or sentence is underlined and enlarged while it is being spoken.
        </p>
      </div>
      <span class="rounded-full border border-default bg-default px-3 py-1 text-sm text-muted">
        {{ progressText }}
      </span>
    </div>

    <div class="mt-4 min-h-64 rounded-3xl border border-dashed border-default bg-default/90 p-4">
      <p
        v-if="segments.length"
        class="flex flex-wrap gap-y-3 text-xl leading-9 whitespace-pre-wrap text-highlighted"
      >
        <span
          v-for="(segment, index) in segments"
          :key="`${segment.start}-${segment.end}`"
          :ref="setSegmentRefAt(index)"
          class="dictation-segment"
          :class="{
            'dictation-segment--active': currentIndex === index,
            'dictation-segment--complete': currentIndex !== null && index < currentIndex
          }"
        >
          {{ segment.display }}
        </span>
      </p>
      <p v-else class="flex min-h-52 items-center justify-center text-center text-base text-muted">
        Paste or type text above to see the karaoke-style guide before you start playback.
      </p>
    </div>
  </div>
</template>

<style scoped>
.dictation-segment {
  border-radius: 0.75rem;
  padding: 0 0.15em;
  text-decoration-thickness: 0.12em;
  text-underline-offset: 0.28em;
  transition:
    transform 220ms ease,
    color 220ms ease,
    background-color 220ms ease,
    text-decoration-color 220ms ease,
    box-shadow 220ms ease;
}

.dictation-segment--active {
  background: color-mix(in srgb, var(--ui-primary) 16%, transparent);
  color: var(--ui-text-highlighted);
  text-decoration: underline;
  text-decoration-color: var(--ui-primary);
  transform: scale(1.08);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--ui-primary) 25%, transparent);
}

.dictation-segment--complete {
  color: var(--ui-text-muted);
}
</style>
