import { apiClient } from "../../../api/apiClient";

export interface ProviderCredentials {
  api_key: string;
}
export type Status = "Active" | "Inactive";
export interface Provider {
  id: string;
  name: string;
  description: string;
  status: string;
  credentials: ProviderCredentials;
  api_key_expires_at: string | null;
}

export interface ProvidersResponse {
  success: boolean;
  status_code: number;
  message: string;
  data: Provider[];
}

export interface ProviderCredentials {
  api_key: string;
}

export interface CreateProviderDto {
  name: string;
  description: string;
  credentials: ProviderCredentials;
  status: "Active" | "Inactive";
}


export interface UpdateProviderDto {
  name: string;
  description: string;
  status: Status;
  credentials: {
    api_key: string;
  };
}

export type UpdateProviderPayload = {
  id: string;
  data: UpdateProviderDto;
};
export const getListOfProviders = async (): Promise<ProvidersResponse> => {
  const { data } = await apiClient.get<ProvidersResponse>("products/providers/");
  return data;
}

export const createProvider = async (
  providerData: CreateProviderDto
): Promise<Provider> => {
  const { data } = await apiClient.post<Provider>(
    "products/providers/",
    providerData
  );
  return data;
}

export const deleteProvider = async (providerId: string): Promise<void> => {
  await apiClient.delete(`products/providers/${providerId}/`);
}


export const getProviderById = async (providerId: string): Promise<Provider> => {
  return apiClient.get(`products/providers/${providerId}/`).then((response) => {
    return response.data.data;
  });
}


export const UpdateProviderById =async(ProviderId:string,providerData:UpdateProviderDto):Promise<Provider>=>{
  return apiClient.put(`products/providers/${ProviderId}/`,providerData).then((response)=>{
    return response.data
  })
}