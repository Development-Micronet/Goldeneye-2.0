import { useState, useMemo } from "react";
import { X, Award, Building2 } from "lucide-react";
import { toast } from "react-toastify";
import { useQueryClient } from "@tanstack/react-query";
import { useCustomers } from "../../hooks/useCustomers";
import { useTenantPlans } from "../../../dashboard/hooks/useTenantPlans";
import { useAssignPlanMutation, useUnassignPlanMutation } from "../../hooks/usePlans";
import type { Plan } from "../../api/plans";

type Props = {
    open: boolean;
    mode: "assign" | "unassign";
    plan: Plan | null;
    onClose: () => void;
};

export const AssignPlanModal = ({ open, mode, plan, onClose }: Props) => {
    const [schemaName, setSchemaName] = useState("");
    const queryClient = useQueryClient();
    const { data: customers = [], isLoading: loadingCustomers } = useCustomers();
    const { data: tenantPlans = [], isLoading: loadingTenantPlans } = useTenantPlans();

    const assignMutation = useAssignPlanMutation();
    const unassignMutation = useUnassignPlanMutation();

    const isAssign = mode === "assign";
    const mutation = isAssign ? assignMutation : unassignMutation;

    // Filter company options based on assign / unassign mode
    const selectableCompanies = useMemo(() => {
        if (!plan) return [];

        // Build a map of schema_name -> TenantPlanRow for lookup
        const tenantPlanMap = new Map<string, typeof tenantPlans[0]>();
        tenantPlans.forEach((tp) => tenantPlanMap.set(tp.schema_name, tp));

        if (isAssign) {
            // ASSIGN MODE: Show ONLY companies that currently have NO PLAN ASSIGNED AT ALL (!plan_details)
            if (customers.length > 0) {
                return customers
                    .filter((c) => {
                        const tp = tenantPlanMap.get(c.schema_name);
                        return !tp || !tp.plan_details; // Must NOT have any assigned plan
                    })
                    .map((c) => ({
                        id: c.id,
                        name: c.name,
                        schema_name: c.schema_name,
                    }));
            }

            return tenantPlans
                .filter((tp) => !tp.plan_details)
                .map((tp) => ({
                    id: tp.customer_id,
                    name: tp.company_name,
                    schema_name: tp.schema_name,
                }));
        } else {
            // UNASSIGN MODE: Show ONLY companies that DO currently have THIS specific plan assigned
            return tenantPlans
                .filter((tp) => {
                    if (!tp.plan_details) return false;
                    const matchId = Number(tp.plan_details.plan_id) === Number(plan.id);
                    const matchName =
                        tp.plan_details.name?.trim().toLowerCase() === plan.name?.trim().toLowerCase();
                    return matchId || matchName;
                })
                .map((tp) => ({
                    id: tp.customer_id,
                    name: tp.company_name,
                    schema_name: tp.schema_name,
                }));
        }
    }, [tenantPlans, customers, plan, isAssign]);

    if (!open || !plan) return null;

    const handleSubmit = () => {
        if (!schemaName) {
            toast.error("Please select a company");
            return;
        }
        const toastId = toast.loading(isAssign ? "Assigning plan..." : "Unassigning plan...");

        mutation.mutate(
            { planId: plan.id, schemaName },
            {
                onSuccess: () => {
                    queryClient.invalidateQueries({ queryKey: ["tenant-plans"] });
                    queryClient.invalidateQueries({ queryKey: ["plans"] });
                    queryClient.invalidateQueries({ queryKey: ["my-plan"] });

                    toast.update(toastId, {
                        render: `Plan ${isAssign ? "assigned" : "unassigned"} successfully!`,
                        type: "success",
                        isLoading: false,
                        autoClose: 3000,
                    });
                    setSchemaName("");
                    onClose();
                },
                onError: (err: any) => {
                    toast.update(toastId, {
                        render: `Failed: ${err.message || "Unknown error"}`,
                        type: "error",
                        isLoading: false,
                        autoClose: 3000,
                    });
                },
            }
        );
    };

    const isLoading = loadingCustomers || loadingTenantPlans;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fadeIn">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-gray-100 select-none">
                <div className="mb-5 flex items-center justify-between border-b border-gray-100 pb-3">
                    <div className="flex items-center gap-2">
                        <Award className="h-5 w-5 text-[#2c6671]" />
                        <h3 className="text-base font-bold text-gray-900">
                            {isAssign ? "Assign" : "Unassign"} Plan — {plan.name}
                        </h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition cursor-pointer"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-gray-700">
                            <Building2 className="h-3.5 w-3.5 text-[#2c6671]" />
                            {isAssign ? "Select Company to Assign" : "Select Company to Unassign"}
                        </label>
                        <select
                            value={schemaName}
                            onChange={(e) => setSchemaName(e.target.value)}
                            disabled={isLoading}
                            className="w-full rounded-md border border-gray-200 bg-gray-50/50 px-3.5 py-2.5 text-xs font-medium text-gray-800 outline-none transition focus:border-[#2c6671] focus:bg-white focus:ring-1 focus:ring-[#2c6671] disabled:opacity-60 cursor-pointer"
                        >
                            <option
                                value="">
                                {isLoading
                                    ? "Loading companies..."
                                    : selectableCompanies.length === 0
                                        ? isAssign
                                            ? "No unassigned company available (all companies already have an assigned plan)"
                                            : "No company currently assigned to this plan"
                                        : "Select company..."}
                            </option>
                            {selectableCompanies.map((c) => (
                                <option className="rounded-md" key={c.id} value={c.schema_name}>
                                    {c.name} ({c.schema_name})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="flex justify-end gap-2.5 pt-3 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={mutation.isPending || selectableCompanies.length === 0 || !schemaName}
                            className={`rounded-xl px-4 py-2 text-xs font-bold text-white shadow-xs transition ${isAssign
                                ? "bg-[#2c6671] hover:bg-[#1f4e57]"
                                : "bg-rose-600 hover:bg-rose-700"
                                } disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer`}
                        >
                            {mutation.isPending ? "Processing..." : isAssign ? "Assign Plan" : "Unassign Plan"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};