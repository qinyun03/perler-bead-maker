import type { ColorCodes, ColorMappingEntry, PixelCell } from "../types";

// 十六进制颜色转 RGB
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const normalized = hex.startsWith("#") ? hex : `#${hex}`;
  const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(normalized);
  if (!match) return null;
  return {
    r: parseInt(match[1], 16),
    g: parseInt(match[2], 16),
    b: parseInt(match[3], 16),
  };
}

export function colorDistanceSq(
  a: { r: number; g: number; b: number },
  b: { r: number; g: number; b: number },
): number {
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return dr * dr + dg * dg + db * db;
}

export function createMappingEntries(mapping: Record<string, ColorCodes>): ColorMappingEntry[] {
  return Object.entries(mapping).flatMap(([hex, codesObj]) => {
    const rgb = hexToRgb(hex);
    if (!rgb) return [];
    const codes = codesObj as ColorCodes;
    return [
      {
        hex,
        r: rgb.r,
        g: rgb.g,
        b: rgb.b,
        codes,
      },
    ];
  });
}

export function findNearestColor(mappingEntries: ColorMappingEntry[], rgb: { r: number; g: number; b: number }): PixelCell {
  let best: ColorMappingEntry | null = null;
  let bestDist = Number.POSITIVE_INFINITY;

  for (const entry of mappingEntries) {
    const dist = colorDistanceSq(rgb, entry);
    if (dist < bestDist) {
      bestDist = dist;
      best = entry;
    }
  }

  if (!best) {
    return {
      hex: "#FFFFFF",
      codes: {
        MARD: "-",
        COCO: "-",
        漫漫: "-",
        盼盼: "-",
        咪小窝: "-",
      },
    };
  }

  return {
    hex: best.hex,
    codes: best.codes,
  };
}
