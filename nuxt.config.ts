import tailwindcss from "@tailwindcss/vite";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },

  app: {
    head: {
      charset: 'utf-8',
      viewport: 'width=device-width, initial-scale=1',
      meta: [
        { name: 'format-detection', content: 'telephone=no' }
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }
      ]
    }
  },

  runtimeConfig: {
    // Private (server-only)
    databaseUrl: process.env.DATABASE_URL,
    betterAuthSecret: process.env.BETTER_AUTH_SECRET,
    githubClientSecret: process.env.GITHUB_CLIENT_SECRET,
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
    appleClientSecret: process.env.APPLE_CLIENT_SECRET,
    stripe: {
      secretKey: process.env.STRIPE_SECRET_KEY,
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    },

    // Public (client + server)
    public: {
      betterAuthUrl: process.env.NUXT_PUBLIC_BETTER_AUTH_URL || 'http://localhost:3000',
      githubClientId: process.env.NUXT_PUBLIC_GITHUB_CLIENT_ID,
      googleClientId: process.env.NUXT_PUBLIC_GOOGLE_CLIENT_ID,
      appleClientId: process.env.NUXT_PUBLIC_APPLE_CLIENT_ID,
      stripe: {
        publicKey: process.env.NUXT_PUBLIC_STRIPE_PUBLIC_KEY,
      }
    }
  },

  modules: [
    "@nuxt/content",
    "@nuxt/eslint",
    "@nuxt/hints",
    "@nuxt/image",
    "@nuxt/scripts",
    "@nuxt/test-utils",
    "@nuxt/ui",
  ],
  css: ["./app/assets/css/main.css"],
  vite: { plugins: [tailwindcss()] },
  nitro: {
    preset: "bun",
  },
});