import { create } from "zustand";

interface SelectedAOIStore {
  selectedAOIId: string | null;

  setSelectedAOI: (id: string | null) => void;
}

export const useSelectedAOIStore = create<SelectedAOIStore>((set) => ({
  selectedAOIId: null,

  setSelectedAOI: (id) =>
    set({
      selectedAOIId: id,
    }),
}));
