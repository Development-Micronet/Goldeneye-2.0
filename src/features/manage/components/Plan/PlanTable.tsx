import React, { useState } from "react";
import { Trash2, Edit2, UserPlus, UserMinus, Award, Calendar, Layers, ShieldCheck, CheckCircle2, XCircle } from "lucide-react";
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

    const { data: allPlans = [], isLoading: isLoadingAll, isError: isErrorAll, error: errorAll } = usePlans({
        enabled: !isAdmin,
    });

    const { data: myPlanData, isLoading: isLoadingMy, isError: isErrorMy, error: errorMy } = useMyPlan({
        enabled: isAdmin,
    });

    const deleteMutation = useDeletePlanMutation();
    const [assignModal, setAssignModal] = useState<{ mode: "assign" | "unassign"; plan: Plan } | null>(null);

    const plans = isAdmin
        ? (myPlanData ? [myPlanData] : [])
        : allPlans;
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
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2c6671]"></div>
                <span className="mt-3 text-xs text-gray-500 font-medium">Loading plans...</span>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="p-4 bg-red-50 text-red-700 rounded-2xl text-xs font-semibold border border-red-100 select-none">
                ⚠️ Failed to load plans: {error?.message || "Unknown error occurred"}
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col gap-4 overflow-hidden min-h-0">
            {/* Table Container Card */}
            <div className="flex-1 overflow-y-auto overflow-x-auto min-h-0 rounded-2xl border border-gray-200/80 bg-white shadow-sm">
                <table className="w-full min-w-[900px] text-left text-xs border-collapse">
                    <thead className="sticky top-0 bg-[#EFFBFD] border-b border-gray-200 z-10 select-none">
                        <tr>
                            <th className="px-4 py-3 font-bold text-[#2c6671] uppercase tracking-wide w-14 text-center">
                                Sr. No.
                            </th>
                            <th className="px-4 py-3 font-bold text-[#2c6671] uppercase tracking-wide w-48">
                                Plan Name
                            </th>
                            <th className="px-4 py-3 font-bold text-[#2c6671] uppercase tracking-wide">
                                Description
                            </th>
                            <th className="px-4 py-3 font-bold text-[#2c6671] uppercase tracking-wide w-44">
                                Validity Dates
                            </th>
                            <th className="px-4 py-3 font-bold text-[#2c6671] uppercase tracking-wide w-64">
                                Allowed Providers & Sensors
                            </th>
                            <th className="px-4 py-3 font-bold text-[#2c6671] uppercase tracking-wide w-36">
                                Services
                            </th>
                            <th className="px-4 py-3 font-bold text-[#2c6671] uppercase tracking-wide w-28 text-center">
                                Status
                            </th>
                            {!isAdmin && (
                                <th className="px-4 py-3 font-bold text-[#2c6671] uppercase tracking-wide w-24 text-center">
                                    Action
                                </th>
                            )}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                        {plans.map((p, index) => (
                            <tr key={p.id} className="hover:bg-[#EFFBFD]/30 transition-colors">
                                {/* Sr No. */}
                                <td className="px-4 py-3.5 text-xs text-gray-500 font-medium text-center">
                                    {index + 1}
                                </td>

                                {/* Plan Name */}
                                <td className="px-4 py-3.5 font-bold text-gray-900 text-sm">
                                    <div className="flex items-center gap-2">
                                        <Award className="h-4 w-4 text-[#2c6671] shrink-0" />
                                        <span>{p.name}</span>
                                    </div>
                                </td>

                                {/* Description */}
                                <td className="px-4 py-3.5 text-xs text-gray-600 font-normal leading-relaxed">
                                    {p.description || "—"}
                                </td>

                                {/* Dates */}
                                <td className="px-4 py-3.5 text-xs text-gray-700">
                                    <div className="flex flex-col gap-1">
                                        <span className="inline-flex items-center gap-1 font-medium text-gray-800">
                                            <strong className="text-[#2c6671] text-[10px] uppercase font-bold">START:</strong> {p.start_date}
                                        </span>
                                        <span className="inline-flex items-center gap-1 font-medium text-gray-800">
                                            <strong className="text-gray-400 text-[10px] uppercase font-bold">END:</strong> {p.end_date}
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
                                                <div key={provider} className="flex items-center gap-1.5 flex-wrap">
                                                    <span
                                                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize select-none ${
                                                            provLower === "airbus"
                                                                ? "bg-[#EFFBFD] text-[#2c6671] border-[#2c6671]/20"
                                                                : provLower === "planet"
                                                                ? "bg-indigo-50 text-indigo-800 border-indigo-200"
                                                                : provLower === "sentinel"
                                                                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                                                : "bg-gray-100 text-gray-700 border-gray-200"
                                                        }`}
                                                    >
                                                        {provider}
                                                    </span>
                                                    <span
                                                        className="text-[10px] text-gray-500 font-normal truncate max-w-[180px]"
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
                                                className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 uppercase tracking-wider"
                                            >
                                                {svc.replace("_", " ")}
                                            </span>
                                        ))}
                                    </div>
                                </td>

                                {/* Status Badges */}
                                <td className="px-4 py-3.5 text-xs text-center">
                                    <div className="flex flex-col items-center gap-1 select-none">
                                        {p.is_active ? (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                                <CheckCircle2 className="h-3 w-3" /> ACTIVE
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                                <XCircle className="h-3 w-3" /> INACTIVE
                                            </span>
                                        )}

                                        {p.is_currently_valid ? (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                VALID
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                                EXPIRED
                                            </span>
                                        )}
                                    </div>
                                </td>

                                {/* Action */}
                                {!isAdmin && (
                                    <td className="px-4 py-3.5 text-xs text-center">
                                        <div className="flex items-center justify-center gap-1">
                                            {/* Edit Button */}
                                            <button
                                                onClick={() => onEdit(p)}
                                                className="p-1.5 hover:bg-[#EFFBFD] rounded-lg text-gray-400 hover:text-[#2c6671] transition-colors cursor-pointer"
                                                title="Edit Plan"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>

                                            {/* Assign Button */}
                                            <button
                                                onClick={() => setAssignModal({ mode: "assign", plan: p })}
                                                className="p-1.5 hover:bg-emerald-50 rounded-lg text-gray-400 hover:text-emerald-600 transition-colors cursor-pointer"
                                                title="Assign to Company"
                                            >
                                                <UserPlus className="w-4 h-4" />
                                            </button>

                                            {/* Unassign Button */}
                                            <button
                                                onClick={() => setAssignModal({ mode: "unassign", plan: p })}
                                                className="p-1.5 hover:bg-amber-50 rounded-lg text-gray-400 hover:text-amber-600 transition-colors cursor-pointer"
                                                title="Unassign from Company"
                                            >
                                                <UserMinus className="w-4 h-4" />
                                            </button>

                                            {/* Delete Button */}
                                            <button
                                                onClick={() => handleDelete(p.id, p.name)}
                                                className="p-1.5 hover:bg-rose-50 rounded-lg text-gray-400 hover:text-rose-600 transition-colors cursor-pointer"
                                                title="Delete Plan"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                )}
                            </tr>
                        ))}
                        {plans.length === 0 && (
                            <tr>
                                <td colSpan={isAdmin ? 7 : 8} className="text-center py-8 text-sm text-gray-400 select-none">
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
