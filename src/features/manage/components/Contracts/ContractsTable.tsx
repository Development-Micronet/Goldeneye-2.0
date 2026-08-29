import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2 } from "lucide-react";
import Swal from "sweetalert2";
import ContractsTableSkeleton from "./ContractsTableSkeleton";
import ContractsFormModal from "./ContractsFormModal";
import { deleteContract, getListOfContracts, type Contract } from "../../api/contracts";
import { logger } from "../../../../utils/logger";

type Props = {
  providerId: string;
  providerName?: string;
};

export default function ContractsTable({ providerId, providerName }: Props) {
  const queryClient = useQueryClient();

  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["contracts"],
    queryFn: getListOfContracts,
  });
  logger.log("Selected Provider ID:", providerId);
  logger.log("Selected Provider Name:", providerName);
  logger.log("Contracts API Response:", data);

  const deleteMutation = useMutation({
    mutationFn: deleteContract,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["contracts"],
      });
    },

    onError: (error) => {
      logger.error("Delete contract failed:", error);
    },
  });

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: "Delete Contract?",
      text: "This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, delete it",
      cancelButtonText: "Cancel",
      reverseButtons: true,
    });

    if (!result.isConfirmed) return;

    deleteMutation.mutate(id, {
      onSuccess: () => {
        Swal.fire({
          title: "Deleted!",
          text: "Contract has been deleted successfully.",
          icon: "success",
          timer: 1500,
          showConfirmButton: false,
        });

        queryClient.invalidateQueries({
          queryKey: ["contracts"],
        });
      },

      onError: () => {
        Swal.fire({
          title: "Error",
          text: "Failed to delete contract.",
          icon: "error",
        });
      },
    });
  };

  if (isLoading) {
    return <ContractsTableSkeleton />;
  }

  if (isError) {
    return (
      <div className="rounded-lg border bg-white p-10 text-center text-red-500">
        Failed to load contracts.
      </div>
    );
  }

  const rawContracts = Array.isArray(data?.data) ? data.data : [];
  logger.log("Raw Contracts:", rawContracts);

  const contracts = rawContracts.filter((contract: Contract) => {
    logger.log("----------------------------");
    logger.log("Contract Provider:", contract.provider);
    logger.log("Selected Provider:", providerId);
    logger.log("Equal:", contract.provider === providerId);

    return contract.provider === providerId;
  });

  if (!contracts.length) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 p-8 text-center select-none">
        <p className="text-xs font-semibold text-gray-500">
          No contracts configured for this provider.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-2xs">
        <table className="w-full border-collapse text-left text-xs">
          <thead className="border-b border-gray-200/80 bg-[#EFFBFD]">
            <tr>
              <th className="w-14 px-4 py-3 text-center font-bold tracking-wide text-[#2c6671] uppercase">
                Sr. No.
              </th>
              <th className="px-4 py-3 font-bold tracking-wide text-[#2c6671] uppercase">
                Contract ID
              </th>
              <th className="px-4 py-3 font-bold tracking-wide text-[#2c6671] uppercase">
                Contract Name
              </th>
              <th className="px-4 py-3 font-bold tracking-wide text-[#2c6671] uppercase">Email</th>
              <th className="px-4 py-3 text-center font-bold tracking-wide text-[#2c6671] uppercase">
                Status
              </th>
              <th className="px-4 py-3 font-bold tracking-wide text-[#2c6671] uppercase">
                Contract Type
              </th>
              <th className="px-4 py-3 font-bold tracking-wide text-[#2c6671] uppercase">
                Expires At
              </th>
              <th className="px-4 py-3 text-center font-bold tracking-wide text-[#2c6671] uppercase">
                Action
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100 bg-white">
            {contracts.map((contract, index) => (
              <tr key={contract.id} className="transition-colors hover:bg-[#EFFBFD]/30">
                <td className="px-4 py-3 text-center text-xs font-medium text-gray-500">
                  {index + 1}
                </td>

                <td className="px-4 py-3 font-mono text-xs font-bold text-gray-900">
                  {contract.contractId}
                </td>

                <td className="px-4 py-3 text-xs font-bold text-gray-800">{contract.name}</td>

                <td className="px-4 py-3 text-xs text-gray-600">{contract.email}</td>

                <td className="px-4 py-3 text-center text-xs">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${
                      contract.status === "Active"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-rose-200 bg-rose-50 text-rose-700"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        contract.status === "Active" ? "bg-emerald-500" : "bg-rose-500"
                      }`}
                    />
                    {contract.status}
                  </span>
                </td>

                <td className="px-4 py-3 text-xs font-medium text-gray-700">
                  {contract.contractType ?? "—"}
                </td>

                <td className="px-4 py-3 text-xs text-gray-600">
                  {new Date(contract.expiresAt).toLocaleString()}
                </td>

                <td className="px-4 py-3 text-center text-xs">
                  <div className="flex items-center justify-center gap-1">
                    <button
                      onClick={() => setSelectedContract(contract)}
                      className="cursor-pointer rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-[#EFFBFD] hover:text-[#2c6671]"
                      title="Edit Contract"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>

                    <button
                      onClick={() => handleDelete(contract.contractId)}
                      className="cursor-pointer rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                      title="Delete Contract"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedContract && (
        <ContractsFormModal
          isOpen={!!selectedContract}
          selectedProviderId={selectedContract.provider}
          contract={selectedContract}
          onClose={() => setSelectedContract(null)}
        />
      )}
    </>
  );
}
