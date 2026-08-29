import { create } from "zustand";
import { buildTechSpecs } from "../../utils/Buildtechnicalspecification";

const calculateAmount = (area: any, price: any) =>
  (parseFloat(area) || 0) * (parseFloat(price) || 0);

export interface QuotationItem {
  item: string;
  unit?: string;
  area?: any;
  price?: any;
  amount?: number;
  cloud_cover?: any;
  angle?: any;
  date?: string;
  geometricprocessing?: string;
  spectralbands?: string;
  task_type?: string;
  techSpecs?: any[];
  [key: string]: any;
}

interface QuotationItemStore {
  quotationItem: QuotationItem[];
  addQuotationItem: (item?: Partial<QuotationItem>) => void;
  updateQuotationItem: (payload: { index: number; field: string; value: any }) => void;
  removeQuotationItem: (index: number) => void;
  setQuotationItems: (items: QuotationItem[]) => void;
  resetQuotationItems: () => void;
  addTechSpec: (payload: { index: number }) => void;
  updateTechSpec: (payload: { index: number; specIndex: number; value: any }) => void;
  removeTechSpec: (payload: { index: number; specIndex: number }) => void;
  setTechSpecs: (payload: { index: number; specs: any[] }) => void;
}

export const useQuotationItemStore = create<QuotationItemStore>((set) => ({
  quotationItem: [],

  addQuotationItem: (newItemPayload) =>
    set((state) => {
      const item: QuotationItem = newItemPayload
        ? ({ ...newItemPayload } as QuotationItem)
        : {
            item: "",
            unit: "Sqkm",
            area: "",
            price: 0,
            amount: 0,
            cloud_cover: 10,
            angle: "",
            date: "",
            geometricprocessing: "",
            spectralbands: "",
            task_type: "",
            techSpecs: buildTechSpecs(""),
          };

      item.amount = calculateAmount(item.area, item.price);
      if (!item.techSpecs) {
        item.techSpecs = buildTechSpecs(item.item || "");
      }

      return { quotationItem: [...state.quotationItem, item] };
    }),

  updateQuotationItem: ({ index, field, value }) =>
    set((state) => {
      if (!state.quotationItem[index]) return state;

      const updatedList = [...state.quotationItem];
      const updatedItem = { ...updatedList[index], [field]: value };

      if (field === "area" || field === "price") {
        updatedItem.amount = calculateAmount(updatedItem.area, updatedItem.price);
      }
      if (field === "geometricprocessing" || field === "spectralbands" || field === "task_type") {
        updatedItem.techSpecs = buildTechSpecs(
          updatedItem.item,
          updatedItem.geometricprocessing,
          updatedItem.spectralbands,
        );
      }

      updatedList[index] = updatedItem;
      return { quotationItem: updatedList };
    }),

  removeQuotationItem: (index) =>
    set((state) => ({
      quotationItem: state.quotationItem.filter((_, i) => i !== index),
    })),

  setQuotationItems: (items) =>
    set(() => ({
      quotationItem: (items || []).map((item) => ({
        ...item,
        techSpecs: buildTechSpecs(item.item || ""),
      })),
    })),

  resetQuotationItems: () => set({ quotationItem: [] }),

  addTechSpec: ({ index }) =>
    set((state) => {
      if (!state.quotationItem[index]) return state;
      const updatedList = [...state.quotationItem];
      const item = { ...updatedList[index] };
      item.techSpecs = [...(item.techSpecs || []), ""];
      updatedList[index] = item;
      return { quotationItem: updatedList };
    }),

  updateTechSpec: ({ index, specIndex, value }) =>
    set((state) => {
      const item = state.quotationItem[index];
      if (!item || !item.techSpecs) return state;

      const updatedList = [...state.quotationItem];
      const updatedItem = { ...updatedList[index] };
      const updatedSpecs = [...(updatedItem.techSpecs || [])];
      updatedSpecs[specIndex] = value;
      updatedItem.techSpecs = updatedSpecs;
      updatedList[index] = updatedItem;

      return { quotationItem: updatedList };
    }),

  removeTechSpec: ({ index, specIndex }) =>
    set((state) => {
      const item = state.quotationItem[index];
      if (!item || !item.techSpecs) return state;

      const updatedList = [...state.quotationItem];
      const updatedItem = { ...updatedList[index] };
      updatedItem.techSpecs = (updatedItem.techSpecs || []).filter((_, i) => i !== specIndex);
      updatedList[index] = updatedItem;

      return { quotationItem: updatedList };
    }),

  setTechSpecs: ({ index, specs }) =>
    set((state) => {
      if (!state.quotationItem[index]) return state;

      const updatedList = [...state.quotationItem];
      updatedList[index] = {
        ...updatedList[index],
        techSpecs: specs,
      };

      return { quotationItem: updatedList };
    }),
}));
