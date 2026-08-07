import { apiClient } from "../../../api/apiClient";

export interface ForgotPasswordPayload {
  email: string;
}

export const forgotPassword = async (payload: ForgotPasswordPayload): Promise<any> => {
  const { data } = await apiClient.post("auth/forgot-password/", payload);
  return data;
};
