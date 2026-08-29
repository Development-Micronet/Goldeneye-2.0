import { create } from "zustand";

const initialValues = {
  from_company: "Micronet Spacetech",
  from_company_email: "",
  from_company_authorized_person: "",
  from_company_authorized_person_designation: "",
  from_company_address: "",

  to_company: "",
  receiver_company_authorized_person: "",
  receiver_company_authorized_person_designation: "",
  receiver_company_email: "",
  address_line_1: "",
  address_line_2: "",
  city: "",
  state: "",
  country: "",
  postal_code: "",

  products: [],
  terms_and_specifications: [],
  description: [],

  delivery: "VIA FTP ONLY",
  incoterms: "EXW",
  payment: "As per Quotation terms",
  purchase_order: "To be Placed on Micronet Spacetech LLP India",
  validity: "30",

  cgst_pct: 9,
  sgst_pct: 9,
  igst_pct: 0,

  sub_total: 0,
  cgst: 0,
  sgst: 0,
  igst: 0,
  total_amount: 0,

  pdf_file: null,
  extraImages: [] as any[],
  verified: false,
  date: "",
};

export type QuotationInfoState = typeof initialValues;

interface QuotationInfoStore extends QuotationInfoState {
  updateField: (payload: { field: string; value: any }) => void;
  setTerms: (terms: any[]) => void;
  setImages: (images: any[]) => void;
  resetQuotation: () => void;
  detachFileFromImage: (payload: { index: number; fileType: string }) => void;
  attachFileToImage: (payload: { index: number; fileType: string; name: string }) => void;
}

export const useQuotationInfoStore = create<QuotationInfoStore>((set) => ({
  ...initialValues,

  updateField: ({ field, value }) =>
    set((state) => ({
      ...state,
      [field]: value,
    })),

  setTerms: (terms) => set({ terms_and_specifications: terms }),

  setImages: (images) => set({ extraImages: images }),

  resetQuotation: () => set(initialValues),

  detachFileFromImage: ({ index, fileType }) =>
    set((state) => {
      const img = state.extraImages[index];
      if (!img) return state;

      const updatedExtraImages = [...state.extraImages];
      updatedExtraImages[index] = {
        ...img,
        supportingfiles: (img.supportingfiles || []).filter((f: any) => f.fileType !== fileType),
      };

      return { extraImages: updatedExtraImages };
    }),

  attachFileToImage: ({ index, fileType, name }) =>
    set((state) => {
      const img = state.extraImages[index];
      if (!img) return state;

      const existing = img.supportingfiles || [];
      const filtered = existing.filter((f: any) => f.fileType !== fileType);

      filtered.push({ fileType, name });

      const updatedExtraImages = [...state.extraImages];
      updatedExtraImages[index] = {
        ...img,
        supportingfiles: filtered,
      };

      return { extraImages: updatedExtraImages };
    }),
}));
