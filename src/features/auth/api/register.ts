import { useMutation } from "@tanstack/react-query";
import { apiClient } from "../../../api/apiClient";

export interface RegisterCompanyPayload {
  name: string;
  username: string;
  admin_email: string;
  password: string;
  first_name: string;
  last_name: string;
  phoneNumber: number;
  address: string;
  businessType: string;
  domainName: string;
  type: string;
}

export interface RegisterCompanyResponse {
  success?: boolean;
  status_code?: number;
  message?: string;
  data?: any;
}

const registerCompany = async (
  payload: RegisterCompanyPayload,
): Promise<RegisterCompanyResponse> => {
  // Since apiClient base URL is /api/, this will request api/tenants/register/
  const { data } = await apiClient.post<RegisterCompanyResponse>(
    "tenants/register/",
    payload,
  );
  return data;
};

export const useRegisterCompanyMutation = () => {
  return useMutation<RegisterCompanyResponse, Error, RegisterCompanyPayload>({
    mutationFn: registerCompany,
  });
};
