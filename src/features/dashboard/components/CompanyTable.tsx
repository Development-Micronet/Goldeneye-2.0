import React from "react";
import type { Company } from "../api/dashboard";
import { useUser } from "../../auth/AuthProvider/AuthContext";
import { useDeleteCustomerMutation } from "../hooks/useDeleteCustomerMutation";
import { useTenantPlans } from "../hooks/useTenantPlans";
import { Trash2, CheckCircle2, XCircle, Building2 } from "lucide-react";
import Swal from "sweetalert2";

interface CompanyTableProps {
  companies: Company[];
  isLoading: boolean;
  onSelectCompany: (company: Company) => void;
  selectedCompanyId?: number | string | null;
}

export function CompanyTable({
  companies,
  isLoading,
  onSelectCompany,
  selectedCompanyId,
}: CompanyTableProps) {
  const { role } = useUser();
  const isSuperAdmin = role?.toLowerCase() === "superadmin";
  const { mutate: deleteCompany } = useDeleteCustomerMutation();
  const { data: tenantPlans = [] } = useTenantPlans();

  // Create quick lookup map for schema/company to plan validity
  const planMap = React.useMemo(() => {
    const map: Record<string, { isValid: boolean; name: string }> = {};
    tenantPlans.forEach((tp) => {
      if (tp.schema_name && tp.plan_details) {
        map[tp.schema_name] = {
          isValid: tp.plan_details.is_currently_valid,
          name: tp.plan_details.name,
        };
      }
    });
    return map;
  }, [tenantPlans]);

  const handleDelete = async (companyId: number) => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "This company will be permanently deleted.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, delete it",
      cancelButtonText: "Cancel",
      reverseButtons: true,
    });

    if (!result.isConfirmed) return;

    deleteCompany(companyId, {
      onSuccess: () => {
        Swal.fire({
          title: "Deleted!",
          text: "Company has been deleted successfully.",
          icon: "success",
          timer: 1500,
          showConfirmButton: false,
        });
      },
      onError: () => {
        Swal.fire({
          title: "Error",
          text: "Failed to delete company.",
          icon: "error",
        });
      },
    });
  };

  if (isLoading) {
    return (
      <div className="flex h-[520px] flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#2c6671]"></div>
        <span className="mt-3 text-xs font-medium text-gray-500">Loading Companies...</span>
      </div>
    );
  }

  return (
    <div className="flex h-[520px] flex-col rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold text-gray-900">
            <Building2 className="h-5 w-5 text-[#2c6671]" />
            Company List
          </h2>
          <p className="mt-0.5 text-xs font-medium text-[#2c6671]">
            Select a company to view its users and subscription details.
          </p>
        </div>
        <span className="rounded-full border border-[#2c6671]/20 bg-[#EFFBFD] px-3 py-1 text-xs font-bold text-[#2c6671]">
          {companies.length} Total
        </span>
      </div>

      <div className="mt-3 flex-1 overflow-auto rounded-xl border border-gray-200/80">
        <table className="w-full min-w-[650px] border-collapse text-left text-xs">
          <thead className="sticky top-0 z-10 border-b border-gray-200 bg-[#EFFBFD]">
            <tr>
              <th className="px-4 py-3 font-bold tracking-wide text-[#2c6671] uppercase">
                Company Name
              </th>
              <th className="px-4 py-3 font-bold tracking-wide text-[#2c6671] uppercase">
                Username
              </th>
              <th className="px-4 py-3 font-bold tracking-wide text-[#2c6671] uppercase">Email</th>
              <th className="px-4 py-3 font-bold tracking-wide text-[#2c6671] uppercase">Schema</th>
              {isSuperAdmin && (
                <th className="px-4 py-3 text-center font-bold tracking-wide text-[#2c6671] uppercase">
                  Plan Status
                </th>
              )}
              {isSuperAdmin && (
                <th className="px-4 py-3 text-center font-bold tracking-wide text-[#2c6671] uppercase">
                  Action
                </th>
              )}
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100 bg-white">
            {companies.map((company) => {
              const planInfo = planMap[company.schema_name];
              const isSelected =
                selectedCompanyId === company.id ||
                (selectedCompanyId !== undefined && selectedCompanyId === company.company_id) ||
                (selectedCompanyId !== undefined && selectedCompanyId === company.customer_id);

              return (
                <tr
                  key={company.id}
                  onClick={() => onSelectCompany(company)}
                  className={`cursor-pointer transition-colors ${
                    isSelected ? "bg-[#EFFBFD] font-medium text-[#1f4e57]" : "hover:bg-[#EFFBFD]/40"
                  }`}
                >
                  <td className="px-4 py-3.5 font-semibold text-gray-900">
                    {company.company_name}
                  </td>
                  <td className="px-4 py-3.5 text-gray-700">{company.username}</td>
                  <td className="px-4 py-3.5 text-gray-600">{company.email}</td>
                  <td className="px-4 py-3.5 font-mono text-[11px] text-gray-500">
                    {company.schema_name}
                  </td>
                  {isSuperAdmin && (
                    <td className="px-4 py-3.5 text-center">
                      {planInfo ? (
                        planInfo.isValid ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                            <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Valid
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700">
                            <XCircle className="h-3 w-3 text-rose-600" /> Expired
                          </span>
                        )
                      ) : (
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">
                          None
                        </span>
                      )}
                    </td>
                  )}
                  {isSuperAdmin && (
                    <td className="px-4 py-3.5 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(company.company_id ?? company.customer_id ?? company.id);
                        }}
                        className="cursor-pointer rounded-md p-1 text-gray-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                        title="Delete Company"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
            {companies.length === 0 && (
              <tr>
                <td colSpan={isSuperAdmin ? 6 : 4} className="py-8 text-center text-gray-400">
                  No companies found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center gap-3 border-t border-gray-100 pt-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#2c6671] text-xs font-bold text-white shadow-xs">
          1
        </div>
        <div>
          <p className="text-xs font-bold text-gray-800">Available Companies</p>
          <p className="text-[11px] text-gray-500">
            Select a company to view its users and plan details.
          </p>
        </div>
      </div>
    </div>
  );
}
