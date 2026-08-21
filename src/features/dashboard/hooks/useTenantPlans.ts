import { useQuery } from "@tanstack/react-query";
import { getTenantPlans } from "../api/dashboard";
import { useAuthStore } from "../../../store/useAuthStore";
import { decryptAESGCM } from "../../../utils/dataDecrypt";

export interface TenantPlanRow {
    customer_id: number;
    schema_name: string;
    company_name: string;
    plan_details: {
        plan_id: number;
        name: string;
        is_active: boolean;
        is_currently_valid: boolean;
        start_date: string;
        end_date: string;
        services: string[];
    } | null;
}

export const useTenantPlans = () => {
    const user = useAuthStore((state) => state.user);
    const accessToken = useAuthStore((state) => state.accessToken);
    const token = accessToken?.replace("Bearer ", "").trim() || "";
    const isSuperAdmin = user?.roleName?.toLowerCase() === "superadmin";

    return useQuery({
        queryKey: ["tenant-plans"],
        queryFn: async () => {
            if (!token) throw new Error("Missing Access Token");

            const encryptedResponse = await getTenantPlans();
            const decrypted = await decryptAESGCM(encryptedResponse.data, token);

            return (decrypted.data ?? decrypted) as TenantPlanRow[];
        },
        enabled: !!token && isSuperAdmin,
    });
};