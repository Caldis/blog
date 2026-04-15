import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const thoughts = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/thoughts" }),
  schema: z.object({
    title: z.string(),
    subtitle: z.string().optional(),
    date: z.coerce.date(),
    summary: z.string().optional(),
    image: z.string().optional(),
    imageAlt: z.string().optional(),
    heroLayout: z.enum(["stacked", "spread"]).optional(),
  }),
});

export const collections = { thoughts };
