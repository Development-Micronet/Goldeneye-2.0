import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2 } from "lucide-react";
import Swal from "sweetalert2";

import ContractsTableSkeleton from "./ContractsTableSkeleton";
import ContractsFormModal from "./ContractsFormModal";

import {
  deleteContract,
  getListOfContracts,
  type Contract,
} from "../../api/contracts";

type Props = {
  providerId: string;
  providerName?: string;
};

export default function ContractsTable({ providerId, providerName }: Props) {
  const queryClient = useQueryClient();

  const [selectedContract, setSelectedContract] = useState<Contract | null>(
    null,
  );

  const { data, isLoading, isError } = useQuery({
    queryKey: ["contracts"],
    queryFn: getListOfContracts,
  });
  console.log("Selected Provider ID:", providerId);
  console.log("Selected Provider Name:", providerName);
  console.log("Contracts API Response:", data);

  const deleteMutation = useMutation({
    mutationFn: deleteContract,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["contracts"],
      });
    },

    onError: (error) => {
      console.error("Delete contract failed:", error);
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
  console.log("Raw Contracts:", rawContracts);

  const contracts = rawContracts.filter((contract: Contract) => {
    console.log("----------------------------");
    console.log("Contract Provider:", contract.provider);
    console.log("Selected Provider:", providerId);
    console.log("Equal:", contract.provider === providerId);

    return contract.provider === providerId;
  });

  if (!contracts.length) {
    return (
      <div className="rounded-lg border bg-white p-10 text-center text-gray-500">
        No Contracts Found.
      </div>
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr className="border-b">
              <th className="px-4 py-3 text-left text-sm font-semibold">
                Sr. No
              </th>

              <th className="px-4 py-3 text-left text-sm font-semibold">
                Contract Id
              </th>

              <th className="px-4 py-3 text-left text-sm font-semibold">
                Contract Name
              </th>

              <th className="px-4 py-3 text-left text-sm font-semibold">
                Email
              </th>

              <th className="px-4 py-3 text-left text-sm font-semibold">
                Status
              </th>

              <th className="px-4 py-3 text-left text-sm font-semibold">
                Contract Type
              </th>

              <th className="px-4 py-3 text-left text-sm font-semibold">
                Expires At
              </th>

              <th className="px-4 py-3 text-center text-sm font-semibold">
                Action
              </th>
            </tr>
          </thead>

          <tbody>
            {contracts.map((contract, index) => (
              <tr
                key={contract.id}
                className="border-b last:border-none hover:bg-gray-50"
              >
                <td className="px-4 py-4">{index + 1}</td>

                <td className="px-4 py-4">{contract.contractId}</td>

                <td className="px-4 py-4">{contract.name}</td>

                <td className="px-4 py-4">{contract.email}</td>

                <td className="px-4 py-4">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      contract.status === "Active"
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-600"
                    }`}
                  >
                    {contract.status}
                  </span>
                </td>

                <td className="px-4 py-4">{contract.contractType ?? "-"}</td>

                <td className="px-4 py-4">
                  {new Date(contract.expiresAt).toLocaleString()}
                </td>

                <td className="px-4 py-4">
                  <div className="flex justify-center gap-3">
                    <button
                      onClick={() => setSelectedContract(contract)}
                      className="text-teal-700 hover:text-teal-900"
                    >
                      <Pencil size={18} />
                    </button>

                    <button
                      onClick={() => handleDelete(contract.id)}
                      className="text-teal-700 hover:text-red-600"
                    >
                      <Trash2 size={18} />
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
