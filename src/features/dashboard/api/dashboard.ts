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
      "dashboard/tenant-superusers/"
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
    `dashboard/tenant-superusers/${schemaName}/users/`
  );

  return data;
};