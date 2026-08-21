import { useTenantPlans } from "../../../dashboard/hooks/useTenantPlans";
import { Building2, Award, CheckCircle2, XCircle } from "lucide-react";

export const TenantPlansTable = () => {
  const { data: rows = [], isLoading, isError, error } = useTenantPlans();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-8 select-none">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#2c6671]"></div>
        <span className="mt-2 text-xs text-gray-500 font-medium">Loading company-plan mapping...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-3 bg-red-50 text-red-700 rounded-2xl text-xs font-semibold border border-red-100">
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
          <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wide">
            Company — Plan Assignment
          </h3>
        </div>
        <span className="rounded-full bg-[#EFFBFD] px-2.5 py-0.5 text-xs font-bold text-[#2c6671] border border-[#2c6671]/20">
          {rows.length} {rows.length === 1 ? "Company" : "Companies"}
        </span>
      </div>

      {/* Table Container Card */}
      <div className="overflow-x-auto rounded-2xl border border-gray-200/80 bg-white shadow-sm">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-[#EFFBFD] border-b border-gray-200 sticky top-0 select-none">
            <tr>
              <th className="px-4 py-3 font-bold text-[#2c6671] uppercase tracking-wide">Company</th>
              <th className="px-4 py-3 font-bold text-[#2c6671] uppercase tracking-wide">Schema</th>
              <th className="px-4 py-3 font-bold text-[#2c6671] uppercase tracking-wide">Assigned Plan</th>
              <th className="px-4 py-3 font-bold text-[#2c6671] uppercase tracking-wide">Validity</th>
              <th className="px-4 py-3 font-bold text-[#2c6671] uppercase tracking-wide text-center">Status</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {rows.map((row) => (
              <tr key={row.customer_id} className="hover:bg-[#EFFBFD]/30 transition-colors">
                <td className="px-4 py-3.5 font-bold text-gray-900 flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-[#2c6671] shrink-0" />
                  <span>{row.company_name}</span>
                </td>
                <td className="px-4 py-3.5 text-gray-600 font-mono text-[11px]">{row.schema_name}</td>
                <td className="px-4 py-3.5">
                  {row.plan_details ? (
                    <span className="font-bold text-gray-800">{row.plan_details.name}</span>
                  ) : (
                    <span className="text-gray-400 italic text-[11px]">No plan assigned</span>
                  )}
                </td>
                <td className="px-4 py-3.5 text-gray-400 italic text-[11px]">
                  {row.plan_details ? `${row.plan_details.start_date} → ${row.plan_details.end_date}` : "No validity date"}
                </td>
                <td className="px-4 py-3.5 text-center">
                  {row.plan_details ? (
                    row.plan_details.is_currently_valid ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="h-3 w-3 text-emerald-600" /> VALID
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-[10px] font-bold text-rose-700 border border-rose-200">
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
                <td colSpan={5} className="text-center py-6 text-xs text-gray-400 select-none">
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