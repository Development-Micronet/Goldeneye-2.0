import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../../../store/useAuthStore";
import {
  getApiKeys,
  createApiKey,
  revokeApiKey,
  parseOrDecryptPayload,
  extractApiKeyList,
  type ApiKeyItem,
  type CreateApiKeyDto,
} from "../api/apiKey";

export const useApiKeys = (options?: { enabled?: boolean }) => {
  const accessToken = useAuthStore((state) => state.accessToken);
  const token = accessToken?.replace("Bearer ", "").trim() || "";

  return useQuery<ApiKeyItem[]>({
    queryKey: ["tenant-api-keys"],
    queryFn: async () => {
      const raw = await getApiKeys();
      const decrypted = await parseOrDecryptPayload(raw, token);
      return extractApiKeyList(decrypted);
    },
    enabled: options?.enabled !== false && !!token,
  });
};

export const useCreateApiKeyMutation = () => {
  const queryClient = useQueryClient();
  const accessToken = useAuthStore((state) => state.accessToken);
  const token = accessToken?.replace("Bearer ", "").trim() || "";

  return useMutation({
    mutationFn: async (payload: CreateApiKeyDto) => {
      const raw = await createApiKey(payload);
      const decrypted = await parseOrDecryptPayload(raw, token);
      return decrypted?.data || decrypted;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-api-keys"] });
    },
  });
};

export const useRevokeApiKeyMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number | string) => {
      return await revokeApiKey(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant-api-keys"] });
    },
  });
};
