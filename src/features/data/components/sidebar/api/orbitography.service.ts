import { apiClient } from "../../../../../api/apiClient";

export interface OrbitSearchPayload {
  satellites: string[];
  startDate: string;
  endDate: string;
  mode: string;
  angle: number;
  shape?: any;
}

export const fetchOrbits = async (payload: OrbitSearchPayload, hasShape: boolean) => {
  const url = hasShape
    ? "products/orbitography/orbits-with-shape/"
    : "products/orbitography/orbits/";
  return apiClient.post(url, payload);
};
