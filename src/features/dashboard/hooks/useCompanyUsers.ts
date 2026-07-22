import { useQuery } from "@tanstack/react-query";
import { decryptAESGCM } from "../../../utils/dataDecrypt";

import {
  getCompanyUsers,
  type CompanyUsersResponse,
} from "../api/dashboard";
import { useAuthStore } from "../../../store/useAuthStore";

export const useCompanyUsers = (schemaName: string) => {
  const token = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: ["company-users", schemaName],

    queryFn: async () => {
      const encrypted = await getCompanyUsers(schemaName);

      const decrypted = (await decryptAESGCM(
        encrypted.data,
        token!
      )) as CompanyUsersResponse;

      return decrypted.results.results;
    },

    enabled: !!schemaName,
  });
};