import type { ColorMappingEntry, PixelCell } from "../types";
import { GRID_SIZE as DEFAULT_GRID_SIZE } from "../types";
import { findNearestColor } from "./color";

export function processImageSrc(
  src: string,
  mappingEntries: ColorMappingEntry[],
  gridSize: number = DEFAULT_GRID_SIZE,
): Promise<PixelCell[][]> {
  return new Promise((resolve, reject) => {
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = gridSize;
          canvas.height = gridSize;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("浏览器不支持画布处理。"));
            return;
          }

          ctx.imageSmoothingEnabled = false;
          ctx.clearRect(0, 0, gridSize, gridSize);
          ctx.drawImage(img, 0, 0, gridSize, gridSize);

          const imageData = ctx.getImageData(0, 0, gridSize, gridSize);
          const data = imageData.data;

          const CONTRAST = 1.25;
          const SATURATION = 1.2;
          const DARK_THRESHOLD = 100;
          const LIGHT_THRESHOLD = 155;

          for (let i = 0; i < data.length; i += 4) {
            let r = data[i];
            let g = data[i + 1];
            let b = data[i + 2];
            const a = data[i + 3];

            if (a < 250) {
              data[i] = 255;
              data[i + 1] = 255;
              data[i + 2] = 255;
              continue;
            }

            r = (r - 128) * CONTRAST + 128;
            g = (g - 128) * CONTRAST + 128;
            b = (b - 128) * CONTRAST + 128;

            const gray = 0.299 * r + 0.587 * g + 0.114 * b;
            r = gray + (r - gray) * SATURATION;
            g = gray + (g - gray) * SATURATION;
            b = gray + (b - gray) * SATURATION;

            if (gray < DARK_THRESHOLD) {
              const k = 0.4;
              r *= k; g *= k; b *= k;
            } else if (gray > LIGHT_THRESHOLD) {
              const k = 0.4;
              r = 255 - (255 - r) * k;
              g = 255 - (255 - g) * k;
              b = 255 - (255 - b) * k;
            }

            data[i] = Math.max(0, Math.min(255, Math.round(r)));
            data[i + 1] = Math.max(0, Math.min(255, Math.round(g)));
            data[i + 2] = Math.max(0, Math.min(255, Math.round(b)));
          }

          const newGrid: PixelCell[][] = [];
          for (let y = 0; y < gridSize; y++) {
            const row: PixelCell[] = [];
            for (let x = 0; x < gridSize; x++) {
              const idx = (y * gridSize + x) * 4;
              const r = data[idx];
              const g = data[idx + 1];
              const b = data[idx + 2];
              row.push(findNearestColor(mappingEntries, { r, g, b }));
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
