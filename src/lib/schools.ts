/**
 * スクールデータの読込・検証・順位算出（ビルド時）。
 * 統一設計 裁定2: 順位は手打ち禁止。scores×segment weightsの加重平均から算出し、
 * /infoのスコア表と機械的に一致させる（景表法H-4対応）。
 */
import { z } from 'zod';
import genreRaw from '../data/genres/ai-school/genre.json';
import schoolsRaw from '../data/genres/ai-school/schools.json';
import segmentsRaw from '../data/genres/ai-school/segments.json';
import changelogRaw from '../data/genres/ai-school/changelog.json';

const ScoreAxes = z.object({
  price: z.number().min(1).max(5),
  hours: z.number().min(1).max(5),
  subsidy: z.number().min(1).max(5),
  support: z.number().min(1).max(5),
  track: z.number().min(1).max(5),
});

const Voice = z.object({
  quote: z.string().min(5),
  attr: z.string(),
  year: z.string(),
  media: z.string(), // H-5: 出典は引用ブロック単位で1:1表示
  url: z.string().url(),
});

const School = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string(),
  shortName: z.string(),
  company: z.string(),
  type: z.string(),
  affiliate: z.boolean(), // H-1: trueでPR表記+rel=sponsoredが原子的に付く
  verified: z.boolean(),
  // 新規申込を受け付けているか。falseはランキング・比較表・診断から自動除外され、
  // 詳細ページのみ「受付停止中」明示で残る（申し込めない校を推薦しないための構造保証）
  enrollable: z.boolean().default(true),
  verifyNote: z.string().nullable(),
  scores: ScoreAxes,
  tags: z.object({
    purpose: z.array(z.string()),
    format: z.array(z.string()),
    kodawari: z.array(z.string()),
  }),
  budget: z.object({
    monthly: z.number().nullable(),
    total: z.number().nullable(),
    period: z.string(),
    note: z.string(),
  }),
  subsidy: z.object({
    type: z.enum(['reskilling', 'senmon-jissen', 'none']),
    rate: z.number().nullable(),
    cap: z.number().nullable(),
    baseFee: z.number().nullable(),
    conditionNote: z.string().min(10), // H-2: 注記なしのデータはビルドで落とす
  }),
  badges: z.array(z.string()),
  points: z.array(z.string()).min(3),
  caution: z.string().min(10),
  reason: z.string(),
  editorNote: z.string(),
  voices: z.array(Voice),
  voicesNote: z.string().optional(),
  cta: z.object({ url: z.string().url(), primary: z.string(), note: z.string() }),
  detail: z.object({
    lead: z.string(),
    curriculum: z.array(z.string()),
    pros: z.array(z.string()),
    cons: z.array(z.string()),
    faq: z.array(z.object({ q: z.string(), a: z.string() })),
    references: z.array(z.object({
      label: z.string(),
      url: z.string().url(),
      checkedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    })),
  }),
}).refine((s) => s.verified || (s.verifyNote != null && s.verifyNote.length > 5), {
  message: 'verified:false の学校には verifyNote が必須（H-6: 注記なし公開の構造的禁止）',
});

const Segment = z.object({
  slug: z.string().regex(/^[a-z-]+$/),
  label: z.string(),
  h1: z.string(),
  title: z.string(),
  description: z.string(),
  intro: z.string(),
  weights: ScoreAxes, // 重みも1..5でなく0..1だが範囲検証は下で
  requireSubsidy: z.boolean().optional(),
  notes: z.record(z.string()),
}).extend({
  weights: z.object({
    price: z.number().min(0).max(1),
    hours: z.number().min(0).max(1),
    subsidy: z.number().min(0).max(1),
    support: z.number().min(0).max(1),
    track: z.number().min(0).max(1),
  }),
});

const Change = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  schoolId: z.string().nullable(),
  kind: z.enum(['price', 'campaign', 'new', 'ended', 'subsidy', 'note']),
  text: z.string().min(5),
  source: z.string().nullable(),
  expiresAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // H-6: 自動失効
});

export const GENRE = genreRaw;
export const SCHOOLS = z.array(School).min(1).parse((schoolsRaw as any).schools);
/** 申込可能（enrollable）な校のみ。校数表示・ランキング母数はこちらを使う */
export const ACTIVE_SCHOOLS = SCHOOLS.filter((s) => s.enrollable);
export const SEGMENTS = z.array(Segment).min(1).parse((segmentsRaw as any).segments);
export const CHANGES = z.array(Change).parse((changelogRaw as any).changes);

// --- architect GO条件1: segment slug と school id の衝突をビルドで落とす ---
{
  const ids = new Set(SCHOOLS.map((s) => s.id));
  for (const seg of SEGMENTS) {
    if (seg.slug !== 'default' && ids.has(seg.slug)) {
      throw new Error(`[ai-school] slug衝突: segment "${seg.slug}" が school id と重複`);
    }
  }
  // weights合計の健全性（±0.01）
  for (const seg of SEGMENTS) {
    const sum = Object.values(seg.weights).reduce((a, b) => a + b, 0);
    if (Math.abs(sum - 1) > 0.01) throw new Error(`[ai-school] weights合計≠1: ${seg.slug} (${sum})`);
  }
  // H-5: 引用と出典の1:1（urlなしvoiceはスキーマで既に不可）
  // changelogのschoolId実在検証
  for (const c of CHANGES) {
    if (c.schoolId && !ids.has(c.schoolId)) throw new Error(`[ai-school] changelogの未知school: ${c.schoolId}`);
  }
}

export type SchoolT = z.infer<typeof School>;
export type SegmentT = z.infer<typeof Segment>;

/** 編集部評価（加重平均・小数1桁）。H-3/H-4: 表示スコアと順位は同一の式から出る */
export function editorialScore(s: SchoolT, seg: SegmentT): number {
  const w = seg.weights;
  const raw =
    s.scores.price * w.price + s.scores.hours * w.hours + s.scores.subsidy * w.subsidy +
    s.scores.support * w.support + s.scores.track * w.track;
  return Math.round(raw * 10) / 10;
}

/** セグメント別ランキング（スコア降順・同点はid昇順で安定）。requireSubsidyで対象絞込み */
export function rankedSchools(seg: SegmentT): { school: SchoolT; score: number; rank: number }[] {
  let pool = SCHOOLS.filter((s) => s.enrollable);
  if (seg.requireSubsidy) pool = pool.filter((s) => s.subsidy.type !== 'none');
  return pool
    .map((school) => ({ school, score: editorialScore(school, seg) }))
    .sort((a, b) => b.score - a.score || a.school.id.localeCompare(b.school.id))
    .map((e, i) => ({ ...e, rank: i + 1 }));
}

export function segmentBySlug(slug: string): SegmentT | undefined {
  return SEGMENTS.find((s) => s.slug === slug);
}
export function schoolById(id: string): SchoolT | undefined {
  return SCHOOLS.find((s) => s.id === id);
}

/** 直近90日以内・未失効の変更点（H-6: 期限切れはビルド時に自動で消える） */
export function activeChanges(today = new Date()): typeof CHANGES {
  const t = today.toISOString().slice(0, 10);
  return CHANGES.filter((c) => c.expiresAt >= t).sort((a, b) => b.date.localeCompare(a.date));
}

/** 構造化データ: ItemListのみ（AggregateRating/Reviewは不使用の設計判断） */
export function itemListJsonLd(seg: SegmentT, site: string) {
  const ranked = rankedSchools(seg);
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: seg.h1,
    itemListElement: ranked.map((e) => ({
      '@type': 'ListItem',
      position: e.rank,
      name: e.school.name,
      url: `${site}${GENRE.basePath}/${e.school.id}`,
    })),
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[], site: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: `${site}${it.path}`,
    })),
  };
}

/** 円表記（3桁区切り） */
export function yen(n: number | null): string {
  return n == null ? '—' : n.toLocaleString('ja-JP') + '円';
}
