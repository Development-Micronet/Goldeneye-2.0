import { create } from "zustand";

interface TaskingStore {
  taskingModal: boolean;
  openTaskingModal: () => void;
  closeTaskingModal: () => void;
}

export const useTaskingStore = create<TaskingStore>((set) => ({
  taskingModal: false,
  openTaskingModal: () => set({ taskingModal: true }),
  closeTaskingModal: () => set({ taskingModal: false }),
}));
