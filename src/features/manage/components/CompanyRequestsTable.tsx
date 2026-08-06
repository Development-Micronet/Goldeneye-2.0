import React, { useState } from "react";
import { Trash2, Check, Package, X } from "lucide-react";
import { useCustomers } from "../hooks/useCustomers";
import { useApproveCustomerMutation, useDeleteCustomerMutation, type Customer } from "../api/customers";
import { usePlans, useAssignPlanMutation } from "../hooks/usePlans";
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
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<number | "">("");

  const { data: plans = [], isLoading: isLoadingPlans } = usePlans();
  const { mutate: assignPlan, isPending: isAssigning } = useAssignPlanMutation();

  const handleAssignClick = (customer: Customer) => {
    setSelectedCustomer(customer);
    setSelectedPlanId(""); // Reset any previously selected plan ID
    setIsAssignModalOpen(true);
  };

  const handleAssignSubmit = () => {
    if (!selectedCustomer || !selectedPlanId) return;

    const toastId = toast.loading(`Assigning plan to "${selectedCustomer.name}"...`);

    assignPlan(
      {
        planId: Number(selectedPlanId),
        schemaName: selectedCustomer.schema_name, // Dynamic customer schema name
      },
      {
        onSuccess: (res) => {
          toast.update(toastId, {
            render: res.message || `Plan assigned successfully to ${selectedCustomer.name}!`,
            type: "success",
            isLoading: false,
            autoClose: 3000,
          });
          setIsAssignModalOpen(false);
          setSelectedCustomer(null);
          setSelectedPlanId("");
        },
        onError: (err: any) => {
          const apiError =
            err.response?.data?.message ||
            err.message ||
            "Failed to assign plan. Please try again.";
          toast.update(toastId, {
            render: apiError,
            type: "error",
            isLoading: false,
            autoClose: 3000,
          });
        },
      }
    );
  };



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

                    {/* New Assign Plan Icon Button (Package) */}
                    {(c.status.toLowerCase() === "active" || c.status.toLowerCase() === "approved") && (
                      <button
                        onClick={() => handleAssignClick(c)} // ← trigger modal hook call
                        className="p-1 hover:bg-gray-100 rounded text-primary hover:text-[#1F4E57] transition-colors cursor-pointer"
                        title="Assign Plan"
                      >
                        <Package className="w-4.5 h-4.5" />
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

      {/* Assign Plan Modal */}
      {isAssignModalOpen && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b px-6 py-4 bg-gray-50/20">
              <div>
                <h3 className="font-semibold text-gray-900 text-base">Assign Plan</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Select a plan to assign to {selectedCustomer.name}
                </p>
              </div>
              <button
                onClick={() => setIsAssignModalOpen(false)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-900 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">
                  Choose a Plan
                </label>
                {isLoadingPlans ? (
                  <div className="text-xs text-gray-500 py-2">Loading plans...</div>
                ) : plans.length === 0 ? (
                  <div className="text-xs text-gray-500 py-2">No plans available.</div>
                ) : (
                  <div className="max-h-48 overflow-y-auto border rounded-lg border-gray-200 divide-y divide-gray-100 bg-white">
                    {plans.map((plan) => {
                      const isSelected = selectedPlanId === plan.id;
                      return (
                        <div
                          key={plan.id}
                          onClick={() => setSelectedPlanId(plan.id)}
                          className={`flex flex-col p-3 text-left cursor-pointer transition-colors ${isSelected
                              ? "bg-[#1F4E57]/10 text-[#1F4E57] border-l-4 border-[#1F4E57]"
                              : "hover:bg-gray-50 text-gray-750"
                            }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-xs sm:text-sm">{plan.name}</span>
                            <input
                              type="radio"
                              name="selectedPlan"
                              checked={isSelected}
                              onChange={() => setSelectedPlanId(plan.id)}
                              className="h-4 w-4 text-[#1F4E57] focus:ring-[#1F4E57] accent-[#1F4E57]"
                            />
                          </div>
                          {plan.description && (
                            <span className="text-[11px] text-gray-400 mt-1 line-clamp-2">
                              {plan.description}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 border-t px-6 py-4 bg-gray-50/50">
              <button
                type="button"
                onClick={() => setIsAssignModalOpen(false)}
                className="border border-gray-300 rounded-lg px-4 py-2 hover:bg-gray-100 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!selectedPlanId || isAssigning}
                onClick={handleAssignSubmit}
                className="bg-primary text-white rounded-lg px-5 py-2 hover:bg-[#1F4E57] disabled:opacity-50 text-xs font-semibold cursor-pointer"
              >
                {isAssigning ? "Assigning..." : "Assign"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
