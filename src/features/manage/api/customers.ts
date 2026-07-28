import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../../api/apiClient";

export interface Customer {
  id: number;
  name: string;
  userName: string;
  email: string;
  address: string;
  domainName: string;
  logoFileName: string | null;
  businessType: string;
  phoneNumber: number;
  type: string;
  status: string;
  statusReason: string | null;
  schema_name: string;
}

export interface CustomersResponse {
  success: boolean;
  status_code: number;
  message: string;
  data: {
    customers: Customer[];
  };
}

export interface EncryptedResponse {
  data: string;
}

export const getCustomers = async (): Promise<EncryptedResponse> => {
  const { data } = await apiClient.get<EncryptedResponse>("tenants/customer/");
  return data;
};

const approveCustomer = async (companyId: number): Promise<any> => {
  const { data } = await apiClient.post(`tenants/customer/${companyId}/approve/`);
  return data;
};

export const useApproveCustomerMutation = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, number>({
    mutationFn: approveCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });

            queryClient.invalidateQueries({ queryKey: ["companies"] });

      queryClient.invalidateQueries({ queryKey: ["manage-tenant-superusers"] })
    },
  });
};

const deleteCustomer = async (companyId: number): Promise<any> => {
  const { data } = await apiClient.delete(`tenants/customer/${companyId}/delete/`);
  return data;
};

export const useDeleteCustomerMutation = () => {
  const queryClient = useQueryClient();
  return useMutation<any, Error, number>({
    mutationFn: deleteCustomer,
    onSuccess: () => {
      // Invalidate queries to automatically refresh list data
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      queryClient.invalidateQueries({ queryKey: ["manage-tenant-superusers"] });
    },
  });
};

