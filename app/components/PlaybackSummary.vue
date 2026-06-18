<!-- app/components/PlaybackSummary.vue -->
<script setup lang="ts">
defineProps<{
  segmentCount: number
  completedCycles: number
  loopPlayback: boolean
  repeatCount: number
}>()
</script>

<template>
  <div class="grid gap-6">
    <div class="rounded-3xl border border-(--ui-border) bg-(--ui-bg-elevated)/85 p-6 shadow-sm">
      <h2 class="text-xl font-semibold text-highlighted">
        Playback summary
      </h2>
      <dl class="mt-4 grid gap-4 text-sm">
        <div class="rounded-2xl border border-(--ui-border) bg-(--ui-bg)/90 p-4">
          <dt class="text-muted">
            Segments
          </dt>
          <dd class="mt-1 text-2xl font-semibold text-highlighted">
            {{ segmentCount }}
          </dd>
        </div>
        <div class="rounded-2xl border border-(--ui-border) bg-(--ui-bg)/90 p-4">
          <dt class="text-muted">
            Completed rounds
          </dt>
          <dd class="mt-1 text-2xl font-semibold text-highlighted">
            {{ completedCycles }}
          </dd>
        </div>
        <div class="rounded-2xl border border-(--ui-border) bg-(--ui-bg)/90 p-4">
          <dt class="text-muted">
            Playback type
          </dt>
          <dd class="mt-1 text-lg font-semibold text-highlighted">
            {{ loopPlayback ? 'Looping continuously' : `Repeat ${repeatCount} time${repeatCount === 1 ? '' : 's'}` }}
          </dd>
        </div>
      </dl>
    </div>

    <div class="rounded-3xl border border-primary/20 bg-primary/5 p-6">
      <h2 class="text-xl font-semibold text-highlighted">
        Best for mixed input
      </h2>
      <p class="mt-3 text-sm leading-7 text-muted">
        Letter mode spells out IDs, room numbers, and codes like A12B or Z9-44. Sentence mode is better for phrases, directions, and longer notes.
      </p>
    </div>
  </div>
</template>
