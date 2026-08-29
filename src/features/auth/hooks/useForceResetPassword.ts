import { useMutation } from "@tanstack/react-query";
import { forceResetPassword, type ForceResetPasswordPayload } from "../api/forceResetPassword";
import { useAuthStore } from "../../../store/useAuthStore";
import { decryptAESGCM } from "../../../utils/dataDecrypt";

// Helper function to extract and decrypt error response
const handleApiError = async (err: any, token: string): Promise<never> => {
  let errorMessage = "Failed to update password. Please try again.";

  // 1. Check if backend sent encrypted error data
  if (err.response?.data?.data && token) {
    try {
      const decrypted = await decryptAESGCM(err.response.data.data, token);
      errorMessage = decrypted.message || JSON.stringify(decrypted);
    } catch (decryptErr) {
      console.error("Failed to decrypt error response:", decryptErr);
    }
  }
  // 2. Fallback to unencrypted api messages
  else if (err.response?.data?.message) {
    errorMessage = err.response.data.message;
  }
  // 3. Fallback to normal network error messages
  else if (err.message) {
    errorMessage = err.message;
  }

  throw new Error(errorMessage);
};

export const useForceResetPasswordMutation = () => {
  const accessToken = useAuthStore((state) => state.accessToken);
  const token = accessToken?.replace("Bearer ", "").trim() || "";

  return useMutation({
    mutationFn: async (payload: ForceResetPasswordPayload) => {
      try {
        return await forceResetPassword(payload);
      } catch (err: any) {
        if (err.message && !err.response) {
          throw err;
        }
        await handleApiError(err, token);
      }
    },
  });
};
