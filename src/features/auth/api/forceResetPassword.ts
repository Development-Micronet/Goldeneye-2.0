import { apiClient } from "../../../api/apiClient";

export interface ForceResetPasswordPayload {
  new_password?: string;
  confirm_password?: string;
}

export const forceResetPassword = async (payload: ForceResetPasswordPayload): Promise<any> => {
  // Since user is already authenticated at this point,
  // apiClient automatically attaches the Authorization Bearer token header.
  const { data } = await apiClient.post("auth/force-reset-password/", payload);
  return data;
};
