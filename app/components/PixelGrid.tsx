import React from "react";
import type { PixelCell, Merchant } from "../types";
import { GRID_SIZE } from "../types";

// PixelGrid 组件
// - 负责将处理后的 `grid`（二维 PixelCell 数组）渲染为 50×50 的像素格子视图
// - 每个格子的背景为匹配到的颜色（cell.hex），格内文本为所选商家的颜色编号（cell.codes[selectedMerchant]）
type Props = {
  grid: PixelCell[][];
  selectedMerchant: Merchant;
};

export default function PixelGrid({ grid, selectedMerchant }: Props) {
  return (
    <div className="flex flex-col gap-2">
      {/* 顶部说明：显示当前选中的商家 */}
      <div className="text-xs text-zinc-600 dark:text-zinc-400">
        当前商家：<span className="font-semibold">{selectedMerchant}</span> · 每个小格背景为实际颜色，文字为该商家的颜色编号。
      </div>

      {/* 可滚动的网格容器：使用 CSS grid 布局，每列宽度固定为 16px */}
      <div className="max-h-[520px] w-full overflow-auto rounded-lg border border-zinc-200 bg-white p-2 dark:border-zinc-800 dark:bg-zinc-950/40">
        <div
          className="grid auto-rows-[16px]"
          style={{
            // 根据 GRID_SIZE 动态设置列数（例如 50 列）
            gridTemplateColumns: `repeat(${GRID_SIZE}, 16px)`,
          }}
        >
          {grid.map((row, y) =>
            // 遍历每一行与列，渲染单个像素格
            row.map((cell, x) => (
              <div
                key={`${x}-${y}`}
                // title 中包含坐标与该格对应的商家编号，便于悬停查看
                title={`(${x + 1}, ${y + 1}) - ${cell.codes[selectedMerchant]}`}
                className="flex h-4 w-4 items-center justify-center border border-zinc-200 text-[7px] font-medium leading-none text-black/80 dark:border-zinc-800 dark:text-black"
                style={{
                  // 使用匹配到的十六进制颜色作为格子背景
                  backgroundColor: cell.hex,
                }}
              >
                <span
                  className="px-[1px]"
                  style={{
                    // 给编号加一个淡淡的白色描边，提升在深色背景上的可读性
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
  );
}
