import { create } from "zustand";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import customParseFormat from "dayjs/plugin/customParseFormat";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);

export interface CriteData {
  IncidentAngle: [number, number];
  CloudCover: [number, number];
  startDate: string;
  endDate: string;
  Date?: string[];
}

interface CriteriaStore {
  criteriaModal: boolean;
  criteData: CriteData;
  DataForSearch: any;
  openCriteriaModal: () => void;
  closeCriteriaModal: () => void;
  submitCriteria: (payload: any) => void;
}

const initialCriteData: CriteData = {
  IncidentAngle: [0, 60],
  CloudCover: [0, 100],
  startDate: dayjs().subtract(29, "days").tz("Asia/Kolkata").toISOString(),
  endDate: dayjs().tz("Asia/Kolkata").toISOString(),
};

const mergeCriteriaData = (existingData: CriteData, newData: any): CriteData => {
  const updatedData = { ...existingData };

  if (newData.incidentAngle) updatedData.IncidentAngle = newData.incidentAngle;
  if (newData.cloudCover) updatedData.CloudCover = newData.cloudCover;

  if (newData.Date && newData.Date.length > 0) {
    const sortedDates = newData.Date.map((date: any) =>
      dayjs(date).tz("Asia/Kolkata").toISOString(),
    ).sort();
    updatedData.startDate = sortedDates[0];
    updatedData.endDate = sortedDates[sortedDates.length - 1];
    updatedData.Date = sortedDates;
  } else {
    if (newData.startDate)
      updatedData.startDate = dayjs(newData.startDate).tz("Asia/Kolkata").toISOString();
    if (newData.endDate)
      updatedData.endDate = dayjs(newData.endDate).tz("Asia/Kolkata").toISOString();
  }

  return updatedData;
};

export const useCriteriaStore = create<CriteriaStore>((set) => ({
  criteriaModal: false,
  criteData: initialCriteData,
  DataForSearch: null,

  openCriteriaModal: () => set({ criteriaModal: true }),
  closeCriteriaModal: () => set({ criteriaModal: false }),

  submitCriteria: (payload) =>
    set((state) => ({
      DataForSearch: payload,
      criteData: mergeCriteriaData(state.criteData, payload),
    })),
}));
