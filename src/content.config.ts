import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
  schema: z
    .object({
      title: z.string(),
      description: z.string().min(40).max(200),
      pubDate: z.coerce.date(),
      updatedDate: z.coerce.date().optional(),
      tags: z.array(z.string()).default([]),
      // trueの記事は本文冒頭にPR表記バナーを自動表示（景表法ステマ規制対応）
      affiliate: z.boolean().default(false),
      // 冒頭サムネ（/img/xxx.jpg）。OGP画像にも自動連動
      heroImage: z.string().optional(),
      draft: z.boolean().default(false),
      // ---- 記事工場ガードレール（拡張性監査C-1/C-2）----
      // この記事が所有する主要KW。lib/blog-checks.tsが重複・LPとのカニバリをビルドで検査
      targetKeyword: z.string().min(4),
      // 所属クラスタ（例: claude / ai-school / ai-coding-tools）とピラー宣言
      cluster: z.string().optional(),
      pillar: z.boolean().default(false),
      // 収益動線: 指定するとPost.astroが比較LP/個別ページへの導線カードを自動描画
      relatedGenre: z.string().optional(),
      relatedSchoolId: z.string().optional(),
      // 一次情報の出典（schools.jsonのreferencesと同じ作法）。affiliate記事は1件以上必須
      sources: z
        .array(z.object({ label: z.string(), url: z.string().url(), checkedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }))
        .default([]),
    })
    .refine((d) => !d.affiliate || d.sources.length > 0, {
      message: 'affiliate:true の記事は sources（一次情報の出典）が1件以上必要です',
    }),
});

export const collections = { blog };
