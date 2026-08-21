import React, { useState } from "react";
import { CheckCircle2, XCircle, AlertCircle, Award, Calendar, ChevronDown, ChevronUp, Layers } from "lucide-react";
import { useTenantPlans, type TenantPlanRow } from "../hooks/useTenantPlans";
import { useAuthStore } from "../../../store/useAuthStore";

export const PlanStatusChart: React.FC = () => {
    const user = useAuthStore((state) => state.user);
    const isSuperAdmin = user?.roleName?.toLowerCase() === "superadmin";

    const { data: tenantPlans = [], isLoading, isError } = useTenantPlans();
    const [showDetailList, setShowDetailList] = useState(false);

    // Only display plan analytics graph for SuperAdmin role
    if (!isSuperAdmin || isError) {
        return null;
    }

    const totalCompanies = tenantPlans.length;
    
    // Calculate counts
    const validCount = tenantPlans.filter(
        (t) => t.plan_details && t.plan_details.is_currently_valid
    ).length;

    const expiredCount = tenantPlans.filter(
        (t) => t.plan_details && !t.plan_details.is_currently_valid
    ).length;

    const unassignedCount = tenantPlans.filter((t) => !t.plan_details).length;

    const assignedTotal = validCount + expiredCount;
    const validPercentage = assignedTotal > 0 ? Math.round((validCount / assignedTotal) * 100) : 0;
    const expiredPercentage = assignedTotal > 0 ? Math.round((expiredCount / assignedTotal) * 100) : 0;

    // Donut SVG calculations
    const radius = 62;
    const circumference = 2 * Math.PI * radius; // ~389.55

    const validDash = (validPercentage / 100) * circumference;
    const expiredDash = (expiredPercentage / 100) * circumference;

    if (isLoading) {
        return (
            <div className="flex h-64 w-full flex-col items-center justify-center rounded-2xl bg-white p-6 shadow-sm border border-gray-150 select-none">
                <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#2c6671]"></div>
                <span className="mt-3 text-xs font-medium text-gray-500">Loading plan analytics graph...</span>
            </div>
        );
    }

    return (
        <div className="flex w-full flex-col gap-4 rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm transition-all duration-300 hover:shadow-md">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EFFBFD] text-[#2c6671] border border-[#2c6671]/20">
                        <Award className="h-5 w-5" />
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-gray-800 select-none">
                            Subscription Plan Status
                        </h3>
                        <p className="text-xs text-gray-500">Real-time overview of active vs expired organization plans</p>
                    </div>
                </div>

                <button
                    onClick={() => setShowDetailList(!showDetailList)}
                    className="flex items-center gap-1.5 rounded-lg border border-[#2c6671]/20 bg-[#EFFBFD] px-3 py-1.5 text-xs font-semibold text-[#2c6671] hover:bg-[#D5E9E9] transition cursor-pointer select-none"
                >
                    <Layers className="h-3.5 w-3.5 text-[#2c6671]" />
                    {showDetailList ? "Hide Companies" : "View Breakdown"}
                    {showDetailList ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </button>
            </div>

            {/* Main Graph Content */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-center">
                {/* Donut Chart SVG */}
                <div className="lg:col-span-5 flex flex-col items-center justify-center relative py-2">
                    <div className="relative flex items-center justify-center">
                        <svg className="h-44 w-44 transform -rotate-90" viewBox="0 0 160 160">
                            {/* Background Track */}
                            <circle
                                cx="80"
                                cy="80"
                                r={radius}
                                className="stroke-gray-100"
                                strokeWidth="16"
                                fill="transparent"
                            />
                            {/* Expired Slice (Red) */}
                            {expiredCount > 0 && (
                                <circle
                                    cx="80"
                                    cy="80"
                                    r={radius}
                                    className="stroke-rose-500 transition-all duration-700 ease-out"
                                    strokeWidth="16"
                                    strokeDasharray={`${expiredDash} ${circumference}`}
                                    strokeDashoffset={-validDash}
                                    strokeLinecap="round"
                                    fill="transparent"
                                />
                            )}
                            {/* Valid Slice (Navbar Green/Teal) */}
                            {validCount > 0 && (
                                <circle
                                    cx="80"
                                    cy="80"
                                    r={radius}
                                    className="stroke-[#00b894] transition-all duration-700 ease-out"
                                    strokeWidth="16"
                                    strokeDasharray={`${validDash} ${circumference}`}
                                    strokeDashoffset="0"
                                    strokeLinecap="round"
                                    fill="transparent"
                                />
                            )}
                        </svg>

                        {/* Center Metric */}
                        <div className="absolute flex flex-col items-center justify-center text-center">
                            <span className="text-2xl font-extrabold text-gray-900 leading-none">
                                {validPercentage}%
                            </span>
                            <span className="text-[11px] font-semibold text-[#00b894] uppercase tracking-wider mt-1">
                                Valid Plans
                            </span>
                            <span className="text-[10px] text-gray-400 mt-0.5">
                                {validCount} of {assignedTotal} active
                            </span>
                        </div>
                    </div>
                </div>

                {/* Legend & Breakdown Stats */}
                <div className="lg:col-span-7 flex flex-col justify-center gap-3">
                    {/* Stat Item: Valid */}
                    <div className="flex items-center justify-between rounded-xl border border-emerald-100 bg-emerald-50/50 p-3 shadow-2xs">
                        <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#00b894] text-white">
                                <CheckCircle2 className="h-5 w-5" />
                            </div>
                            <div>
                                <span className="text-xs font-bold text-emerald-950 block">Valid & Active Plans</span>
                                <span className="text-[11px] text-emerald-700 font-medium">Currently within validity period</span>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="text-lg font-bold text-emerald-700">{validCount}</span>
                            <span className="text-xs text-emerald-600 block font-semibold">{validPercentage}%</span>
                        </div>
                    </div>

                    {/* Stat Item: Expired */}
                    <div className="flex items-center justify-between rounded-xl border border-rose-100 bg-rose-50/50 p-3 shadow-2xs">
                        <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500 text-white">
                                <XCircle className="h-5 w-5" />
                            </div>
                            <div>
                                <span className="text-xs font-bold text-rose-950 block">Expired Plans</span>
                                <span className="text-[11px] text-rose-700 font-medium">End date has passed</span>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="text-lg font-bold text-rose-700">{expiredCount}</span>
                            <span className="text-xs text-rose-600 block font-semibold">{expiredPercentage}%</span>
                        </div>
                    </div>

                    {/* Stat Item: Unassigned */}
                    {unassignedCount > 0 && (
                        <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50/60 p-3 shadow-2xs">
                            <div className="flex items-center gap-3">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-400 text-white">
                                    <AlertCircle className="h-5 w-5" />
                                </div>
                                <div>
                                    <span className="text-xs font-bold text-gray-800 block">No Plan Assigned</span>
                                    <span className="text-[11px] text-gray-500 font-medium">Awaiting plan allocation</span>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="text-lg font-bold text-gray-700">{unassignedCount}</span>
                                <span className="text-xs text-gray-500 block font-semibold">
                                    {Math.round((unassignedCount / totalCompanies) * 100)}%
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Collapsible Company Plan Breakdown */}
            {showDetailList && (
                <div className="mt-2 border-t border-gray-100 pt-3 animate-fadeIn">
                    <h4 className="mb-2 text-xs font-bold text-gray-700 uppercase tracking-wide flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-[#2c6671]" />
                        Company Plan Expiry Status
                    </h4>
                    <div className="max-h-56 overflow-y-auto rounded-xl border border-gray-200 bg-gray-50/40">
                        <table className="min-w-full text-left text-xs">
                            <thead className="bg-[#EFFBFD] sticky top-0 text-[11px] font-bold text-[#2c6671] uppercase border-b border border-gray-200">
                                <tr>
                                    <th className="px-4 py-2.5">Company</th>
                                    <th className="px-4 py-2.5">Assigned Plan</th>
                                    <th className="px-4 py-2.5">Validity Dates</th>
                                    <th className="px-4 py-2.5 text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 bg-white">
                                {tenantPlans.map((tp: TenantPlanRow) => {
                                    const isValid = tp.plan_details?.is_currently_valid;
                                    return (
                                        <tr key={tp.customer_id} className="hover:bg-[#EFFBFD]/40 transition-colors">
                                            <td className="px-4 py-2.5 font-semibold text-gray-800">
                                                {tp.company_name}
                                                <span className="block text-[10px] text-gray-400 font-normal">
                                                    ({tp.schema_name})
                                                </span>
                                            </td>
                                            <td className="px-4 py-2.5">
                                                {tp.plan_details ? (
                                                    <span className="font-semibold text-gray-700">{tp.plan_details.name}</span>
                                                ) : (
                                                    <span className="text-gray-400 italic text-[11px]">Unassigned</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-2.5 text-gray-600 text-[11px]">
                                                {tp.plan_details ? (
                                                    `${tp.plan_details.start_date} → ${tp.plan_details.end_date}`
                                                ) : (
                                                    "—"
                                                )}
                                            </td>
                                            <td className="px-4 py-2.5 text-center">
                                                {tp.plan_details ? (
                                                    isValid ? (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                                            <CheckCircle2 className="h-3 w-3" /> Valid
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                                            <XCircle className="h-3 w-3" /> Expired
                                                        </span>
                                                    )
                                                ) : (
                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-500">
                                                        None
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                                {tenantPlans.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="text-center py-4 text-gray-400">
                                            No company plan mapping available.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};
