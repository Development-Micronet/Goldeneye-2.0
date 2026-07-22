import { toast } from "react-toastify";
import React, { useState } from "react";
import { Check, Edit2, Trash2 } from "lucide-react";
import { type Customer, useApproveCustomerMutation, useCustomersQuery } from "../api/customers";

interface CompanyRequestsTableProps {
  onEdit?: (customer: Customer) => void;
  onDelete?: (id: number) => void;
}

export const CompanyRequestsTable: React.FC<CompanyRequestsTableProps> = ({ onEdit, onDelete }) => {
  const { data, isLoading, isError, error } = useCustomersQuery();
  const { mutate: approveCustomer, isPending: isApproving } = useApproveCustomerMutation();
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

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 select-none">
        <div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2"></div>
        <span className="mt-3 text-xs font-medium text-gray-500">Loading company requests...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-red-100 bg-red-50 p-4 text-xs font-semibold text-red-700 select-none">
        ⚠️ Failed to load company requests: {error?.message || "Unknown error occurred"}
      </div>
    );
  }

  const customers = data?.data?.customers || [];
  const filteredCustomers = customers.filter((c) => {
    if (statusFilter === "All") return true;
    return c.status.toLowerCase() === statusFilter.toLowerCase();
  });

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
      {/* Status Filter Pill Buttons */}
      <div className="flex flex-shrink-0 gap-2 border-b border-gray-100 pb-3 select-none">
        {(["All", "Active", "Pending"] as const).map((filter) => (
          <button
            key={filter}
            onClick={() => setStatusFilter(filter)}
            className={`cursor-pointer rounded-full border px-4 py-1.5 text-xs font-semibold transition-all ${
              statusFilter === filter
                ? "bg-primary border-primary text-white shadow-sm"
                : "hover:text-gray-750 border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
            }`}
          >
            {filter === "All" ? "All Statuses" : filter}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-x-auto overflow-y-auto">
        <table className="min-w-full border-collapse border border-gray-200">
          <thead>
            <tr className="bg-white select-none">
              <th className="w-16 border border-gray-200 px-3 py-2.5 text-left text-[10px] font-bold text-gray-700 sm:px-4 sm:text-xs">
                Sr. No.
              </th>
              <th className="border border-gray-200 px-3 py-2.5 text-left text-[10px] font-bold text-gray-700 sm:px-4 sm:text-xs">
                Company Name
              </th>
              <th className="border border-gray-200 px-3 py-2.5 text-left text-[10px] font-bold text-gray-700 sm:px-4 sm:text-xs">
                Email ID
              </th>
              <th className="border border-gray-200 px-3 py-2.5 text-left text-[10px] font-bold text-gray-700 sm:px-4 sm:text-xs">
                Domain
              </th>
              <th className="border border-gray-200 px-3 py-2.5 text-left text-[10px] font-bold text-gray-700 sm:px-4 sm:text-xs">
                Org Type
              </th>
              <th className="border border-gray-200 px-3 py-2.5 text-left text-[10px] font-bold text-gray-700 sm:px-4 sm:text-xs">
                Status
              </th>
              <th className="border border-gray-200 px-3 py-2.5 text-left text-[10px] font-bold text-gray-700 sm:px-4 sm:text-xs">
                Status Reason
              </th>
              <th className="w-24 border border-gray-200 px-3 py-2.5 text-left text-[10px] font-bold text-gray-700 sm:px-4 sm:text-xs">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {filteredCustomers.map((c, index) => (
              <tr key={c.id}>
                <td className="border border-gray-200 px-3 py-3 text-center text-xs font-medium text-gray-800 sm:px-4 sm:text-sm">
                  {index + 1}
                </td>
                <td className="border border-gray-200 px-3 py-3 text-xs font-medium text-gray-800 sm:px-4 sm:text-sm">
                  {c.name}
                </td>
                <td className="border border-gray-200 px-3 py-3 text-xs text-gray-800 sm:px-4 sm:text-sm">
                  {c.email}
                </td>
                <td className="border border-gray-200 px-3 py-3 text-xs text-gray-800 sm:px-4 sm:text-sm">
                  {c.domainName || "—"}
                </td>
                <td className="border border-gray-200 px-3 py-3 text-xs text-gray-800 sm:px-4 sm:text-sm">
                  {c.type}
                </td>
                <td className="border border-gray-200 px-3 py-3 text-xs text-gray-800 sm:px-4 sm:text-sm">
                  <div className="flex items-center select-none">
                    <span
                      className={`mr-2 inline-block h-2.5 w-2.5 rounded-full ${
                        c.status === "Active" || c.status === "Approved"
                          ? "bg-[#10B981]"
                          : c.status === "Pending"
                            ? "bg-[#F59E0B]"
                            : "bg-[#EF4444]"
                      }`}
                    />
                    <span>{c.status}</span>
                  </div>
                </td>
                <td className="border border-gray-200 px-3 py-3 text-xs text-gray-800 sm:px-4 sm:text-sm">
                  {c.statusReason || "—"}
                </td>
                <td className="border border-gray-200 px-3 py-3 text-xs text-gray-800 sm:px-4 sm:text-sm">
                  <div className="flex items-center gap-4">
                    {c.status.toLowerCase() === "pending" && (
                      <button
                        onClick={() => handleApprove(c.id, c.name)}
                        disabled={isApproving}
                        className="cursor-pointer rounded p-1 text-green-600 transition-colors hover:bg-gray-100 hover:text-green-700 disabled:opacity-50"
                        title="Approve Request"
                      >
                        <Check className="h-4.5 w-4.5" />
                      </button>
                    )}
                    <button
                      onClick={() => onEdit?.(c)}
                      disabled={isApproving}
                      className="text-gray-655 hover:text-primary cursor-pointer rounded p-1 transition-colors hover:bg-gray-100 disabled:opacity-50"
                      title="Edit Request"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onDelete?.(c.id)}
                      disabled={isApproving}
                      className="text-gray-655 cursor-pointer rounded p-1 transition-colors hover:bg-gray-100 hover:text-red-500 disabled:opacity-50"
                      title="Delete Request"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredCustomers.length === 0 && (
              <tr>
                <td colSpan={8} className="py-8 text-center text-sm text-gray-400">
                  No {statusFilter !== "All" ? statusFilter.toLowerCase() : ""} company requests
                  found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
