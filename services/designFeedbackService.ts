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

const buildSpecificIssueTip = (
  config: EmojiConfig,
  breakdown: DesignScoreBreakdown,
  lang: Language,
) => {
  if (breakdown.displayedContrastLc < 60) {
    if (breakdown.contrast.localTextLc < 45) {
      return lang === 'jp'
        ? '塗りと線の色差が弱いです。塗り色を少し濃くするか、内側線を黒など明暗差の大きい色にすると文字形が読み取りやすくなります。'
        : 'The fill and stroke do not differ enough. Darken the fill slightly or use a higher-contrast inner stroke so the letterform is easier to read.';
    }

    if (breakdown.contrast.recommendInnerStroke) {
      return lang === 'jp'
        ? '明るい塗り色が白背景で埋もれています。黒など差の大きい内側線を細めに足すと、色味を保ったまま読みやすくなります。'
        : 'The bright fill is blending into light backgrounds. Add a thin, high-contrast inner stroke to preserve the color while improving readability.';
    }

    if (breakdown.contrast.backgroundSeparationLc < 45 || breakdown.stroke.outerTooThin || !breakdown.stroke.outerEffective) {
      return lang === 'jp'
        ? '背景との境界が弱いです。外側線を8〜14程度まで太くするか、背景と差のある白・黒系の外側線にすると輪郭が残りやすくなります。'
        : 'The boundary against the background is weak. Increase the outer stroke toward 8-14 or use a white/black outer stroke with stronger background separation.';
    }

    return lang === 'jp'
      ? 'APCAコントラストが不足しています。まず外側線の太さと色を見直し、背景に対して輪郭が残る設定にすると改善しやすいです。'
      : 'APCA contrast is insufficient. Start by adjusting outer stroke width and color so the silhouette remains visible against the background.';
  }

  if (breakdown.scalabilityScore < 72) {
    if (breakdown.characterComplexity.maxStrokeCount >= 16) {
      return lang === 'jp'
        ? '高画数の漢字が小サイズで詰まりやすいです。画数の少ない表現に言い換えるか、太さ・内側線・字間を少し軽くすると安定します。'
        : 'Dense Kanji are clogging at small sizes. Use a simpler expression with fewer strokes, or ease the weight, inner stroke, and letter spacing.';
    }

    if (breakdown.characterComplexity.characterCount > 4) {
      return lang === 'jp'
        ? '文字量が多く、小サイズで一文字あたりの面積が不足しています。上段・下段に分けるか、短い表現に置き換えると読みやすくなります。'
        : 'There is too much text for the small display size. Split it across top/bottom lines or use a shorter expression to give each character more area.';
    }

    if (breakdown.stroke.innerTooHeavy || (config.stroke1Enabled && config.stroke1Width >= 8)) {
      return lang === 'jp'
        ? '内側線が文字内部を圧迫しています。内側線を細くし、必要なら字間を少し広げると小サイズで抜けが良くなります。'
        : 'The inner stroke is compressing the letter interior. Thin the inner stroke and, if needed, add a little letter spacing for small-size clarity.';
    }

    if (config.fontWeight >= 850) {
      return lang === 'jp'
        ? 'フォントの太さで字面が詰まり気味です。ウェイトを1段階軽くすると、小サイズでも線がつぶれにくくなります。'
        : 'The font weight is making the glyphs feel crowded. Lower the weight one step so strokes do not clog at small sizes.';
    }

    if (config.condense < 90 || config.condense > 115) {
      return lang === 'jp'
        ? '横幅の変形が強く、文字形が崩れやすいです。横幅を100に近づけ、必要なら幅揃えで全体の収まりを調整してください。'
        : 'The width transform is too strong and may distort the glyphs. Move width closer to 100 and use width fit for overall balance if needed.';
    }

    return lang === 'jp'
      ? '縮小耐性が不足しています。まず内側線を細くし、字間を少し広げると、小サイズで文字内部がつぶれにくくなります。'
      : 'Scalability is insufficient. Start by thinning the inner stroke and adding a little letter spacing so interiors survive at small sizes.';
  }

  if (breakdown.compositionScore < 75) {
    return lang === 'jp'
      ? '全体の収まりが不安定です。横幅を100に近づけるか幅揃えを使い、上下の見た目の幅をそろえると表示領域を使いやすくなります。'
      : 'The overall composition is unstable. Move width closer to 100 or use width fit so the top and bottom lines occupy the area more evenly.';
  }

  return lang === 'jp'
    ? '総合点を下げている要因が分散しています。まずAPCAバーが低い場合は外側線、縮小耐性バーが低い場合は太さ・内側線・字間から調整してください。'
    : 'The score is being reduced by multiple smaller factors. If APCA is lower, adjust the outer stroke; if scalability is lower, adjust weight, inner stroke, or letter spacing first.';
};

const buildLightAdjustmentTip = (
  breakdown: DesignScoreBreakdown,
  colorName: string,
  lang: Language,
) => {
  const weakestScore = Math.min(
    breakdown.contrastFitScore,
    breakdown.scalabilityScore,
    breakdown.compositionScore,
  );

  if (weakestScore === breakdown.contrastFitScore) {
    return lang === 'jp'
      ? 'APCAコントラストに少し伸びしろがあります。外側線の太さを8〜14の範囲で微調整し、背景との差が出る白・黒系の線色を選ぶと安定します。'
      : 'APCA contrast has some room to improve. Fine-tune the outer stroke within 8-14 and choose a white/black stroke color that separates from the background.';
  }

  if (weakestScore === breakdown.scalabilityScore) {
    return lang === 'jp'
      ? '縮小耐性に少し伸びしろがあります。内側線を少し細くするか、字間を少し広げると小サイズで文字内部が残りやすくなります。'
      : 'Scalability has some room to improve. Slightly thin the inner stroke or add a little letter spacing so letter interiors survive at small sizes.';
  }

  if (weakestScore === breakdown.compositionScore) {
    return lang === 'jp'
      ? '構成の収まりに少し伸びしろがあります。横幅を100に近づけるか幅揃えを使い、上下の見た目の幅をそろえると安定します。'
      : 'Composition has some room to improve. Move width closer to 100 or use width fit so the top and bottom lines feel more balanced.';
  }

  return lang === 'jp'
    ? `${colorName}の色味は保てています。外側線を現在の太さ付近で維持し、内側線だけを軽く調整すると見た目を崩さず詰められます。`
    : `The ${colorName} color character is preserved. Keep the outer stroke near its current width and make only small inner-stroke adjustments if needed.`;
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
  const isSingleLine = config.textBottom.trim().length === 0;

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
      ? '画数の多い漢字が小サイズで詰まりやすいです。画数の少ないシンプルな表現にするか、太さ・内側線・字間を少し軽くすると安定します。'
      : 'Dense Kanji can clog at small sizes. Using a simpler expression with fewer strokes, or easing weight, inner stroke, or letter spacing will make it steadier.',
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
      ? isSingleLine
        ? '1段だけの構成で縦横比が偏っています。下段にも分けるか、横幅や幅揃えを調整すると表示領域をより効率よく使えます。'
        : '全体の縦横比が偏っているので、横幅や幅揃えを調整すると表示領域をより効率よく使えます。'
      : isSingleLine
        ? 'The one-line layout is skewing the aspect ratio. Splitting into two lines or adjusting width/fit can use the emoji area more efficiently.'
        : 'The overall aspect ratio is skewed, so width or fit adjustment can use the emoji area more efficiently.',
  });

  addCandidate({
    id: 'general-scalability',
    impact: breakdown.scalabilityScore < 72
      ? (72 - breakdown.scalabilityScore) * 0.35 + 8
      : 0,
    tip: lang === 'jp'
      ? '縮小耐性が不足しています。内側線を細くし、字間を少し広げるか、横幅を100に近づけると小サイズで安定しやすくなります。'
      : 'Scalability is insufficient. Thin the inner stroke, add a little letter spacing, or move width closer to 100 to stabilize small-size display.',
  });

  const bestCandidate = candidates.sort((left, right) => right.impact - left.impact)[0];

  let tip: string;

  if (bestCandidate && (isDanger || !isAcceptable || bestCandidate.impact >= 12)) {
    tip = bestCandidate.tip;
  } else if (!isAcceptable) {
    tip = buildSpecificIssueTip(config, breakdown, lang);
  } else if (!isGood) {
    if (breakdown.contrast.unnecessaryInnerStrokeRisk) {
      tip = lang === 'jp'
        ? '内側線がやや強く、色面を圧迫しています。内側線を少し弱めると、色味を保ちながらよりすっきり見せられます。'
        : 'The inner stroke is slightly strong and compresses the color area. Lighten it a little to keep the color while making the design cleaner.';
    } else if (breakdown.characterComplexity.maxStrokeCount >= 16 && config.fontWeight >= 800) {
      tip = lang === 'jp'
        ? 'このままでも読めますが、高画数の漢字は太さを少し軽くすると小サイズでさらに安定します。'
        : 'This is readable, but dense Kanji will hold better at small sizes with a slightly lighter weight.';
    } else {
      tip = buildLightAdjustmentTip(breakdown, colorName, lang);
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
