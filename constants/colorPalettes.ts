export interface PccsToneColor {
  tone: string;
  pccsSymbol: string;
  nameJa: string;
  hex: string;
  note?: string;
}

export const PCCS_BRIGHT_TONE_PALETTE: PccsToneColor[] = [
  { tone: 'b2', pccsSymbol: '2:R-6.0-8s', nameJa: '明るい赤 / 珊瑚色', hex: '#F9344C' },
  { tone: 'b4', pccsSymbol: '4:rO-6.5-8s', nameJa: '黄赤 / 柿色', hex: '#FC4E32' },
  { tone: 'b6', pccsSymbol: '6:yO-7.5-8s', nameJa: 'オレンジ', hex: '#FF9914' },
  { tone: 'b8', pccsSymbol: '8:Y-8.5-8', nameJa: '緑みの黄 / カナリア色', hex: '#FFF231' },
  { tone: 'b10', pccsSymbol: '10:YG-7.5-8s', nameJa: '黄緑 / 若草色', hex: '#99D02B' },
  { tone: 'b12', pccsSymbol: '12:G-6.5-8s', nameJa: '明るい緑', hex: '#33A65E' },
  { tone: 'b14', pccsSymbol: '14:BG-6.0-8s', nameJa: '青緑 / ピーコックグリーン', hex: '#1AA18E' },
  { tone: 'b16', pccsSymbol: '16:gB-5.5-8s', nameJa: '明るい緑みの青', hex: '#1D86AE' },
  { tone: 'b18', pccsSymbol: '18:B-5.0-8s', nameJa: '青 / 露草色', hex: '#386CB0' },
  { tone: 'b20', pccsSymbol: '20:V-5.0-8s', nameJa: '青紫 / 菫色', hex: '#6964AD' },
  { tone: 'b22', pccsSymbol: '22:P-5.0-8s', nameJa: '青みの紫 / モーブ', hex: '#A45AAA' },
  { tone: 'b24', pccsSymbol: '24:RP-5.5-8s', nameJa: 'あざやかな赤紫 / 牡丹色', hex: '#DF4C94' },
];

export const DEFAULT_PRESET_COLOR_SLOTS = PCCS_BRIGHT_TONE_PALETTE.map((color) => color.hex);

export const MEGAMOJI_FONT_COLOR_PALETTE: PccsToneColor[] = [
  { tone: 'mega-k0', pccsSymbol: 'Megamoji font color / neutral 0', nameJa: 'Megamoji 黒', hex: '#000000', note: 'MEGAMOJI fontcolors.ts' },
  { tone: 'mega-k1', pccsSymbol: 'Megamoji font color / neutral 1', nameJa: 'Megamoji 暗灰', hex: '#3F3F3F', note: 'MEGAMOJI fontcolors.ts' },
  { tone: 'mega-k2', pccsSymbol: 'Megamoji font color / neutral 2', nameJa: 'Megamoji 灰', hex: '#7F7F7F', note: 'MEGAMOJI fontcolors.ts' },
  { tone: 'mega-k3', pccsSymbol: 'Megamoji font color / neutral 3', nameJa: 'Megamoji 明灰', hex: '#BFBFBF', note: 'MEGAMOJI fontcolors.ts' },
  { tone: 'mega-k4', pccsSymbol: 'Megamoji font color / neutral 4', nameJa: 'Megamoji 白', hex: '#FFFFFF', note: 'MEGAMOJI fontcolors.ts' },
  { tone: 'mega-r1', pccsSymbol: 'Megamoji red / dark', nameJa: 'Megamoji 赤 暗', hex: '#990009', note: 'MEGAMOJI fontcolors.ts' },
  { tone: 'mega-y1', pccsSymbol: 'Megamoji yellow / dark', nameJa: 'Megamoji 黄 暗', hex: '#996E00', note: 'MEGAMOJI fontcolors.ts' },
  { tone: 'mega-g1', pccsSymbol: 'Megamoji green / dark', nameJa: 'Megamoji 緑 暗', hex: '#014C00', note: 'MEGAMOJI fontcolors.ts' },
  { tone: 'mega-c1', pccsSymbol: 'Megamoji lightblue / dark', nameJa: 'Megamoji 水色 暗', hex: '#00517F', note: 'MEGAMOJI fontcolors.ts' },
  { tone: 'mega-b1', pccsSymbol: 'Megamoji blue / dark', nameJa: 'Megamoji 青 暗', hex: '#000699', note: 'MEGAMOJI fontcolors.ts' },
  { tone: 'mega-v1', pccsSymbol: 'Megamoji purple / dark', nameJa: 'Megamoji 紫 暗', hex: '#4C0099', note: 'MEGAMOJI fontcolors.ts' },
  { tone: 'mega-p1', pccsSymbol: 'Megamoji pink / dark', nameJa: 'Megamoji 桃 暗', hex: '#7F0063', note: 'MEGAMOJI fontcolors.ts' },
  { tone: 'mega-r2', pccsSymbol: 'Megamoji red / vivid', nameJa: 'Megamoji 赤', hex: '#FF000F', note: 'MEGAMOJI fontcolors.ts' },
  { tone: 'mega-y2', pccsSymbol: 'Megamoji yellow / vivid', nameJa: 'Megamoji 黄', hex: '#FFB700', note: 'MEGAMOJI fontcolors.ts' },
  { tone: 'mega-g2', pccsSymbol: 'Megamoji green / vivid', nameJa: 'Megamoji 緑', hex: '#03B200', note: 'MEGAMOJI fontcolors.ts' },
  { tone: 'mega-c2', pccsSymbol: 'Megamoji lightblue / vivid', nameJa: 'Megamoji 水色', hex: '#0092E5', note: 'MEGAMOJI fontcolors.ts' },
  { tone: 'mega-b2', pccsSymbol: 'Megamoji blue / vivid', nameJa: 'Megamoji 青', hex: '#000AFF', note: 'MEGAMOJI fontcolors.ts' },
  { tone: 'mega-v2', pccsSymbol: 'Megamoji purple / vivid', nameJa: 'Megamoji 紫', hex: '#7F00FF', note: 'MEGAMOJI fontcolors.ts' },
  { tone: 'mega-p2', pccsSymbol: 'Megamoji pink / vivid', nameJa: 'Megamoji 桃', hex: '#E500B3', note: 'MEGAMOJI fontcolors.ts' },
  { tone: 'mega-r3', pccsSymbol: 'Megamoji red / light', nameJa: 'Megamoji 赤 明', hex: '#FF656F', note: 'MEGAMOJI fontcolors.ts' },
  { tone: 'mega-y3', pccsSymbol: 'Megamoji yellow / light', nameJa: 'Megamoji 黄 明', hex: '#FECD4C', note: 'MEGAMOJI fontcolors.ts' },
  { tone: 'mega-g3', pccsSymbol: 'Megamoji green / light', nameJa: 'Megamoji 緑 明', hex: '#04E500', note: 'MEGAMOJI fontcolors.ts' },
  { tone: 'mega-c3', pccsSymbol: 'Megamoji lightblue / light', nameJa: 'Megamoji 水色 明', hex: '#32B5FF', note: 'MEGAMOJI fontcolors.ts' },
  { tone: 'mega-b3', pccsSymbol: 'Megamoji blue / light', nameJa: 'Megamoji 青 明', hex: '#656CFF', note: 'MEGAMOJI fontcolors.ts' },
  { tone: 'mega-v3', pccsSymbol: 'Megamoji purple / light', nameJa: 'Megamoji 紫 明', hex: '#B265FF', note: 'MEGAMOJI fontcolors.ts' },
  { tone: 'mega-p3', pccsSymbol: 'Megamoji pink / light', nameJa: 'Megamoji 桃 明', hex: '#FE4CD7', note: 'MEGAMOJI fontcolors.ts' },
];

const linearToSrgb = (value: number) => {
  const clamped = Math.max(0, Math.min(1, value));
  return clamped <= 0.0031308
    ? 12.92 * clamped
    : 1.055 * clamped ** (1 / 2.4) - 0.055;
};

const oklchToHex = (lightness: number, chroma: number, hue: number) => {
  const hueRadians = (hue * Math.PI) / 180;
  const a = chroma * Math.cos(hueRadians);
  const b = chroma * Math.sin(hueRadians);

  const lPrime = lightness + 0.3963377774 * a + 0.2158037573 * b;
  const mPrime = lightness - 0.1055613458 * a - 0.0638541728 * b;
  const sPrime = lightness - 0.0894841775 * a - 1.2914855480 * b;

  const l = lPrime ** 3;
  const m = mPrime ** 3;
  const s = sPrime ** 3;

  const red = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const green = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const blue = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;

  return `#${[red, green, blue]
    .map((channel) => Math.round(linearToSrgb(channel) * 255).toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()}`;
};

export const OKLCH_FIXED_LIGHTNESS_PALETTE: PccsToneColor[] = Array.from({ length: 12 }, (_, index) => {
  const hue = index * 30;
  const lightness = 0.62;
  const chroma = 0.10;

  return {
    tone: `h${hue}`,
    pccsSymbol: `OKLCH ${Math.round(lightness * 100)}% / ${chroma.toFixed(2)} / ${hue}`,
    nameJa: `固定明度 ${Math.round(lightness * 100)} / 色相 ${hue}°`,
    hex: oklchToHex(lightness, chroma, hue),
    note: 'OKLCH固定明度パレット',
  };
});
