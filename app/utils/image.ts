import type { ColorMappingEntry, PixelCell, FilterStyle } from "../types";
import { GRID_SIZE as DEFAULT_GRID_SIZE } from "../types";
import { findNearestColor, filterPalette } from "./color";

// 将图片 Data URL 缩放为指定网格大小，并对每个像素进行预处理后匹配最近的颜色表条目
// 参数：
// - src: 图片的 Data URL（或可访问的图片 URL）
// - mappingEntries: 颜色映射条目数组，用于查找最近颜色
// - gridSize: 输出网格尺寸，默认使用 types 中定义的 GRID_SIZE（50）
// 返回：Promise，解析为 PixelCell[][]（二维数组，索引为 [y][x]）
export function processImageSrc(
  src: string,
  mappingEntries: ColorMappingEntry[],
  gridSize: number = DEFAULT_GRID_SIZE,
  filterStyle: FilterStyle = "none",
): Promise<PixelCell[][]> {
  return new Promise((resolve, reject) => {
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";

      img.onload = () => {
        try {
          // 使用 canvas 将图片绘制并缩放到目标网格尺寸
          const canvas = document.createElement("canvas");
          canvas.width = gridSize;
          canvas.height = gridSize;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("浏览器不支持画布处理。"));
            return;
          }

          // 关闭抗锯齿以保持像素块的清晰度
          ctx.imageSmoothingEnabled = false;
          ctx.clearRect(0, 0, gridSize, gridSize);
          ctx.drawImage(img, 0, 0, gridSize, gridSize);

          const imageData = ctx.getImageData(0, 0, gridSize, gridSize);
          const data = imageData.data;

          // 预处理参数：对比度、饱和度以及深/浅阈值，用于增强视觉效果并保持珠子颜色识别
          const CONTRAST = 1.25;
          const SATURATION = 1.2;
          const DARK_THRESHOLD = 100;
          const LIGHT_THRESHOLD = 155;

          // 遍历像素并执行：透明处理、对比度/饱和度调整、针对过暗或过亮的额外压缩/提升
          for (let i = 0; i < data.length; i += 4) {
            let r = data[i];
            let g = data[i + 1];
            let b = data[i + 2];
            const a = data[i + 3];

            // 若存在透明度，则视为白色背景（避免透明区域带来干扰）
            if (a < 250) {
              data[i] = 255;
              data[i + 1] = 255;
              data[i + 2] = 255;
              continue;
            }

            // 简单对比度调整（围绕 128 拉伸）
            r = (r - 128) * CONTRAST + 128;
            g = (g - 128) * CONTRAST + 128;
            b = (b - 128) * CONTRAST + 128;

            // 转为灰度，再按饱和度比率混合回彩色，近似增强色彩
            const gray = 0.299 * r + 0.587 * g + 0.114 * b;
            r = gray + (r - gray) * SATURATION;
            g = gray + (g - gray) * SATURATION;
            b = gray + (b - gray) * SATURATION;

            // 针对过暗或过亮区域进行额外处理，避免纯黑/纯白导致的颜色映射失真
            if (gray < DARK_THRESHOLD) {
              const k = 0.4;
              r *= k; g *= k; b *= k;
            } else if (gray > LIGHT_THRESHOLD) {
              const k = 0.4;
              r = 255 - (255 - r) * k;
              g = 255 - (255 - g) * k;
              b = 255 - (255 - b) * k;
            }

            // 限定到合法的 0-255 整数范围
            data[i] = Math.max(0, Math.min(255, Math.round(r)));
            data[i + 1] = Math.max(0, Math.min(255, Math.round(g)));
            data[i + 2] = Math.max(0, Math.min(255, Math.round(b)));
          }

          // 在映射前根据 filterStyle 生成 activePalette（子集）
          const activePalette = filterPalette(mappingEntries, filterStyle);

          // 将处理后的像素逐一映射到最近的颜色条目（仅在 activePalette 中查找），生成 PixelCell 二维数组
          const newGrid: PixelCell[][] = [];
          for (let y = 0; y < gridSize; y++) {
            const row: PixelCell[] = [];
            for (let x = 0; x < gridSize; x++) {
              const idx = (y * gridSize + x) * 4;
              const r = data[idx];
              const g = data[idx + 1];
              const b = data[idx + 2];
              // findNearestColor 会返回包含 hex 与各商家编号的 PixelCell
              row.push(findNearestColor(activePalette, { r, g, b }, { filterStyle }));
            }
            newGrid.push(row);
          }

          resolve(newGrid);
        } catch (err) {
          reject(err);
        }
      };

      img.onerror = () => reject(new Error("加载图片失败，请重试。"));
      img.src = src;
    } catch (err) {
      reject(err);
    }
  });
}
