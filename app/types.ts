// 支持的商家枚举（用于索引颜色编号）
export type Merchant = "MARD" | "COCO" | "漫漫" | "盼盼" | "咪小窝";

// 每个商家对应的颜色编号映射，例如 { MARD: "01", COCO: "A1", ... }
export type ColorCodes = Record<Merchant, string>;

// 颜色映射条目：用于构建查找数组
// - hex: 原始十六进制颜色字符串（例如 "#FF0000"）
// - r/g/b: 对应的数值，便于计算颜色距离
// - codes: 包含每个商家的颜色编号
export type ColorMappingEntry = {
  hex: string;
  r: number;
  g: number;
  b: number;
  codes: ColorCodes;
};

// 最终在像素网格中使用的单元：包含展示用的 hex 与各商家编号
export type PixelCell = {
  hex: string;
  codes: ColorCodes;
};

// 全部商家列表（用于渲染选择按钮等）
export const MERCHANTS: Merchant[] = ["MARD", "COCO", "漫漫", "盼盼", "咪小窝"];

// 输出网格尺寸（宽/高），当前项目固定为 50
export const GRID_SIZE = 50;

// 支持的色彩风格，用于调色板子集过滤
export type FilterStyle = "none" | "candy" | "grayscale";
