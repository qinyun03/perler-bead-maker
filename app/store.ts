import create from "zustand";

type GridState = {
  gridSize: number;
  setGridSize: (size: number) => void;
};

// 简单的 Zustand store，用于管理可调整的正方形网格尺寸
const useGridStore = create<GridState>((set) => ({
  gridSize: 32,
  setGridSize: (size: number) => set(() => ({ gridSize: size })),
}));

export default useGridStore;
