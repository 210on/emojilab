import React from 'react';
import {
  OKLCH_FIXED_LIGHTNESS_PALETTE,
  PCCS_BRIGHT_TONE_PALETTE,
  PccsToneColor,
} from '../../../constants/colorPalettes';
import { calculateAPCA } from '../metrics/contrast';
import { calculateWcagContrastRatio } from '../metrics/wcagContrast';

const MAX_APCA_LC = 110;

const getBarWidth = (value: number) => `${Math.min(100, Math.round((value / MAX_APCA_LC) * 100))}%`;

type StrokeDecision = 'required' | 'conditional' | 'optional' | 'avoid';

interface MeasuredColor extends PccsToneColor {
  apcaWhite: number;
  apcaBlack: number;
  wcagWhite: string;
  wcagBlack: string;
  decision: StrokeDecision;
}

const getStrokeDecision = (apcaWhite: number): StrokeDecision => {
  if (apcaWhite < 45) return 'required';
  if (apcaWhite < 60) return 'conditional';
  if (apcaWhite < 70) return 'optional';
  return 'avoid';
};

const decisionMeta: Record<StrokeDecision, { label: string; tone: string; className: string; note: string }> = {
  required: {
    label: '黒内枠 推奨',
    tone: '必須寄り',
    className: 'bg-red-50 text-red-700 ring-red-100 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-900',
    note: '白背景では埋もれやすい。16pxでも輪郭補助が必要。',
  },
  conditional: {
    label: '条件付き',
    tone: '画数次第',
    className: 'bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900',
    note: '短い語なら不要な場合あり。高画数・小サイズでは細めに入れる。',
  },
  optional: {
    label: '基本不要',
    tone: '薄くなら可',
    className: 'bg-neutral-100 text-neutral-700 ring-neutral-200 dark:bg-neutral-800 dark:text-neutral-200 dark:ring-neutral-700',
    note: '白背景で概ね成立。入れるなら細くして字面を潰さない。',
  },
  avoid: {
    label: '付けすぎ注意',
    tone: '不要寄り',
    className: 'bg-blue-50 text-blue-700 ring-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900',
    note: '白背景で十分強い。16pxでは黒内枠が潰れの原因になりやすい。',
  },
};

const measurePalette = (palette: PccsToneColor[]): MeasuredColor[] =>
  palette.map((color) => {
    const apcaWhite = Math.round(calculateAPCA(color.hex, '#FFFFFF'));
    const apcaBlack = Math.round(calculateAPCA(color.hex, '#000000'));

    return {
      ...color,
      apcaWhite,
      apcaBlack,
      wcagWhite: calculateWcagContrastRatio(color.hex, '#FFFFFF').toFixed(2),
      wcagBlack: calculateWcagContrastRatio(color.hex, '#000000').toFixed(2),
      decision: getStrokeDecision(apcaWhite),
    };
  });

const getStats = (colors: MeasuredColor[]) => {
  const whiteValues = colors.map((color) => color.apcaWhite);
  const blackValues = colors.map((color) => color.apcaBlack);
  const whiteMin = Math.min(...whiteValues);
  const whiteMax = Math.max(...whiteValues);
  const blackMin = Math.min(...blackValues);
  const blackMax = Math.max(...blackValues);

  return {
    whiteMin,
    whiteMax,
    whiteSpread: whiteMax - whiteMin,
    blackMin,
    blackMax,
    blackSpread: blackMax - blackMin,
  };
};

const pccsMeasuredColors = measurePalette(PCCS_BRIGHT_TONE_PALETTE);
const oklchMeasuredColors = measurePalette(OKLCH_FIXED_LIGHTNESS_PALETTE);

const linearToSrgb = (value: number) => {
  const clamped = Math.max(0, Math.min(1, value));
  return clamped <= 0.0031308
    ? 12.92 * clamped
    : 1.055 * clamped ** (1 / 2.4) - 0.055;
};

const oklchToLinearRgb = (lightness: number, chroma: number, hue: number) => {
  const hueRadians = (hue * Math.PI) / 180;
  const a = chroma * Math.cos(hueRadians);
  const b = chroma * Math.sin(hueRadians);

  const lPrime = lightness + 0.3963377774 * a + 0.2158037573 * b;
  const mPrime = lightness - 0.1055613458 * a - 0.0638541728 * b;
  const sPrime = lightness - 0.0894841775 * a - 1.2914855480 * b;

  const l = lPrime ** 3;
  const m = mPrime ** 3;
  const s = sPrime ** 3;

  return {
    red: 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    green: -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    blue: -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
  };
};

const isInSrgbGamut = ({ red, green, blue }: ReturnType<typeof oklchToLinearRgb>) =>
  red >= 0 && red <= 1 && green >= 0 && green <= 1 && blue >= 0 && blue <= 1;

const linearRgbToHex = ({ red, green, blue }: ReturnType<typeof oklchToLinearRgb>) =>
  `#${[red, green, blue]
    .map((channel) => Math.round(linearToSrgb(channel) * 255).toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()}`;

const makeContrastBandColor = (hue: number) => {
  const targetWhiteLc = 62;
  const chromaCandidates = [0.18, 0.17, 0.16, 0.15, 0.14, 0.13, 0.12, 0.11, 0.10, 0.09, 0.08];
  let best: { hex: string; lightness: number; chroma: number; whiteLc: number; delta: number } | null = null;

  for (const chroma of chromaCandidates) {
    for (let step = 0; step <= 100; step += 1) {
      const lightness = 0.42 + step * 0.0036;
      const rgb = oklchToLinearRgb(lightness, chroma, hue);
      if (!isInSrgbGamut(rgb)) continue;

      const hex = linearRgbToHex(rgb);
      const whiteLc = Math.round(calculateAPCA(hex, '#FFFFFF'));
      const delta = Math.abs(whiteLc - targetWhiteLc);
      const candidate = { hex, lightness, chroma, whiteLc, delta };

      if (!best || candidate.delta < best.delta || (candidate.delta === best.delta && candidate.chroma > best.chroma)) {
        best = candidate;
      }
    }

    if (best && best.chroma === chroma && best.delta <= 1) {
      break;
    }
  }

  return best ?? { hex: '#777777', lightness: 0.62, chroma: 0, whiteLc: 62, delta: 0 };
};

const OKLCH_CONTRAST_BAND_PALETTE: PccsToneColor[] = Array.from({ length: 12 }, (_, index) => {
  const hue = index * 30;
  const color = makeContrastBandColor(hue);

  return {
    tone: `c${hue}`,
    pccsSymbol: `OKLCH L${color.lightness.toFixed(3)} / C${color.chroma.toFixed(2)} / ${hue}`,
    nameJa: `白背景Lc ${color.whiteLc} / 色相 ${hue}°`,
    hex: color.hex,
    note: 'OKLCHコントラスト帯固定パレット',
  };
});

const oklchContrastBandMeasuredColors = measurePalette(OKLCH_CONTRAST_BAND_PALETTE);

const makeWcagAaDualColor = (hue: number) => {
  let best: { hex: string; lightness: number; chroma: number; whiteRatio: number; blackRatio: number } | null = null;

  for (let chromaStep = 0; chromaStep <= 90; chromaStep += 1) {
    const chroma = 0.22 - chromaStep * 0.002;

    for (let lightnessStep = 0; lightnessStep <= 220; lightnessStep += 1) {
      const lightness = 0.48 + lightnessStep * 0.001;
      const rgb = oklchToLinearRgb(lightness, chroma, hue);
      if (!isInSrgbGamut(rgb)) continue;

      const hex = linearRgbToHex(rgb);
      const whiteRatio = calculateWcagContrastRatio(hex, '#FFFFFF');
      const blackRatio = calculateWcagContrastRatio(hex, '#000000');

      if (whiteRatio < 4.5 || blackRatio < 4.5) continue;

      const candidate = { hex, lightness, chroma, whiteRatio, blackRatio };
      const candidateMargin = Math.min(whiteRatio, blackRatio);
      const bestMargin = best ? Math.min(best.whiteRatio, best.blackRatio) : 0;

      if (!best || candidate.chroma > best.chroma || (candidate.chroma === best.chroma && candidateMargin > bestMargin)) {
        best = candidate;
      }
    }

    if (best && Math.abs(best.chroma - chroma) < 0.0001) {
      break;
    }
  }

  return best ?? { hex: '#767676', lightness: 0.6, chroma: 0, whiteRatio: 4.54, blackRatio: 4.62 };
};

const OKLCH_WCAG_AA_DUAL_PALETTE: PccsToneColor[] = Array.from({ length: 12 }, (_, index) => {
  const hue = index * 30;
  const color = makeWcagAaDualColor(hue);

  return {
    tone: `aa${hue}`,
    pccsSymbol: `OKLCH L${color.lightness.toFixed(3)} / C${color.chroma.toFixed(3)} / ${hue}`,
    nameJa: `WCAG AA 白${color.whiteRatio.toFixed(2)} / 黒${color.blackRatio.toFixed(2)} / 色相 ${hue}°`,
    hex: color.hex,
    note: 'OKLCH WCAG AA 白黒両対応パレット',
  };
});

const oklchWcagAaMeasuredColors = measurePalette(OKLCH_WCAG_AA_DUAL_PALETTE);

const PaletteDistribution: React.FC<{
  title: string;
  description: string;
  colors: MeasuredColor[];
}> = ({ title, description, colors }) => {
  const stats = getStats(colors);

  return (
    <div className="rounded-3xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-sm font-black text-neutral-950 dark:text-white">{title}</h3>
          <p className="mt-1 text-xs font-bold leading-5 text-neutral-500">{description}</p>
        </div>
        <div className="grid grid-cols-2 gap-2 text-[11px] font-black text-neutral-500">
          <span>白Lc {stats.whiteMin}-{stats.whiteMax}</span>
          <span>差 {stats.whiteSpread}</span>
          <span>黒Lc {stats.blackMin}-{stats.blackMax}</span>
          <span>差 {stats.blackSpread}</span>
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800">
        <div className="grid grid-cols-12">
          {colors.map((color) => (
            <div
              key={color.tone}
              className="h-12"
              style={{ backgroundColor: color.hex }}
              title={`${color.tone} ${color.hex}`}
            />
          ))}
        </div>
        <div className="grid grid-cols-12 border-t border-neutral-200 bg-white text-center dark:border-neutral-800 dark:bg-neutral-950">
          {colors.map((color) => {
            const meta = decisionMeta[color.decision];
            return (
              <div key={color.tone} className="min-w-0 border-r border-neutral-100 px-1 py-2 last:border-r-0 dark:border-neutral-800">
                <p className="truncate text-[10px] font-black text-neutral-900 dark:text-white">{color.tone}</p>
                <p className="truncate text-[10px] font-bold text-neutral-500">{meta.tone}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const StrokeSimulation: React.FC<{
  title: string;
  colors: MeasuredColor[];
}> = ({ title, colors }) => (
  <div className="rounded-3xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950">
    <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h3 className="text-sm font-black text-neutral-950 dark:text-white">{title}</h3>
        <p className="mt-1 text-xs font-bold leading-5 text-neutral-500">
          上段は枠なし、下段は黒内枠あり。白背景の16px相当で比較します。
        </p>
      </div>
      <div className="flex gap-4 text-[11px] font-black text-neutral-500">
        <span>上: 枠なし</span>
        <span>下: 黒内枠</span>
      </div>
    </div>

    <div className="mt-4 grid grid-cols-6 gap-2 lg:grid-cols-12">
      {colors.map((color) => {
        const meta = decisionMeta[color.decision];
        const shouldShowStrongStroke = color.decision === 'required' || color.decision === 'conditional';
        const strokeWidth = color.decision === 'required' ? 2 : color.decision === 'conditional' ? 1.5 : 1;

        return (
          <article key={color.tone} className="rounded-2xl border border-neutral-200 bg-white p-2 text-center dark:border-neutral-800">
            <div className="mx-auto grid h-20 w-full place-items-center rounded-xl bg-white">
              <div className="grid gap-1">
                <span className="text-[16px] font-black leading-none" style={{ color: color.hex }}>
                  あ
                </span>
                <span
                  className="text-[16px] font-black leading-none"
                  style={{
                    color: color.hex,
                    WebkitTextStroke: `${strokeWidth}px #000000`,
                    paintOrder: 'stroke fill',
                    textShadow: shouldShowStrongStroke ? '0 0 0 #000' : 'none',
                  }}
                >
                  あ
                </span>
              </div>
            </div>
            <p className="mt-2 text-[10px] font-black text-neutral-900 dark:text-white">{color.tone}</p>
            <p className={`mt-1 rounded-full px-1.5 py-1 text-[9px] font-black ring-1 ${meta.className}`}>
              {meta.tone}
            </p>
          </article>
        );
      })}
    </div>
  </div>
);

const DecisionSummary: React.FC<{ colors: MeasuredColor[] }> = ({ colors }) => (
  <div className="grid gap-2 sm:grid-cols-4">
    {(['required', 'conditional', 'optional', 'avoid'] as StrokeDecision[]).map((decision) => {
      const meta = decisionMeta[decision];
      const matches = colors.filter((color) => color.decision === decision);
      return (
        <div key={decision} className={`rounded-2xl p-3 ring-1 ${meta.className}`}>
          <p className="text-xs font-black">{meta.label}</p>
          <p className="mt-1 text-lg font-black">{matches.map((color) => color.tone).join(' / ') || '-'}</p>
        </div>
      );
    })}
  </div>
);

const DetailRows: React.FC<{ colors: MeasuredColor[] }> = ({ colors }) => (
  <div className="grid gap-3">
    {colors.map((color) => {
      const better = color.apcaWhite >= color.apcaBlack ? 'white' : 'black';
      const meta = decisionMeta[color.decision];

      return (
        <article key={color.tone} className="grid gap-3 rounded-2xl border border-neutral-200 p-3 dark:border-neutral-800 lg:grid-cols-[12rem_8rem_1fr]">
          <div className="flex items-center gap-3">
            <span className="h-10 w-10 shrink-0 rounded-2xl border border-neutral-200 shadow-inner dark:border-neutral-700" style={{ backgroundColor: color.hex }} />
            <div className="min-w-0">
              <p className="text-sm font-black text-neutral-950 dark:text-white">{color.tone} <span className="text-neutral-500">{color.hex}</span></p>
              <p className="truncate text-xs font-bold text-neutral-500">{color.nameJa}</p>
            </div>
          </div>

          <div className={`rounded-2xl px-3 py-2 ring-1 ${meta.className}`}>
            <p className="text-xs font-black">{meta.label}</p>
            <p className="mt-1 text-[11px] font-bold leading-4 opacity-80">{meta.note}</p>
          </div>

          <div className="grid gap-2">
            <div className="grid grid-cols-[3rem_1fr_7.5rem] items-center gap-2">
              <span className="text-xs font-black text-neutral-500">白</span>
              <div className="h-3 rounded-full bg-neutral-100 dark:bg-neutral-800">
                <div className="h-full rounded-full bg-neutral-300" style={{ width: getBarWidth(color.apcaWhite) }} />
              </div>
              <span className={`text-right text-xs font-black ${better === 'white' ? 'text-[var(--accent)]' : 'text-neutral-500'}`}>
                Lc {color.apcaWhite} / {color.wcagWhite}:1
              </span>
            </div>

            <div className="grid grid-cols-[3rem_1fr_7.5rem] items-center gap-2">
              <span className="text-xs font-black text-neutral-500">黒</span>
              <div className="h-3 rounded-full bg-neutral-100 dark:bg-neutral-800">
                <div className="h-full rounded-full bg-neutral-950 dark:bg-white" style={{ width: getBarWidth(color.apcaBlack) }} />
              </div>
              <span className={`text-right text-xs font-black ${better === 'black' ? 'text-[var(--accent)]' : 'text-neutral-500'}`}>
                Lc {color.apcaBlack} / {color.wcagBlack}:1
              </span>
            </div>
          </div>
        </article>
      );
    })}
  </div>
);

const ColorContrastChart: React.FC = () => (
  <section className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="text-lg font-black">Palette Contrast Decision Map</h2>
        <p className="mt-1 text-sm leading-6 text-neutral-500">
          PCCSブライトトーン、OKLCH固定明度、OKLCHコントラスト帯固定、WCAG AA白黒両対応候補を比較します。PCCSは実用候補、OKLCH系は研究上の統制・補正候補です。
        </p>
      </div>
      <div className="flex gap-3 text-xs font-black text-neutral-500">
        <span className="inline-flex items-center gap-1"><span className="h-2 w-5 rounded bg-neutral-300" />白</span>
        <span className="inline-flex items-center gap-1"><span className="h-2 w-5 rounded bg-neutral-950 dark:bg-white" />黒</span>
      </div>
    </div>

    <div className="mt-5 grid gap-4 xl:grid-cols-2">
      <PaletteDistribution
        title="PCCS bright tone"
        description="色彩体系として説明しやすいが、白背景コントラストは色相で大きく変動します。"
        colors={pccsMeasuredColors}
      />
      <PaletteDistribution
        title="OKLCH fixed lightness"
        description="L=0.62 / C=0.10で明度を統制。白背景コントラストのばらつきを抑えた比較条件です。"
        colors={oklchMeasuredColors}
      />
      <PaletteDistribution
        title="OKLCH contrast-band"
        description="白背景Lc 62付近を目標に、色相ごとのLを調整。彩度を残しつつ視認条件を揃える候補です。"
        colors={oklchContrastBandMeasuredColors}
      />
      <PaletteDistribution
        title="OKLCH WCAG AA dual"
        description="白背景・黒背景の両方でWCAG AA 4.5:1以上を満たす候補。両テーマ対応の統制条件です。"
        colors={oklchWcagAaMeasuredColors}
      />
    </div>

    <div className="mt-4 grid gap-4 xl:grid-cols-2">
      <StrokeSimulation title="PCCS bright: 内枠シミュレーション" colors={pccsMeasuredColors} />
      <StrokeSimulation title="OKLCH fixed-L: 内枠シミュレーション" colors={oklchMeasuredColors} />
      <StrokeSimulation title="OKLCH contrast-band: 内枠シミュレーション" colors={oklchContrastBandMeasuredColors} />
      <StrokeSimulation title="OKLCH WCAG AA dual: 内枠シミュレーション" colors={oklchWcagAaMeasuredColors} />
    </div>

    <div className="mt-4">
      <h3 className="mb-3 text-sm font-black text-neutral-950 dark:text-white">PCCS bright の黒内枠判定</h3>
      <DecisionSummary colors={pccsMeasuredColors} />
    </div>

    <div className="mt-5">
      <h3 className="mb-3 text-sm font-black text-neutral-950 dark:text-white">PCCS bright 詳細</h3>
      <DetailRows colors={pccsMeasuredColors} />
    </div>

    <div className="mt-5">
      <h3 className="mb-3 text-sm font-black text-neutral-950 dark:text-white">OKLCH fixed-L 詳細</h3>
      <DetailRows colors={oklchMeasuredColors} />
    </div>

    <div className="mt-5">
      <h3 className="mb-3 text-sm font-black text-neutral-950 dark:text-white">OKLCH contrast-band 詳細</h3>
      <DetailRows colors={oklchContrastBandMeasuredColors} />
    </div>

    <div className="mt-5">
      <h3 className="mb-3 text-sm font-black text-neutral-950 dark:text-white">OKLCH WCAG AA dual 詳細</h3>
      <DetailRows colors={oklchWcagAaMeasuredColors} />
    </div>
  </section>
);

export default ColorContrastChart;
