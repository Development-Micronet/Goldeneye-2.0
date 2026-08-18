import { create } from "zustand";

export type SensorData = {
  id: string;
  name: string;
  productTypes: string[];
};

export type ProviderData = {
  name: string;
  sensors: SensorData[];
};

interface ProductStore {
  providers: ProviderData[];
  selectedProvider: string;
  /** Selected sensor IDs (e.g. "PNEO", "PHR") */
  selectedSensors: string[];
  /** Selected product types (airbus only) */
  selectedProductTypes: string[];

  setProviders: (providers: ProviderData[]) => void;
  setSelectedProvider: (provider: string) => void;
  setSelectedSensors: (sensors: string[]) => void;
  toggleSensor: (sensorId: string) => void;
  setSelectedProductTypes: (types: string[]) => void;
  toggleProductType: (type: string) => void;
  clearProducts: () => void;
}

export const useProductStore = create<ProductStore>((set, get) => ({
  providers: [],
  selectedProvider: "airbus",
  selectedSensors: [],
  selectedProductTypes: [],

  setProviders: (providers) => {
    const state = get();
    const matched = providers.find((p) => p.name === "airbus");
    const defaultSensorIds = matched ? matched.sensors.map((s) => s.id) : [];
    // Collect all productTypes for default provider
    const defaultProductTypes = matched
      ? [...new Set(matched.sensors.flatMap((s) => s.productTypes))]
      : [];

    set({
      providers,
      selectedSensors:
        state.selectedSensors.length > 0 ? state.selectedSensors : defaultSensorIds,
      selectedProductTypes:
        state.selectedProductTypes.length > 0
          ? state.selectedProductTypes
          : defaultProductTypes,
    });
  },

  setSelectedProvider: (provider) => {
    const state = get();
    const matched = state.providers.find((p) => p.name === provider);
    const sensorIds = matched ? matched.sensors.map((s) => s.id) : [];
    const allProductTypes = matched
      ? [...new Set(matched.sensors.flatMap((s) => s.productTypes))]
      : [];
    set({
      selectedProvider: provider,
      selectedSensors: sensorIds,
      selectedProductTypes: allProductTypes,
    });
  },

  setSelectedSensors: (sensors) => set({ selectedSensors: sensors }),

  toggleSensor: (sensorId) =>
    set((state) => ({
      selectedSensors: state.selectedSensors.includes(sensorId)
        ? state.selectedSensors.filter((s) => s !== sensorId)
        : [...state.selectedSensors, sensorId],
    })),

  setSelectedProductTypes: (types) => set({ selectedProductTypes: types }),

  toggleProductType: (type) =>
    set((state) => ({
      selectedProductTypes: state.selectedProductTypes.includes(type)
        ? state.selectedProductTypes.filter((t) => t !== type)
        : [...state.selectedProductTypes, type],
    })),

  clearProducts: () =>
    set({
      selectedSensors: [],
      selectedProductTypes: [],
    }),
}));
