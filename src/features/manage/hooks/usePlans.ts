import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getPlans,
  getMyPlan,
  createPlan,
  deletePlan,
  updatePlan,
  assignPlan,
  unassignPlan,
  type CreatePlanDto,
  type PlansResponse,
} from "../api/plans";
import { useAuthStore } from "../../../store/useAuthStore";
import { decryptAESGCM } from "../../../utils/dataDecrypt";
import { useEffect } from "react";
import { usePlanStore } from "../../data/hooks/usePlanStore";

// Helper function to extract, decrypt and format nested validation error responses
const handleApiError = async (err: any, token: string): Promise<never> => {
  let errorMessage = "An error occurred";

  // 1. Check if backend sent encrypted error data
  if (err.response?.data?.data && token) {
    try {
      const decrypted = await decryptAESGCM(err.response.data.data, token);

      // 2. Scan for nested "data" fields containing validation arrays (like name: ["..."])
      if (decrypted.data && typeof decrypted.data === "object") {
        const validationErrors: string[] = [];
        for (const [key, value] of Object.entries(decrypted.data)) {
          const fieldName = key.charAt(0).toUpperCase() + key.slice(1).replace("_", " ");

          if (Array.isArray(value)) {
            validationErrors.push(`${fieldName}: ${value.join(", ")}`);
          } else if (typeof value === "string") {
            validationErrors.push(`${fieldName}: ${value}`);
          }
        }

        // Agar nested validation messages mile toh unhe select karein
        if (validationErrors.length > 0) {
          errorMessage = validationErrors.join("\n");
        } else {
          errorMessage = decrypted.message || JSON.stringify(decrypted);
        }
      } else {
        errorMessage = decrypted.message || JSON.stringify(decrypted);
      }
    } catch (decryptErr) {
      console.error("Failed to decrypt error response:", decryptErr);
    }
  }
  // 3. Fallback to unencrypted api messages
  else if (err.response?.data?.message) {
    errorMessage = err.response.data.message;
  }
  // 4. Fallback to normal network error messages
  else if (err.message) {
    errorMessage = err.message;
  }

  throw new Error(errorMessage);
};

export const usePlans = (options?: { enabled?: boolean }) => {
  const accessToken = useAuthStore((state) => state.accessToken);
  const token = accessToken?.replace("Bearer ", "").trim() || "";

  return useQuery({
    queryKey: ["plans"],
    queryFn: async () => {
      if (!token) throw new Error("Missing Access Token");

      try {
        const encryptedResponse = await getPlans();

        const decrypted = (await decryptAESGCM(encryptedResponse.data, token)) as PlansResponse;

        return decrypted.data;
      } catch (err: any) {
        if (err.message && !err.response) {
          throw err;
        }
        await handleApiError(err, token);
      }
    },
    enabled: options?.enabled !== false && !!token,
  });
};

export const useMyPlan = (options?: { enabled?: boolean }) => {
  const accessToken = useAuthStore((state) => state.accessToken);
  const setPlan = usePlanStore((state) => state.setPlan);

  const token = accessToken?.replace("Bearer ", "").trim() || "";

  const query = useQuery({
    queryKey: ["my-plan"],

    queryFn: async () => {
      if (!token) {
        throw new Error("Missing Access Token");
      }

      try {
        const encryptedResponse = await getMyPlan();

        if (typeof encryptedResponse.data === "string") {
          const decrypted = await decryptAESGCM(encryptedResponse.data, token);

          return decrypted.data || decrypted;
        }

        return encryptedResponse.data || encryptedResponse;
      } catch (err: any) {
        if (err.message && !err.response) {
          throw err;
        }

        await handleApiError(err, token);
      }
    },

    enabled: options?.enabled !== false && !!token,
  });

  // Sync React Query data -> Zustand
  useEffect(() => {
    if (query.data) {
      setPlan(query.data);
    }
  }, [query.data, setPlan]);

  return useQuery({
    queryKey: ["my-plan"],
    queryFn: getMyPlan,
    enabled: options?.enabled ?? true,
    retry: false,
  });
};

export const useCreatePlanMutation = () => {
  const queryClient = useQueryClient();
  const accessToken = useAuthStore((state) => state.accessToken);
  const token = accessToken?.replace("Bearer ", "").trim() || "";

  return useMutation({
    mutationFn: async (planData: CreatePlanDto) => {
      try {
        return await createPlan(planData);
      } catch (err: any) {
        await handleApiError(err, token);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plans"] });
    },
  });
};

export const useDeletePlanMutation = () => {
  const queryClient = useQueryClient();
  const accessToken = useAuthStore((state) => state.accessToken);
  const token = accessToken?.replace("Bearer ", "").trim() || "";

  return useMutation({
    mutationFn: async (id: number) => {
      try {
        return await deletePlan(id);
      } catch (err: any) {
        await handleApiError(err, token);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plans"] });
    },
  });
};

export const useUpdatePlanMutation = () => {
  const queryClient = useQueryClient();
  const accessToken = useAuthStore((state) => state.accessToken);
  const token = accessToken?.replace("Bearer ", "").trim() || "";

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<CreatePlanDto> }) => {
      try {
        return await updatePlan(id, data);
      } catch (err: any) {
        await handleApiError(err, token);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plans"] });
    },
  });
};

export const useAssignPlanMutation = () => {
  const queryClient = useQueryClient(); // ← ye line missing hai, add karo
  const accessToken = useAuthStore((state) => state.accessToken);
  const token = accessToken?.replace("Bearer ", "").trim() || "";

  return useMutation({
    mutationFn: async ({ planId, schemaName }: { planId: number; schemaName: string }) => {
      try {
        const res = await assignPlan(planId, { schema_name: schemaName });
        if (res && res.data && token) {
          return await decryptAESGCM(res.data, token);
        }
        return res;
      } catch (err: any) {
        await handleApiError(err, token);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plans"] });
      queryClient.invalidateQueries({ queryKey: ["my-plan"] });
      queryClient.invalidateQueries({ queryKey: ["tenant-plans"] });
    },
  });
};
export const useUnassignPlanMutation = () => {
  const queryClient = useQueryClient();
  const accessToken = useAuthStore((state) => state.accessToken);
  const token = accessToken?.replace("Bearer ", "").trim() || "";

  return useMutation({
    mutationFn: async ({ planId, schemaName }: { planId: number; schemaName: string }) => {
      try {
        return await unassignPlan(planId, schemaName);
      } catch (err: any) {
        await handleApiError(err, token);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plans"] });
      queryClient.invalidateQueries({ queryKey: ["my-plan"] });
      queryClient.invalidateQueries({ queryKey: ["tenant-plans"] });
    },
  });
};
