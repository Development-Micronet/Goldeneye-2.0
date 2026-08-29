import { create } from "zustand";
import Map from "ol/Map";

interface SelectedAOIStore {
  selectedAOIId: string | null;
  map: Map | null;

  setSelectedAOI: (id: string | null) => void;
  setMap: (map: Map | null) => void;
}

export const useSelectedAOIStore = create<SelectedAOIStore>((set) => ({
  selectedAOIId: null,
  map: null,

  setSelectedAOI: (id) =>
    set({
      selectedAOIId: id,
    }),

  setMap: (map) =>
    set({
      map,
    }),
}));
