import { docsLoader } from "@astrojs/starlight/loaders";
import { docsSchema } from "@astrojs/starlight/schema";
import { z } from "astro/zod";
import { defineCollection } from "astro:content";

// The home pages' results image and features, shown by components/Hero.astro.
const home = z.object({
  results: z
    .object({ src: z.string(), darkSrc: z.string(), alt: z.string(), caption: z.string() })
    .optional(),
  features: z
    .array(
      z.object({
        icon: z.string(),
        title: z.string().optional(),
        details: z.string(),
        link: z.string(),
        linkText: z.string().optional(),
      }),
    )
    .optional(),
});

export const collections = {
  docs: defineCollection({ loader: docsLoader(), schema: docsSchema({ extend: home }) }),
};
