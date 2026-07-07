import { APCAcontrast, sRGBtoY } from 'apca-w3';

const hexToSRGB = (hex: string): [number, number, number, number] => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
  1,
];

export const calculateAPCA = (fgHex: string, bgHex: string): number => {
  const contrast = APCAcontrast(
    sRGBtoY(hexToSRGB(fgHex)),
    sRGBtoY(hexToSRGB(bgHex)),
  );

  return Number.isFinite(contrast) ? Math.abs(contrast) : 0;
};
