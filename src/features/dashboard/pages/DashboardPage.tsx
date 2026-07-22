import { useState } from "react";
import { ArrowRightIcon, ArrowDownIcon } from "@heroicons/react/24/outline";

import { DashboardCards } from "../components/DashboardCards";
import { CompanyTable } from "../components/CompanyTable";
import { UserTable } from "../components/UserTable";

import { useCompanies } from "../hooks/useCompanies";
import { useCompanyUsers } from "../hooks/useCompanyUsers";

import type { Company } from "../api/dashboard";

export const DashboardPage = () => {
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

  const { data: companies = [], isLoading: companiesLoading } = useCompanies();

  const { data: users = [], isLoading: usersLoading } = useCompanyUsers(
    selectedCompany?.schema_name ?? "",
  );

  return (
    <div className="h-full overflow-y-auto bg-[#f5f7fb] p-5">
      <DashboardCards companies={companies} users={users} selectedCompany={selectedCompany} />

      <div className="relative mt-5 flex flex-col items-center gap-5 xl:flex-row xl:items-start">
        <div className="w-full min-w-0 flex-1">
          <CompanyTable
            companies={companies}
            isLoading={companiesLoading}
            onSelectCompany={setSelectedCompany}
          />
        </div>

        {selectedCompany && (
          <div className="z-10 my-2 flex shrink-0 items-center justify-center rounded-full border border-gray-100 bg-white p-2 shadow-md xl:absolute xl:top-[265px] xl:left-1/2 xl:my-0 xl:-translate-x-1/2 xl:-translate-y-1/2">
            <ArrowRightIcon className="hidden h-6 w-6 text-red-500 xl:block" />
            <ArrowDownIcon className="block h-6 w-6 text-red-500 xl:hidden" />
          </div>
        )}

        <div className="w-full min-w-0 flex-1">
          <UserTable
            users={users}
            isLoading={usersLoading}
            companyName={selectedCompany?.company_name ?? ""}
            schemaName={selectedCompany?.schema_name ?? ""}
          />
        </div>
      </div>
    </div>
  );
};
