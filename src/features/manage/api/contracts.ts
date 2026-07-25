import { decryptAESGCM } from "../../../utils/dataDecrypt";
import { useAuthStore } from "../../../store/useAuthStore";
import { apiClient } from "../../../api/apiClient";
import { logger } from "../../../utils/logger";

export type ContractStatus = "Active" | "Inactive";

export interface Contract {
  id: string;
  provider: string;
  contractId: string;
  name: string;
  email: string;
  status: ContractStatus;
  apiKeys?: string;
  expiresAt: string;
  contractType?: string;
}

export interface ContractsResponse {
  success: boolean;
  status_code: number;
  message: string;
  data: Contract[];
}

export interface CreateContractDto {
  provider: string;
  contractId: string;
  name: string;
  email: string;
  status: ContractStatus;
  apiKeys: string;
  expiresAt: string;
  contractType?: string;
}

export interface UpdateContractDto {
  provider: string;
  contractId: string;
  name: string;
  email: string;
  status: ContractStatus;
  expiresAt: string;
  apiKeys: string;
  contractType?: string;
}

export type UpdateContractPayload = {
  id: string;
  data: UpdateContractDto;
};

/**
 * Get List of Contracts
 */
export const getListOfContracts = async (): Promise<ContractsResponse> => {
  const response = await apiClient.get("products/contracts/");

  logger.log("Encrypted Response:", response.data);

  const token = useAuthStore.getState().accessToken!;

  const decryptedData = await decryptAESGCM(response.data.data, token);

  logger.log("Decrypted Contracts:", decryptedData);

  return decryptedData;
};

/**
 * Create Contract
 */
export const createContract = async (contractData: CreateContractDto): Promise<Contract> => {
  const { data } = await apiClient.post<Contract>("products/contracts/", contractData);
  return data;
};

/**
 * Delete Contract
 */
export const deleteContract = async (contractId: string): Promise<void> => {
  await apiClient.delete(`products/contracts/${contractId}/`);
};

/**
 * Get Contract By ID
 */
export const getContractById = async (contractId: string): Promise<Contract> => {
  return apiClient.get(`products/contracts/${contractId}/`).then((response) => response.data.data);
};

/**
 * Update Contract
 */
export const updateContractById = async (
  contractId: string,
  contractData: UpdateContractDto,
): Promise<Contract> => {
  return apiClient
    .put(`products/contracts/${contractId}/`, contractData)
    .then((response) => response.data);
};
