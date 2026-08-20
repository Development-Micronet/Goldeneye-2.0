import { useTenantPlans } from "../../../dashboard/hooks/useTenantPlans";

export const TenantPlansTable = () => {
  const { data: rows = [], isLoading, isError, error } = useTenantPlans();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-8 select-none">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        <span className="mt-2 text-xs text-gray-500 font-medium">Loading company-plan mapping...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-3 bg-red-50 text-red-700 rounded-lg text-xs font-semibold border border-red-100">
        ⚠️ Failed to load tenant plans: {(error as any)?.message || "Unknown error"}
      </div>
    );
  }

  return (
    <div className="mt-6">
      <h3 className="mb-2 text-xs font-bold text-gray-700 uppercase tracking-wide">
        Company → Plan Assignment
      </h3>
      <div className="overflow-x-auto border border-gray-200 rounded-md">
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="bg-gray-50/70 border-b border-gray-200">
              <th className="border border-gray-200 px-4 py-2.5 text-left text-[11px] font-bold text-gray-700">Company</th>
              <th className="border border-gray-200 px-4 py-2.5 text-left text-[11px] font-bold text-gray-700">Schema</th>
              <th className="border border-gray-200 px-4 py-2.5 text-left text-[11px] font-bold text-gray-700">Assigned Plan</th>
              <th className="border border-gray-200 px-4 py-2.5 text-left text-[11px] font-bold text-gray-700">Validity</th>
              <th className="border border-gray-200 px-4 py-2.5 text-left text-[11px] font-bold text-gray-700">Status</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-150">
            {rows.map((row) => (
              <tr key={row.customer_id} className="hover:bg-gray-50/50">
                <td className="border border-gray-200 px-4 py-2.5 text-xs font-semibold text-gray-900">{row.company_name}</td>
                <td className="border border-gray-200 px-4 py-2.5 text-xs text-gray-600">{row.schema_name}</td>
                <td className="border border-gray-200 px-4 py-2.5 text-xs">
                  {row.plan_details ? (
                    <span className="font-semibold text-gray-800">{row.plan_details.name}</span>
                  ) : (
                    <span className="text-gray-400 italic">No plan assigned</span>
                  )}
                </td>
                <td className="border border-gray-200 px-4 py-2.5 text-xs text-gray-600">
                  {row.plan_details ? `${row.plan_details.start_date} → ${row.plan_details.end_date}` : "—"}
                </td>
                <td className="border border-gray-200 px-4 py-2.5 text-xs">
                  {row.plan_details ? (
                    row.plan_details.is_currently_valid ? (
                      <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-blue-50 text-blue-700 border border-blue-200">VALID</span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200">EXPIRED</span>
                    )
                  ) : "—"}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-6 text-sm text-gray-400 select-none">
                  No companies found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};