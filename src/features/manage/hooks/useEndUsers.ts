import { useQuery } from "@tanstack/react-query";
import {
    getTenantSuperusers,
    getCompanyUsers,
    type TenantSuperusersResponse,
    type CompanyUsersResponse
} from "../api/enduser";
import { useAuthStore } from "../../../store/useAuthStore";
import { decryptAESGCM } from "../../../utils/dataDecrypt";

// Hook 1: Decrypted Tenant Superusers (Companies) list fetch karne ke liye
export const useTenantSuperusers = () => {
    const accessToken = useAuthStore((state) => state.accessToken);
    // Token se 'Bearer ' prefix hata rahe hain decryption ke liye
    const token = accessToken?.replace("Bearer ", "").trim() || "";

    return useQuery({
        queryKey: ["manage-tenant-superusers"],
        queryFn: async () => {
            if (!token) throw new Error("Missing Access Token");

            const encryptedResponse = await getTenantSuperusers();

            // Data ko decrypt kar rahe hain
            const decrypted = (await decryptAESGCM(
                encryptedResponse.data,
                token
            )) as TenantSuperusersResponse;

            return decrypted.results.results; // Returns: Company[]
        },
        enabled: !!token,
    });
};

// Hook 2: Kisi selected schema ke andar ke users list fetch karne ke liye
export const useCompanyUsers = (schemaName: string) => {
    const accessToken = useAuthStore((state) => state.accessToken);
    const token = accessToken?.replace("Bearer ", "").trim() || "";

    return useQuery({
        queryKey: ["manage-company-users", schemaName],
        queryFn: async () => {
            if (!token) throw new Error("Missing Access Token");
            if (!schemaName) throw new Error("Missing Schema Name");

            const encryptedResponse = await getCompanyUsers(schemaName);

            // Data ko decrypt kar rahe hain
            const decrypted = (await decryptAESGCM(
                encryptedResponse.data,
                token
            )) as CompanyUsersResponse;

            return decrypted.results.results; // Returns: CompanyUser[]
        },
        enabled: !!schemaName && !!token,
    });
};
