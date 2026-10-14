import { apiClient } from "../../../api/apiClient";
import { decryptAESGCM } from "../../../utils/dataDecrypt";

export interface ApiKeyItem {
  id: number;
  name: string;
  key?: string;
  api_key?: string;
  token?: string;
  prefix?: string;
  masked_key?: string;
  created_at?: string;
  expires_at: string;
  is_active?: boolean;
  revoked?: boolean;
  status?: string;
  last_used_at?: string | null;
  created_by?: string | number | null;
}

export interface CreateApiKeyDto {
  name: string;
  expires_at: string;
}

export interface ApiKeyCreatedResponse {
  id?: number;
  name?: string;
  key?: string;
  api_key?: string;
  token?: string;
  expires_at?: string;
  created_at?: string;
  [key: string]: any;
}

export interface ApiKeysListResponse {
  success?: boolean;
  status_code?: number;
  message?: string;
  data?: ApiKeyItem[] | { results?: ApiKeyItem[]; keys?: ApiKeyItem[] };
  results?: ApiKeyItem[];
}

/**
 * Safely parse or decrypt API responses (supporting plaintext JSON or AES-GCM encrypted payload)
 */
export async function parseOrDecryptPayload(rawData: any, token?: string): Promise<any> {
  if (!rawData) return rawData;

  // If raw string
  if (typeof rawData === "string") {
    if (token) {
      try {
        const decrypted = await decryptAESGCM(rawData, token);
        if (decrypted) return decrypted;
      } catch {
        // Not encrypted or decryption failed, try parse JSON
      }
    }
    try {
      return JSON.parse(rawData);
    } catch {
      return rawData;
    }
  }

  // If object has data field as encrypted string
  if (typeof rawData === "object" && typeof rawData.data === "string" && token) {
    try {
      const decrypted = await decryptAESGCM(rawData.data, token);
      if (decrypted) return decrypted;
    } catch {
      // not encrypted
    }
  }

  return rawData;
}

/**
 * Helper to normalize list of API keys from varied response envelopes
 */
export function extractApiKeyList(payload: any): ApiKeyItem[] {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.results)) return payload.results;
  if (payload.data && Array.isArray(payload.data.results)) return payload.data.results;
  if (payload.data && Array.isArray(payload.data.keys)) return payload.data.keys;
  if (Array.isArray(payload.keys)) return payload.keys;
  return [];
}

/**
 * GET /api/tenants/api-key/
 */
export const getApiKeys = async (): Promise<any> => {
  const { data } = await apiClient.get("tenants/api-key/");
  return data;
};

/**
 * POST /api/tenants/api-key/
 * Body: { name: string, expires_at: string }
 */
export const createApiKey = async (payload: CreateApiKeyDto): Promise<any> => {
  const { data } = await apiClient.post("tenants/api-key/", payload);
  return data;
};

/**
 * POST /api/tenants/api-key/{id}/revoke/
 */
export const revokeApiKey = async (id: number | string): Promise<any> => {
  try {
    const { data } = await apiClient.post(`tenants/api-key/${id}/revoke/`);
    return data;
  } catch (error: any) {
    // Fallback if backend registered DELETE for revoke
    if (error.response?.status === 405) {
      const { data } = await apiClient.delete(`tenants/api-key/${id}/revoke/`);
      return data;
    }
    throw error;
  }
};
