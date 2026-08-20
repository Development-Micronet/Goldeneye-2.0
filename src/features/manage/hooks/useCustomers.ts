import { useQuery } from "@tanstack/react-query";
import { getCustomers, type CustomersResponse } from "../api/customers";
import { useAuthStore } from "../../../store/useAuthStore";
import { decryptAESGCM } from "../../../utils/dataDecrypt";

export const useCustomers = (enabled = true) => {
  const accessToken = useAuthStore((state) => state.accessToken);
  const token = accessToken?.replace("Bearer ", "").trim() || "";

  return useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      if (!token) throw new Error("Missing Access Token");

      const encryptedResponse = await getCustomers();

      const decrypted = (await decryptAESGCM(
        encryptedResponse.data,
        token
      )) as CustomersResponse;

      return decrypted.data.customers; // Returns: Customer[]
    },
    // enabled: !!token,
    enabled: !!token && enabled,
  });
};
