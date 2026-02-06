export type Merchant = "MARD" | "COCO" | "漫漫" | "盼盼" | "咪小窝";

export type ColorCodes = Record<Merchant, string>;

export type ColorMappingEntry = {
  hex: string;
  r: number;
  g: number;
  b: number;
  codes: ColorCodes;
};

export type PixelCell = {
  hex: string;
  codes: ColorCodes;
};

export const MERCHANTS: Merchant[] = ["MARD", "COCO", "漫漫", "盼盼", "咪小窝"];
export const GRID_SIZE = 50;
