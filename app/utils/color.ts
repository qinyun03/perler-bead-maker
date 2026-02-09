import type { ColorCodes, ColorMappingEntry, PixelCell, FilterStyle } from "../types";

// 将 6 位十六进制颜色（#rrggbb 或 rrggbb）转换为 RGB 数值
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

// 计算两种颜色的平方欧氏距离（RGB 空间）
// 使用平方距离避免昂贵的开方运算，足以用于最近邻比较
export function colorDistanceSq(
  a: { r: number; g: number; b: number },
  b: { r: number; g: number; b: number },
): number {
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return dr * dr + dg * dg + db * db;
}

// 将 colorSystemMapping（以 hex 为键，codes 为值）转换为便于查找的数组结构
// 每一项包含 hex、r/g/b 以及对应各商家的编号
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

// 将 RGB 转为 HSL（h: 0-360, s: 0-100, l: 0-100）
export function rgbToHsl({ r, g, b }: { r: number; g: number; b: number }): { h: number; s: number; l: number } {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rn:
        h = (gn - bn) / d + (gn < bn ? 6 : 0);
        break;
      case gn:
        h = (bn - rn) / d + 2;
        break;
      case bn:
        h = (rn - gn) / d + 4;
        break;
    }
    h *= 60;
  }

  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
}

// 将 HSL 转回 RGB，h:0-360, s:0-100, l:0-100
export function hslToRgb({ h, s, l }: { h: number; s: number; l: number }): { r: number; g: number; b: number } {
  const hh = h / 360;
  const ss = s / 100;
  const ll = l / 100;

  if (ss === 0) {
    const val = Math.round(ll * 255);
    return { r: val, g: val, b: val };
  }

  const q = ll < 0.5 ? ll * (1 + ss) : ll + ss - ll * ss;
  const p = 2 * ll - q;
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  const r = hue2rgb(p, q, hh + 1 / 3);
  const g = hue2rgb(p, q, hh);
  const b = hue2rgb(p, q, hh - 1 / 3);

  return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
}

// 根据 FilterStyle 对 mappingEntries 做子集过滤，返回筛选后的 activePalette
export function filterPalette(mappingEntries: ColorMappingEntry[], filterStyle: FilterStyle): ColorMappingEntry[] {
  if (filterStyle === "none") return mappingEntries;

  const filtered = mappingEntries.filter((entry) => {
    const { h, s, l } = rgbToHsl({ r: entry.r, g: entry.g, b: entry.b });
    switch (filterStyle) {
      case "candy":
        // Candy Pop 智能筛选：保留鲜艳的深色与柔和的浅色，避免过曝丢失马卡龙色
        if (entry.hex.toUpperCase() === "#FFFFFF") return true;
        if (entry.hex.toUpperCase() === "#000000") return true;
        // 规则 A（高亮区）：L > 70 -> 允许较低饱和度以保留浅色马卡龙（S > 10）
        if (l > 70) return s > 10;
        // 规则 B（中间/暗调）：L <= 70 -> 要求较高饱和度（S > 40）以保证色彩鲜明
        return s > 40;
      case "grayscale":
        return s < 5; // 极低饱和 -> 黑白灰
      default:
        return true;
    }
  });

  return filtered.length > 0 ? filtered : mappingEntries;
}

// 在已知颜色条目中寻找与给定 RGB 最接近的颜色，返回 PixelCell（包含 hex 与各商家编号）
// 若找不到条目（理论上不会发生），返回一个默认的白色占位对象
export function findNearestColor(
  mappingEntries: ColorMappingEntry[],
  rgb: { r: number; g: number; b: number },
  options?: { filterStyle?: FilterStyle },
): PixelCell {
  let best: ColorMappingEntry | null = null;
  let bestDist = Number.POSITIVE_INFINITY;

  // ignore style-specific weighting here; palette filtering handles candy/grayscale
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
