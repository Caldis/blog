import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const thoughts = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/thoughts" }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    summary: z.string().optional(),
  }),
});

export const collections = { thoughts };
