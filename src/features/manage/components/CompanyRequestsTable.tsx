import React, { useState, useMemo } from "react";
import { Trash2, Check, Package, X, Building2, CheckCircle2, Clock, XCircle } from "lucide-react";
import { useCustomers } from "../hooks/useCustomers";
import {
  useApproveCustomerMutation,
  useDeleteCustomerMutation,
  type Customer,
} from "../api/customers";
import { usePlans, useAssignPlanMutation } from "../hooks/usePlans";
import { toast } from "react-toastify";
import Swal from "sweetalert2";

interface CompanyRequestsTableProps {
  onEdit: (customer: Customer) => void;
  onDelete?: (id: number) => void;
}

export const CompanyRequestsTable: React.FC<CompanyRequestsTableProps> = ({}) => {
  const { data: customers = [], isLoading, isError, error } = useCustomers();
  const { mutate: approveCustomer, isPending: isApproving } = useApproveCustomerMutation();
  const { mutate: deleteCustomer, isPending: isDeleting } = useDeleteCustomerMutation();
  const [statusFilter, setStatusFilter] = useState<"All" | "Active" | "Pending">("All");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<number | "">("");

  const { data: plans = [], isLoading: isLoadingPlans } = usePlans();
  const activePlans = plans.filter((p) => new Date(p.end_date) >= new Date());
  const { mutate: assignPlan, isPending: isAssigning } = useAssignPlanMutation();

  const handleAssignClick = (customer: Customer) => {
    setSelectedCustomer(customer);
    setSelectedPlanId("");
    setIsAssignModalOpen(true);
  };

  const handleAssignSubmit = () => {
    if (!selectedCustomer || !selectedPlanId) return;

    const toastId = toast.loading(`Assigning plan to "${selectedCustomer.name}"...`);

    assignPlan(
      {
        planId: Number(selectedPlanId),
        schemaName: selectedCustomer.schema_name,
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
      },
    );
  };

  const handleApprove = async (companyId: number, companyName: string) => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: `You are about to approve the request for "${companyName}".`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#10b981",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, approve it",
      cancelButtonText: "Cancel",
      reverseButtons: true,
    });

    if (!result.isConfirmed) return;

    approveCustomer(companyId, {
      onSuccess: (res) => {
        Swal.fire({
          title: "Approved!",
          text: res?.message || `Request for "${companyName}" has been approved successfully.`,
          icon: "success",
          timer: 1500,
          showConfirmButton: false,
        });
      },
      onError: (err) => {
        const apiError =
          (err as any).response?.data?.message || err.message || "Failed to approve request.";
        Swal.fire({
          title: "Error",
          text: apiError,
          icon: "error",
        });
      },
    });
  };

  const handleDelete = async (companyId: number, companyName: string) => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: `This request for "${companyName}" will be permanently deleted.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, delete it",
      cancelButtonText: "Cancel",
      reverseButtons: true,
    });

    if (!result.isConfirmed) return;

    deleteCustomer(companyId, {
      onSuccess: (res) => {
        Swal.fire({
          title: "Deleted!",
          text: res?.message || `Request for "${companyName}" has been deleted successfully.`,
          icon: "success",
          timer: 1500,
          showConfirmButton: false,
        });
      },
      onError: (err) => {
        const apiError =
          (err as any).response?.data?.message || err.message || "Failed to delete request.";
        Swal.fire({
          title: "Error",
          text: apiError,
          icon: "error",
        });
      },
    });
  };

  const activeCount = useMemo(
    () =>
      customers.filter(
        (c) => c.status.toLowerCase() === "active" || c.status.toLowerCase() === "approved",
      ).length,
    [customers],
  );

  const pendingCount = useMemo(
    () => customers.filter((c) => c.status.toLowerCase() === "pending").length,
    [customers],
  );

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 select-none">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#2c6671]"></div>
        <span className="mt-3 text-xs font-medium text-gray-500">Loading company requests...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-xs font-semibold text-red-700 select-none">
        ⚠️ Failed to load company requests: {error?.message || "Unknown error occurred"}
      </div>
    );
  }

  const filteredCustomers = customers.filter((c) => {
    if (statusFilter === "All") return true;
    if (statusFilter === "Active")
      return c.status.toLowerCase() === "active" || c.status.toLowerCase() === "approved";
    return c.status.toLowerCase() === statusFilter.toLowerCase();
  });

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
      {/* Status Filter Pill Buttons */}
      <div className="flex shrink-0 items-center gap-2 border-b border-gray-100 pb-3 select-none">
        <button
          onClick={() => setStatusFilter("All")}
          className={`cursor-pointer rounded-full border px-4 py-1.5 text-xs font-bold transition-all ${
            statusFilter === "All"
              ? "border-[#2c6671] bg-[#2c6671] text-white shadow-xs"
              : "border-[#2c6671]/20 bg-[#EFFBFD]/60 text-[#2c6671] hover:bg-[#EFFBFD]"
          }`}
        >
          All Statuses ({customers.length})
        </button>

        <button
          onClick={() => setStatusFilter("Active")}
          className={`cursor-pointer rounded-full border px-4 py-1.5 text-xs font-bold transition-all ${
            statusFilter === "Active"
              ? "border-[#2c6671] bg-[#2c6671] text-white shadow-xs"
              : "border-[#2c6671]/20 bg-[#EFFBFD]/60 text-[#2c6671] hover:bg-[#EFFBFD]"
          }`}
        >
          Active ({activeCount})
        </button>

        <button
          onClick={() => setStatusFilter("Pending")}
          className={`cursor-pointer rounded-full border px-4 py-1.5 text-xs font-bold transition-all ${
            statusFilter === "Pending"
              ? "border-[#2c6671] bg-[#2c6671] text-white shadow-xs"
              : "border-[#2c6671]/20 bg-[#EFFBFD]/60 text-[#2c6671] hover:bg-[#EFFBFD]"
          }`}
        >
          Pending ({pendingCount})
        </button>
      </div>

      {/* Table Container Card */}
      <div className="min-h-0 flex-1 overflow-x-auto overflow-y-auto rounded-2xl border border-gray-200/80 bg-white shadow-sm">
        <table className="w-full min-w-[850px] border-collapse text-left text-xs">
          <thead className="sticky top-0 z-10 border-b border-gray-200 bg-[#EFFBFD] select-none">
            <tr>
              <th className="w-14 px-4 py-3 text-center font-bold tracking-wide text-[#2c6671] uppercase">
                Sr. No.
              </th>
              <th className="px-4 py-3 font-bold tracking-wide text-[#2c6671] uppercase">
                Company Name
              </th>
              <th className="px-4 py-3 font-bold tracking-wide text-[#2c6671] uppercase">
                Email ID
              </th>
              <th className="px-4 py-3 font-bold tracking-wide text-[#2c6671] uppercase">Domain</th>
              <th className="px-4 py-3 font-bold tracking-wide text-[#2c6671] uppercase">
                Org Type
              </th>
              <th className="px-4 py-3 text-center font-bold tracking-wide text-[#2c6671] uppercase">
                Status
              </th>
              <th className="px-4 py-3 font-bold tracking-wide text-[#2c6671] uppercase">
                Status Reason
              </th>
              <th className="w-24 px-4 py-3 text-center font-bold tracking-wide text-[#2c6671] uppercase">
                Action
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100 bg-white">
            {filteredCustomers.map((c, index) => {
              const statusLower = c.status.toLowerCase();
              const isActive = statusLower === "active" || statusLower === "approved";
              const isPending = statusLower === "pending";

              return (
                <tr key={c.id} className="transition-colors hover:bg-[#EFFBFD]/30">
                  <td className="px-4 py-3.5 text-center font-medium text-gray-500">{index + 1}</td>
                  <td className="px-4 py-3.5 font-bold text-gray-900">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 shrink-0 text-[#2c6671]" />
                      <span>{c.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 font-medium text-gray-600">{c.email}</td>
                  <td className="px-4 py-3.5 font-mono text-[11px] text-gray-500">
                    {c.domainName || "—"}
                  </td>
                  <td className="px-4 py-3.5 font-medium text-gray-700">
                    {c.type || "Enterprise"}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    {isActive ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
                        <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Active
                      </span>
                    ) : isPending ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-800">
                        <Clock className="h-3 w-3 text-amber-600" /> Pending
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-[11px] font-bold text-rose-700">
                        <XCircle className="h-3 w-3 text-rose-600" /> {c.status}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-xs text-gray-600">{c.statusReason || "—"}</td>
                  <td className="px-4 py-3.5 text-center">
                    <div className="flex items-center justify-center gap-2">
                      {isPending && (
                        <button
                          onClick={() => handleApprove(c.id, c.name)}
                          disabled={isApproving}
                          className="cursor-pointer rounded-lg p-1 text-emerald-600 transition-colors hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-50"
                          title="Approve Request"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                      )}

                      <button
                        onClick={() => handleDelete(c.id, c.name)}
                        disabled={isApproving || isDeleting}
                        className="cursor-pointer rounded-lg p-1 text-gray-400 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                        title="Delete Request"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filteredCustomers.length === 0 && (
              <tr>
                <td colSpan={8} className="py-8 text-center text-xs text-gray-400 select-none">
                  No {statusFilter !== "All" ? statusFilter.toLowerCase() : ""} company requests
                  found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Assign Plan Modal */}
      {isAssignModalOpen && selectedCustomer && (
        <div className="animate-fadeIn fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-6 shadow-2xl select-none">
            {/* Modal Header */}
            <div className="mb-4 flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-gray-900">Assign Plan</h3>
                <p className="mt-0.5 text-xs text-gray-500">
                  Select a plan to assign to {selectedCustomer.name}
                </p>
              </div>
              <button
                onClick={() => setIsAssignModalOpen(false)}
                className="cursor-pointer rounded-full p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-xs font-bold text-gray-700">Choose a Plan</label>
                {isLoadingPlans ? (
                  <div className="py-2 text-xs text-gray-500">Loading plans...</div>
                ) : activePlans.length === 0 ? (
                  <div className="py-2 text-xs text-gray-500">No active plans available.</div>
                ) : (
                  <div className="max-h-48 divide-y divide-gray-100 overflow-y-auto rounded-xl border border-gray-200 bg-white">
                    {activePlans.map((plan) => {
                      const isSelected = selectedPlanId === plan.id;
                      return (
                        <div
                          key={plan.id}
                          onClick={() => setSelectedPlanId(plan.id)}
                          className={`flex cursor-pointer flex-col p-3 text-left transition-colors ${
                            isSelected
                              ? "border-l-4 border-[#2c6671] bg-[#EFFBFD] text-[#2c6671]"
                              : "text-gray-700 hover:bg-gray-50"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold sm:text-sm">{plan.name}</span>
                            <input
                              type="radio"
                              name="selectedPlan"
                              checked={isSelected}
                              onChange={() => setSelectedPlanId(plan.id)}
                              className="h-4 w-4 accent-[#2c6671]"
                            />
                          </div>
                          {plan.description && (
                            <span className="mt-1 line-clamp-2 text-[11px] text-gray-500">
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
            <div className="mt-4 flex justify-end gap-2.5 border-t border-gray-100 pt-4">
              <button
                type="button"
                onClick={() => setIsAssignModalOpen(false)}
                className="cursor-pointer rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 transition hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!selectedPlanId || isAssigning}
                onClick={handleAssignSubmit}
                className="cursor-pointer rounded-xl bg-[#2c6671] px-5 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-[#1f4e57] disabled:opacity-50"
              >
                {isAssigning ? "Assigning..." : "Assign Plan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
