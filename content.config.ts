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
    homepage: defineCollection({
      type: "data",
      source: "homepage.yml",
      schema: z.object({
        hero: z.object({
          title: z.string(),
          description: z.string(),
          links: z.array(
            z.object({
              label: z.string(),
              to: z.string(),
              target: z.string().optional(),
              icon: z.string().optional(),
              trailingIcon: z.string().optional(),
              size: z.enum(["xs", "sm", "md", "lg", "xl"]).optional(),
              color: z
                .enum([
                  "primary",
                  "secondary",
                  "success",
                  "info",
                  "warning",
                  "error",
                  "neutral",
                ])
                .optional(),
              variant: z
                .enum(["link", "solid", "outline", "soft", "subtle", "ghost"])
                .optional(),
            })
          ),
        }),
        features: z.object({
          title: z.string(),
          description: z.string(),
          items: z.array(
            z.object({
              icon: z.string(),
              title: z.string(),
              description: z.string(),
            })
          ),
        }),
        cta: z.object({
          title: z.string(),
          description: z.string(),
          variant: z.enum(["solid", "outline", "soft", "subtle", "naked"]),
          links: z.array(
            z.object({
              label: z.string(),
              to: z.string(),
              target: z.string().optional(),
              icon: z.string().optional(),
              trailingIcon: z.string().optional(),
              color: z
                .enum([
                  "primary",
                  "secondary",
                  "success",
                  "info",
                  "warning",
                  "error",
                  "neutral",
                ])
                .optional(),
              variant: z
                .enum(["link", "solid", "outline", "soft", "subtle", "ghost"])
                .optional(),
            })
          ),
        }),
      }),
    }),
  },
});
