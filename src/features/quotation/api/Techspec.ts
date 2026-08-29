import { apiClient } from "../../../api/apiClient";
import { decryptAESGCM } from "../../../utils/dataDecrypt";
import { useAuthStore } from "../../../store/useAuthStore";

const decryptResponseData = async (resData: any): Promise<any> => {
  if (!resData) return resData;

  const accessToken = useAuthStore.getState().accessToken;
  const token = accessToken?.replace("Bearer ", "").trim() || "";

  if (!token) return resData;

  let current = resData;

  try {
    if (typeof current === "string") {
      current = await decryptAESGCM(current, token);
    } else if (current && typeof current === "object") {
      if (typeof current.data === "string") {
        current = await decryptAESGCM(current.data, token);
      } else if (typeof current.results === "string") {
        const decryptedResults = await decryptAESGCM(current.results, token);
        current = { ...current, results: decryptedResults };
      }
    }
  } catch (err) {
    console.warn("Decryption warning in Techspec API:", err);
  }

  return current;
};

// Resilient API requester trying primary path first, fallback path on 404
const requestWithFallback = async (
  method: "get" | "post" | "put" | "delete",
  pathSuffix: string,
  dataOrParams?: any,
  config?: any,
) => {
  const primaryPath = `product-tech-image/${pathSuffix}`;
  const fallbackPath = `products/product-tech-image/${pathSuffix}`;

  try {
    if (method === "get") return await apiClient.get(primaryPath, config);
    if (method === "post") return await apiClient.post(primaryPath, dataOrParams, config);
    if (method === "put") return await apiClient.put(primaryPath, dataOrParams, config);
    if (method === "delete") return await apiClient.delete(primaryPath, config);
  } catch (err: any) {
    if (err?.response?.status === 404) {
      if (method === "get") return await apiClient.get(fallbackPath, config);
      if (method === "post") return await apiClient.post(fallbackPath, dataOrParams, config);
      if (method === "put") return await apiClient.put(fallbackPath, dataOrParams, config);
      if (method === "delete") return await apiClient.delete(fallbackPath, config);
    }
    throw err;
  }
};

// 1. POST product-tech-image/
export const AddTechspec = async (formData: FormData): Promise<any> => {
  const response = await requestWithFallback("post", "", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return await decryptResponseData(response?.data);
};

/**
 * Helper to extract product prefix before hyphen ('-').
 * e.g., "Pléiades-0.7m" -> "Pléiades", "SPOT-6" -> "SPOT"
 * Everything after '-' is ignored.
 */
export const getProductPrefix = (productName?: string): string => {
  if (!productName) return "";
  const trimmed = productName.trim();
  if (trimmed.includes("-")) {
    return trimmed.split("-")[0].trim();
  }
  return trimmed;
};

// 2. GET product-tech-image/?product_name=SPOT-6
export const GetTechspec = async (productName?: string): Promise<any> => {
  const prefix = getProductPrefix(productName);
  const query = prefix ? `?product_name=${encodeURIComponent(prefix)}` : "";
  const response = await requestWithFallback("get", query);
  const decrypted = await decryptResponseData(response?.data);

  // Fallback: If searching with prefix returned empty results and productName had a hyphen,
  // try searching with full productName.
  if (
    productName &&
    prefix !== productName.trim() &&
    (Array.isArray(decrypted)
      ? decrypted.length === 0
      : !decrypted ||
        (decrypted.results && Array.isArray(decrypted.results) && decrypted.results.length === 0))
  ) {
    try {
      const fallbackQuery = `?product_name=${encodeURIComponent(productName.trim())}`;
      const fallbackRes = await requestWithFallback("get", fallbackQuery);
      const fallbackDecrypted = await decryptResponseData(fallbackRes?.data);
      const fallbackList = Array.isArray(fallbackDecrypted)
        ? fallbackDecrypted
        : fallbackDecrypted?.results || fallbackDecrypted?.data || [];
      if (fallbackList.length > 0) {
        return fallbackDecrypted;
      }
    } catch {
      // Ignore fallback errors and return original decrypted response
    }
  }

  return decrypted;
};

// 3. GET product-tech-image/{id}/
export const GetTechspecById = async (id: number | string): Promise<any> => {
  const response = await requestWithFallback("get", `${id}/`);
  return await decryptResponseData(response?.data);
};

// 4. PUT product-tech-image/{id}/
export const UpdateTechspec = async (id: number | string, formData: FormData): Promise<any> => {
  const response = await requestWithFallback("put", `${id}/`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return await decryptResponseData(response?.data);
};

// 5. DELETE product-tech-image/{id}/
export const DeleteTechspec = async (id: number | string): Promise<any> => {
  const response = await requestWithFallback("delete", `${id}/`);
  return await decryptResponseData(response?.data);
};
