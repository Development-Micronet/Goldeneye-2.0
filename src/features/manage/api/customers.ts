import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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

const fetchCustomers = async (): Promise<CustomersResponse> => {
  const { data } = await apiClient.get<CustomersResponse>("tenants/customer/");
  return data;
};

export const useCustomersQuery = () => {
  return useQuery<CustomersResponse, Error>({
    queryKey: ["customers"],
    queryFn: fetchCustomers,
  });
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
    },
  });
};

