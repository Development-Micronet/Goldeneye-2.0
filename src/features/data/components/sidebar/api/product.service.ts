import { apiClient } from "../../../../../api/apiClient";

export type SatelliteProvider = "airbus" | "sentinel" | "planet" | string;

export interface ProductSearchPayload {
  provider: SatelliteProvider;
  start_date: string;
  end_date: string;
  cloud_cover: [number, number];
  intersects: {
    type: "Polygon";
    coordinates: number[][][];
  };
  sensors: string[];
  incidence_angle: [number, number];
  start_page: number;
  items_per_page?: number;
  limit?: number;
  sortBy:
    | "date"
    | "cloud_cover"
    | "incident_angle"
    | "+date"
    | "+cloud_cover"
    | "+incident_angle"
    | "-date"
    | "-cloud_cover"
    | "-incident_angle";
  /** Only sent when provider === "airbus" */
  productType?: string;
}

export interface EncryptedResponse {
  data: string;
}

export const searchProducts = async (payload: ProductSearchPayload): Promise<EncryptedResponse> => {
  const response = await apiClient.post<EncryptedResponse>("/products/unf-search/", payload);
  return response.data;
};

export const listofproviderandsensors = async () => {
  const res = await apiClient.get("/products/sensors/");
  return res.data;
};