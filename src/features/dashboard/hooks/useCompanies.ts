import { useQuery } from "@tanstack/react-query";
import { getTenantSuperusers, type TenantSuperusersResponse } from "../api/dashboard";

import { useAuthStore } from "../../../store/useAuthStore";
import { decryptAESGCM } from "../../../utils/dataDecrypt";

export const useCompanies = () => {
  const accessToken = useAuthStore((state) => state.accessToken);
  const token = accessToken?.replace("Bearer ", "").trim() || "";

  return useQuery({
    queryKey: ["companies"],

    queryFn: async () => {
      const res = await getTenantSuperusers();

      if (!token) {
        throw new Error("Missing Token");
      }

      const decrypted = (await decryptAESGCM(res.data, token)) as TenantSuperusersResponse;

      return decrypted.results.results;
    },
  });
};
