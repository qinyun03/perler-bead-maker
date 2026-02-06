"use client";

import { useMemo, useRef, useState } from "react";
import colorSystemMapping from "./colorSystemMapping.json";
import type { Merchant, PixelCell } from "./types";
import { MERCHANTS, GRID_SIZE } from "./types";
import { createMappingEntries } from "./utils/color";
import { processImageSrc } from "./utils/image";
import PixelGrid from "./components/PixelGrid";

export default function Home() {
  const [selectedMerchant, setSelectedMerchant] = useState<Merchant>("MARD");
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [grid, setGrid] = useState<PixelCell[][] | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const mappingEntries = useMemo(() => createMappingEntries(colorSystemMapping as any), []);

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

  const processImage = async (src: string) => {
    setProcessing(true);
    setError(null);
    try {
      const newGrid = await processImageSrc(src, mappingEntries, GRID_SIZE);
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
