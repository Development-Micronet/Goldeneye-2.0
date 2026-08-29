import React, { useState } from "react";
import {
  Trash2,
  Edit2,
  UserPlus,
  UserMinus,
  Award,
  Calendar,
  Layers,
  ShieldCheck,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { usePlans, useMyPlan, useDeletePlanMutation } from "../../hooks/usePlans";
import { type Plan } from "../../api/plans";
import { useAuthStore } from "../../../../store/useAuthStore";
import { AssignPlanModal } from "./AssignPlanModal";
import Swal from "sweetalert2";

interface PlanTableProps {
  onEdit: (plan: Plan) => void;
}

export const PlanTable: React.FC<PlanTableProps> = ({ onEdit }) => {
  const user = useAuthStore((state) => state.user);
  const roleName = user?.roleName.toLowerCase() || "";
  const isAdmin = roleName === "admin";

  const {
    data: allPlans = [],
    isLoading: isLoadingAll,
    isError: isErrorAll,
    error: errorAll,
  } = usePlans({
    enabled: !isAdmin,
  });

  const {
    data: myPlanData,
    isLoading: isLoadingMy,
    isError: isErrorMy,
    error: errorMy,
  } = useMyPlan({
    enabled: isAdmin,
  });

  const deleteMutation = useDeletePlanMutation();
  const [assignModal, setAssignModal] = useState<{
    mode: "assign" | "unassign";
    plan: Plan;
  } | null>(null);

  const plans = isAdmin ? (myPlanData ? [myPlanData] : []) : allPlans;
  const isLoading = isAdmin ? isLoadingMy : isLoadingAll;
  const isError = isAdmin ? isErrorMy : isErrorAll;
  const error = isAdmin ? errorMy : errorAll;

  const handleDelete = async (id: number, name: string) => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: `Plan "${name}" will be permanently deleted.`,
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
          text: `Plan "${name}" has been deleted successfully.`,
          icon: "success",
          timer: 1500,
          showConfirmButton: false,
        });
      },
      onError: (err: any) => {
        Swal.fire({
          title: "Error",
          text: err?.message || "Failed to delete plan.",
          icon: "error",
        });
      },
    });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 select-none">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#2c6671]"></div>
        <span className="mt-3 text-xs font-medium text-gray-500">Loading plans...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-xs font-semibold text-red-700 select-none">
        ⚠️ Failed to load plans: {error?.message || "Unknown error occurred"}
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
      {/* Table Container Card */}
      <div className="min-h-0 flex-1 overflow-x-auto overflow-y-auto rounded-2xl border border-gray-200/80 bg-white shadow-sm">
        <table className="w-full min-w-[900px] border-collapse text-left text-xs">
          <thead className="sticky top-0 z-10 border-b border-gray-200 bg-[#EFFBFD] select-none">
            <tr>
              <th className="w-14 px-4 py-3 text-center font-bold tracking-wide text-[#2c6671] uppercase">
                Sr. No.
              </th>
              <th className="w-48 px-4 py-3 font-bold tracking-wide text-[#2c6671] uppercase">
                Plan Name
              </th>
              <th className="px-4 py-3 font-bold tracking-wide text-[#2c6671] uppercase">
                Description
              </th>
              <th className="w-44 px-4 py-3 font-bold tracking-wide text-[#2c6671] uppercase">
                Validity Dates
              </th>
              <th className="w-64 px-4 py-3 font-bold tracking-wide text-[#2c6671] uppercase">
                Allowed Providers & Sensors
              </th>
              <th className="w-36 px-4 py-3 font-bold tracking-wide text-[#2c6671] uppercase">
                Services
              </th>
              <th className="w-28 px-4 py-3 text-center font-bold tracking-wide text-[#2c6671] uppercase">
                Status
              </th>
              {!isAdmin && (
                <th className="w-24 px-4 py-3 text-center font-bold tracking-wide text-[#2c6671] uppercase">
                  Action
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {plans.map((p, index) => (
              <tr key={p.id} className="transition-colors hover:bg-[#EFFBFD]/30">
                {/* Sr No. */}
                <td className="px-4 py-3.5 text-center text-xs font-medium text-gray-500">
                  {index + 1}
                </td>

                {/* Plan Name */}
                <td className="px-4 py-3.5 text-sm font-bold text-gray-900">
                  <div className="flex items-center gap-2">
                    <Award className="h-4 w-4 shrink-0 text-[#2c6671]" />
                    <span>{p.name}</span>
                  </div>
                </td>

                {/* Description */}
                <td className="px-4 py-3.5 text-xs leading-relaxed font-normal text-gray-600">
                  {p.description || "—"}
                </td>

                {/* Dates */}
                <td className="px-4 py-3.5 text-xs text-gray-700">
                  <div className="flex flex-col gap-1">
                    <span className="inline-flex items-center gap-1 font-medium text-gray-800">
                      <strong className="text-[10px] font-bold text-[#2c6671] uppercase">
                        START:
                      </strong>{" "}
                      {p.start_date}
                    </span>
                    <span className="inline-flex items-center gap-1 font-medium text-gray-800">
                      <strong className="text-[10px] font-bold text-gray-400 uppercase">
                        END:
                      </strong>{" "}
                      {p.end_date}
                    </span>
                  </div>
                </td>

                {/* Providers & Sensors */}
                <td className="px-4 py-3.5 text-xs">
                  <div className="flex flex-col gap-1.5 py-0.5">
                    {p.allowed_providers?.map((provider) => {
                      const sensors = p.allowed_sensors?.[provider] || [];
                      const provLower = provider.toLowerCase();
                      return (
                        <div key={provider} className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[10px] font-bold capitalize select-none ${
                              provLower === "airbus"
                                ? "border-[#2c6671]/20 bg-[#EFFBFD] text-[#2c6671]"
                                : provLower === "planet"
                                  ? "border-indigo-200 bg-indigo-50 text-indigo-800"
                                  : provLower === "sentinel"
                                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                                    : "border-gray-200 bg-gray-100 text-gray-700"
                            }`}
                          >
                            {provider}
                          </span>
                          <span
                            className="max-w-[180px] truncate text-[10px] font-normal text-gray-500"
                            title={sensors.join(", ")}
                          >
                            ({sensors.length > 0 ? sensors.join(", ") : "No sensors"})
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </td>

                {/* Services */}
                <td className="px-4 py-3.5 text-xs">
                  <div className="flex flex-wrap gap-1">
                    {p.services?.map((svc) => (
                      <span
                        key={svc}
                        className="rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-bold tracking-wider text-slate-700 uppercase"
                      >
                        {svc.replace("_", " ")}
                      </span>
                    ))}
                  </div>
                </td>

                {/* Status Badges */}
                <td className="px-4 py-3.5 text-center text-xs">
                  <div className="flex flex-col items-center gap-1 select-none">
                    {p.is_active ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                        <CheckCircle2 className="h-3 w-3" /> ACTIVE
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800">
                        <XCircle className="h-3 w-3" /> INACTIVE
                      </span>
                    )}

                    {p.is_currently_valid ? (
                      <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                        VALID
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700">
                        EXPIRED
                      </span>
                    )}
                  </div>
                </td>

                {/* Action */}
                {!isAdmin && (
                  <td className="px-4 py-3.5 text-center text-xs">
                    <div className="flex items-center justify-center gap-1">
                      {/* Edit Button */}
                      <button
                        onClick={() => onEdit(p)}
                        className="cursor-pointer rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-[#EFFBFD] hover:text-[#2c6671]"
                        title="Edit Plan"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>

                      {/* Assign Button */}
                      <button
                        onClick={() => setAssignModal({ mode: "assign", plan: p })}
                        className="cursor-pointer rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-emerald-50 hover:text-emerald-600"
                        title="Assign to Company"
                      >
                        <UserPlus className="h-4 w-4" />
                      </button>

                      {/* Unassign Button */}
                      <button
                        onClick={() => setAssignModal({ mode: "unassign", plan: p })}
                        className="cursor-pointer rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-amber-50 hover:text-amber-600"
                        title="Unassign from Company"
                      >
                        <UserMinus className="h-4 w-4" />
                      </button>

                      {/* Delete Button */}
                      <button
                        onClick={() => handleDelete(p.id, p.name)}
                        className="cursor-pointer rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                        title="Delete Plan"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {plans.length === 0 && (
              <tr>
                <td
                  colSpan={isAdmin ? 7 : 8}
                  className="py-8 text-center text-sm text-gray-400 select-none"
                >
                  No plans found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Assign / Unassign Modal */}
      <AssignPlanModal
        open={!!assignModal}
        mode={assignModal?.mode || "assign"}
        plan={assignModal?.plan || null}
        onClose={() => setAssignModal(null)}
      />
    </div>
  );
};
