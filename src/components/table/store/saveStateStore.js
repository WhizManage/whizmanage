// src/components/table/store/saveStateStore.js
import { create } from "zustand";

export const useTableSaveStateStore = create((set) => ({
  saveState: "saved",
  lastSaveTime: null,

  setSaveState: (newState) =>
    set((prev) =>
      prev.saveState === newState ? prev : { ...prev, saveState: newState }
    ),

  setLastSaveTime: (time) =>
    set((prev) =>
      prev.lastSaveTime === time ? prev : { ...prev, lastSaveTime: time }
    ),
}));
