import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTenantPlans } from "./useTenantPlans";
import { getRegisterUserServices } from "../api/dashboard";
import { usePlanStore } from "../../data/hooks/usePlanStore";
import { useAuthStore } from "../../../store/useAuthStore";
import { decryptAESGCM } from "../../../utils/dataDecrypt";

export const DEFAULT_SERVICES = [
  "search",
  "tasking",
  "my_indent",
  "my_orders",
  "orbitography",
  "analytics",
  "api_key",
  "geo_3d",
  "quotations",
];

export const extractServicesList = (data: any): string[] => {
  if (!data) return [];
  if (Array.isArray(data)) {
    return data.filter((x): x is string => typeof x === "string");
  }
  if (Array.isArray(data.services)) {
    return data.services.filter((x): x is string => typeof x === "string");
  }
  if (Array.isArray(data.data?.services)) {
    return data.data.services.filter((x): x is string => typeof x === "string");
  }
  if (Array.isArray(data.data)) {
    return data.data.filter((x): x is string => typeof x === "string");
  }
  if (Array.isArray(data.results?.services)) {
    return data.results.services.filter((x): x is string => typeof x === "string");
  }
  if (Array.isArray(data.results)) {
    return data.results.filter((x): x is string => typeof x === "string");
  }
  return [];
};

/**
 * Hook to retrieve available services for a tenant company:
 * 1. Checks GET /api/tenants/register-user/ if supported by backend
 * 2. Matches the tenant company to its assigned plan from /api/dashboard/tenant-plans/
 * 3. Falls back to user's active plan (for Admin) or system default services
 */
export const useTenantCompanyServices = (
  organizationName?: string,
  schemaName?: string,
) => {
  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);
  const token = accessToken?.replace("Bearer ", "").trim() || "";
  const isSuperAdmin = user?.roleName?.toLowerCase() === "superadmin";

  // 1. Plan from tenant-plans (for Superadmin)
  const { data: tenantPlans = [], isLoading: loadingTenantPlans } = useTenantPlans();

  // 2. Active plan from Zustand / MyPlan (for Admin)
  const myPlan = usePlanStore((state) => state.plan);

  // 3. Direct fetch from GET /api/tenants/register-user/
  const { data: apiServices, isLoading: loadingApiServices } = useQuery({
    queryKey: ["register-user-services", schemaName, organizationName],
    queryFn: async () => {
      if (!token) return null;
      try {
        const raw = await getRegisterUserServices({
          schema_name: schemaName,
          organization_name: organizationName,
        });

        if (!raw) return null;

        let parsedData = raw;
        if (typeof raw.data === "string") {
          try {
            const decrypted = await decryptAESGCM(raw.data, token);
            parsedData = decrypted.data ?? decrypted.results ?? decrypted;
          } catch {
            // failed to decrypt or not encrypted string
          }
        }

        const list = extractServicesList(parsedData);
        return list.length > 0 ? list : null;
      } catch {
        // Backend GET may not be implemented or return 404/405, fallback gracefully
        return null;
      }
    },
    enabled: !!token && (!!schemaName || !!organizationName),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  // Calculate matching tenant plan details
  const matchingTenantPlan = useMemo(() => {
    if (!tenantPlans || tenantPlans.length === 0) return null;
    return (
      tenantPlans.find((tp) => {
        if (schemaName && tp.schema_name && tp.schema_name === schemaName) return true;
        if (
          organizationName &&
          tp.company_name &&
          tp.company_name.trim().toLowerCase() === organizationName.trim().toLowerCase()
        ) {
          return true;
        }
        return false;
      }) ?? null
    );
  }, [tenantPlans, schemaName, organizationName]);

  // Derive available services and assigned plan name
  const { availableServices, assignedPlanName } = useMemo(() => {
    // 1. If direct API returned services, use them
    if (apiServices && apiServices.length > 0) {
      return {
        availableServices: apiServices,
        assignedPlanName: matchingTenantPlan?.plan_details?.name || myPlan?.plan_name || null,
      };
    }

    // 2. If SuperAdmin and matching tenant plan exists with services
    if (
      isSuperAdmin &&
      matchingTenantPlan?.plan_details?.services &&
      matchingTenantPlan.plan_details.services.length > 0
    ) {
      return {
        availableServices: matchingTenantPlan.plan_details.services,
        assignedPlanName: matchingTenantPlan.plan_details.name || null,
      };
    }

    // 3. If Admin or user with active plan
    if (myPlan?.services && myPlan.services.length > 0) {
      return {
        availableServices: myPlan.services,
        assignedPlanName: myPlan.plan_name || null,
      };
    }

    // 4. Default fallback services
    return {
      availableServices: DEFAULT_SERVICES,
      assignedPlanName: null,
    };
  }, [apiServices, isSuperAdmin, matchingTenantPlan, myPlan]);

  return {
    availableServices,
    assignedPlanName,
    isLoading: loadingTenantPlans || loadingApiServices,
  };
};

