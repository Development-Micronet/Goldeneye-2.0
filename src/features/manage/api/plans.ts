import { apiClient } from "../../../api/apiClient";

export interface Plan {
  id: number;
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  allowed_providers: string[];
  allowed_sensors: Record<string, string[]>;
  services: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string;
  is_currently_valid: boolean;
}

export interface CreatePlanDto {
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  allowed_providers: string[];
  allowed_sensors: Record<string, string[]>;
  services: string[];
  is_active: boolean;
}

export interface PlansResponse {
  success: boolean;
  status_code: number;
  message: string;
  data: Plan[];
}

export interface MyPlanResponse {
  success: boolean;
  status_code: number;
  message: string;
  data: {
    plan_id: number;
    plan_name: string;
    description: string;
    start_date: string;
    end_date: string;
    allowed_providers: string[];
    allowed_sensors: Record<string, string[]>;
    services: string[];
    is_active: boolean;
    is_currently_valid: boolean;
    assigned_at: string;
  };
}
export interface EncryptedResponse {
  data: string;
}

// standard API request (No Decryption here)
export const getPlans = async (): Promise<EncryptedResponse> => {
  const { data } = await apiClient.get<EncryptedResponse>("plans/");
  return data;
};

// standard POST request function
export const createPlan = async (planData: CreatePlanDto): Promise<Plan> => {
  const { data } = await apiClient.post<Plan>("plans/", planData);
  return data;
};

export const deletePlan = async (planId: number): Promise<void> => {
  await apiClient.delete(`plans/${planId}/`);
};

export const updatePlan = async (
  planId: number,
  planData: Partial<CreatePlanDto>,
): Promise<Plan> => {
  const { data } = await apiClient.patch<Plan>(`plans/${planId}/`, planData);
  return data;
};

export const assignPlan = async (
  planId: number,
  payload: { schema_name: string },
): Promise<any> => {
  const { data } = await apiClient.post<any>(`plans/${planId}/assign/`, payload);
  return data;
};

// export const getMyPlan = async (): Promise<EncryptedResponse> => {
//   const { data } = await apiClient.get<EncryptedResponse>("plans/my-plan/");
//   return data;
// };

export const getMyPlan = async (): Promise<MyPlanResponse | null> => {
  try {
    const { data } = await apiClient.get<MyPlanResponse>("plans/my-plan/");

    return data;
  } catch (error: any) {
    if (error.response?.status === 404) {
      // No plan assigned = valid empty state
      return null;
    }

    throw error;
  }
};

export const unassignPlan = async (planId: number, schemaName: string): Promise<any> => {
  const { data } = await apiClient.delete<any>(`plans/${planId}/assign/${schemaName}/`);
  return data;
};
