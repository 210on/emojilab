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
