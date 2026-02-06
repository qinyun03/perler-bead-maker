"use client";

import { useMemo, useRef, useState } from "react";
import colorSystemMapping from "./colorSystemMapping.json";

// 支持的商家类型
type Merchant = "MARD" | "COCO" | "漫漫" | "盼盼" | "咪小窝";

// 每个颜色在五个商家下对应的编号
type ColorCodes = Record<Merchant, string>;

// 颜色映射表中一条记录的结构（带预计算好的 RGB）
type ColorMappingEntry = {
  hex: string; // 颜色原始十六进制值（来自 colorSystemMapping.json 的 key）
  r: number;
  g: number;
  b: number;
  codes: ColorCodes; // 不同商家的编号
};

// 像素网格中每一个格子的内容
type PixelCell = {
  hex: string; // 该格子最终选用的颜色（十六进制）
  codes: ColorCodes; // 该颜色在五个商家的编号
};

// 商家列表顺序，用于渲染按钮
const MERCHANTS: Merchant[] = ["MARD", "COCO", "漫漫", "盼盼", "咪小窝"];
// 固定网格大小为 50 × 50
const GRID_SIZE = 50;

// 十六进制颜色转 RGB，方便后续计算颜色距离
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const normalized = hex.startsWith("#") ? hex : `#${hex}`;
  const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(normalized);
  if (!match) return null;
  return {
    r: parseInt(match[1], 16),
    g: parseInt(match[2], 16),
    b: parseInt(match[3], 16),
  };
}

// 计算两种颜色的“欧氏距离平方”，用来做最近颜色匹配
function colorDistanceSq(a: { r: number; g: number; b: number }, b: {
  r: number;
  g: number;
  b: number;
}): number {
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return dr * dr + dg * dg + db * db;
}

export default function Home() {
  // 当前选中的商家
  const [selectedMerchant, setSelectedMerchant] = useState<Merchant>("MARD");
  // 上传图片的 base64 地址，用于左侧预览
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  // 生成好的 50 × 50 网格，每个格子是 PixelCell
  const [grid, setGrid] = useState<PixelCell[][] | null>(null);
  // 是否正在处理图片（压缩 + 取色 + 匹配）
  const [processing, setProcessing] = useState(false);
  // 错误信息展示
  const [error, setError] = useState<string | null>(null);
  // 文件 input 的引用，用于“清空重新选择”时重置
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // 预处理颜色映射：把 JSON 转成包含 RGB 的数组，便于后续做最近颜色匹配
  const mappingEntries: ColorMappingEntry[] = useMemo(() => {
    return Object.entries(colorSystemMapping).flatMap(([hex, codesObj]) => {
      const rgb = hexToRgb(hex);
      if (!rgb) {
        // 如果 hex 非法，直接丢弃该条记录
        return [];
      }
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
  }, []);

  // 处理文件上传：读成 dataURL，并触发图片处理
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("请选择图片文件。");
      return;
    }

    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        setImageSrc(result);
        processImage(result);
      }
    };
    reader.onerror = () => {
      setError("读取图片失败，请重试。");
    };
    reader.readAsDataURL(file);
  };

  // 给定一个 RGB 颜色，在映射表中找到“最近”的一条颜色记录
  const findNearestColor = (rgb: { r: number; g: number; b: number }): PixelCell => {
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
  };

  // 最简化算法：缩放 → 预对比度 → 最近颜色映射（无抖动）
  const processImage = (src: string) => {
    setProcessing(true);
    try {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = GRID_SIZE;
          canvas.height = GRID_SIZE;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            setError("浏览器不支持画布处理。");
            setProcessing(false);
            return;
          }

          // 第一步：简单缩放（关闭平滑，避免抗锯齿产生灰色杂点）
          ctx.imageSmoothingEnabled = false;
          ctx.clearRect(0, 0, GRID_SIZE, GRID_SIZE);
          ctx.drawImage(img, 0, 0, GRID_SIZE, GRID_SIZE);

          const imageData = ctx.getImageData(0, 0, GRID_SIZE, GRID_SIZE);
          const data = imageData.data;

          const CONTRAST = 1.25;
          const SATURATION = 1.2;
          const DARK_THRESHOLD = 100;   // 低于此灰度视为近黑
          const LIGHT_THRESHOLD = 155;  // 高于此灰度视为近白

          for (let i = 0; i < data.length; i += 4) {
            let r = data[i];
            let g = data[i + 1];
            let b = data[i + 2];
            const a = data[i + 3];

            // 透明度清洗：半透明像素强制视为白色，防止透明边缘混合成灰
            if (a < 250) {
              data[i] = 255;
              data[i + 1] = 255;
              data[i + 2] = 255;
              continue;
            }

            // 预对比度与饱和度
            r = (r - 128) * CONTRAST + 128;
            g = (g - 128) * CONTRAST + 128;
            b = (b - 128) * CONTRAST + 128;

            const gray = 0.299 * r + 0.587 * g + 0.114 * b;
            r = gray + (r - gray) * SATURATION;
            g = gray + (g - gray) * SATURATION;
            b = gray + (b - gray) * SATURATION;

            // 二值化倾向：近黑更黑，近白更白
            if (gray < DARK_THRESHOLD) {
              const k = 0.4; // 压向黑色
              r *= k; g *= k; b *= k;
            } else if (gray > LIGHT_THRESHOLD) {
              const k = 0.4; // 压向白色
              r = 255 - (255 - r) * k;
              g = 255 - (255 - g) * k;
              b = 255 - (255 - b) * k;
            }

            data[i] = Math.max(0, Math.min(255, Math.round(r)));
            data[i + 1] = Math.max(0, Math.min(255, Math.round(g)));
            data[i + 2] = Math.max(0, Math.min(255, Math.round(b)));
          }

          // 第三步：最近颜色映射（无抖动，直接替换为最近色）
          const newGrid: PixelCell[][] = [];
          for (let y = 0; y < GRID_SIZE; y++) {
            const row: PixelCell[] = [];
            for (let x = 0; x < GRID_SIZE; x++) {
              const idx = (y * GRID_SIZE + x) * 4;
              const r = data[idx];
              const g = data[idx + 1];
              const b = data[idx + 2];
              row.push(findNearestColor({ r, g, b }));
            }
            newGrid.push(row);
          }

          setGrid(newGrid);
        } catch (e) {
          console.error(e);
          setError("处理图片时出错，请重试。");
        } finally {
          setProcessing(false);
        }
      };
      img.onerror = () => {
        setError("加载图片失败，请重试。");
        setProcessing(false);
      };
      img.src = src;
    } catch (e) {
      console.error(e);
      setError("处理图片时出错，请重试。");
      setProcessing(false);
    }
  };

  // 切换商家时，只改变展示的编号，不重新计算网格
  const handleMerchantChange = (merchant: Merchant) => {
    setSelectedMerchant(merchant);
  };

  // 重置所有状态，方便用户重新上传
  const handleReset = () => {
    setImageSrc(null);
    setGrid(null);
    setError(null);
    setSelectedMerchant("MARD");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-5xl flex-col gap-8 py-10 px-4 sm:px-8 bg-white dark:bg-black">
        {/* 顶部标题 + 简要说明 */}
        <header className="flex flex-col gap-2">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
            珠板像素画生成器（50×50）
          </h1>
          <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400">
            上传一张图片，自动转换为 50×50 像素画，并根据不同商家（MARD、COCO、漫漫、盼盼、咪小窝）
            显示对应的颜色编号，方便按图取色拼珠。
          </p>
        </header>

        {/* 步骤区域：上传图片 + 选择商家 + 状态提示 */}
        <section className="flex flex-col gap-6 rounded-xl border border-zinc-200 bg-zinc-50/60 p-4 sm:p-6 dark:border-zinc-800 dark:bg-zinc-900/40">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-zinc-800 dark:text-zinc-100">
                1. 上传图片
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="block w-full text-sm text-zinc-700 file:mr-4 file:rounded-md file:border-0 file:bg-zinc-900 file:px-4 file:py-2 file:text-sm file:font-medium file:text-zinc-50 hover:file:bg-zinc-800 cursor-pointer dark:file:bg-zinc-100 dark:file:text-zinc-900 dark:hover:file:bg-zinc-200"
              />
              <span className="text-xs text-zinc-500">
                建议使用正方形或接近正方形的图片，系统会自动压缩到 50×50 像素进行取样。
              </span>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-zinc-800 dark:text-zinc-100">
                2. 选择商家
              </label>
              <div className="flex flex-wrap gap-2">
                {MERCHANTS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => handleMerchantChange(m)}
                    className={`rounded-full px-3 py-1 text-xs sm:text-sm border transition-colors ${
                      selectedMerchant === m
                        ? "border-zinc-900 bg-zinc-900 text-zinc-50 dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-900"
                        : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-zinc-600 dark:text-zinc-400">
              像素画尺寸：<span className="font-medium">50 × 50（共 2500 点）</span>，
              每个点显示当前商家的颜色编号。
            </div>
            <button
              type="button"
              onClick={handleReset}
              className="text-xs rounded-full border border-zinc-300 px-3 py-1 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              清空重新选择
            </button>
          </div>

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
              {error}
            </div>
          )}

          {processing && (
            <div className="text-xs text-zinc-600 dark:text-zinc-300">
              正在处理图片并匹配最近颜色，请稍候…
            </div>
          )}
        </section>

        {/* 下半部分：左侧原图预览，右侧 50×50 像素图纸 */}
        <section className="grid gap-6 md:grid-cols-[minmax(0,1fr),minmax(0,1.4fr)]">
          <div className="flex flex-col gap-4">
            <h2 className="text-sm font-medium text-zinc-800 dark:text-zinc-100">
              原图预览
            </h2>
            <div className="flex items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50/60 p-4 dark:border-zinc-700 dark:bg-zinc-900/40">
              {imageSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imageSrc}
                  alt="原图预览"
                  className="max-h-80 w-auto max-w-full rounded-md object-contain"
                />
              ) : (
                <div className="flex flex-col items-center gap-1 text-center text-xs text-zinc-500 dark:text-zinc-400">
                  <span>暂未选择图片</span>
                  <span>请选择上方的图片文件开始生成像素图纸。</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <h2 className="text-sm font-medium text-zinc-800 dark:text-zinc-100">
              像素图纸（编号视图）
            </h2>
            {grid ? (
              <div className="flex flex-col gap-2">
                <div className="text-xs text-zinc-600 dark:text-zinc-400">
                  当前商家：<span className="font-semibold">{selectedMerchant}</span>{" "}
                  · 每个小格背景为实际颜色，文字为该商家的颜色编号。
                </div>
                <div className="max-h-[520px] w-full overflow-auto rounded-lg border border-zinc-200 bg-white p-2 dark:border-zinc-800 dark:bg-zinc-950/40">
                  <div
                    className="grid auto-rows-[16px]"
                    style={{
                      gridTemplateColumns: `repeat(${GRID_SIZE}, 16px)`,
                    }}
                  >
                    {grid.map((row, y) =>
                      row.map((cell, x) => (
                        <div
                          key={`${x}-${y}`}
                          title={`(${x + 1}, ${y + 1}) - ${cell.codes[selectedMerchant]}`}
                          className="flex h-4 w-4 items-center justify-center border border-zinc-200 text-[7px] font-medium leading-none text-black/80 dark:border-zinc-800 dark:text-black"
                          style={{
                            backgroundColor: cell.hex,
                          }}
                        >
                          <span
                            className="px-[1px]"
                            style={{
                              textShadow: "0 0 2px rgba(255,255,255,0.9)",
                            }}
                          >
                            {cell.codes[selectedMerchant]}
                          </span>
                        </div>
                      )),
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex h-full min-h-40 items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50/60 p-4 text-xs text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-400">
                生成结果会显示在这里：先在上方选择一张图片。
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
