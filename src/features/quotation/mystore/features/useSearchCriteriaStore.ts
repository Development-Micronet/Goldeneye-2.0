import { create } from "zustand";

export interface SearchCriteriaState {
  itemsPerPage: number;
  constellation: string;
  cloudCover: string;
  incidenceAngle: string;
  processingLevel: string;
  sortBy: string;
  acquisitionDate: string;
  geometry: any;
  [key: string]: any;
}

const defaultState: SearchCriteriaState = {
  itemsPerPage: 12,
  constellation: "",
  cloudCover: "[0,100]",
  incidenceAngle: "[0,60]",
  processingLevel: "SENSOR,ALBUM",
  sortBy: "",
  acquisitionDate: "",
  geometry: undefined,
};

const getInitialState = (): SearchCriteriaState => {
  const sessionData = sessionStorage.getItem("filter");
  const parsedSessionData = sessionData ? JSON.parse(sessionData) : {};
  return {
    ...defaultState,
    ...parsedSessionData,
  };
};

interface SearchCriteriaStore extends SearchCriteriaState {
  updateSearchCriteria: (payload: Partial<SearchCriteriaState>) => void;
  resetSearchCriteria: () => void;
}

export const useSearchCriteriaStore = create<SearchCriteriaStore>((set) => ({
  ...getInitialState(),

  updateSearchCriteria: (payload) =>
    set((state) => ({
      ...state,
      ...payload,
    })),

  resetSearchCriteria: () => set(defaultState),
}));
