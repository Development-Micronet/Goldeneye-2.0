import React, { useState } from "react";
import { Trash2, Check } from "lucide-react";
import { useCustomers } from "../hooks/useCustomers";
import { useApproveCustomerMutation, useDeleteCustomerMutation, type Customer } from "../api/customers";

import { toast } from "react-toastify";


interface CompanyRequestsTableProps {
  onEdit: (customer: Customer) => void;
  onDelete?: (id: number) => void;
}

export const CompanyRequestsTable: React.FC<CompanyRequestsTableProps> = ({
}) => {
  const { data: customers = [], isLoading, isError, error } = useCustomers();
  const { mutate: approveCustomer, isPending: isApproving } = useApproveCustomerMutation();
  const { mutate: deleteCustomer, isPending: isDeleting } = useDeleteCustomerMutation();
  const [statusFilter, setStatusFilter] = useState<"All" | "Active" | "Pending">("All");

  const handleApprove = (companyId: number, companyName: string) => {
    if (confirm(`Are you sure you want to approve the request for "${companyName}"?`)) {
      const toastId = toast.loading(`Approving organization "${companyName}"...`);
      approveCustomer(companyId, {
        onSuccess: (res) => {
          toast.update(toastId, {
            render: res.message || `${companyName} request approved successfully!`,
            type: "success",
            isLoading: false,
            autoClose: 3000,
          });
        },
        onError: (err) => {
          const apiError =
            (err as any).response?.data?.message ||
            err.message ||
            "Approval failed. Please try again.";
          toast.update(toastId, {
            render: apiError,
            type: "error",
            isLoading: false,
            autoClose: 3000,
          });
        },
      });
    }
  };

  const handleDelete = (companyId: number, companyName: string) => {
    if (confirm(`Are you sure you want to delete the request for "${companyName}"?`)) {
      const toastId = toast.loading(`Deleting organization "${companyName}"...`);
      deleteCustomer(companyId, {
        onSuccess: (res) => {
          toast.update(toastId, {
            render: res.message || `${companyName} request deleted successfully!`,
            type: "success",
            isLoading: false,
            autoClose: 3000,
          });
        },
        onError: (err) => {
          const apiError =
            (err as any).response?.data?.message ||
            err.message ||
            "Deletion failed. Please try again.";
          toast.update(toastId, {
            render: apiError,
            type: "error",
            isLoading: false,
            autoClose: 3000,
          });
        },
      });
    }
  };



  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 select-none">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="mt-3 text-xs text-gray-500 font-medium">Loading company requests...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-4 bg-red-50 text-red-700 rounded-lg text-xs font-semibold border border-red-100 select-none">
        ⚠️ Failed to load company requests: {error?.message || "Unknown error occurred"}
      </div>
    );
  }

  const filteredCustomers = customers.filter((c) => {
    if (statusFilter === "All") return true;
    return c.status.toLowerCase() === statusFilter.toLowerCase();
  });

  return (
    <div className="flex-1 flex flex-col gap-4 overflow-hidden min-h-0">
      {/* Status Filter Pill Buttons */}
      <div className="flex gap-2 select-none border-b border-gray-100 pb-3 flex-shrink-0">
        {(["All", "Active", "Pending"] as const).map((filter) => (
          <button
            key={filter}
            onClick={() => setStatusFilter(filter)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${statusFilter === filter
              ? "bg-primary text-white border-primary shadow-sm"
              : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50 hover:text-gray-750"
              }`}
          >
            {filter === "All" ? "All Statuses" : filter}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-auto min-h-0">
        <table className="min-w-full border-collapse border border-gray-200">
          <thead>
            <tr className="bg-white select-none">
              <th className="border border-gray-200 px-3 py-2.5 sm:px-4 text-left text-[10px] sm:text-xs font-bold text-gray-700 w-16">
                Sr. No.
              </th>
              <th className="border border-gray-200 px-3 py-2.5 sm:px-4 text-left text-[10px] sm:text-xs font-bold text-gray-700">
                Company Name
              </th>
              <th className="border border-gray-200 px-3 py-2.5 sm:px-4 text-left text-[10px] sm:text-xs font-bold text-gray-700">
                Email ID
              </th>
              <th className="border border-gray-200 px-3 py-2.5 sm:px-4 text-left text-[10px] sm:text-xs font-bold text-gray-700">
                Domain
              </th>
              <th className="border border-gray-200 px-3 py-2.5 sm:px-4 text-left text-[10px] sm:text-xs font-bold text-gray-700">
                Org Type
              </th>
              <th className="border border-gray-200 px-3 py-2.5 sm:px-4 text-left text-[10px] sm:text-xs font-bold text-gray-700">
                Status
              </th>
              <th className="border border-gray-200 px-3 py-2.5 sm:px-4 text-left text-[10px] sm:text-xs font-bold text-gray-700">
                Status Reason
              </th>
              <th className="border border-gray-200 px-3 py-2.5 sm:px-4 text-left text-[10px] sm:text-xs font-bold text-gray-700 w-24">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {filteredCustomers.map((c, index) => (
              <tr key={c.id}>
                <td className="border border-gray-200 px-3 py-3 sm:px-4 text-xs sm:text-sm text-gray-800 text-center font-medium">
                  {index + 1}
                </td>
                <td className="border border-gray-200 px-3 py-3 sm:px-4 text-xs sm:text-sm text-gray-800 font-medium">
                  {c.name}
                </td>
                <td className="border border-gray-200 px-3 py-3 sm:px-4 text-xs sm:text-sm text-gray-800">
                  {c.email}
                </td>
                <td className="border border-gray-200 px-3 py-3 sm:px-4 text-xs sm:text-sm text-gray-800">
                  {c.domainName || "—"}
                </td>
                <td className="border border-gray-200 px-3 py-3 sm:px-4 text-xs sm:text-sm text-gray-800">
                  {c.type}
                </td>
                <td className="border border-gray-200 px-3 py-3 sm:px-4 text-xs sm:text-sm text-gray-800">
                  <div className="flex items-center select-none">
                    <span
                      className={`inline-block w-2.5 h-2.5 rounded-full mr-2 ${c.status === "Active" || c.status === "Approved"
                        ? "bg-[#10B981]"
                        : c.status === "Pending"
                          ? "bg-[#F59E0B]"
                          : "bg-[#EF4444]"
                        }`}
                    />
                    <span>{c.status}</span>
                  </div>
                </td>
                <td className="border border-gray-200 px-3 py-3 sm:px-4 text-xs sm:text-sm text-gray-800">
                  {c.statusReason || "—"}
                </td>
                <td className="border border-gray-200 px-3 py-3 sm:px-4 text-xs sm:text-sm text-gray-800">
                  <div className="flex items-center gap-4">
                    {c.status.toLowerCase() === "pending" && (
                      <button
                        onClick={() => handleApprove(c.id, c.name)}
                        disabled={isApproving}
                        className="p-1 hover:bg-gray-100 rounded text-green-600 hover:text-green-700 disabled:opacity-50 transition-colors cursor-pointer"
                        title="Approve Request"
                      >
                        <Check className="w-4.5 h-4.5" />
                      </button>
                    )}

                    <button
                      onClick={() => handleDelete(c.id, c.name)}
                      disabled={isApproving || isDeleting}
                      className="p-1 hover:bg-gray-100 rounded text-gray-655 hover:text-red-500 disabled:opacity-50 transition-colors cursor-pointer"
                      title="Delete Request"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                  </div>
                </td>
              </tr>
            ))}
            {filteredCustomers.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center py-8 text-sm text-gray-400">
                  No {statusFilter !== "All" ? statusFilter.toLowerCase() : ""} company requests found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
