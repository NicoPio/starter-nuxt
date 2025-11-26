import { defineCollection, defineContentConfig } from "@nuxt/content";
import { z } from "zod";

export default defineContentConfig({
  collections: {
    authors: defineCollection({
      type: "data",
      source: "/**.yml",
      schema: z.object({
        name: z.string(),
        avatar: z.string(),
        url: z.string(),
      }),
    }),
    i18n_en_app: defineCollection({
      type: "data",
      source: "i18n/en/app.yml",
    }),
    i18n_en_nav: defineCollection({
      type: "data",
      source: "i18n/en/nav.yml",
    }),
    i18n_en_auth: defineCollection({
      type: "data",
      source: "i18n/en/auth.yml",
    }),
    i18n_en_profile: defineCollection({
      type: "data",
      source: "i18n/en/profile.yml",
    }),
    i18n_en_dashboard: defineCollection({
      type: "data",
      source: "i18n/en/dashboard.yml",
    }),
    i18n_en_subscription: defineCollection({
      type: "data",
      source: "i18n/en/subscription.yml",
    }),
    i18n_en_admin: defineCollection({
      type: "data",
      source: "i18n/en/admin.yml",
    }),
    i18n_en_errors: defineCollection({
      type: "data",
      source: "i18n/en/errors.yml",
    }),
    i18n_fr_app: defineCollection({
      type: "data",
      source: "i18n/fr/app.yml",
    }),
    i18n_fr_nav: defineCollection({
      type: "data",
      source: "i18n/fr/nav.yml",
    }),
    i18n_fr_auth: defineCollection({
      type: "data",
      source: "i18n/fr/auth.yml",
    }),
    i18n_fr_profile: defineCollection({
      type: "data",
      source: "i18n/fr/profile.yml",
    }),
    i18n_fr_dashboard: defineCollection({
      type: "data",
      source: "i18n/fr/dashboard.yml",
    }),
    i18n_fr_subscription: defineCollection({
      type: "data",
      source: "i18n/fr/subscription.yml",
    }),
    i18n_fr_admin: defineCollection({
      type: "data",
      source: "i18n/fr/admin.yml",
    }),
    i18n_fr_errors: defineCollection({
      type: "data",
      source: "i18n/fr/errors.yml",
    }),
    i18n_en_homepage: defineCollection({
      type: "data",
      source: "i18n/en/homepage.yml",
    }),
    i18n_fr_homepage: defineCollection({
      type: "data",
      source: "i18n/fr/homepage.yml",
    }),
    i18n_en_features: defineCollection({
      type: "data",
      source: "i18n/en/features.yml",
    }),
    i18n_fr_features: defineCollection({
      type: "data",
      source: "i18n/fr/features.yml",
    }),
  },
});
