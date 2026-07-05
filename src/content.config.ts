import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    tags: z.array(z.string()).default([]),
    // trueの記事は本文冒頭にPR表記バナーを自動表示（景表法ステマ規制対応）
    affiliate: z.boolean().default(false),
    // 冒頭サムネ（/img/xxx.jpg）。OGP画像にも自動連動
    heroImage: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { blog };
