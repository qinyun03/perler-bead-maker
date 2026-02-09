"use client";

import { useMemo, useRef, useState } from "react";
import colorSystemMapping from "./colorSystemMapping.json";
import type { Merchant, PixelCell, FilterStyle } from "./types";
import { MERCHANTS } from "./types";
import { createMappingEntries, filterPalette } from "./utils/color";
import { processImageSrc } from "./utils/image";
import useGridStore from "./store";
import PixelGrid from "./components/PixelGrid";

export default function Home() {
  const [selectedMerchant, setSelectedMerchant] = useState<Merchant>("MARD");
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [grid, setGrid] = useState<PixelCell[][] | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // 叠放层透明度（0-100）用于控制裸网格在原图之上的显示程度
  const [overlayOpacity, setOverlayOpacity] = useState<number>(100);

  // 色彩风格滤镜状态（用于调色板子集或在 processImageSrc 中传入）
  const [filterStyle, setFilterStyle] = useState<FilterStyle>("none");

  const mappingEntries = useMemo(() => createMappingEntries(colorSystemMapping as any), []);
  const [activeColor, setActiveColor] = useState<PixelCell | null>(null);
  const gridSize = useGridStore((s) => s.gridSize);
  const setGridSize = useGridStore((s) => s.setGridSize);

  // 优先显示当前图纸中已有的颜色（出现在网格中的 hex 优先）
  const prioritizedPalette = useMemo(() => {
    const base = filterPalette(mappingEntries, filterStyle);
    if (!grid) return base;
    const present = new Set(grid.flat().map((c) => c.hex.toUpperCase()));
    return [...base].sort((a, b) => {
      const ia = present.has(a.hex.toUpperCase()) ? 0 : 1;
      const ib = present.has(b.hex.toUpperCase()) ? 0 : 1;
      return ia - ib;
    });
  }, [mappingEntries, filterStyle, grid]);

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
        processImage(result, filterStyle);
      }
    };
    reader.onerror = () => {
      setError("读取图片失败，请重试。");
    };
    reader.readAsDataURL(file);
  };

  const processImage = async (src: string, style?: FilterStyle) => {
    setProcessing(true);
    setError(null);
    try {
      const usedStyle = style ?? filterStyle;
      const newGrid = await processImageSrc(src, mappingEntries, gridSize, usedStyle);
      setGrid(newGrid);
    } catch (e) {
      console.error(e);
      setError("处理图片时出错，请重试。");
    } finally {
      setProcessing(false);
    }
  };

  const handleMerchantChange = (merchant: Merchant) => {
    setSelectedMerchant(merchant);
  };

  const handleReset = () => {
    setImageSrc(null);
    setGrid(null);
    setError(null);
    setSelectedMerchant("MARD");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // 点击单元格：使用当前选中色进行填充
  const handleCellClick = (cell: PixelCell, x: number, y: number) => {
    if (!activeColor) return;
    setGrid((g) => {
      if (!g) return g;
      const next = g.map((row) => row.slice());
      next[y][x] = { hex: activeColor.hex, codes: activeColor.codes };
      return next;
    });
  };

  // 双击吸管：从单元格取色为当前选中色
  const handleEyedrop = (cell: PixelCell, x: number, y: number) => {
    setActiveColor({ hex: cell.hex, codes: cell.codes });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-5xl flex-col gap-8 py-10 px-4 sm:px-8 bg-white dark:bg-black">
        {/* 顶部标题 + 简要说明 */}
        <header className="flex flex-col gap-2">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
            珠板像素画生成器（{gridSize}×{gridSize}）
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
                建议使用正方形或接近正方形的图片，系统会自动等比缩放并居中到 {gridSize}×{gridSize} 像素进行取样。
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
              {/* 色彩风格选择：切换后会重新处理当前图片（若已选择） */}
              <div className="mt-3">
                <label className="text-sm font-medium text-zinc-800 dark:text-zinc-100">3. 色彩风格</label>
                <div className="mt-2">
                  <select
                    value={filterStyle}
                    onChange={(e) => {
                      const v = e.target.value as FilterStyle;
                      setFilterStyle(v);
                      if (imageSrc) processImage(imageSrc, v);
                    }}
                    className="rounded-md border border-zinc-300 bg-white px-3 py-1 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
                  >
                    <option value="none">原图（无筛选）</option>
                    <option value="candy">糖果色（Candy Pop）</option>
                    <option value="grayscale">黑白（仅保留灰度颜色）</option>
                  </select>
                </div>
              </div>
              {/* 网格尺寸调整：范围 5-64，步长 2，松开滑块时触发重新生成 */}
              <div className="mt-3">
                <label className="text-sm font-medium text-zinc-800 dark:text-zinc-100">4. 网格尺寸</label>
                <div className="mt-2 flex items-center gap-3">
                  <input
                    type="range"
                    min={5}
                    max={64}
                    step={2}
                    value={gridSize}
                    onChange={(e) => setGridSize(Number(e.target.value))}
                    onMouseUp={() => {
                      if (imageSrc) processImage(imageSrc);
                    }}
                    onTouchEnd={() => {
                      if (imageSrc) processImage(imageSrc);
                    }}
                    className="w-48"
                  />
                  <div className="text-sm text-zinc-600 dark:text-zinc-400">{gridSize} × {gridSize}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-zinc-600 dark:text-zinc-400">
              像素画尺寸：<span className="font-medium">{gridSize} × {gridSize}（共 {gridSize * gridSize} 点）</span>，
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
              <>
                <div className="text-xs text-zinc-600 dark:text-zinc-400">
                  当前商家：<span className="font-semibold">{selectedMerchant}</span>
                </div>

                {/* 叠放容器：相对定位，内部两个绝对定位元素完全重合（底图：原图；上层：裸网格） */}
                <div className="relative mx-auto" style={{ width: `${(grid[0]?.length ?? 0) * 16}px`, height: `${grid.length * 16}px` }}>
                  {/* 底图：原图按覆盖方式铺满容器，保证与网格像素完全重合 */}
                  {imageSrc && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={imageSrc}
                      alt="原图对比底图"
                      style={{
                        position: "absolute",
                        inset: 0,
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  )}

                  {/* 裸网格：绝对定位覆盖在原图之上，透明度由滑块控制 */}
                  <div style={{ position: "absolute", inset: 0, pointerEvents: "auto" }}>
                    <div style={{ width: "100%", height: "100%", display: "flex", justifyContent: "center" }}>
                      <div style={{ position: "relative", width: "100%", height: "100%" }}>
                        <div style={{ position: "absolute", inset: 0 }}>
                          <PixelGrid grid={grid} selectedMerchant={selectedMerchant} bare cellSize={16} opacity={overlayOpacity / 100} onCellClick={handleCellClick} onEyedrop={handleEyedrop} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 透明度滑块 */}
                <div className="mt-2 flex items-center gap-3">
                  <label className="text-sm text-zinc-700 dark:text-zinc-200">透明度</label>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={overlayOpacity}
                    onChange={(e) => setOverlayOpacity(Number(e.target.value))}
                    className="w-48"
                  />
                  <div className="text-sm text-zinc-600 dark:text-zinc-400">{overlayOpacity}%</div>
                  <div className="text-xs text-zinc-500 ml-3">0% 显示底图 · 100% 显示拼豆图纸</div>
                </div>

                {/* 编辑区：配色面板（调色板优先显示图纸已有颜色，实际编辑在上方图纸进行）*/}
                <div className="mt-4 rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900/40">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-zinc-800 dark:text-zinc-100">手动编辑与配色</div>
                    <div className="text-xs text-zinc-500">在上方图纸点击填色 · 双击吸管取色</div>
                  </div>

                  <div className="mt-3 grid grid-cols-6 gap-1 max-h-48 overflow-auto rounded border border-zinc-100 p-1 dark:border-zinc-800">
                    {prioritizedPalette.map((entry) => (
                      <button
                        key={entry.hex}
                        onClick={() => setActiveColor({ hex: entry.hex, codes: entry.codes })}
                        type="button"
                        className={`w-8 h-8 rounded-sm border ${activeColor?.hex === entry.hex ? "ring-2 ring-offset-1 ring-indigo-500" : "border-zinc-200"}`}
                        style={{ backgroundColor: entry.hex }}
                        title={`${entry.hex} · ${entry.codes[selectedMerchant]}`}
                      />
                    ))}
                  </div>

                  <div className="mt-2 text-xs">当前选中： <span className="font-medium">{activeColor ? activeColor.codes[selectedMerchant] : "—"}</span></div>
                </div>
              </>
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
