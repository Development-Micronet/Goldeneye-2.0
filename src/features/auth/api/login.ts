import { useMutation } from '@tanstack/react-query'
import { apiClient } from '../../../api/apiClient'

export interface LoginCredentials {
  username: string
  password: string
}

export interface UserData {
  refresh: string;
  access: string;
  user: string;
  roleName: string;
  first_name: string;
  last_name: string;
  email: string;
  date_joined: string;
  parentUsername: string;
  mobile_number: string | null;
  address: string;
  customerName: string;
  schema_name?: string;
  domain_name?: string;
  date: string;
}

export interface LoginResponse {
  success: boolean;
  status_code: number;
  message: string;
  data: UserData;
}

const loginUser = async (credentials: LoginCredentials): Promise<LoginResponse> => {
  const { data } = await apiClient.post<LoginResponse>('auth/login/', credentials)
  return data
}

export const useLoginMutation = () => {
  return useMutation<LoginResponse, Error, LoginCredentials>({
    mutationFn: loginUser,
  })
}
