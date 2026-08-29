import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

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

  isInitialized: boolean;

  setProviders: (providers: ProviderData[]) => void;
  setSelectedProvider: (provider: string) => void;
  setSelectedSensors: (sensors: string[]) => void;
  toggleSensor: (sensorId: string) => void;
  setSelectedProductTypes: (types: string[]) => void;
  toggleProductType: (type: string) => void;
  clearProducts: () => void;
  resetProductStore: () => void;
}

export const useProductStore = create<ProductStore>()(
  persist(
    (set, get) => ({
      providers: [],
      selectedProvider: "airbus",
      selectedSensors: [],
      selectedProductTypes: [],
      isInitialized: false,

      setProviders: (providers) => {
        const state = get();
        if (state.isInitialized) {
          set({ providers });
          return;
        }

        const allSensorIds = providers.flatMap((p) => p.sensors.map((s) => s.id));
        const allProductTypes = [
          ...new Set(providers.flatMap((p) => p.sensors.flatMap((s) => s.productTypes ?? []))),
        ];

        set({
          providers,
          selectedSensors: allSensorIds,
          selectedProductTypes: allProductTypes,
          isInitialized: true,
        });
      },

      setSelectedProvider: (provider) => {
        set({
          selectedProvider: provider,
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

      resetProductStore: () =>
        set({
          providers: [],
          selectedProvider: "airbus",
          selectedSensors: [],
          selectedProductTypes: [],
          isInitialized: false,
        }),
    }),
    {
      name: "product-selection-storage",
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
);
