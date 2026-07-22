import { create } from "zustand";

type DateMode = "between" | "after" | "before";
type TabType = "products" | "cloudcover" | "incidence" | "date" | "none";

interface MapStore {
  cloudcover: string;
  incidentAngle: string;
  tab: TabType;
  dateMode: DateMode;
  startDate: string;
  endDate: string;

  setCloudCover: (min: number, max: number) => void;
  setIncidentAngle: (min: number, max: number) => void;
  setTab: (tab: TabType) => void;

  setDateFilter: (mode: DateMode, startDate: string, endDate?: string) => void;
}

export const useParameter = create<MapStore>((set) => ({
  cloudcover: "[0,100]",
  incidentAngle: "[0,60]",
  dateMode: "between",
  startDate: "",
  endDate: "",
  tab: "none",
  setTab: (tab) => set({ tab }),

  setCloudCover: (min, max) =>
    set({
      cloudcover: `[${min},${max}]`,
    }),

  setIncidentAngle: (min, max) =>
    set({
      incidentAngle: `[${min},${max}]`,
    }),

  setDateFilter: (mode, startDate, endDate = "") =>
    set({
      dateMode: mode,
      startDate,
      endDate,
    }),
}));
