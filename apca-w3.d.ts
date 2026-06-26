declare module 'apca-w3' {
  export function sRGBtoY(rgb: [number, number, number, number] | [number, number, number]): number;
  export function APCAcontrast(txtY: number, bgY: number, places?: number): number;
}
