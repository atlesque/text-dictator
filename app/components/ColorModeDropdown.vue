<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

const colorMode = useColorMode()

const modes = [
  { label: 'Light', icon: 'i-lucide-sun', value: 'light' as const },
  { label: 'Dark', icon: 'i-lucide-moon', value: 'dark' as const },
  { label: 'System', icon: 'i-lucide-monitor', value: 'system' as const }
]

const currentIcon = computed(() => {
  const active = modes.find(m => m.value === colorMode.preference)
  return active?.icon ?? 'i-lucide-sun'
})

const items = computed<DropdownMenuItem[]>(() =>
  modes.map(mode => ({
    label: mode.label,
    icon: mode.icon,
    type: 'checkbox' as const,
    checked: colorMode.preference === mode.value,
    onUpdateChecked(checked: boolean) {
      if (checked) {
        colorMode.preference = mode.value
      }
    },
    onSelect(e: Event) {
      e.preventDefault()
    }
  }))
)
</script>

<template>
  <ClientOnly>
    <UDropdownMenu :items="items" :content="{ align: 'end' }" :ui="{ content: 'w-40' }">
      <UButton color="neutral" variant="ghost" :icon="currentIcon" size="sm" class="gap-1.5">
        <span class="hidden sm:inline text-sm">Theme</span>
      </UButton>
    </UDropdownMenu>
    <template #fallback>
      <UButton color="neutral" variant="ghost" icon="i-lucide-sun" size="sm" />
    </template>
  </ClientOnly>
</template>
