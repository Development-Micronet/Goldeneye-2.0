import { create } from "zustand";

export type ProviderData = {
  name: string;
  sensors: string[];
};

interface ProductStore {
  providers: ProviderData[];
  selectedProvider: string;
  selectedSensors: string[];

  setProviders: (providers: ProviderData[]) => void;
  setSelectedProvider: (provider: string) => void;
  setSelectedSensors: (sensors: string[]) => void;
  toggleSensor: (sensor: string) => void;
  clearProducts: () => void;
}

export const useProductStore = create<ProductStore>((set, get) => ({
  providers: [],
  selectedProvider: "airbus",
  selectedSensors: [],

  setProviders: (providers) => {
    const state = get();
    // Default to "airbus" and select all its sensors by default if not set
    const matched = providers.find((p) => p.name === "airbus");
    const defaultSensors = matched ? matched.sensors : [];
    set({
      providers,
      selectedSensors: state.selectedSensors.length > 0 ? state.selectedSensors : defaultSensors,
    });
  },

  setSelectedProvider: (provider) => {
    const state = get();
    const matched = state.providers.find((p) => p.name === provider);
    set({
      selectedProvider: provider,
      selectedSensors: matched ? matched.sensors : [],
    });
  },

  setSelectedSensors: (sensors) =>
    set({
      selectedSensors: sensors,
    }),

  toggleSensor: (sensor) =>
    set((state) => ({
      selectedSensors: state.selectedSensors.includes(sensor)
        ? state.selectedSensors.filter((s) => s !== sensor)
        : [...state.selectedSensors, sensor],
    })),

  clearProducts: () =>
    set({
      selectedSensors: [],
    }),
}));
