/**
 * 記事工場の品質ゲート（拡張性監査C-1/C-2/H-3/M-6）。
 * blog/index.astro のビルド時に全記事へ適用し、違反は throw でビルドを落とす
 * （lib/schools.ts のslug衝突検査と同じ作法）。
 *
 * 検査項目:
 *  1. targetKeyword の記事間重複（カニバリ）
 *  2. LP所有KWとの衝突 — スクール単体の「評判/料金/口コミ/レビュー」は
 *     /ai-school/[school] が所有。blogで書けるのは vs比較・howto・条件別のみ
 *  3. 本文の内部リンクが実在ページに解決すること
 *  4. 収益動線 — relatedGenre/relatedSchoolId 指定 or 本文にLPへのリンクが最低1本
 */
import { SCHOOLS, SEGMENTS, GENRE } from './schools';

const norm = (s: string) => s.toLowerCase().replace(/[\s　]+/g, ' ').trim();

export interface BlogEntryLike {
  id: string;
  body?: string;
  data: {
    targetKeyword: string;
    relatedGenre?: string;
    relatedSchoolId?: string;
    affiliate: boolean;
    sources: { label: string; url: string; checkedAt: string }[];
  };
}

export function assertBlogQuality(posts: BlogEntryLike[]): void {
  const validPaths = new Set<string>([
    '/',
    '/blog',
    '/info',
    '/about',
    '/privacy',
    GENRE.basePath,
    `${GENRE.basePath}/lp`,
    ...SCHOOLS.map((s) => `${GENRE.basePath}/${s.id}`),
    ...SEGMENTS.filter((s) => s.slug !== 'default').map((s) => `${GENRE.basePath}/${s.slug}`),
    ...posts.map((p) => `/blog/${p.id}`),
  ]);

  const seenKw = new Map<string, string>();
  for (const p of posts) {
    const kw = norm(p.data.targetKeyword);

    // 1. 記事間のKW重複
    const dup = seenKw.get(kw);
    if (dup) throw new Error(`[blog-checks] 主要KWが重複: "${p.data.targetKeyword}" （${p.id} と ${dup}）`);
    seenKw.set(kw, p.id);

    // 2. LP所有KWとのカニバリ（単体レビュー禁止ルール）
    for (const s of SCHOOLS) {
      const name = norm(s.shortName).replace(/（.*?）/g, '').trim();
      if (
        kw.includes(name) &&
        /(評判|口コミ|レビュー|料金)/.test(kw) &&
        !/(vs|比較|どっち)/.test(kw)
      ) {
        throw new Error(
          `[blog-checks] KWカニバリ: "${p.data.targetKeyword}" は ${GENRE.basePath}/${s.id} が所有します。` +
            'スクール単体の評判/料金レビューはblogで書かず、vs比較・howto・条件別比較にしてください（ARCHITECTURE参照）'
        );
      }
    }

    // 3. 内部リンク解決（markdownリンクとhref属性の両方を拾う）
    const body = p.body ?? '';
    const links = [...body.matchAll(/(?:\]\(|href=")(\/[^)"#?\s]*)/g)]
      .map((m) => (m[1].replace(/\/$/, '') === '' ? '/' : m[1].replace(/\/$/, '')));
    for (const l of links) {
      if (l.startsWith('/img/')) continue;
      if (!validPaths.has(l)) throw new Error(`[blog-checks] 内部リンク切れ: ${l} （${p.id}）`);
    }

    // 4. 収益動線の担保
    const hasFlow =
      p.data.relatedGenre || p.data.relatedSchoolId || links.some((l) => l.startsWith(GENRE.basePath));
    if (!hasFlow) {
      throw new Error(
        `[blog-checks] ${p.id}: 比較LPへの動線がありません。frontmatterで relatedGenre を指定するか、本文に ${GENRE.basePath} へのリンクを置いてください`
      );
    }

    // relatedSchoolIdの実在チェック
    if (p.data.relatedSchoolId && !SCHOOLS.some((s) => s.id === p.data.relatedSchoolId)) {
      throw new Error(`[blog-checks] ${p.id}: relatedSchoolId "${p.data.relatedSchoolId}" は schools.json に存在しません`);
    }
  }
}
