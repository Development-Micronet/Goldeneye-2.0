import { apiClient } from "../../../api/apiClient";

// 1. Company/Tenant Superuser Interface
export interface Company {
  id: number;
  username: string;
  email: string;
  schema_name: string;
  company_name: string;
}

// Decrypted Company Response Type
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

// 2. Company User Interface
export interface CompanyUser {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  schema_name?: string;
  tenant_role?: string;
  services?: string[];
  organization_name?: string;
  designation?: string;
  department?: string;
  mobile_number?: string;
  email_personal?: string;
  country?: string;
  state?: string;
  city?: string;
  locality?: string;
  address?: string;
  gender?: string;
}

export interface RegisterUserPayload {
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  organization_name: string;
  designation: string;
  department: string;
  mobile_number: string;
  email_personal?: string;
  country?: string;
  state?: string;
  city?: string;
  locality?: string;
  address?: string;
  gender?: string;
  services: string[];
}

// Decrypted User Response Type
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

// Encrypted wrapper returned by backend
export interface EncryptedResponse {
  data: string;
}

/**
 * Fetch all Tenant Superusers (Companies)
 * GET /api/dashboard/tenant-superusers/
 */
export const getTenantSuperusers = async (): Promise<EncryptedResponse> => {
  const { data } = await apiClient.get<EncryptedResponse>("dashboard/tenant-company/");
  return data;
};

/**
 * Fetch users under a specific schema
 * GET /api/dashboard/tenant-superusers/{schema_name}/users/
 */
export const getCompanyUsers = async (schemaName: string): Promise<EncryptedResponse> => {
  const { data } = await apiClient.get<EncryptedResponse>(
    `dashboard/tenant-company/${schemaName}/users/`,
  );
  return data;
};

/**
 * Register a new end user
 * POST /api/tenants/register-user/
 */
export const registerUser = async (payload: RegisterUserPayload | any): Promise<any> => {
  const { data } = await apiClient.post("tenants/register-user/", payload);
  return data;
};

/**
 * Update an existing user
 * PATCH /api/tenants/users/{user_id}/
 */
export const updateCompanyUser = async (
  userId: number,
  payload: Partial<RegisterUserPayload> | any,
): Promise<any> => {
  const { data } = await apiClient.patch(`tenants/users/${userId}/`, payload);
  return data;
};

/**
 * Fetch detailed user data
 * GET /api/tenants/users/{user_id}/
 */
export const getCompanyUserDetail = async (userId: number): Promise<any> => {
  const { data } = await apiClient.get(`tenants/users/${userId}/`);
  return data;
};

/**
 * Fetch register user services
 * GET /api/tenants/register-user/
 */
export const getRegisterUserServices = async (params?: {
  schema_name?: string;
  organization_name?: string;
}): Promise<any> => {
  const config: { headers?: Record<string, string>; params?: any } = {};
  if (params?.schema_name) {
    config.headers = { "X-Schema-Name": params.schema_name };
    config.params = params;
  } else if (params?.organization_name) {
    config.params = params;
  }
  const { data } = await apiClient.get("tenants/register-user/", config);
  return data;
};
