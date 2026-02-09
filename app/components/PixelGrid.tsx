import React from "react";
import type { PixelCell, Merchant } from "../types";

type Props = {
  grid: PixelCell[][];
  selectedMerchant: Merchant;
  toolMode?: any;
  opacity?: number;
  onCellClick?: (cell: PixelCell, x: number, y: number) => void;
  onEyedrop?: (cell: PixelCell, x: number, y: number) => void;
  // 裸网格用于绝对叠放（无外层容器）
  bare?: boolean;
  cellSize?: number;
};

export default function PixelGrid({
  grid,
  selectedMerchant,
  opacity = 1,
  onCellClick,
  onEyedrop,
  bare = false,
  cellSize = 16,
}: Props) {
  // 渲染单个格子
  const renderCell = (cell: PixelCell, x: number, y: number) => (
    <div
      key={`${x}-${y}`}
      title={`(${x + 1}, ${y + 1}) - ${cell.codes[selectedMerchant]}`}
      className="flex items-center justify-center border border-zinc-200 text-[7px] font-medium leading-none text-black/80 dark:border-zinc-800 dark:text-black"
      style={{
        width: `${cellSize}px`,
        height: `${cellSize}px`,
        backgroundColor: cell.hex,
      }}
      onClick={() => onCellClick?.(cell, x, y)}
      onDoubleClick={() => onEyedrop?.(cell, x, y)}
    >
      <span className="px-[1px]" style={{ textShadow: "0 0 2px rgba(255,255,255,0.9)" }}>
        {cell.codes[selectedMerchant]}
      </span>
    </div>
  );

  // 裸网格：仅返回 grid 元素，便于外层绝对定位
  if (bare) {
    return (
      <div
        className="grid"
        style={{
          gridAutoRows: `${cellSize}px`,
          gridTemplateColumns: `repeat(${grid[0]?.length ?? 0}, ${cellSize}px)`,
          opacity,
        }}
      >
        {grid.map((row, y) => row.map((cell, x) => renderCell(cell, x, y)))}
      </div>
    );
  }

  // 标准渲染（包含外层容器与说明）
  return (
    <div className="flex flex-col gap-2">
      <div className="text-xs text-zinc-600 dark:text-zinc-400">
        当前商家：<span className="font-semibold">{selectedMerchant}</span> · 每个小格背景为实际颜色，文字为该商家的颜色编号。
      </div>

      <div className="max-h-[520px] w-full overflow-auto rounded-lg border border-zinc-200 bg-white p-2 dark:border-zinc-800 dark:bg-zinc-950/40" style={{ opacity }}>
        <div className="flex justify-center">
          <div className="grid" style={{ gridAutoRows: `${cellSize}px`, gridTemplateColumns: `repeat(${grid[0]?.length ?? 0}, ${cellSize}px)` }}>
            {grid.map((row, y) => row.map((cell, x) => renderCell(cell, x, y)))}
          </div>
        </div>
      </div>
    </div>
  );
}
