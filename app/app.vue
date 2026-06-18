<script setup lang="ts">
useHead({
  htmlAttrs: {
    lang: 'en'
  },
  link: [
    { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }
  ]
})

const title = 'Text Dictator'
const description = 'Type any text and have it dictated back letter-by-letter or sentence-by-sentence with adjustable speed, voice, repeats, and karaoke-style progress.'

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  ogImage: '/og-image.svg',
  twitterTitle: title,
  twitterDescription: description,
  twitterImage: '/og-image.svg',
  twitterCard: 'summary_large_image'
})
</script>

<template>
  <UApp>
    <NuxtPage />
  </UApp>
</template>
