import { useState, useEffect } from "react";
import { ArrowRightIcon, ArrowDownIcon } from "@heroicons/react/24/outline";

import { DashboardCards } from "../components/DashboardCards";
import { PlanStatusChart } from "../components/PlanStatusChart";
import { CompanyTable } from "../components/CompanyTable";
import { UserTable } from "../components/UserTable";
import { AddUserModal } from "../components/AddUserModal";

import { useCompanies } from "../hooks/useCompanies";
import { useCompanyUsers } from "../hooks/useCompanyUsers";

import type { Company, CompanyUser } from "../api/dashboard";

import { EditUserModal } from "../components/EditUserModal";

import { toast } from "react-toastify";
import { deleteUser } from "../api/dashboard";
import { useAuthStore } from "../../../store/useAuthStore";
import { decryptAESGCM } from "../../../utils/dataDecrypt";

export const DashboardPage = () => {
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

  const { data: companies = [], isLoading: companiesLoading } = useCompanies();

  // Auto-select the first company by default when companies list is available
  useEffect(() => {
    if (companies.length > 0 && !selectedCompany) {
      setSelectedCompany(companies[0]);
    }
  }, [companies, selectedCompany]);

  const {
    data: users = [],
    isLoading: usersLoading,
    refetch: refetchUsers,
  } = useCompanyUsers(selectedCompany?.schema_name ?? "");

  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [selectedUserToEdit, setSelectedUserToEdit] = useState<CompanyUser | null>(null);

  const handleDeleteUser = async (userId: number) => {
    try {
      await deleteUser(userId);
      toast.success("User deleted successfully!");
      refetchUsers(); // Refresh the list of users
    } catch (err: any) {
      console.error("Delete user error:", err);
      let errorMessage = "Failed to delete user. Please try again.";

      // Decrypt error response if backend returns encrypted error messages
      if (err.response?.data?.data) {
        try {
          const token = useAuthStore.getState().accessToken?.replace("Bearer ", "").trim() || "";
          const decrypted = await decryptAESGCM(err.response.data.data, token);
          errorMessage =
            decrypted.message || decrypted.results?.message || JSON.stringify(decrypted);
        } catch (decryptErr) {
          console.error("Failed to decrypt error response:", decryptErr);
        }
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      }

      toast.error(errorMessage);
    }
  };

  return (
    <div className="h-full space-y-6 overflow-y-auto bg-[#f8fafc] p-4 font-sans sm:p-6">
      {/* 1. Top KPI Summary Stat Cards */}
      <DashboardCards companies={companies} users={users} selectedCompany={selectedCompany} />

      {/* 2. Subscription Plan Validity Analytics Graph */}
      <PlanStatusChart />

      {/* 3. Company List & User Management Tables */}
      <div className="relative flex flex-col items-center gap-5 xl:flex-row xl:items-start">
        <div className="w-full min-w-0 flex-1">
          <CompanyTable
            companies={companies}
            isLoading={companiesLoading}
            onSelectCompany={setSelectedCompany}
            selectedCompanyId={selectedCompany?.id ?? selectedCompany?.company_id}
          />
        </div>

        {selectedCompany && (
          <div className="z-10 my-2 flex shrink-0 items-center justify-center rounded-full border border-[#2c6671]/20 bg-white p-2 shadow-md xl:absolute xl:top-[260px] xl:left-1/2 xl:my-0 xl:-translate-x-1/2 xl:-translate-y-1/2">
            <ArrowRightIcon className="hidden h-5 w-5 text-[#2c6671] xl:block" />
            <ArrowDownIcon className="block h-5 w-5 text-[#2c6671] xl:hidden" />
          </div>
        )}

        <div className="w-full min-w-0 flex-1">
          <UserTable
            users={users}
            isLoading={usersLoading}
            companyName={selectedCompany?.company_name ?? ""}
            schemaName={selectedCompany?.schema_name ?? ""}
            onAddUserClick={() => setShowAddUserModal(true)}
            onDeleteUser={handleDeleteUser}
            onEditUser={(user) => {
              setSelectedUserToEdit(user);
              setShowEditUserModal(true);
            }}
          />
        </div>
      </div>

      {/* Modals */}
      <AddUserModal
        open={showAddUserModal}
        onClose={() => setShowAddUserModal(false)}
        defaultOrganization={selectedCompany?.company_name ?? ""}
        onSuccess={() => {
          refetchUsers();
        }}
      />

      <EditUserModal
        open={showEditUserModal}
        onClose={() => setShowEditUserModal(false)}
        user={selectedUserToEdit}
        onSuccess={() => {
          refetchUsers();
        }}
      />
    </div>
  );
};
