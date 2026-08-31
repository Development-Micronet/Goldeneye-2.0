import { apiClient } from "../../../../../api/apiClient";

interface TaskingAttemptPayload {
  acquisitionStartDate: string;
  acquisitionEndDate: string;
  missions: string[];
  progTypeNames: string[];
  acquisitionMode: string;
  maxCloudCover: number;
  maxIncidenceAngle: number;
  aoi: {
    type: "Polygon";
    coordinates: number[][][];
  };
}

export const FetchAttempt = async (
  payload: TaskingAttemptPayload
) => {
  const res = await apiClient.post("/tasking/attempts/", payload);
  return res.data;
};
