<!-- app/components/PlaybackSummary.vue -->
<script setup lang="ts">
defineProps<{
  segmentCount: number;
  completedCycles: number;
  loopPlayback: boolean;
  repeatCount: number;
}>();
</script>

<template>
  <div class="grid gap-6">
    <div
      class="rounded-3xl border border-(--ui-border) bg-(--ui-bg-elevated)/85 p-6 shadow-sm"
    >
      <h2 class="text-xl font-semibold text-highlighted">Playback summary</h2>
      <dl class="mt-4 grid gap-4 text-sm">
        <div
          class="rounded-2xl border border-(--ui-border) bg-(--ui-bg)/90 p-4"
        >
          <dt class="text-muted">Segments</dt>
          <dd class="mt-1 text-2xl font-semibold text-highlighted">
            {{ segmentCount }}
          </dd>
        </div>
        <div
          class="rounded-2xl border border-(--ui-border) bg-(--ui-bg)/90 p-4"
        >
          <dt class="text-muted">Completed rounds</dt>
          <dd class="mt-1 text-2xl font-semibold text-highlighted">
            {{ completedCycles }}
          </dd>
        </div>
        <div
          class="rounded-2xl border border-(--ui-border) bg-(--ui-bg)/90 p-4"
        >
          <dt class="text-muted">Playback type</dt>
          <dd class="mt-1 text-lg font-semibold text-highlighted">
            {{
              loopPlayback
                ? "Looping continuously"
                : `Repeat ${repeatCount} time${repeatCount === 1 ? "" : "s"}`
            }}
          </dd>
        </div>
      </dl>
    </div>
  </div>
</template>
