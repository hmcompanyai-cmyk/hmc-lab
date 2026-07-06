/**
 * 給付金シミュレータのロジック（H-2対応）。
 * 表示規律: 実質価格を主表示にしない。「総額◯円／条件を満たせば実質◯円」の順で、
 * conditionNote（支給条件）を同等の視認性で近接表示する。ここは計算のみを担う。
 */
export type SubsidyScheme = 'reskilling' | 'senmon-jissen' | 'none';

export const SCHEME_LABEL: Record<SubsidyScheme, string> = {
  reskilling: 'リスキリング補助金（経産省・最大70%）',
  'senmon-jissen': '専門実践教育訓練給付金（厚労省・最大80%）',
  none: '対象制度なし',
};

const SCHEME_RATE: Record<SubsidyScheme, number> = {
  reskilling: 0.7,
  'senmon-jissen': 0.8,
  none: 0,
};
const SCHEME_CAP: Record<SubsidyScheme, number | null> = {
  reskilling: 560000,
  'senmon-jissen': 640000,
  none: null,
};

export interface SubsidyResult {
  fee: number;
  scheme: SubsidyScheme;
  granted: number;   // 支給額（条件達成後）
  effective: number; // 実質負担（条件達成後）
  capped: boolean;
}

/** min(fee×rate, cap) を支給額とし、端数は切り捨て（保守的に少なく見せる） */
export function simulate(fee: number, scheme: SubsidyScheme): SubsidyResult {
  if (!Number.isFinite(fee) || fee <= 0) return { fee: 0, scheme, granted: 0, effective: 0, capped: false };
  const rate = SCHEME_RATE[scheme];
  const cap = SCHEME_CAP[scheme];
  const rawGrant = Math.floor(fee * rate);
  const granted = cap != null ? Math.min(rawGrant, cap) : rawGrant;
  return { fee, scheme, granted, effective: fee - granted, capped: cap != null && rawGrant > cap };
}

/** 常時併記する条件注記（JS非依存で静的にも出す） */
export const CONDITION_NOTE =
  '給付金・補助金は割引ではありません。講座の修了や転職・就業継続などの条件をすべて達成した後に支給される制度で、達成できない場合は満額負担となります。対象要件・支給時期は各制度の公式情報と各スクールの無料相談でご確認ください。';
