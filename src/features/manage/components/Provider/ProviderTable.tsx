import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getListOfProviders,
  deleteProvider,
  type ProvidersResponse,
} from "../../api/provider";
import { useState } from "react";
import { Trash2, Loader2 } from "lucide-react";
import ProviderTableskeleton from "./ProviderTableskeleton";
import ProviderViewAndEdit from "./ProviderViewAndEdit";
import { Eye } from "lucide-react";
import Swal from "sweetalert2";

const ProviderTable = () => {
  const queryClient = useQueryClient();
  const query = useQuery<ProvidersResponse>({
    queryKey: ["providers"],
    queryFn: getListOfProviders,
  });

  const { data, isLoading, isError } = query;
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(
    null,
  );
  const deleteMutation = useMutation({
    mutationFn: deleteProvider,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["providers"],
      });
    },

    onError: (error) => {
      console.error("Delete failed:", error);
    },
  });

  const handleDelete = async (providerId: string) => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "This provider will be permanently deleted.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, delete it",
      cancelButtonText: "Cancel",
      reverseButtons: true,
    });

    if (!result.isConfirmed) return;

    deleteMutation.mutate(providerId, {
      onSuccess: () => {
        Swal.fire({
          title: "Deleted!",
          text: "Provider has been deleted successfully.",
          icon: "success",
          timer: 1500,
          showConfirmButton: false,
        });
      },
      onError: () => {
        Swal.fire({
          title: "Error",
          text: "Failed to delete provider.",
          icon: "error",
        });
      },
    });
  };
  if (isLoading) return <ProviderTableskeleton />;
  if (isError) return <div>Error loading providers.</div>;

  return (
    <>
      <div className="flex-1 overflow-y-auto overflow-x-auto min-h-0">
        <table className="min-w-full border-collapse border border-gray-200">
          <thead>
            <tr className="bg-white select-none">
              <th className="border border-gray-200 px-3 py-2.5 sm:px-4 text-left text-[10px] sm:text-xs font-bold text-gray-700 w-16">
                Sr. No.
              </th>
              <th className="border border-gray-200 px-3 py-2.5 sm:px-4 text-left text-[10px] sm:text-xs font-bold text-gray-700">
                Provider Name
              </th>
              <th className="border border-gray-200 px-3 py-2.5 sm:px-4 text-left text-[10px] sm:text-xs font-bold text-gray-700">
                Description
              </th>
              <th className="border border-gray-200 px-3 py-2.5 sm:px-4 text-left text-[10px] sm:text-xs font-bold text-gray-700">
                Status
              </th>
              <th className="border border-gray-200 px-3 py-2.5 sm:px-4 text-left text-[10px] sm:text-xs font-bold text-gray-700">
                API Key
              </th>
              <th className="border border-gray-200 px-3 py-2.5 sm:px-4 text-left text-[10px] sm:text-xs font-bold text-gray-700">
                Action
              </th>
            </tr>
          </thead>

          <tbody className="bg-white">
            {!data?.data?.length ? (
              <tr>
                <td
                  colSpan={6}
                  className="border border-gray-200 px-4 py-8 text-center text-sm text-gray-500"
                >
                  No providers found
                </td>
              </tr>
            ) : (
              data.data.map((provider, index) => (
                <tr
                  key={provider.id}
                  className="transition-all duration-150 hover:bg-gray-50"
                >
                  <td className="border border-gray-200 px-3 py-3 sm:px-4 text-xs sm:text-sm text-gray-800 text-center font-medium">
                    {index + 1}
                  </td>

                  <td className="border border-gray-200 px-3 py-3 sm:px-4 text-xs sm:text-sm text-gray-800 font-medium">
                    {provider.name}
                  </td>

                  <td className="border border-gray-200 px-3 py-3 sm:px-4 text-xs sm:text-sm text-gray-800">
                    {provider.description}
                  </td>

                  <td className="border border-gray-200 px-3 py-3 sm:px-4 text-xs sm:text-sm text-gray-800">
                    <div className="flex items-center select-none">
                      <span
                        className={`inline-block w-2.5 h-2.5 rounded-full mr-2 ${
                          provider.status === "Active"
                            ? "bg-[#10B981]"
                            : "bg-[#F59E0B]"
                        }`}
                      />
                      <span>{provider.status}</span>
                    </div>
                  </td>

                  <td className="border border-gray-200 px-3 py-3 sm:px-4 text-xs sm:text-sm text-gray-800">
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                      {provider.credentials.api_key.slice(0, 20)}...
                    </code>
                  </td>

                  {/* ACTION */}
                  <td className="border border-gray-200 px-3 py-3 sm:px-4 text-xs sm:text-sm text-gray-800">
                    <div className="flex gap-2 items-center">
                      <button
                        type="button"
                        onClick={() => handleDelete(provider.id)}
                        className="hover:opacity-70 transition"
                        disabled={
                          deleteMutation.isPending &&
                          deleteMutation.variables === provider.id
                        }
                      >
                        {deleteMutation.isPending &&
                        deleteMutation.variables === provider.id ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <Trash2 size={16} />
                        )}
                      </button>

                      <button
                        onClick={() => setSelectedProviderId(provider.id)}
                        className="hover:opacity-70 transition"
                      >
                        <Eye size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {selectedProviderId && (
        <ProviderViewAndEdit
          providerid={selectedProviderId}
          onBack={() => setSelectedProviderId(null)}
        />
      )}
    </>
  );
};

export default ProviderTable;
