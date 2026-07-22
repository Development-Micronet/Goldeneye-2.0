import { apiClient } from "../../../../../api/apiClient";

// import type {ProductResponse} from "../Models/product.types";

export type SatelliteProvider = "airbus" | "sentinel";

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
  incidence_angle: [number, number],
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
}

export interface EncryptedResponse {
  data: string;
}

export const searchProducts = async (payload: ProductSearchPayload): Promise<EncryptedResponse> => {
  const response = await apiClient.post<EncryptedResponse>("/products/unf-search/", payload);

  return response.data;
};
