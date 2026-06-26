// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ["@nuxt/eslint", "@nuxt/ui"],

  ssr: false,

  devtools: {
    enabled: true,
  },

  app: {
    head: {
      htmlAttrs: {
        lang: "en",
      },
      title: "Text Dictator",
      meta: [
        {
          name: "description",
          content:
            "Type any text and have it dictated back letter-by-letter or sentence-by-sentence with adjustable speed, voice, repeats, and karaoke-style progress.",
        },
        { property: "og:title", content: "Text Dictator" },
        {
          property: "og:description",
          content:
            "Type any text and have it dictated back letter-by-letter or sentence-by-sentence with adjustable speed, voice, repeats, and karaoke-style progress.",
        },
        { property: "og:image", content: "/og-image.svg" },
        { property: "og:type", content: "website" },
        { name: "twitter:title", content: "Text Dictator" },
        {
          name: "twitter:description",
          content:
            "Type any text and have it dictated back letter-by-letter or sentence-by-sentence with adjustable speed, voice, repeats, and karaoke-style progress.",
        },
        { name: "twitter:image", content: "/og-image.svg" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      link: [{ rel: "icon", type: "image/svg+xml", href: "/favicon.svg" }],
    },
  },

  css: ["~/assets/css/main.css"],
  devServer: {
    port: 8035,
  },

  compatibilityDate: "2025-01-15",

  eslint: {
    config: {
      stylistic: {
        commaDangle: "never",
        braceStyle: "1tbs",
      },
    },
  },
});
