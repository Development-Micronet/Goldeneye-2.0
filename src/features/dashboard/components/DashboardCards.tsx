import React from "react";
import { Building2, ShieldCheck, Users, User, Award, CheckCircle2, XCircle } from "lucide-react";
import type { Company, CompanyUser } from "../api/dashboard";
import { useTenantPlans } from "../hooks/useTenantPlans";
import { useAuthStore } from "../../../store/useAuthStore";

interface DashboardCardsProps {
  companies: Company[];
  users: CompanyUser[];
  selectedCompany: Company | null;
}

export const DashboardCards: React.FC<DashboardCardsProps> = ({
  companies,
  users,
  selectedCompany,
}) => {
  const user = useAuthStore((state) => state.user);
  const isSuperAdmin = user?.roleName?.toLowerCase() === "superadmin";

  const { data: tenantPlans = [] } = useTenantPlans();

  const validCount = tenantPlans.filter(
    (t) => t.plan_details && t.plan_details.is_currently_valid,
  ).length;

  const expiredCount = tenantPlans.filter(
    (t) => t.plan_details && !t.plan_details.is_currently_valid,
  ).length;

  return (
    <div
      className={`grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 ${isSuperAdmin ? "xl:grid-cols-5" : "xl:grid-cols-4"} select-none`}
    >
      {/* Card 1: Total Companies */}
      <div className="group relative flex items-center gap-4 rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm transition-all duration-300 hover:border-[#2c6671] hover:shadow-md">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#2c6671]/20 bg-[#EFFBFD] text-[#2c6671] transition-transform duration-300 group-hover:scale-105">
          <Building2 className="h-6 w-6" />
        </div>
        <div className="flex min-w-0 flex-col">
          <span className="text-xs font-semibold tracking-wider text-gray-500 uppercase">
            Total Companies
          </span>
          <span className="text-2xl leading-tight font-bold text-gray-900">{companies.length}</span>
          <span className="truncate text-[11px] font-medium text-[#2c6671]">
            Registered Organizations
          </span>
        </div>
      </div>

      {/* Card 2: Total Users */}
      <div className="group relative flex items-center gap-4 rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm transition-all duration-300 hover:border-[#2c6671] hover:shadow-md">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#2c6671]/20 bg-[#EFFBFD] text-[#2c6671] transition-transform duration-300 group-hover:scale-105">
          <Users className="h-6 w-6" />
        </div>
        <div className="flex min-w-0 flex-col">
          <span className="text-xs font-semibold tracking-wider text-gray-500 uppercase">
            Total Users
          </span>
          <span className="text-2xl leading-tight font-bold text-gray-900">{users.length}</span>
          <span className="truncate text-[11px] font-medium text-[#2c6671]">
            {selectedCompany ? `In ${selectedCompany.company_name}` : "Select a company"}
          </span>
        </div>
      </div>

      {/* Card 3: Selected Company */}
      <div className="group relative flex items-center gap-4 rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm transition-all duration-300 hover:border-[#2c6671] hover:shadow-md">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#2c6671]/20 bg-[#EFFBFD] text-[#2c6671] transition-transform duration-300 group-hover:scale-105">
          <User className="h-6 w-6" />
        </div>
        <div className="flex min-w-0 flex-col">
          <span className="text-xs font-semibold tracking-wider text-gray-500 uppercase">
            Selected Company
          </span>
          <span className="truncate text-base leading-snug font-bold text-gray-900">
            {selectedCompany?.company_name ?? "None Selected"}
          </span>
          <span className="truncate text-[11px] font-medium text-[#2c6671]">
            Schema: {selectedCompany?.schema_name ?? "-"}
          </span>
        </div>
      </div>

      {/* Card 4: Tenant Admin */}
      <div className="group relative flex items-center gap-4 rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm transition-all duration-300 hover:border-[#2c6671] hover:shadow-md">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#2c6671]/20 bg-[#EFFBFD] text-[#2c6671] transition-transform duration-300 group-hover:scale-105">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <div className="flex min-w-0 flex-col">
          <span className="text-xs font-semibold tracking-wider text-gray-500 uppercase">
            Tenant Admin
          </span>
          <span className="truncate text-base leading-snug font-bold text-gray-900">
            {selectedCompany?.username ?? "-"}
          </span>
          <span className="truncate text-[11px] font-medium text-[#2c6671]">
            {selectedCompany?.email ?? "-"}
          </span>
        </div>
      </div>

      {/* Card 5: Plan Health Status (SuperAdmin only) */}
      {isSuperAdmin && (
        <div className="group relative flex items-center gap-4 rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm transition-all duration-300 hover:border-[#2c6671] hover:shadow-md">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#2c6671]/20 bg-[#EFFBFD] text-[#2c6671] transition-transform duration-300 group-hover:scale-105">
            <Award className="h-6 w-6" />
          </div>
          <div className="flex min-w-0 flex-col">
            <span className="text-xs font-semibold tracking-wider text-gray-500 uppercase">
              Plan Validity
            </span>
            <div className="mt-0.5 flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                <CheckCircle2 className="h-3 w-3" /> {validCount} Valid
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-800">
                <XCircle className="h-3 w-3" /> {expiredCount} Exp
              </span>
            </div>
            <span className="mt-1 text-[11px] text-gray-400">Real-time status</span>
          </div>
        </div>
      )}
    </div>
  );
};
