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
    schema_name: string;
    tenant_role: string;
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
        `dashboard/tenant-company/${schemaName}/users/`

    );
    return data;
};
