<template>
  <UApp>
    <nav class="sticky top-0 z-50 border-b border-default bg-default/70 backdrop-blur">
      <div class="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <div class="flex items-center gap-2.5">
          <UIcon name="i-lucide-mic-vocal" class="size-5 text-primary" />
          <span class="text-lg font-semibold text-highlighted">Text Dictator</span>
        </div>
        <ColorModeDropdown />
      </div>
    </nav>
    <NuxtPage />
  </UApp>
</template>
