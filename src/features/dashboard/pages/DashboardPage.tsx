import { useState } from "react";
import { ArrowRightIcon, ArrowDownIcon } from "@heroicons/react/24/outline";

import { DashboardCards } from "../components/DashboardCards";
import { CompanyTable } from "../components/CompanyTable";
import { UserTable } from "../components/UserTable";

import { useCompanies } from "../hooks/useCompanies";
import { useCompanyUsers } from "../hooks/useCompanyUsers";

import type { Company } from "../api/dashboard";

export const DashboardPage = () => {
  const [selectedCompany, setSelectedCompany] =
    useState<Company | null>(null);

  const { data: companies = [], isLoading: companiesLoading } =
    useCompanies();

  const { data: users = [], isLoading: usersLoading } =
    useCompanyUsers(selectedCompany?.schema_name ?? "");

  return (
<<<<<<< HEAD
    <div className="flex h-full flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-xl border border-gray-100 bg-white p-8 text-center shadow-lg">
        <h1 className="mb-3 text-2xl font-bold text-gray-800">Golden Eye Dashboard</h1>
        <p className="mb-2 text-sm text-gray-500">
          Successfully Authenticated! Welcome to the secure portal.
        </p>
        {user && (
          <div className="mb-6 text-xs text-gray-400">
            Logged in as: <span className="text-gray-655 font-semibold">{user.user}</span> (
            {user.roleName})
          </div>
        )}
        <button
          onClick={() => performLogout()}
          className="w-full cursor-pointer rounded-lg bg-red-600 py-2.5 text-sm font-semibold text-white shadow transition-all hover:bg-red-700"
        >
          Logout
        </button>
=======
    <div className="h-full overflow-y-auto bg-[#f5f7fb] p-5">
      <DashboardCards
        companies={companies}
        users={users}
        selectedCompany={selectedCompany}
      />

      <div className="relative mt-5 flex flex-col gap-5 xl:flex-row items-center xl:items-start">
        <div className="flex-1  min-w-0 w-full">
          <CompanyTable
            companies={companies}
            isLoading={companiesLoading}
            onSelectCompany={setSelectedCompany}
          />
        </div>

        {selectedCompany && (
          <div className="flex items-center justify-center shrink-0 z-10 my-2 xl:my-0 xl:absolute xl:left-1/2 xl:top-[265px] xl:-translate-x-1/2 xl:-translate-y-1/2 bg-white rounded-full p-2 shadow-md border border-gray-100">
            <ArrowRightIcon className="hidden xl:block h-6 w-6 text-red-500" />
            <ArrowDownIcon className="block xl:hidden h-6 w-6 text-red-500" />
          </div>
        )}

        <div className="flex-1 min-w-0 w-full">
          <UserTable
            users={users}
            isLoading={usersLoading}
            companyName={selectedCompany?.company_name ?? ""}
            schemaName={selectedCompany?.schema_name ?? ""}
          />
        </div>
>>>>>>> 4798ab56ee171861f11e9355ee280e306f7e0395
      </div>
    </div>
  );
};