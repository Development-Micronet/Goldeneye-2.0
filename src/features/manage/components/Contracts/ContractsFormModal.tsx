import { useEffect } from "react";
import { useForm } from "react-hook-form";
import type { FieldErrors } from "react-hook-form";
import { X } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { useAuthStore } from "../../../../store/useAuthStore";
import { decryptAESGCM } from "../../../../utils/dataDecrypt";

import {
  createContract,
  updateContractById,
  type Contract,
  type CreateContractDto,
  type UpdateContractDto,
} from "../../api/contracts";

import { getListOfProviders } from "../../api/provider";

interface ContractFormModalProps {
  isOpen: boolean;
  onClose: () => void;

  // Create
  selectedProviderId?: string;

  // Edit
  contract?: Contract | null;
}

export default function ContractFormModal({
  isOpen,
  onClose,
  selectedProviderId,
  contract,
}: ContractFormModalProps) {
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateContractDto>({
    defaultValues: {
      status: "Active",
    },
  });

  /**
   * Load Providers
   */
  const { data: providers } = useQuery({
    queryKey: ["providers"],
    queryFn: getListOfProviders,
  });

  const resolvedProviderId = contract?.provider ?? selectedProviderId ?? "";
  const selectedProviderName = providers?.data?.find(
    (provider) => provider.provider_id === resolvedProviderId,
  )?.name;


  const { accessToken } = useAuthStore.getState();
const token = accessToken?.replace("Bearer ", "").trim() || "";

  /**
   * Auto-select provider if passed
   */
  useEffect(() => {
    if (contract) {
      setValue("provider", contract.provider);
      setValue("contractId", contract.contractId);
      setValue("name", contract.name);
      setValue("email", contract.email);
      setValue("status", contract.status);
      setValue("expiresAt", contract.expiresAt);
      setValue("apiKeys", contract.apiKeys ?? "");
    } else if (selectedProviderId) {
      setValue("provider", selectedProviderId);
    } else {
      setValue("provider", "");
    }
  }, [contract, selectedProviderId, setValue]);

  /**
   * Create Contract
   */
  const createMutation = useMutation({
    mutationFn: createContract,

    onSuccess: () => {
      toast.success("Contract created successfully.");

      queryClient.invalidateQueries({
        queryKey: ["contracts"],
      });

      reset();

      onClose();
    },

   onError: async (error: any) => {
  try {
    console.log("Encrypted Error:", error.response.data);

    const decrypted = await decryptAESGCM(
      error.response.data.data,
      token
    );

    console.log("Decrypted Error:", decrypted);

    toast.error(decrypted.message);
  } catch (err) {
    console.error(err);
    toast.error("Failed to create contract");
  }
},
  });

  const onValidationError = (errors: FieldErrors<CreateContractDto>) => {
    const firstError = Object.values(errors).find((error) => error?.message);

    if (firstError?.message) {
      toast.error(`Please fill this field: ${firstError.message}`);
    } else {
      toast.error("Please fill all required fields.");
    }
  };

  const onSubmit = (data: CreateContractDto) => {
    const providerValue = data.provider || resolvedProviderId ;
    const selectedContractType =
      watch("contractType") || contract?.contractType || "";

    if (contract) {
      const updateData: UpdateContractDto = {
        provider: providerValue,
        contractId: data.contractId,
        name: data.name,
        email: data.email,
        status: data.status,
        apiKeys: data.apiKeys ?? "",
        expiresAt: data.expiresAt,
        contractType: selectedContractType,
      };

      updateMutation.mutate({
        id: contract.contractId   ,
        data: updateData,
      });
    } else {
      createMutation.mutate({
        ...data,
        provider: providerValue,
      });
    }
  };

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateContractDto }) =>
      updateContractById(id, data),

    onSuccess: () => {
      toast.success("✅ Contract updated successfully");

      queryClient.invalidateQueries({
        queryKey: ["contracts"],
      });

      reset();
      onClose();
    },

    onError: () => {
      toast.error("Failed to update contract");
    },
  });

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-2xl rounded-lg bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold">
            {contract ? "Edit Contract" : "Create Contract"}
          </h2>

          <button onClick={onClose}>
            <X size={22} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit, onValidationError)}>
          <div className="grid grid-cols-2 gap-5 p-6">
            {/* Provider */}
            {(contract || selectedProviderId) && (
              <div className="col-span-2 rounded-md border border-teal-100 bg-teal-50 px-3 py-3">
                <label className="mb-1 block text-sm font-medium text-teal-800">
                  Provider
                </label>

                <p className="text-sm text-gray-700">
                  {selectedProviderName ||
                    resolvedProviderId ||
                    "Selected provider"}
                </p>

                <input type="hidden" {...register("provider")} />
              </div>
            )}

            {!contract && !selectedProviderId && (
              <div className="col-span-2">
                <label className="mb-1 block text-sm font-medium">
                  Provider
                </label>

                <select
                  {...register("provider", {
                    required: "Provider is required",
                  })}
                  className="w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="">Select Provider</option>

                  {providers?.data?.map((provider) => (
                    <option
                      key={provider.provider_id}
                      value={provider.provider_id}
                    >
                      {provider.name}
                    </option>
                  ))}
                </select>

                {errors.provider && (
                  <p className="mt-1 text-sm text-red-500">
                    {errors.provider.message}
                  </p>
                )}
              </div>
            )}

            {/* Contract ID */}
            <div>
              <label className="mb-1 block text-sm font-medium">
                Contract ID
              </label>

              <input
                {...register("contractId", {
                  required: "Contract ID is required",
                })}
                placeholder="CTR-AIRBUS-2026-001"
                className="w-full rounded-md border px-3 py-2"
              />

              {errors.contractId && (
                <p className="mt-1 text-sm text-red-500">
                  {errors.contractId.message}
                </p>
              )}
            </div>

            {/* Name */}
            <div>
              <label className="mb-1 block text-sm font-medium">
                Contract Name
              </label>

              <input
                {...register("name", {
                  required: "Contract Name is required",
                })}
                placeholder="Airbus Enterprise Contract"
                className="w-full rounded-md border px-3 py-2"
              />

              {errors.name && (
                <p className="mt-1 text-sm text-red-500">
                  {errors.name.message}
                </p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="mb-1 block text-sm font-medium">Email</label>

              <input
                type="email"
                {...register("email", {
                  required: "Email is required",
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: "Enter a valid email address",
                  },
                })}
                placeholder="contracts@airbus.com"
                className="w-full rounded-md border px-3 py-2"
              />

              {errors.email && (
                <p className="mt-1 text-sm text-red-500">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* API Keys */}
            <div>
              <label className="mb-1 block text-sm font-medium">API Keys</label>

              <input
                {...register("apiKeys", {
                  required: "API Key is required",
                })}
                placeholder="ab12cd34ef56gh78ij90"
                className="w-full rounded-md border px-3 py-2"
              />

              {errors.apiKeys && (
                <p className="mt-1 text-sm text-red-500">
                  {errors.apiKeys.message}
                </p>
              )}
            </div>

            {/* Status */}
            <div>
              <label className="mb-1 block text-sm font-medium">Status</label>

              <select
                {...register("status")}
                className="w-full rounded-md border px-3 py-2"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            {/* Expiry */}
            <div>
              <label className="mb-1 block text-sm font-medium">
                Expires At
              </label>

              <input
                type="datetime-local"
                {...register("expiresAt", {
                  required: "Expiry Date is required",
                })}
                className="w-full rounded-md border px-3 py-2"
              />

              {errors.expiresAt && (
                <p className="mt-1 text-sm text-red-500">
                  {errors.expiresAt.message}
                </p>
              )}
            </div>

            {/* Contract Type */}
            <div className="col-span-2">
              <label className="mb-2 block text-sm font-medium">
                Contract Type
              </label>

              <div className="space-y-2">
                {["Enterprise", "Search", "Order", "Tasking"].map((type) => (
                  <label
                    key={type}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <input
                      type="radio"
                      value={type}
                      {...register("contractType", {
                        required: "Contract Type is required",
                      })}
                      className="h-4 w-4 rounded-none"
                    />

                    <span>{type}</span>
                  </label>
                ))}
              </div>

              {errors.contractType && (
                <p className="mt-1 text-sm text-red-500">
                  {errors.contractType.message}
                </p>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 border-t px-6 py-4">
            <button
              type="button"
              onClick={() => {
                reset();
                onClose();
              }}
              className="rounded-md border border-gray-300 px-5 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={
                createMutation.isPending ||
                updateMutation.isPending ||
                isSubmitting
              }
              className="rounded-md bg-teal-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {createMutation.isPending ||
              updateMutation.isPending ||
              isSubmitting
                ? contract
                  ? "Updating..."
                  : "Creating..."
                : contract
                  ? "Update Contract"
                  : "Create Contract"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
