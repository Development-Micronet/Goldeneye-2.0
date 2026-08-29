import { apiClient } from "../../../api/apiClient";
import { decryptAESGCM } from "../../../utils/dataDecrypt";
import { useAuthStore } from "../../../store/useAuthStore";

const userName: string = "admin";

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
    console.warn("Decryption attempt warning:", err);
  }

  return current;
};

export interface QuotationFilters {
  search?: string;
  company?: string;
  from_company?: string;
  city?: string;
  date_from?: string;
  date_to?: string;
  amount_min?: string;
  amount_max?: string;
  gst_type?: string;
  delivery?: string;
  incoterms?: string;
  validity?: string;
  has_images?: string;
  sort_by?: string;
  sort_dir?: string;
  page_size?: number | string;
  [key: string]: any;
}

// 1. GET {{baseUrl}}/api/quotation/?page=1&page_size=10
export const Getallquotations = async (page: number = 1, pageSize: number = 10): Promise<any> => {
  const response = await apiClient.get(`quotation/?page=${page}&page_size=${pageSize}`);
  return await decryptResponseData(response.data);
};

// 2. POST {{baseUrl}}/api/quotation/generate-pdf/ (Multipart FormData)
export const CreateQuotation = async (formData: FormData): Promise<any> => {
  const response = await apiClient.post("quotation/generate-pdf/", formData, {
    headers: {
      "Content-Type": undefined, // Browser sets multipart/form-data boundary automatically
    },
  });
  return await decryptResponseData(response.data);
};

// 3. POST {{baseUrl}}/api/quotation/create/ (JSON Payload)
export const CreateQuotationJSON = async (payload: any): Promise<any> => {
  const response = await apiClient.post("quotation/create/", payload);
  return await decryptResponseData(response.data);
};

// 4. GET {{baseUrl}}/api/quotation/search/?...
export const SearchQuotation = async (
  filters: QuotationFilters = {},
  page: number = 1,
): Promise<any> => {
  const params = new URLSearchParams();
  params.append("page", page.toString());

  const keys: (keyof QuotationFilters)[] = [
    "search",
    "company",
    "from_company",
    "city",
    "date_from",
    "date_to",
    "amount_min",
    "amount_max",
    "gst_type",
    "delivery",
    "incoterms",
    "validity",
    "has_images",
    "sort_by",
    "sort_dir",
    "page_size",
  ];

  keys.forEach((k) => {
    const value = filters[k];
    if (value !== undefined && value !== "" && value !== null) {
      params.append(k, value.toString());
    }
  });

  const response = await apiClient.get(`quotation/search/?${params.toString()}`);
  return await decryptResponseData(response.data);
};

// 5. GET {{baseUrl}}/api/quotation/next-quotation-number/
export const Getnextquotations = async (): Promise<any> => {
  const response = await apiClient.get("quotation/next-quotation-number/");
  return await decryptResponseData(response.data);
};

// 6. DELETE {{baseUrl}}/api/quotation/delete/{id}/
export const DeleteQuotation = async (id: number | string): Promise<any> => {
  const response = await apiClient.delete(`quotation/delete/${id}/`);
  return await decryptResponseData(response.data);
};

// 7. GET {{baseUrl}}/api/quotation/{id}/
export const GetQuotation = async (id: number | string): Promise<any> => {
  const response = await apiClient.get(`quotation/${id}/`);
  return await decryptResponseData(response.data);
};

// 8. PUT {{baseUrl}}/api/quotation/update/{id}/
export const UpdateQuotation = async (id: number | string, payload: any): Promise<any> => {
  const response = await apiClient.put(`quotation/update/${id}/`, payload);
  return await decryptResponseData(response.data);
};

// 9. GET {{baseUrl}}/api/quotation/images/{id}/download-kml/
export const DownloadKml = async (
  id: number | string,
): Promise<import("axios").AxiosResponse<Blob>> => {
  const response = await apiClient.get(`quotation/images/${id}/download-kml/`, {
    responseType: "blob",
  });
  return response;
};

// 10. GET {{baseUrl}}/api/quotation/images/{id}/download-html/
export const DownloadHtml = async (
  id: number | string,
): Promise<import("axios").AxiosResponse<Blob>> => {
  const response = await apiClient.get(`quotation/images/${id}/download-html/`, {
    responseType: "blob",
  });
  return response;
};

// 11. GET /users/{userName}/assignproduct/
export const Fetchdata = async (): Promise<any> => {
  const response = await apiClient.get(`/users/${userName}/assignproduct/`);
  return await decryptResponseData(response.data);
};

// 12. PATCH quotation/set-verification/{quote_no}/
export const verifyquotation = async (quote_no: number | string): Promise<any> => {
  const response = await apiClient.patch(`quotation/set-verification/${quote_no}/`);
  return await decryptResponseData(response.data);
};
