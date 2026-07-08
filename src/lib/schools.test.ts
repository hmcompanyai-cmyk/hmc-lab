import { describe, it, expect } from 'vitest';
import {
  SCHOOLS, SEGMENTS, editorialScore, rankedSchools, segmentBySlug,
  schoolById, activeChanges, itemListJsonLd, breadcrumbJsonLd, yen,
} from './schools';
import { simulate, CONDITION_NOTE, SCHEME_LABEL } from './subsidy';

describe('データ検証（zodはimport時に通過済み）', () => {
  it('9校・5セグメントが読み込まれる', () => {
    expect(SCHOOLS.length).toBe(9);
    expect(SEGMENTS.map((s) => s.slug)).toContain('default');
    expect(SEGMENTS.length).toBe(5);
  });
  it('全ての口コミが出典URLを持つ（H-5）', () => {
    for (const s of SCHOOLS) for (const v of s.voices) expect(v.url).toMatch(/^https?:\/\//);
  });
  it('全校がconditionNoteを持つ（H-2）', () => {
    for (const s of SCHOOLS) expect(s.subsidy.conditionNote.length).toBeGreaterThan(10);
  });
});

describe('editorialScore / rankedSchools（H-3/H-4）', () => {
  const def = segmentBySlug('default')!;
  it('スコアは加重平均で小数1桁', () => {
    const dmm = schoolById('dmm')!;
    // 5*.25+5*.2+2*.15+3*.25+4*.15 = 3.9
    expect(editorialScore(dmm, def)).toBe(3.9);
  });
  it('順位はスコア降順・全校連番', () => {
    const r = rankedSchools(def);
    expect(r.length).toBe(8); // TA受付停止でenrollable:false
    for (let i = 1; i < r.length; i++) expect(r[i - 1].score).toBeGreaterThanOrEqual(r[i].score);
    expect(r.map((e) => e.rank)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });
  it('給付金セグメントは対象校のみ（requireSubsidy）', () => {
    const kyufu = segmentBySlug('kyufu')!;
    const r = rankedSchools(kyufu);
    expect(r.every((e) => e.school.subsidy.type !== 'none')).toBe(true);
    expect(r.length).toBe(4); // 侍/キカガク/スキルアップ/ヒューマン（TAは受付停止中）
  });
  it('セグメントで順位が変わる（重み駆動の実証）', () => {
    const def1 = rankedSchools(segmentBySlug('default')!)[0].school.id;
    const ten1 = rankedSchools(segmentBySlug('tenshoku')!)[0].school.id;
    expect(def1).not.toBe(ten1); // 総合と転職で1位が異なる想定（重みが効いている）
  });
});

describe('activeChanges（H-6失効）', () => {
  it('期限内の変更のみ返す', () => {
    expect(activeChanges(new Date('2026-07-06')).length).toBeGreaterThan(0);
    expect(activeChanges(new Date('2027-01-01')).length).toBe(0);
  });
});

describe('構造化データ', () => {
  it('ItemListは順位と一致', () => {
    const ld = itemListJsonLd(segmentBySlug('default')!, 'https://example.com');
    expect(ld['@type']).toBe('ItemList');
    expect(ld.itemListElement[0].position).toBe(1);
    expect(ld.itemListElement.length).toBe(8);
  });
  it('BreadcrumbList生成', () => {
    const ld = breadcrumbJsonLd([{ name: 'A', path: '/a' }], 'https://x.jp');
    expect(ld.itemListElement[0].item).toBe('https://x.jp/a');
  });
});

describe('simulate（給付金・H-2）', () => {
  it('通常計算: floor(fee×rate)', () => {
    const r = simulate(297000, 'reskilling');
    expect(r.granted).toBe(207900);
    expect(r.effective).toBe(89100);
    expect(r.capped).toBe(false);
  });
  it('上限適用: 専門実践は64万円cap', () => {
    const r = simulate(1000000, 'senmon-jissen');
    expect(r.granted).toBe(640000);
    expect(r.capped).toBe(true);
  });
  it('制度なしは支給0', () => {
    expect(simulate(100000, 'none').granted).toBe(0);
  });
  it('不正入力は0に安全化', () => {
    expect(simulate(NaN, 'reskilling').effective).toBe(0);
    expect(simulate(-5, 'reskilling').granted).toBe(0);
  });
  it('条件注記とラベルが存在', () => {
    expect(CONDITION_NOTE).toContain('割引ではありません');
    expect(SCHEME_LABEL.reskilling).toContain('70');
  });
});

describe('yen', () => {
  it('3桁区切り・null安全', () => {
    expect(yen(16280)).toBe('16,280円');
    expect(yen(null)).toBe('—');
  });
});
