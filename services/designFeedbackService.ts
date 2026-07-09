import { DesignScoreBreakdown, EmojiConfig, Language, ScoreMetrics } from '../types';
import { calculateDesignScore } from '../src/research/metrics/designScore';

type FeedbackMetrics = ScoreMetrics;

interface DesignFeedbackResult {
  score: number;
  tip: string;
}

interface FeedbackCandidate {
  id: string;
  impact: number;
  tip: string;
}

const getLocalizedColorName = (
  family: DesignScoreBreakdown['color']['family'],
  lang: Language,
) => {
  const jp = {
    yellow: '黄系',
    orange: '橙系',
    red: '赤系',
    pink: '桃系',
    purple: '紫系',
    blue: '青系',
    cyan: '水色系',
    green: '緑系',
    white: '白系',
    black: '黒系',
    gray: '灰色系',
  } as const;

  const en = {
    yellow: 'yellow',
    orange: 'orange',
    red: 'red',
    pink: 'pink',
    purple: 'purple',
    blue: 'blue',
    cyan: 'cyan',
    green: 'green',
    white: 'white',
    black: 'black',
    gray: 'gray',
  } as const;

  return lang === 'jp' ? jp[family] : en[family];
};

const getBreakdown = (
  config: EmojiConfig,
  metrics: FeedbackMetrics,
): DesignScoreBreakdown => {
  return metrics.designScore ?? calculateDesignScore(config);
};

const buildDesignSupportFeedback = (
  config: EmojiConfig,
  lang: Language,
  metrics: FeedbackMetrics,
): DesignFeedbackResult => {
  const breakdown = getBreakdown(config, metrics);
  const score = breakdown.total;
  const colorName = getLocalizedColorName(breakdown.color.family, lang);
  const candidates: FeedbackCandidate[] = [];
  const isDanger =
    breakdown.displayedContrastLc < 45 ||
    breakdown.scalabilityScore < 60 ||
    breakdown.total < 60;
  const isGood =
    breakdown.displayedContrastLc >= 75 &&
    breakdown.scalabilityScore >= 82 &&
    breakdown.total >= 84;
  const isAcceptable =
    breakdown.displayedContrastLc >= 60 &&
    breakdown.scalabilityScore >= 72 &&
    breakdown.total >= 70;

  const addCandidate = (candidate: FeedbackCandidate) => {
    if (candidate.impact > 0) {
      candidates.push(candidate);
    }
  };

  addCandidate({
    id: 'missing-inner-contrast-support',
    impact: breakdown.contrast.recommendInnerStroke
      ? (75 - Math.min(breakdown.displayedContrastLc, 75)) * 0.45 + 10
      : 0,
    tip: lang === 'jp'
      ? '明るい塗り色が白背景で埋もれやすいので、黒など十分に差のある内側線を少し足すと色味を保ったまま読みやすくなります。'
      : 'The bright fill blends into light backgrounds, so a small high-contrast inner stroke can preserve the color while improving readability.',
  });

  addCandidate({
    id: 'weak-local-contrast',
    impact: breakdown.contrast.localTextLc < 45
      ? (45 - breakdown.contrast.localTextLc) * 0.6 + 16
      : 0,
    tip: lang === 'jp'
      ? '塗りと線の差が弱いので、塗り色か内側線のどちらかを十分に離すと文字形が読み取りやすくなります。'
      : 'The fill and stroke are too close, so separating either the fill color or inner stroke will make the letterform easier to read.',
  });

  addCandidate({
    id: 'weak-background-separation',
    impact: breakdown.contrast.backgroundSeparationLc < 45
      ? (45 - breakdown.contrast.backgroundSeparationLc) * 0.55 + 14
      : 0,
    tip: lang === 'jp'
      ? '背景との分離が弱いので、外側線を少し強めるとチャット背景上で輪郭が保ちやすくなります。'
      : 'The emoji is not separated enough from the background, so strengthening the outer stroke should preserve the silhouette in chat surfaces.',
  });

  addCandidate({
    id: 'dense-kanji-heavy-weight',
    impact: breakdown.characterComplexity.maxStrokeCount >= 16 && config.fontWeight >= 800
      ? (100 - breakdown.scalabilityScore) * 0.35 + 10
      : 0,
    tip: lang === 'jp'
      ? '画数の多い漢字に太いウェイトが重なり、小サイズで詰まりやすいです。太さか内側線を少し弱めると安定します。'
      : 'Dense Kanji plus a heavy weight can clog at small sizes, so easing the weight or inner stroke will stabilize it.',
  });

  addCandidate({
    id: 'dense-kanji-complexity',
    impact: breakdown.characterComplexity.maxStrokeCount >= 16 && breakdown.scalabilityScore < 72
      ? (72 - breakdown.scalabilityScore) * 0.5 + breakdown.characterComplexity.denseKanjiCount * 4 + 8
      : 0,
    tip: lang === 'jp'
      ? '画数の多い漢字が小サイズで詰まりやすいです。文字数を減らすか、太さ・内側線・字間を少し軽くすると安定します。'
      : 'Dense Kanji can clog at small sizes. Reducing text count or easing weight, inner stroke, or letter spacing will make it steadier.',
  });

  addCandidate({
    id: 'inner-stroke-too-heavy',
    impact: breakdown.stroke.innerTooHeavy
      ? (config.stroke1Width - 8) * 2 + (breakdown.contrast.unnecessaryInnerStrokeRisk ? 10 : 0)
      : breakdown.contrast.unnecessaryInnerStrokeRisk
        ? 10
        : 0,
    tip: lang === 'jp'
      ? '内側線が強く、塗りの面積を圧迫しています。内側線を細くすると小サイズでの抜けが良くなります。'
      : 'The inner stroke is too strong and compresses the fill area. Thinning it will improve small-size clarity.',
  });

  addCandidate({
    id: 'dense-kanji-inner-stroke',
    impact: breakdown.characterComplexity.denseKanjiCount > 0 && config.stroke1Enabled && config.stroke1Width >= 8
      ? breakdown.characterComplexity.denseKanjiCount * 4 + config.stroke1Width
      : 0,
    tip: lang === 'jp'
      ? '画数の多い漢字に内側線が重く、小サイズで詰まりやすいです。内側線を少し細くすると安定します。'
      : 'Dense Kanji plus a strong inner stroke can clog at small sizes, so thinning the inner stroke should help.',
  });

  addCandidate({
    id: 'outer-stroke-too-thin',
    impact: breakdown.stroke.outerTooThin || !breakdown.stroke.outerEffective
      ? (!breakdown.stroke.outerEffective ? 12 : 8) + Math.max(0, 60 - breakdown.displayedContrastLc) * 0.25
      : 0,
    tip: lang === 'jp'
      ? '外側線が輪郭として効きにくいので、少し太くするとチャット背景上で形を保ちやすくなります。'
      : 'The outer stroke is not acting as a reliable boundary, so making it slightly thicker will hold the shape in chat surfaces.',
  });

  addCandidate({
    id: 'composition-aspect',
    impact: breakdown.composition.fullAspectRatio > 1.7 || breakdown.composition.fullAspectRatio < 0.65
      ? (100 - breakdown.compositionScore) * 0.2 + 8
      : 0,
    tip: lang === 'jp'
      ? '全体の縦横比が偏っているので、横幅や幅揃えを調整すると表示領域をより効率よく使えます。'
      : 'The overall aspect ratio is skewed, so width or fit adjustment can use the emoji area more efficiently.',
  });

  addCandidate({
    id: 'general-scalability',
    impact: breakdown.scalabilityScore < 72
      ? (72 - breakdown.scalabilityScore) * 0.35 + 8
      : 0,
    tip: lang === 'jp'
      ? '小さい表示でつぶれやすい構成です。文字数、線幅、横幅補正のいずれかを整理すると安定します。'
      : 'This setup may blur at small sizes. Reducing text count, stroke width, or width distortion will make it steadier.',
  });

  const bestCandidate = candidates.sort((left, right) => right.impact - left.impact)[0];

  let tip: string;

  if (bestCandidate && (isDanger || !isAcceptable || bestCandidate.impact >= 12)) {
    tip = bestCandidate.tip;
  } else if (!isAcceptable) {
    tip = lang === 'jp'
      ? 'コントラストまたは縮小耐性がまだ弱い状態です。赤く表示されている指標を優先して調整すると改善しやすくなります。'
      : 'Contrast or scalability is still weak. Prioritizing the red indicator should improve the score most directly.';
  } else if (!isGood) {
    if (breakdown.contrast.unnecessaryInnerStrokeRisk) {
      tip = lang === 'jp'
        ? '見やすさは許容範囲です。内側線を少し弱めると、色味を保ちながらよりすっきり見せられます。'
        : 'Readability is acceptable. A slightly lighter inner stroke can keep the color while making the design cleaner.';
    } else if (breakdown.characterComplexity.maxStrokeCount >= 16 && config.fontWeight >= 800) {
      tip = lang === 'jp'
        ? 'このままでも読めますが、高画数の漢字は太さを少し軽くすると小サイズでさらに安定します。'
        : 'This is readable, but dense Kanji will hold better at small sizes with a slightly lighter weight.';
    } else {
      tip = lang === 'jp'
        ? 'このスコアなら見やすさは許容範囲です。色味を保ちたい場合はこの方向で進められます。'
        : 'At this score, readability is within an acceptable range, so this color direction is reasonable to keep.';
    }
  } else if (breakdown.stroke.outerStable && !breakdown.stroke.innerTooHeavy) {
    tip = lang === 'jp'
      ? `${colorName}の塗りと線の分離が良く、小サイズでも視認性を保ちやすい構成です。`
      : `The ${colorName} fill and strokes are well separated, making this likely to stay readable at small sizes.`;
  } else {
    tip = lang === 'jp'
      ? 'コントラスト、縮小耐性、構成のバランスが良く、色味を保ったまま十分見やすい仕上がりです。'
      : 'Contrast, scalability, and composition are balanced, so this remains readable while preserving the color character.';
  }

  return { score, tip };
};

export async function analyzeDesignSupport(
  _text: string,
  config: EmojiConfig,
  lang: Language,
  metrics: FeedbackMetrics,
) {
  return buildDesignSupportFeedback(config, lang, metrics);
}
