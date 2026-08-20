import React, { useState } from "react";
import { Trash2, Edit2, UserPlus, UserMinus } from "lucide-react";  // ✅
import { usePlans, useMyPlan, useDeletePlanMutation } from "../../hooks/usePlans";
import { type Plan } from "../../api/plans";
import { toast } from "react-toastify";
import { useAuthStore } from "../../../../store/useAuthStore";
import { AssignPlanModal } from "./AssignPlanModal";

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
    const [assignModal, setAssignModal] = useState<{ mode: "assign" | "unassign"; plan: Plan } | null>(null); // ← naya
    const plans = isAdmin
        ? (myPlanData ? [myPlanData] : [])
        : allPlans;
    const isLoading = isAdmin ? isLoadingMy : isLoadingAll;
    const isError = isAdmin ? isErrorMy : isErrorAll;
    const error = isAdmin ? errorMy : errorAll;

    const handleDelete = (id: number, name: string) => {
        if (confirm(`Are you sure you want to delete plan "${name}"?`)) {
            const toastId = toast.loading(`Deleting plan "${name}"...`);

            deleteMutation.mutate(id, {
                onSuccess: () => {
                    toast.update(toastId, {
                        render: `Plan "${name}" deleted successfully!`,
                        type: "success",
                        isLoading: false,
                        autoClose: 3000,
                    });
                },
                onError: (err: any) => {
                    toast.update(toastId, {
                        render: `Failed to delete: ${err.message || "Unknown error"}`,
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
                <span className="mt-3 text-xs text-gray-500 font-medium">Loading plans...</span>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="p-4 bg-red-50 text-red-700 rounded-lg text-xs font-semibold border border-red-100 select-none">
                ⚠️ Failed to load plans: {error?.message || "Unknown error occurred"}
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col gap-4 overflow-hidden min-h-0">
            {/* Table Container */}
            <div className="flex-1 overflow-y-auto overflow-x-auto min-h-0  border-gray-150 shadow-xs">
                <table className="min-w-full border-collapse border border-gray-200">
                    <thead>
                        <tr className="bg-gray-50/70 select-none border-b border-gray-200">
                            <th className="border border-gray-200 px-4 py-3.5 text-left text-[11px] font-bold text-gray-700 w-16">
                                Sr. No.
                            </th>
                            <th className="border border-gray-200 px-4 py-3.5 text-left text-[11px] font-bold text-gray-700 w-56">
                                Plan Name
                            </th>
                            <th className="border border-gray-200 px-4 py-3.5 text-left text-[11px] font-bold text-gray-700">
                                Description
                            </th>
                            <th className="border border-gray-200 px-4 py-3.5 text-left text-[11px] font-bold text-gray-700 w-44">
                                Validity Dates
                            </th>
                            <th className="border border-gray-200 px-4 py-3.5 text-left text-[11px] font-bold text-gray-700 w-64">
                                Allowed Providers & Sensors
                            </th>
                            <th className="border border-gray-200 px-4 py-3.5 text-left text-[11px] font-bold text-gray-700 w-36">
                                Services
                            </th>
                            <th className="border border-gray-200 px-4 py-3.5 text-left text-[11px] font-bold text-gray-700 w-28">
                                Status
                            </th>
                            {!isAdmin && (
                                <th className="border border-gray-200 px-4 py-3.5 text-left text-[11px] font-bold text-gray-700 w-20">
                                    Action
                                </th>
                            )}
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-150">
                        {plans.map((p, index) => (
                            <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                                {/* Sr No. */}
                                <td className="border border-gray-200 px-4 py-3 text-xs text-gray-800 text-center font-medium">
                                    {index + 1}
                                </td>

                                {/* Plan Name */}
                                <td className="border border-gray-200 px-4 py-3 text-xs sm:text-sm text-gray-900 font-semibold">
                                    {p.name}
                                </td>

                                {/* Description */}
                                <td className="border border-gray-200 px-4 py-3 text-xs text-gray-600 font-normal leading-relaxed">
                                    {p.description || "—"}
                                </td>

                                {/* Dates */}
                                <td className="border border-gray-200 px-4 py-3 text-xs text-gray-750 font-medium">
                                    <div className="flex flex-col gap-0.5">
                                        <span><strong className="text-gray-400 text-[10px]">START:</strong> {p.start_date}</span>
                                        <span><strong className="text-gray-400 text-[10px]">END:</strong> {p.end_date}</span>
                                    </div>
                                </td>

                                {/* Providers & Sensors (Beautiful customized tag mapping) */}
                                <td className="border border-gray-200 px-4 py-3 text-xs">
                                    <div className="flex flex-col gap-1.5 py-0.5">
                                        {p.allowed_providers?.map((provider) => {
                                            const sensors = p.allowed_sensors?.[provider] || [];
                                            return (
                                                <div key={provider} className="flex items-center gap-1.5">
                                                    <span
                                                        className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold border capitalize select-none ${provider === "airbus"
                                                            ? "bg-blue-50 text-blue-700 border-blue-200"
                                                            : provider === "planet"
                                                                ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                                                                : provider === "sentinel"
                                                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                                    : "bg-gray-50 text-gray-600 border-gray-200"
                                                            }`}
                                                    >
                                                        {provider}
                                                    </span>
                                                    <span
                                                        className="text-[10px] text-gray-400 font-normal truncate max-w-[200px]"
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
                                <td className="border border-gray-200 px-4 py-3 text-xs">
                                    <div className="flex flex-wrap gap-1">
                                        {p.services?.map((svc) => (
                                            <span
                                                key={svc}
                                                className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-gray-100 text-gray-600 border border-gray-200 uppercase tracking-wider"
                                            >
                                                {svc.replace("_", " ")}
                                            </span>
                                        ))}
                                    </div>
                                </td>

                                {/* Status Badges */}
                                <td className="border border-gray-200 px-4 py-3 text-xs">
                                    <div className="flex flex-col items-start gap-1 select-none">
                                        {p.is_active ? (
                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-green-50 text-green-700 border border-green-200">
                                                ACTIVE
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-red-50 text-red-700 border border-red-200">
                                                INACTIVE
                                            </span>
                                        )}

                                        {p.is_currently_valid ? (
                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                                VALID
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                                EXPIRED
                                            </span>
                                        )}
                                    </div>
                                </td>

                                {/* Action */}
                                {!isAdmin && (
                                    <td className="border border-gray-200 px-4 py-3 text-xs text-center">
                                        <div className="flex items-center justify-center gap-3">
                                            {/* Edit Button */}
                                            <button
                                                onClick={() => onEdit(p)}
                                                className="p-1.5 hover:bg-blue-50 rounded-md text-gray-400 hover:text-blue-500 transition-colors cursor-pointer inline-flex items-center"
                                                title="Edit Plan"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>

                                            {/* Assign Button ← naya */}
                                            <button
                                                onClick={() => setAssignModal({ mode: "assign", plan: p })}
                                                className="p-1.5 hover:bg-green-50 rounded-md text-gray-400 hover:text-green-600 transition-colors cursor-pointer inline-flex items-center"
                                                title="Assign to Company"
                                            >
                                                <UserPlus className="w-4 h-4" />
                                            </button>

                                            {/* Unassign Button ← naya */}
                                            <button
                                                onClick={() => setAssignModal({ mode: "unassign", plan: p })}
                                                className="p-1.5 hover:bg-orange-50 rounded-md text-gray-400 hover:text-orange-600 transition-colors cursor-pointer inline-flex items-center"
                                                title="Unassign from Company"
                                            >
                                                <UserMinus className="w-4 h-4" />
                                            </button>

                                            {/* Delete Button */}
                                            <button
                                                onClick={() => handleDelete(p.id, p.name)}
                                                className="p-1.5 hover:bg-red-50 rounded-md text-gray-400 hover:text-red-500 transition-colors cursor-pointer inline-flex items-center"
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
