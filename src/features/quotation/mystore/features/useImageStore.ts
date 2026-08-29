import { create } from "zustand";

const STORAGE_KEY = "initialImages";

const normalizeImage = (img: any = {}) => ({
  file: img.file || null,
  dataUrl: img.dataUrl || null,
  caption: img.caption || "Map Screenshot",
  supportingfiles: Array.isArray(img.supportingfiles) ? img.supportingfiles : [],
});

const syncToStorage = (images: any[]) => {
  try {
    if (images.length === 0) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(images));
    }
  } catch {
    // storage full or unavailable
  }
};

const loadFromStorage = () => {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(stored) ? stored.map(normalizeImage) : [];
  } catch {
    return [];
  }
};

interface ImageStore {
  images: any[];
  addImage: (imgPayload: any) => void;
  setImages: (images: any[]) => void;
  clearImages: () => void;
  attachFileToImage: (payload: { index: number; file: any; fileType: string }) => void;
  detachFileFromImage: (payload: { index: number; fileType: string }) => void;
  updateCaption: (payload: { index: number; caption: string }) => void;
  removeImage: (index: number) => void;
}

export const useImageStore = create<ImageStore>((set) => ({
  images: loadFromStorage(),

  addImage: (imgPayload) =>
    set((state) => {
      const newImages = [...state.images, normalizeImage(imgPayload)];
      syncToStorage(newImages);
      return { images: newImages };
    }),

  setImages: (images) =>
    set(() => {
      const newImages = (images || []).map(normalizeImage);
      syncToStorage(newImages);
      return { images: newImages };
    }),

  clearImages: () =>
    set(() => {
      syncToStorage([]);
      return { images: [] };
    }),

  attachFileToImage: ({ index, file, fileType }) =>
    set((state) => {
      const img = state.images[index];
      if (!img) return state;

      const existing = img.supportingfiles || [];
      const filtered = existing.filter((f: any) => f.fileType !== fileType);

      filtered.push({
        file,
        name: file.name || "unknown",
        fileType,
      });

      const newImages = [...state.images];
      newImages[index] = { ...img, supportingfiles: filtered };
      syncToStorage(newImages);
      return { images: newImages };
    }),

  detachFileFromImage: ({ index, fileType }) =>
    set((state) => {
      const img = state.images[index];
      if (!img) return state;

      const updatedSupporting = (img.supportingfiles || []).filter(
        (f: any) => f.fileType !== fileType,
      );

      const newImages = [...state.images];
      newImages[index] = { ...img, supportingfiles: updatedSupporting };
      syncToStorage(newImages);
      return { images: newImages };
    }),

  updateCaption: ({ index, caption }) =>
    set((state) => {
      if (!state.images[index]) return state;

      const newImages = [...state.images];
      newImages[index] = {
        ...newImages[index],
        caption: caption || "Map Screenshot",
      };
      syncToStorage(newImages);
      return { images: newImages };
    }),

  removeImage: (index) =>
    set((state) => {
      const newImages = state.images.filter((_, i) => i !== index);
      syncToStorage(newImages);
      return { images: newImages };
    }),
}));
