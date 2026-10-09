<template>
  <UApp>
    <div class="aurora" aria-hidden="true" />
    <nav class="sticky top-0 z-50 mx-auto max-w-7xl px-4 pt-4 sm:px-6 lg:px-8">
      <div
        class="glass-panel flex items-center justify-between rounded-full! px-4 py-2.5 sm:px-5"
      >
        <div class="flex items-center gap-3">
          <span class="brand-orb" aria-hidden="true" />
          <span class="text-base font-semibold tracking-tight text-highlighted">
            Text <span class="gradient-text">Dictator</span>
          </span>
        </div>
        <ColorModeDropdown />
      </div>
    </nav>
    <NuxtPage />
  </UApp>
</template>

<style scoped>
.brand-orb {
  display: block;
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 9999px;
  background: conic-gradient(from 200deg, #a78bfa, #60a5fa, #f0abfc, #67e8f9, #a78bfa);
  box-shadow: 0 0 18px rgb(139 92 246 / 0.7);
  animation: orb-spin 8s linear infinite;
}

@keyframes orb-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .brand-orb {
    animation: none;
  }
}
</style>
