
import { EmojiConfig, Language, ScoreMetrics } from "../types";
import { getStrokeMetrics } from "../utils/kanjiStrokeCounts";

type FeedbackMetrics = Pick<ScoreMetrics, 'contrastRatio' | 'scalability'>;

interface DesignFeedbackResult {
  score: number;
  tip: string;
}

type StrokeProfile = 'outer-missing' | 'outer-thin' | 'inner-heavy' | 'strong-both' | 'outer-stable';
type FeedbackBand = 'danger' | 'improve' | 'acceptable' | 'good';

const ACCEPTABLE_CONTRAST = 60;
const GOOD_CONTRAST = 75;
const ACCEPTABLE_SCALABILITY = 72;
const GOOD_SCALABILITY = 82;

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const normalizeContrastScore = (contrastRatio: number) => {
  if (contrastRatio >= 75) {
    return 88 + Math.min(12, (contrastRatio - 75) * 0.8);
  }

  if (contrastRatio >= 45) {
    return 55 + (contrastRatio - 45) * 1.1;
  }

  return Math.max(12, 20 + contrastRatio * 0.75);
};

const getColorProfile = (hex: string) => {
  const normalized = hex.replace('#', '');
  const r = parseInt(normalized.slice(0, 2), 16) / 255;
  const g = parseInt(normalized.slice(2, 4), 16) / 255;
  const b = parseInt(normalized.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  const lightness = (max + min) / 2;

  let hue = 0;
  if (delta !== 0) {
    if (max === r) hue = ((g - b) / delta) % 6;
    else if (max === g) hue = (b - r) / delta + 2;
    else hue = (r - g) / delta + 4;
    hue *= 60;
    if (hue < 0) hue += 360;
  }

  const saturation = delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1));

  let family: 'yellow' | 'orange' | 'red' | 'pink' | 'purple' | 'blue' | 'cyan' | 'green' | 'white' | 'black' | 'gray';
  if (lightness > 0.9 && saturation < 0.18) family = 'white';
  else if (lightness < 0.18 && saturation < 0.2) family = 'black';
  else if (saturation < 0.15) family = 'gray';
  else if (hue < 20 || hue >= 345) family = 'red';
  else if (hue < 45) family = 'orange';
  else if (hue < 68) family = 'yellow';
  else if (hue < 150) family = 'green';
  else if (hue < 190) family = 'cyan';
  else if (hue < 255) family = 'blue';
  else if (hue < 320) family = 'purple';
  else family = 'pink';

  return {
    family,
    lightness,
    saturation,
    isVeryLight: lightness > 0.82,
    isVeryDark: lightness < 0.2,
  };
};

const getStrokeProfile = (config: EmojiConfig): StrokeProfile => {
  if (!config.stroke2Enabled || config.stroke2Width <= 1) {
    return 'outer-missing' as const;
  }

  if (config.stroke2Width < 8) {
    return 'outer-thin' as const;
  }

  if (config.stroke1Enabled && config.stroke1Width >= 10 && config.fontWeight >= 700) {
    return 'inner-heavy' as const;
  }

  if (config.stroke1Enabled && config.stroke1Width >= 3 && config.stroke2Width >= 8 && config.stroke2Width <= 14) {
    return 'strong-both' as const;
  }

  return 'outer-stable' as const;
};

const getCharacterComplexityScore = (text: string) => {
  const chars = [...text].filter((char) => char.trim().length > 0);
  const charCount = chars.length;
  const symbolCount = chars.filter((char) => /[!！?？。、,.・ー〜~…\-]/.test(char)).length;
  const kanaCount = chars.filter((char) => /[\u3040-\u30ff]/.test(char)).length;
  const strokeMetrics = getStrokeMetrics(text);

  let score = 92;

  if (charCount >= 5) score -= 28;
  else if (charCount === 4) score -= 18;
  else if (charCount === 3) score -= 10;

  if (symbolCount >= 2) score -= 8;
  else if (symbolCount === 1) score -= 3;

  if (charCount > 0 && kanaCount / charCount >= 0.7) score += 4;

  if (strokeMetrics.knownKanjiCount > 0) {
    if (strokeMetrics.maxStrokeCount >= 20) score -= 16;
    else if (strokeMetrics.maxStrokeCount >= 16) score -= 11;
    else if (strokeMetrics.maxStrokeCount >= 14) score -= 7;

    if (strokeMetrics.totalStrokeCount >= 36) score -= 10;
    else if (strokeMetrics.totalStrokeCount >= 24) score -= 6;

    if (strokeMetrics.denseKanjiCount >= 2) score -= 10;
    else if (strokeMetrics.denseKanjiCount === 1) score -= 5;
  }

  if (strokeMetrics.unknownKanjiCount >= 2) score -= 8;
  else if (strokeMetrics.unknownKanjiCount === 1) score -= 4;

  return clamp(score, 30, 100);
};

const getHeuristicScore = (text: string, config: EmojiConfig) => {
  let score = getCharacterComplexityScore(text);
  const strokeMetrics = getStrokeMetrics(text);

  if (config.fontWeight < 400) score -= 18;
  else if (config.fontWeight < 600) score -= 8;
  else if (config.fontWeight >= 800) score += 4;

  if (!config.stroke2Enabled || config.stroke2Width <= 1) score -= 18;
  else if (config.stroke2Width < 8) score -= 10;
  else if (config.stroke2Width <= 14) score += 8;
  else score += 3;

  if (config.stroke1Enabled && config.stroke1Width >= 10 && config.fontWeight >= 700) score -= 16;
  else if (config.stroke1Enabled && config.stroke1Width >= 4) score += 3;

  if (Math.abs(config.spacing) > 42) score -= 10;
  else if (Math.abs(config.spacing) > 28) score -= 5;

  if (Math.abs(config.letterSpacing) > 20) score -= 8;
  else if (Math.abs(config.letterSpacing) > 12) score -= 4;

  if (config.condense < 72 || config.condense > 132) score -= 9;
  else if (config.condense < 82 || config.condense > 122) score -= 4;

  if (strokeMetrics.denseKanjiCount > 0 && config.fontWeight >= 800) score -= 11;
  if (strokeMetrics.denseKanjiCount > 0 && config.stroke1Enabled && config.stroke1Width >= 8) score -= 9;
  if (strokeMetrics.maxStrokeCount >= 20 && config.condense < 90) score -= 8;
  if (strokeMetrics.unknownKanjiCount > 0 && config.fontWeight >= 800) score -= 5;

  return clamp(score, 0, 100);
};

const getLocalizedColorName = (
  family: ReturnType<typeof getColorProfile>['family'],
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

function buildDesignSupportFeedback(
  text: string,
  config: EmojiConfig,
  lang: Language,
  metrics: FeedbackMetrics,
): DesignFeedbackResult {
  const contrastScore = normalizeContrastScore(metrics.contrastRatio);
  const heuristicScore = getHeuristicScore(text, config);
  const colorProfile = getColorProfile(config.mainColor);
  const strokeProfile = getStrokeProfile(config);
  const strokeMetrics = getStrokeMetrics(text);

  const score = Math.round(clamp(
    contrastScore * 0.45 + metrics.scalability * 0.35 + heuristicScore * 0.2,
    0,
    100,
  ));

  const band: FeedbackBand =
    metrics.contrastRatio < 45 || metrics.scalability < 60
      ? 'danger'
      : metrics.contrastRatio >= GOOD_CONTRAST &&
          metrics.scalability >= GOOD_SCALABILITY &&
          score >= 84 &&
          strokeProfile !== 'outer-missing' &&
          strokeProfile !== 'outer-thin' &&
          strokeProfile !== 'inner-heavy'
        ? 'good'
        : metrics.contrastRatio >= ACCEPTABLE_CONTRAST &&
            metrics.scalability >= ACCEPTABLE_SCALABILITY &&
            score >= 70 &&
            strokeProfile !== 'outer-missing'
          ? 'acceptable'
          : 'improve';

  const colorName = getLocalizedColorName(colorProfile.family, lang);

  let tip: string;

  if (band === 'danger') {
    if (metrics.contrastRatio < 45) {
      tip = lang === 'jp'
        ? '背景との差が弱いので、塗り色を濃くするか外側の線を強めると見やすくなります。'
        : 'Contrast is weak, so darken the fill or strengthen the outer stroke for better clarity.';
    } else if (strokeMetrics.maxStrokeCount >= 16 && config.fontWeight >= 800) {
      tip = lang === 'jp'
        ? '画数の多い漢字に太めのウェイトが重なり、小サイズで詰まりやすいです。太さか内側線を少し弱めると安定します。'
        : 'Dense Kanji plus a heavy weight may clog at small sizes, so ease the weight or inner stroke slightly.';
    } else if (strokeMetrics.denseKanjiCount > 0) {
      tip = lang === 'jp'
        ? '画数の多い漢字が含まれるので、小さい表示ではつぶれやすいです。ひらがな化や文字数整理も有効です。'
        : 'Dense Kanji are included, so they may blur at small sizes. Hiragana or fewer characters can help.';
    } else if (strokeMetrics.unknownKanjiCount > 0 && config.fontWeight >= 800) {
      tip = lang === 'jp'
        ? '未登録の漢字を含むため保守的に評価しています。太めの設定では小サイズで詰まらないか確認してください。'
        : 'This includes Kanji outside the stroke table, so it is rated conservatively. Check that the heavy weight does not clog at small sizes.';
    } else {
      tip = lang === 'jp'
        ? '小さい表示でつぶれやすいので、文字数を減らすか線幅を整理すると安定します。'
        : 'This may blur at small sizes, so reduce character count or simplify the stroke widths.';
    }
  } else if (band === 'improve') {
    if (strokeMetrics.maxStrokeCount >= 16 && config.fontWeight >= 800) {
      tip = lang === 'jp'
        ? '高画数の漢字に太いウェイトが重なっているので、太さを少し下げると字面の抜けが良くなります。'
        : 'High-stroke Kanji plus a heavy weight are making the form dense, so a slightly lighter weight should open it up.';
    } else if (strokeMetrics.denseKanjiCount > 0 && config.stroke1Enabled && config.stroke1Width >= 8) {
      tip = lang === 'jp'
        ? '画数の多い漢字に内側の線が強く、字面が詰まりやすいです。内側を少し細くすると安定します。'
        : 'Dense Kanji with a strong inner stroke can clog the form, so thinning the inner stroke should help.';
    } else if (strokeMetrics.unknownKanjiCount > 0 && config.fontWeight >= 800) {
      tip = lang === 'jp'
        ? '画数未登録の漢字を含むため、太さを少し抑えて小サイズでの詰まりを確認すると安全です。'
        : 'Some Kanji are outside the stroke table, so a slightly lighter weight is safer for small-size checks.';
    } else if (strokeProfile === 'outer-missing') {
      tip = lang === 'jp'
        ? '外側の線が弱いので、縁取りを足すと色味を保ったまま見やすさを上げやすいです。'
        : 'The outer stroke is too weak, so adding one will improve readability without losing the color feel.';
    } else if (strokeProfile === 'outer-thin') {
      tip = lang === 'jp'
        ? '外側の線が細めなので、少し太くすると小サイズでも輪郭が保ちやすくなります。'
        : 'The outer stroke is a little thin, so making it thicker should hold the silhouette better.';
    } else if (strokeProfile === 'inner-heavy') {
      tip = lang === 'jp'
        ? '内側の線が強めで詰まりやすいので、少し細くすると文字の抜けが良くなります。'
        : 'The inner stroke is heavy and may clog the form, so thinning it slightly should open it up.';
    } else if (colorProfile.isVeryLight || colorProfile.family === 'white') {
      tip = lang === 'jp'
        ? '白系の塗りは軽やかですが埋もれやすいので、外側の線を少し強めると安定します。'
        : 'White-toned fills feel light, but they disappear easily, so a slightly stronger outer stroke will help.';
    } else {
      tip = lang === 'jp'
        ? `${colorName}の印象は活かせていますが、線幅を少し整えると見やすさがもう一段安定します。`
        : `The ${colorName} tone works well, and a small stroke adjustment should make it steadier.`;
    }
  } else if (band === 'acceptable') {
    if (strokeMetrics.maxStrokeCount >= 16 && config.fontWeight >= 800) {
      tip = lang === 'jp'
        ? 'このままでも読めますが、高画数の漢字は太さを少し軽くすると小サイズでさらに安定します。'
        : 'This is readable, but dense Kanji would hold a little better at small sizes with a slightly lighter weight.';
    } else if (strokeProfile === 'strong-both') {
      tip = lang === 'jp'
        ? 'このままでも十分見やすく、色味も保てています。必要なら線幅を少しだけ軽くするとさらに自然です。'
        : 'This is already readable while keeping the intended color feel. You could lighten the strokes slightly for a softer look.';
    } else if (colorProfile.family === 'blue' || colorProfile.family === 'cyan') {
      tip = lang === 'jp'
        ? `${colorName}でも見やすさは許容範囲です。必要なら外側の線を少し強めるとさらに安定します。`
        : `Even in ${colorName}, the readability is acceptable. A slightly stronger outer stroke would make it even steadier.`;
    } else {
      tip = lang === 'jp'
        ? 'このスコアなら見やすさは許容範囲です。色味を保ちたい場合はこの方向で進められます。'
        : 'At this score, readability is within an acceptable range, so you can keep this color direction if you want to preserve the mood.';
    }
  } else if (colorProfile.family === 'yellow' || colorProfile.family === 'orange') {
    tip = lang === 'jp'
      ? `${colorName}の塗りと枠線のバランスが良く、小サイズでも視認性を保ちやすい構成です。`
      : `${colorName} fills pair well with the strokes and stay readable even at small sizes.`;
  } else {
    tip = lang === 'jp'
      ? 'コントラストと線のバランスが良く、色味を保ったまま十分見やすい仕上がりです。'
      : 'The contrast and stroke balance are strong, so this stays readable while keeping the color character.';
  }

  return { score, tip };
}

export async function analyzeDesignSupport(
  text: string, 
  config: EmojiConfig,
  lang: Language,
  metrics: FeedbackMetrics,
) {
  return buildDesignSupportFeedback(text, config, lang, metrics);
}
