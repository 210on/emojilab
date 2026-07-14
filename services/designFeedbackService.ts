import { DesignScoreBreakdown, EmojiConfig, Language, ScoreMetrics } from '../types';
import {
  calculateDesignScore,
  DESIGN_SCORE_THRESHOLDS,
} from '../src/research/metrics/designScore';

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

const buildCharacterCountTip = (config: EmojiConfig, lang: Language) => {
  const isTwoLine = config.textTop.trim().length > 0 && config.textBottom.trim().length > 0;
  if (lang === 'jp') {
    return isTwoLine
      ? '片方の行に3文字以上が集中し、一文字あたりの表示面積が不足しています。上下の文字数を分け直すか、短い・字形の単純な表現へ言い換えてください。'
      : '1行の文字量が多く、一文字あたりの表示面積が不足しています。上下2段へ分けるか、短い・字形の単純な表現へ言い換えてください。';
  }
  return isTwoLine
    ? 'One line contains three or more characters and leaves too little area per glyph. Redistribute the text between the two lines or use a shorter, simpler expression.'
    : 'The single line contains too many characters and leaves too little area per glyph. Split it across two lines or use a shorter, simpler expression.';
};

const buildSpecificIssueTip = (
  config: EmojiConfig,
  breakdown: DesignScoreBreakdown,
  lang: Language,
) => {
  if (breakdown.characterComplexity.characterCount === 0) {
    return lang === 'jp'
      ? '文字が入力されていません。上または下の入力欄に、絵文字として伝えたい短い表現を入力してください。'
      : 'No text is entered. Add a short expression to the top or bottom field before evaluating the design.';
  }

  if (breakdown.displayedContrastLc < DESIGN_SCORE_THRESHOLDS.contrastAcceptable) {
    if (breakdown.contrast.localTextLc < DESIGN_SCORE_THRESHOLDS.contrastCritical) {
      return lang === 'jp'
        ? '塗りと線の色差が弱いです。塗り色を少し濃くするか、内側線を黒など明暗差の大きい色にすると文字形が読み取りやすくなります。'
        : 'The fill and stroke do not differ enough. Darken the fill slightly or use a higher-contrast inner stroke so the letterform is easier to read.';
    }

    if (breakdown.contrast.recommendInnerStroke) {
      return lang === 'jp'
        ? '明るい塗り色が白背景で埋もれています。黒など差の大きい内側線を細めに足すと、色味を保ったまま読みやすくなります。'
        : 'The bright fill is blending into light backgrounds. Add a thin, high-contrast inner stroke to preserve the color while improving readability.';
    }

    if (
      breakdown.contrast.backgroundSeparationLc < DESIGN_SCORE_THRESHOLDS.contrastCritical ||
      breakdown.stroke.outerTooThin ||
      !breakdown.stroke.outerEffective
    ) {
      return lang === 'jp'
        ? '背景との境界が弱いです。外側線を8〜14程度まで太くするか、背景と差のある白・黒系の外側線にすると輪郭が残りやすくなります。'
        : 'The boundary against the background is weak. Increase the outer stroke toward 8-14 or use a white/black outer stroke with stronger background separation.';
    }

    return lang === 'jp'
      ? 'APCAコントラストが不足しています。まず外側線の太さと色を見直し、背景に対して輪郭が残る設定にすると改善しやすいです。'
      : 'APCA contrast is insufficient. Start by adjusting outer stroke width and color so the silhouette remains visible against the background.';
  }

  if (breakdown.scalabilityScore < DESIGN_SCORE_THRESHOLDS.scalabilityAcceptable) {
    if (breakdown.characterComplexity.maxStrokeCount >= 16) {
      return lang === 'jp'
        ? '高画数の漢字が小サイズで詰まりやすいです。画数の少ない表現に言い換えるか、太さ・内側線・字間を少し軽くすると安定します。'
        : 'Dense Kanji are clogging at small sizes. Use a simpler expression with fewer strokes, or ease the weight, inner stroke, and letter spacing.';
    }

    if (breakdown.scalabilityPenalties.characterCount > 0) {
      return buildCharacterCountTip(config, lang);
    }

    if (breakdown.stroke.innerTooHeavy || (config.stroke1Enabled && config.stroke1Width >= 8)) {
      return lang === 'jp'
        ? '内側線が文字内部を圧迫しています。内側線を細くし、必要なら字間を少し広げると小サイズで抜けが良くなります。'
        : 'The inner stroke is compressing the letter interior. Thin the inner stroke and, if needed, add a little letter spacing for small-size clarity.';
    }

    if (config.fontWeight >= 900) {
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

  if (breakdown.scalabilityPenalties.widthTransform >= 7) {
    return lang === 'jp'
      ? '文字の横幅変形が強く、字形が崩れやすいです。横幅を100に近づけ、幅揃えを使う場合も変形量が小さくなるよう上下サイズ比を整えてください。'
      : 'The horizontal transform is strong enough to distort the glyphs. Move width closer to 100 and, when using width fit, adjust line-size balance to reduce deformation.';
  }

  if (breakdown.scalabilityPenalties.lineBalance >= 4 || breakdown.scalabilityPenalties.aspectRatio >= 4) {
    return lang === 'jp'
      ? '上下の幅または全体の縦横比が偏っています。上下サイズ比や幅揃えを調整し、正方形の表示領域をより均等に使ってください。'
      : 'The line widths or overall aspect ratio are uneven. Adjust line-size balance or width fit to use the square display area more evenly.';
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
  );

  if (weakestScore === breakdown.contrastFitScore) {
    return lang === 'jp'
      ? 'APCAコントラストに少し伸びしろがあります。外側線の太さを8〜14の範囲で微調整し、背景との差が出る白・黒系の線色を選ぶと安定します。'
      : 'APCA contrast has some room to improve. Fine-tune the outer stroke within 8-14 and choose a white/black stroke color that separates from the background.';
  }

  if (
    weakestScore === breakdown.scalabilityScore &&
    (breakdown.scalabilityPenalties.widthTransform >= 3 ||
      breakdown.scalabilityPenalties.lineBalance >= 3 ||
      breakdown.scalabilityPenalties.aspectRatio >= 3)
  ) {
    return lang === 'jp'
      ? '縮小時の収まりに少し伸びしろがあります。横幅を100に近づけるか、上下サイズ比と幅揃えを調整すると安定します。'
      : 'Small-size layout has some room to improve. Move width closer to 100 or adjust line-size balance and width fit.';
  }

  if (weakestScore === breakdown.scalabilityScore) {
    return lang === 'jp'
      ? '縮小耐性に少し伸びしろがあります。内側線を少し細くするか、字間を少し広げると小サイズで文字内部が残りやすくなります。'
      : 'Scalability has some room to improve. Slightly thin the inner stroke or add a little letter spacing so letter interiors survive at small sizes.';
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
    breakdown.displayedContrastLc < DESIGN_SCORE_THRESHOLDS.contrastCritical ||
    breakdown.scalabilityScore < DESIGN_SCORE_THRESHOLDS.scalabilityCritical ||
    breakdown.total < DESIGN_SCORE_THRESHOLDS.scalabilityCritical;
  const isGood =
    breakdown.displayedContrastLc >= DESIGN_SCORE_THRESHOLDS.contrastGood &&
    breakdown.scalabilityScore >= DESIGN_SCORE_THRESHOLDS.scalabilityGood &&
    breakdown.total >= DESIGN_SCORE_THRESHOLDS.totalGood;
  const isAcceptable =
    breakdown.displayedContrastLc >= DESIGN_SCORE_THRESHOLDS.contrastAcceptable &&
    breakdown.scalabilityScore >= DESIGN_SCORE_THRESHOLDS.scalabilityAcceptable &&
    breakdown.total >= DESIGN_SCORE_THRESHOLDS.totalAcceptable;
  const isTwoLine = config.textTop.trim().length > 0 && config.textBottom.trim().length > 0;
  const isSingleLine = !isTwoLine;

  const addCandidate = (candidate: FeedbackCandidate) => {
    if (candidate.impact > 0) {
      candidates.push(candidate);
    }
  };

  addCandidate({
    id: 'empty-text',
    impact: breakdown.scalabilityPenalties.emptyText,
    tip: lang === 'jp'
      ? '文字が入力されていません。上または下の入力欄に、絵文字として伝えたい短い表現を入力してください。'
      : 'No text is entered. Add a short expression to the top or bottom field before evaluating the design.',
  });

  addCandidate({
    id: 'missing-inner-contrast-support',
    impact: breakdown.contrast.recommendInnerStroke
      ? (DESIGN_SCORE_THRESHOLDS.contrastGood - Math.min(
        breakdown.displayedContrastLc,
        DESIGN_SCORE_THRESHOLDS.contrastGood,
      )) * 0.45 + 10
      : 0,
    tip: lang === 'jp'
      ? '明るい塗り色が白背景で埋もれやすいので、黒など十分に差のある内側線を少し足すと色味を保ったまま読みやすくなります。'
      : 'The bright fill blends into light backgrounds, so a small high-contrast inner stroke can preserve the color while improving readability.',
  });

  addCandidate({
    id: 'weak-local-contrast',
    impact: breakdown.contrast.localTextLc < DESIGN_SCORE_THRESHOLDS.contrastCritical
      ? (DESIGN_SCORE_THRESHOLDS.contrastCritical - breakdown.contrast.localTextLc) * 0.6 + 16
      : 0,
    tip: lang === 'jp'
      ? '塗りと線の差が弱いので、塗り色か内側線のどちらかを十分に離すと文字形が読み取りやすくなります。'
      : 'The fill and stroke are too close, so separating either the fill color or inner stroke will make the letterform easier to read.',
  });

  addCandidate({
    id: 'weak-background-separation',
    impact: breakdown.contrast.backgroundSeparationLc < DESIGN_SCORE_THRESHOLDS.contrastCritical
      ? (DESIGN_SCORE_THRESHOLDS.contrastCritical - breakdown.contrast.backgroundSeparationLc) * 0.55 + 14
      : 0,
    tip: lang === 'jp'
      ? '背景との分離が弱いので、外側線を少し強めるとチャット背景上で輪郭が保ちやすくなります。'
      : 'The emoji is not separated enough from the background, so strengthening the outer stroke should preserve the silhouette in chat surfaces.',
  });

  addCandidate({
    id: 'dense-kanji-heavy-weight',
    impact: breakdown.characterComplexity.maxStrokeCount >= 16 && config.fontWeight >= 900
      ? breakdown.scalabilityPenalties.fontWeight + breakdown.scalabilityPenalties.kanjiComplexity * 0.35 + 6
      : 0,
    tip: lang === 'jp'
      ? '画数の多い漢字に太いウェイトが重なり、小サイズで詰まりやすいです。太さか内側線を少し弱めると安定します。'
      : 'Dense Kanji plus a heavy weight can clog at small sizes, so easing the weight or inner stroke will stabilize it.',
  });

  addCandidate({
    id: 'dense-kanji-complexity',
    impact: breakdown.characterComplexity.maxStrokeCount >= 16
      ? breakdown.scalabilityPenalties.kanjiComplexity
      : 0,
    tip: lang === 'jp'
      ? '画数の多い漢字が小サイズで詰まりやすいです。画数の少ないシンプルな表現にするか、太さ・内側線・字間を少し軽くすると安定します。'
      : 'Dense Kanji can clog at small sizes. Using a simpler expression with fewer strokes, or easing weight, inner stroke, or letter spacing will make it steadier.',
  });

  addCandidate({
    id: 'character-count',
    impact: breakdown.scalabilityPenalties.characterCount,
    tip: buildCharacterCountTip(config, lang),
  });

  addCandidate({
    id: 'thin-font-weight',
    impact: config.fontWeight < 600 ? breakdown.scalabilityPenalties.fontWeight : 0,
    tip: lang === 'jp'
      ? '文字線が細く、小サイズで欠けやすいです。フォントの太さを600〜700付近へ上げて主要な画を残してください。'
      : 'The glyph strokes are too thin to survive at small sizes. Raise the font weight toward 600-700 to preserve the main strokes.',
  });

  addCandidate({
    id: 'unknown-kanji',
    impact: breakdown.scalabilityPenalties.unknownKanji,
    tip: lang === 'jp'
      ? '画数辞書にない漢字が含まれ、密度を確定できません。実寸プレビューで形を確認し、必要なら太さや内側線を軽くしてください。'
      : 'A Kanji is missing from the stroke dictionary, so its density cannot be determined. Check the actual-size preview and reduce weight or inner stroke if needed.',
  });

  addCandidate({
    id: 'inner-stroke-too-heavy',
    impact: breakdown.scalabilityPenalties.innerStroke + (
      breakdown.contrast.unnecessaryInnerStrokeRisk
        ? breakdown.scalabilityPenalties.unnecessaryInnerStroke
        : 0
    ),
    tip: lang === 'jp'
      ? '内側線が強く、塗りの面積を圧迫しています。内側線を細くすると小サイズでの抜けが良くなります。'
      : 'The inner stroke is too strong and compresses the fill area. Thinning it will improve small-size clarity.',
  });

  addCandidate({
    id: 'dense-kanji-inner-stroke',
    impact: breakdown.characterComplexity.denseKanjiCount > 0 && config.stroke1Enabled && config.stroke1Width >= 8
      ? breakdown.scalabilityPenalties.innerStroke
      : 0,
    tip: lang === 'jp'
      ? '画数の多い漢字に内側線が重く、小サイズで詰まりやすいです。内側線を少し細くすると安定します。'
      : 'Dense Kanji plus a strong inner stroke can clog at small sizes, so thinning the inner stroke should help.',
  });

  addCandidate({
    id: 'outer-stroke-too-thin',
    impact: breakdown.stroke.outerTooThin || !breakdown.stroke.outerEffective
      ? breakdown.scalabilityPenalties.outerStroke + Math.max(
        0,
        DESIGN_SCORE_THRESHOLDS.contrastAcceptable - breakdown.displayedContrastLc,
      ) * 0.25
      : 0,
    tip: lang === 'jp'
      ? '外側線が輪郭として効きにくいので、少し太くするとチャット背景上で形を保ちやすくなります。'
      : 'The outer stroke is not acting as a reliable boundary, so making it slightly thicker will hold the shape in chat surfaces.',
  });

  addCandidate({
    id: 'outer-stroke-too-heavy',
    impact: breakdown.stroke.outerTooHeavy ? breakdown.scalabilityPenalties.outerStroke : 0,
    tip: lang === 'jp'
      ? '外側線が太く、文字が使える面積を圧迫しています。外側線を8〜14付近へ戻すと輪郭を保ちながら文字を大きくできます。'
      : 'The outer stroke is consuming too much of the available area. Return it toward 8-14 to preserve the boundary while allowing larger glyphs.',
  });

  addCandidate({
    id: 'geometry-aspect',
    impact: breakdown.scalabilityPenalties.aspectRatio > 0
      ? breakdown.scalabilityPenalties.aspectRatio + breakdown.scalabilityPenalties.lineBalance
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
    id: 'width-transform',
    impact: breakdown.scalabilityPenalties.widthTransform + breakdown.scalabilityPenalties.denseWidthInteraction,
    tip: lang === 'jp'
      ? '横幅変形が文字形を圧迫しています。横幅を100に近づけ、幅揃えを使う場合は上下サイズ比も調整して変形量を抑えてください。'
      : 'Horizontal transformation is compressing the glyphs. Move width closer to 100 and adjust line-size balance when using width fit to reduce deformation.',
  });

  addCandidate({
    id: 'letter-spacing',
    impact: breakdown.scalabilityPenalties.letterSpacing,
    tip: lang === 'jp'
      ? '字間が極端で、小サイズの文字形が詰まるか離れすぎています。字間を0付近へ戻してから少しずつ調整してください。'
      : 'Letter spacing is extreme, causing glyphs to crowd or separate too much at small sizes. Return it near 0 and adjust gradually.',
  });

  addCandidate({
    id: 'line-spacing',
    impact: breakdown.scalabilityPenalties.lineSpacing,
    tip: lang === 'jp'
      ? '上下の行間が極端で、線同士が接触するか表示領域を使い切れていません。行間を0付近へ戻して調整してください。'
      : 'Line spacing is extreme, causing strokes to touch or wasting the display area. Return spacing near 0 and adjust from there.',
  });

  addCandidate({
    id: 'line-balance',
    impact: breakdown.scalabilityPenalties.lineBalance,
    tip: lang === 'jp'
      ? '上下の見た目の幅に差があります。上下サイズ比を調整してから幅揃えを使い、片方だけを強く変形させないようにしてください。'
      : 'The two lines have uneven visual widths. Adjust line-size balance before width fit so one line is not transformed too strongly.',
  });

  addCandidate({
    id: 'general-scalability',
    impact: breakdown.scalabilityScore < DESIGN_SCORE_THRESHOLDS.scalabilityAcceptable
      ? Math.max(
        0,
        DESIGN_SCORE_THRESHOLDS.scalabilityAcceptable - breakdown.scalabilityScore,
      ) * 0.2
      : 0,
    tip: lang === 'jp'
      ? '縮小耐性が不足しています。内側線を細くし、字間を少し広げるか、横幅を100に近づけると小サイズで安定しやすくなります。'
      : 'Scalability is insufficient. Thin the inner stroke, add a little letter spacing, or move width closer to 100 to stabilize small-size display.',
  });

  const bestCandidate = candidates.sort((left, right) => right.impact - left.impact)[0];

  let tip: string;

  if (bestCandidate && (isDanger || !isAcceptable || (!isGood && bestCandidate.impact >= 4))) {
    tip = bestCandidate.tip;
  } else if (!isAcceptable) {
    tip = buildSpecificIssueTip(config, breakdown, lang);
  } else if (!isGood) {
    if (breakdown.contrast.unnecessaryInnerStrokeRisk) {
      tip = lang === 'jp'
        ? '内側線がやや強く、色面を圧迫しています。内側線を少し弱めると、色味を保ちながらよりすっきり見せられます。'
        : 'The inner stroke is slightly strong and compresses the color area. Lighten it a little to keep the color while making the design cleaner.';
    } else if (breakdown.characterComplexity.maxStrokeCount >= 16 && config.fontWeight >= 900) {
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
      ? 'コントラストと縮小耐性のバランスが良く、色味を保ったまま十分見やすい仕上がりです。'
      : 'Contrast and scalability are balanced, so this remains readable while preserving the color character.';
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
