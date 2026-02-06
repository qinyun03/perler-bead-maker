import React from "react";
import type { PixelCell, Merchant } from "../types";
import { GRID_SIZE } from "../types";

type Props = {
  grid: PixelCell[][];
  selectedMerchant: Merchant;
};

export default function PixelGrid({ grid, selectedMerchant }: Props) {
  return (
    <div className="flex flex-col gap-2">
      <div className="text-xs text-zinc-600 dark:text-zinc-400">
        当前商家：<span className="font-semibold">{selectedMerchant}</span> · 每个小格背景为实际颜色，文字为该商家的颜色编号。
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
  );
}
