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
  config?: any
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

// 2. GET product-tech-image/?product_name=SPOT-6
export const GetTechspec = async (productName?: string): Promise<any> => {
  const query = productName ? `?product_name=${encodeURIComponent(productName)}` : "";
  const response = await requestWithFallback("get", query);
  return await decryptResponseData(response?.data);
};

// 3. GET product-tech-image/{id}/
export const GetTechspecById = async (id: number | string): Promise<any> => {
  const response = await requestWithFallback("get", `${id}/`);
  return await decryptResponseData(response?.data);
};

// 4. PUT product-tech-image/{id}/
export const UpdateTechspec = async (
  id: number | string,
  formData: FormData
): Promise<any> => {
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