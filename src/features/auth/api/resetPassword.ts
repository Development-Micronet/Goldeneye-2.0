import { apiClient } from "../../../api/apiClient";

export interface ResetPasswordPayload {
    uid: string;
    token: string;
    new_password?: string;
    confirm_password?: string;
}

export const resetPassword = async (payload: ResetPasswordPayload): Promise<any> => {
    const { data } = await apiClient.post("auth/reset-password-confirm/", payload);
    return data;
};
