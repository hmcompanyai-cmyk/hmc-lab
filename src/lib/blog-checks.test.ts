import { describe, it, expect } from 'vitest';
import { assertBlogQuality, type BlogEntryLike } from './blog-checks';

type BlogEntryOverride = Partial<Omit<BlogEntryLike, 'data'>> & {
  data?: Partial<BlogEntryLike['data']>;
};

function post(overrides: BlogEntryOverride = {}): BlogEntryLike {
  const base: BlogEntryLike = {
    id: 'ai-school-howto',
    body: '[比較LP](/ai-school) <a href="/about">about</a> ![x](/img/school.png)',
    data: {
      targetKeyword: '生成AIスクール 比較',
      relatedGenre: 'ai-school',
      affiliate: false,
      sources: [{ label: '公式', url: 'https://example.com', checkedAt: '2026-07-25' }],
    },
  };

  return {
    ...base,
    ...overrides,
    data: {
      ...base.data,
      ...overrides.data,
    },
  };
}

describe('assertBlogQuality', () => {
  it('有効な内部リンク・画像リンク・収益動線を通す', () => {
    expect(() => assertBlogQuality([post()])).not.toThrow();
  });

  it('主要KW重複を検出する', () => {
    expect(() => assertBlogQuality([
      post({ id: 'a', data: { targetKeyword: '生成AI スクール 比較' } }),
      post({ id: 'b', data: { targetKeyword: '生成AI　スクール 比較' } }),
    ])).toThrow('主要KWが重複');
  });

  it('LP所有の単体レビューKWは弾き、vs比較は許可する', () => {
    expect(() => assertBlogQuality([
      post({ id: 'dmm-review', data: { targetKeyword: 'DMM 生成AI CAMP 評判' } }),
    ])).toThrow('KWカニバリ');

    expect(() => assertBlogQuality([
      post({ id: 'dmm-vs', data: { targetKeyword: 'DMM 生成AI CAMP vs 侍エンジニア 評判' } }),
    ])).not.toThrow();
  });

  it('内部リンク切れを検出し、末尾スラッシュは正規化する', () => {
    expect(() => assertBlogQuality([
      post({ body: '[ok](/ai-school/) [ng](/missing)' }),
    ])).toThrow('内部リンク切れ: /missing');
  });

  it('LPへの動線がない記事を検出する', () => {
    expect(() => assertBlogQuality([
      post({ body: '[about](/about)', data: { relatedGenre: undefined, relatedSchoolId: undefined } }),
    ])).toThrow('比較LPへの動線がありません');
  });

  it('relatedSchoolIdの実在性を検証する', () => {
    expect(() => assertBlogQuality([
      post({ data: { relatedSchoolId: 'missing-school' } }),
    ])).toThrow('schools.json に存在しません');
  });
});
