import { useTenantPlans } from "../../../dashboard/hooks/useTenantPlans";
import { Building2, Award, CheckCircle2, XCircle } from "lucide-react";

export const TenantPlansTable = () => {
  const { data: rows = [], isLoading, isError, error } = useTenantPlans();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-8 select-none">
        <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-[#2c6671]"></div>
        <span className="mt-2 text-xs font-medium text-gray-500">
          Loading company-plan mapping...
        </span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-2xl border border-red-100 bg-red-50 p-3 text-xs font-semibold text-red-700">
        ⚠️ Failed to load tenant plans: {(error as any)?.message || "Unknown error"}
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-3">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Award className="h-4 w-4 text-[#2c6671]" />
          <h3 className="text-xs font-bold tracking-wide text-gray-800 uppercase">
            Company — Plan Assignment
          </h3>
        </div>
        <span className="rounded-full border border-[#2c6671]/20 bg-[#EFFBFD] px-2.5 py-0.5 text-xs font-bold text-[#2c6671]">
          {rows.length} {rows.length === 1 ? "Company" : "Companies"}
        </span>
      </div>

      {/* Table Container Card */}
      <div className="overflow-x-auto rounded-2xl border border-gray-200/80 bg-white shadow-sm">
        <table className="w-full border-collapse text-left text-xs">
          <thead className="sticky top-0 border-b border-gray-200 bg-[#EFFBFD] select-none">
            <tr>
              <th className="px-4 py-3 font-bold tracking-wide text-[#2c6671] uppercase">
                Company
              </th>
              <th className="px-4 py-3 font-bold tracking-wide text-[#2c6671] uppercase">Schema</th>
              <th className="px-4 py-3 font-bold tracking-wide text-[#2c6671] uppercase">
                Assigned Plan
              </th>
              <th className="px-4 py-3 font-bold tracking-wide text-[#2c6671] uppercase">
                Validity
              </th>
              <th className="px-4 py-3 text-center font-bold tracking-wide text-[#2c6671] uppercase">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {rows.map((row) => (
              <tr key={row.customer_id} className="transition-colors hover:bg-[#EFFBFD]/30">
                <td className="flex items-center gap-2 px-4 py-3.5 font-bold text-gray-900">
                  <Building2 className="h-4 w-4 shrink-0 text-[#2c6671]" />
                  <span>{row.company_name}</span>
                </td>
                <td className="px-4 py-3.5 font-mono text-[11px] text-gray-600">
                  {row.schema_name}
                </td>
                <td className="px-4 py-3.5">
                  {row.plan_details ? (
                    <span className="font-bold text-gray-800">{row.plan_details.name}</span>
                  ) : (
                    <span className="text-[11px] text-gray-400 italic">No plan assigned</span>
                  )}
                </td>
                <td className="px-4 py-3.5 text-[11px] text-gray-400 italic">
                  {row.plan_details
                    ? `${row.plan_details.start_date} → ${row.plan_details.end_date}`
                    : "No validity date"}
                </td>
                <td className="px-4 py-3.5 text-center">
                  {row.plan_details ? (
                    row.plan_details.is_currently_valid ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
                        <CheckCircle2 className="h-3 w-3 text-emerald-600" /> VALID
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-[10px] font-bold text-rose-700">
                        <XCircle className="h-3 w-3 text-rose-600" /> EXPIRED
                      </span>
                    )
                  ) : (
                    <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[10px] font-medium text-gray-500">
                      NONE
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 text-center text-xs text-gray-400 select-none">
                  No company-plan mapping found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
