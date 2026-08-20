import { apiClient } from "../../../api/apiClient";

/* ==========================================================
   Company Interfaces
========================================================== */

export interface Company {
  id: number;
  username: string;
  email: string;
  schema_name: string;
  company_name: string;
}

/* ==========================================================
   Company API Decrypted Response
========================================================== */

export interface TenantSuperusersResponse {
  count: number;
  next: string | null;
  previous: string | null;

  results: {
    success: boolean;
    message: string;
    results: Company[];
  };
}

/* ==========================================================
   User Interfaces
========================================================== */

export interface CompanyUser {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  schema_name: string;
  tenant_role: string;
}

/* ==========================================================
   Users API Decrypted Response
========================================================== */

export interface CompanyUsersResponse {
  count: number;
  next: string | null;
  previous: string | null;

  results: {
    success: boolean;
    message: string;
    schema_name: string;
    results: CompanyUser[];
  };
}

/* ==========================================================
   Encrypted Response (Backend actually returns this)
========================================================== */

export interface EncryptedResponse {
  data: string;
}

/* ==========================================================
   APIs
========================================================== */

/**
 * GET
 * /api/dashboard/tenant-superusers/
 */
export const getTenantSuperusers =
  async (): Promise<EncryptedResponse> => {
    const { data } = await apiClient.get<EncryptedResponse>(
      "dashboard/tenant-company/"
    );

    return data;
  };

/**
 * GET
 * /api/dashboard/tenant-superusers/{schema_name}/users/
 */
export const getCompanyUsers = async (
  schemaName: string
): Promise<EncryptedResponse> => {
  const { data } = await apiClient.get<EncryptedResponse>(
    `dashboard/tenant-company/${schemaName}/users/`

  );

  return data;
};

/**
 * POST
 * /api/tenants/register-user/
 */
export const registerUser = async (payload: any): Promise<any> => {
  const { data } = await apiClient.post("tenants/register-user/", payload);
  return data;
};

/**
 * DELETE
 * /api/tenants/users/{user_id}/
 */
export const deleteUser = async (userId: number): Promise<any> => {
  const { data } = await apiClient.delete(`tenants/users/${userId}/`);
  return data;
};

/**
 * PATCH
 * /api/tenants/users/{user_id}/
 */
export const updateCompanyUser = async (userId: number, payload: Partial<CompanyUser>): Promise<any> => {
  const { data } = await apiClient.patch(`tenants/users/${userId}/`, payload);
  return data;
};
/**
 * POST
 * /api/tenants/customer/{company_id}/delete/
 */
export const deleteCompany = async (
  companyId: number
): Promise<any> => {
  const { data } = await apiClient.post(
    `tenants/customer/${companyId}/delete/`
  );

  return data;
};

/**
 * GET
 * /api/dashboard/tenant-plans/
 */
export const getTenantPlans = async (): Promise<EncryptedResponse> => {
  const { data } = await apiClient.get<EncryptedResponse>(
    "dashboard/tenant-plans/"
  );
  return data;
};