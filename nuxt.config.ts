// https://nuxt.com/docs/api/configuration/nuxt-config
// Production origin, used for canonical, Open Graph and sitemap URLs.
// Override with NUXT_PUBLIC_SITE_URL when deploying to another domain.
const env = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env
const siteUrl = (env?.NUXT_PUBLIC_SITE_URL || 'https://text-dictator.pages.dev').replace(/\/$/, '')

const seo = {
  name: 'Text Dictator',
  title: 'Text Dictator: Hear Any Text Read Aloud, Letter by Letter',
  description:
    'Free online dictation tool. Paste any text and hear it read aloud letter by letter or sentence by sentence, with adjustable voice, speed and repeats.',
  imageAlt: 'Text Dictator: hear any text read aloud, letter by letter'
}

export default defineNuxtConfig({
  modules: ['@nuxt/eslint', '@nuxt/ui'],

  devtools: {
    enabled: true
  },

  app: {
    head: {
      htmlAttrs: {
        lang: 'en'
      },
      title: seo.title,
      meta: [
        { name: 'description', content: seo.description },
        { name: 'application-name', content: seo.name },
        { name: 'apple-mobile-web-app-title', content: seo.name },
        { name: 'robots', content: 'index, follow, max-image-preview:large' },
        { name: 'color-scheme', content: 'light dark' },
        { name: 'theme-color', content: '#eef0ff', media: '(prefers-color-scheme: light)' },
        { name: 'theme-color', content: '#05040d', media: '(prefers-color-scheme: dark)' },
        { property: 'og:type', content: 'website' },
        { property: 'og:site_name', content: seo.name },
        { property: 'og:locale', content: 'en_US' },
        { property: 'og:url', content: `${siteUrl}/` },
        { property: 'og:title', content: seo.title },
        { property: 'og:description', content: seo.description },
        { property: 'og:image', content: `${siteUrl}/og-image.png` },
        { property: 'og:image:type', content: 'image/png' },
        { property: 'og:image:width', content: '1200' },
        { property: 'og:image:height', content: '630' },
        { property: 'og:image:alt', content: seo.imageAlt },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: seo.title },
        { name: 'twitter:description', content: seo.description },
        { name: 'twitter:image', content: `${siteUrl}/og-image.png` },
        { name: 'twitter:image:alt', content: seo.imageAlt }
      ],
      link: [
        { rel: 'canonical', href: `${siteUrl}/` },
        { rel: 'icon', href: '/favicon.ico', sizes: '48x48' },
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
        { rel: 'manifest', href: '/site.webmanifest' }
      ],
      script: [
        {
          type: 'application/ld+json',
          innerHTML: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebApplication',
            name: seo.name,
            url: `${siteUrl}/`,
            description: seo.description,
            image: `${siteUrl}/og-image.png`,
            applicationCategory: 'EducationalApplication',
            operatingSystem: 'Any',
            browserRequirements: 'Requires a browser with the Web Speech API',
            inLanguage: 'en',
            isAccessibleForFree: true,
            offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' }
          })
        }
      ]
    }
  },

  runtimeConfig: {
    public: {
      siteUrl
    }
  },

  nitro: {
    prerender: {
      routes: ['/robots.txt', '/sitemap.xml']
    }
  },

  css: ['~/assets/css/main.css'],

  devServer: {
    port: 8035
  },

  compatibilityDate: '2025-01-15',

  eslint: {
    config: {}
  }
})
