import { Building2, ShieldCheck, Users, User } from "lucide-react";
import type { Company, CompanyUser } from "../api/dashboard";

interface DashboardCardsProps {
  companies: Company[];
  users: CompanyUser[];
  selectedCompany: Company | null;
}

export const DashboardCards = ({
  companies,
  users,
  selectedCompany,
}: DashboardCardsProps) => {
  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4 ">
      {/* Card 1 */}
      <div className="flex items-center gap-5 rounded-xl border-t-4 border-[#0f6a73] bg-white p-6 shadow-md h-30">
        <div className="flex h-[70px] w-[70px] items-center justify-center rounded-full bg-[#f3f6fb]">
          <Users className="h-8 w-8 text-[#0f6a73]" />
        </div>

        <div className="flex flex-col gap-2">
          <p className="m-0 text-base text-gray-600">Total Companies</p>
          <h2 className="m-0 text-2xl font-semibold text-gray-900">{companies.length}</h2>
          <span className="text-sm text-gray-500">
            From Companies API
          </span>
        </div>
      </div>

      {/* Card 2 */}
      <div className="flex items-center gap-5 rounded-xl border-t-4 border-[#0f6a73] bg-white p-6 shadow-md h-30">
        <div className="flex h-[70px] w-[70px] items-center justify-center rounded-full bg-[#f3f6fb]">
          <User className="h-8 w-8 text-[#0f6a73]" />
        </div>

        <div className="flex flex-col gap-2">
          <p className="m-0 text-base text-gray-600">Total Users</p>
          <h2 className="m-0 text-2xl font-semibold text-gray-900"> {users.length}</h2>
          <span className="text-sm text-gray-500">
            From Selected Company API
          </span>
        </div>
      </div>

      {/* Card 3 */}
      <div className="flex items-center gap-5 rounded-xl border-t-4 border-[#0f6a73] bg-white p-6 shadow-md h-30">
        <div className="flex h-[70px] w-[70px] items-center justify-center rounded-full bg-[#f3f6fb]">
          <Building2 className="h-8 w-8 text-[#0f6a73]" />
        </div>

        <div className="flex flex-col gap-2">
          <p className="m-0 text-base text-gray-600">Selected Company</p>
          <h2 className="m-0 text-xl font-semibold text-gray-900">
            {selectedCompany?.company_name ?? "No Company Selected"}
          </h2>

          <span className="text-sm text-gray-500">
            schema : {selectedCompany?.schema_name ?? "-"}
          </span>
        </div>
      </div>

      {/* Card 4 */}
      <div className="flex items-center gap-5 rounded-xl border-t-4 border-[#0f6a73] bg-white p-6 shadow-md h-30">
        <div className="flex h-[70px] w-[70px] items-center justify-center rounded-full bg-[#f3f6fb]">
          <ShieldCheck className="h-8 w-8 text-[#0f6a73]" />
        </div>

        <div className="flex flex-col gap-2">
          <p className="m-0 text-base text-gray-600">Tenant Admin</p>
          <h2 className="m-0 text-xl font-semibold text-gray-900">
            {selectedCompany?.username ?? "-"}
          </h2>

          <span className="text-sm text-gray-500">
            {selectedCompany?.email ?? "-"}
          </span>
        </div>
      </div>
    </div>
  );
};