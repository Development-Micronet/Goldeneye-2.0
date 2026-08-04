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
    } else if (current && typeof current === "object" && typeof current.data === "string") {
      current = await decryptAESGCM(current.data, token);
    }
  } catch (err) {
    console.warn("Decryption warning in Techspec API:", err);
  }

  return current;
};

export const AddTechspec = async (formData: FormData): Promise<any> => {
  const response = await apiClient.post("product-tech-image/", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return await decryptResponseData(response.data);
};

export const GetTechspec = async (productName: string): Promise<any> => {
  const response = await apiClient.get(`product-tech-image/?product_name=${productName}`);
  return await decryptResponseData(response.data);
};