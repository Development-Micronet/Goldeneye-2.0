import React, { useState, useMemo } from "react";
import {
  ChevronDown,
  ChevronUp,
  Plus,
  Building2,
  Users,
  Search,
  ShieldCheck,
  Mail,
  User,
} from "lucide-react";
import { useTenantSuperusers, useCompanyUsers } from "../hooks/useEndUsers";
import type { Company, CompanyUser } from "../api/enduser";
import { useAuthStore } from "../../../store/useAuthStore";
import { EndUserFormModal } from "./Enduser/EndUserFormModal";
import { useQueryClient } from "@tanstack/react-query";

interface EndUsersTableProps {
  users?: any[];
  onEdit?: (user: CompanyUser) => void;
  onDelete?: (id: number) => void;
}

// 1. Child Component: Accordion Card for Each Company
const CompanyUserAccordion: React.FC<{
  company: Company;
  isAdmin: boolean;
  onAddUser: (companyName: string) => void;
  onEdit?: (user: CompanyUser) => void;
  onDelete?: (id: number) => void;
  searchQuery: string;
}> = ({ company, isAdmin, onAddUser, searchQuery }) => {
  const [open, setOpen] = useState(false);

  // Fetch users for the selected company
  const { data: users = [], isLoading, error } = useCompanyUsers(company.schema_name);

  // Check if company metadata itself matches search query
  const companyMatchesSearch = useMemo(() => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      company.company_name?.toLowerCase().includes(q) ||
      company.email?.toLowerCase().includes(q) ||
      company.schema_name?.toLowerCase().includes(q) ||
      company.username?.toLowerCase().includes(q)
    );
  }, [company, searchQuery]);

  // Sort & filter users inside company by search query
  const sortedUsers = useMemo(() => {
    if (!users) return [];
    let list = [...users].sort((a, b) => {
      if (a.tenant_role === "tenant_admin" && b.tenant_role !== "tenant_admin") return -1;
      if (a.tenant_role !== "tenant_admin" && b.tenant_role === "tenant_admin") return 1;
      return 0;
    });

    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (u) =>
          u.username?.toLowerCase().includes(q) ||
          u.email?.toLowerCase().includes(q) ||
          u.first_name?.toLowerCase().includes(q) ||
          u.last_name?.toLowerCase().includes(q) ||
          `${u.first_name || ""} ${u.last_name || ""}`.toLowerCase().includes(q),
      );
    }

    return list;
  }, [users, searchQuery]);

  const isSearchActive = searchQuery.trim() !== "";
  const hasMatchingUser = sortedUsers.length > 0;

  // Automatically expand accordion if search matches users or company metadata
  React.useEffect(() => {
    if (isSearchActive && (hasMatchingUser || companyMatchesSearch)) {
      setOpen(true);
    }
  }, [isSearchActive, hasMatchingUser, companyMatchesSearch]);

  // Hide company card completely if search is active and neither company nor any user inside matches
  if (isSearchActive && !companyMatchesSearch && !hasMatchingUser && !isLoading) {
    return null;
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm transition-all duration-300 hover:shadow-md">
      {/* Accordion Header */}
      <div
        onClick={() => setOpen(!open)}
        className="flex cursor-pointer flex-col justify-between gap-3 border-b border-gray-200/60 bg-gradient-to-r from-[#EFFBFD] via-[#f7fdfd] to-white px-5 py-4 transition-colors select-none hover:bg-[#e8f7fa] sm:flex-row sm:items-center"
      >
        <div className="flex min-w-0 items-center gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#2c6671] text-white shadow-xs">
            <Building2 className="h-5 w-5" />
          </div>

          <div className="flex min-w-0 flex-col">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="truncate text-base font-bold text-gray-900">
                {company.company_name}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-[#2c6671]/20 bg-[#2c6671]/10 px-2.5 py-0.5 text-[11px] font-semibold text-[#2c6671]">
                schema: {company.schema_name}
              </span>
            </div>
            <div className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-gray-500">
              <Mail className="h-3.5 w-3.5 shrink-0 text-gray-400" />
              <span className="truncate">{company.email}</span>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-gray-100 pt-2 sm:justify-end sm:border-t-0 sm:pt-0">
          {/* User count badge */}
          <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-700 shadow-2xs">
            <Users className="h-3.5 w-3.5 text-[#2c6671]" />
            {isLoading ? "..." : `${users.length} ${users.length === 1 ? "User" : "Users"}`}
          </span>

          {/* Add End User Button */}
          {isAdmin && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAddUser(company.company_name);
              }}
              className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-[#2c6671] px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-[#1f4e57] active:scale-95"
              title="Add End User"
            >
              <Plus size={15} />
              <span>Add User</span>
            </button>
          )}

          {/* Expand/Collapse Chevron Icon */}
          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 transition-transform duration-200">
            {open ? <ChevronUp size={18} className="text-[#2c6671]" /> : <ChevronDown size={18} />}
          </div>
        </div>
      </div>

      {/* Accordion Content Table */}
      {open && (
        <div className="animate-fadeIn bg-white p-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-[#2c6671]"></div>
              <span className="mt-2 text-xs font-medium text-gray-500">Loading users...</span>
            </div>
          ) : error ? (
            <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-center text-xs font-medium text-red-600">
              ⚠️ Failed to load users for this organization.
            </div>
          ) : sortedUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <User className="mb-1 h-8 w-8 text-gray-300" />
              <span className="text-xs font-medium text-gray-400">
                {searchQuery ? "No matching users found." : "No users found for this organization."}
              </span>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-200/80">
              <table className="w-full min-w-[700px] border-collapse text-left text-xs">
                <thead className="border-b border-gray-200 bg-[#EFFBFD]">
                  <tr>
                    <th className="w-14 px-4 py-3 font-bold tracking-wide text-[#2c6671] uppercase">
                      Sr No.
                    </th>
                    <th className="px-4 py-3 font-bold tracking-wide text-[#2c6671] uppercase">
                      Full Name
                    </th>
                    <th className="px-4 py-3 font-bold tracking-wide text-[#2c6671] uppercase">
                      Username
                    </th>
                    <th className="px-4 py-3 font-bold tracking-wide text-[#2c6671] uppercase">
                      Email
                    </th>
                    <th className="px-4 py-3 text-center font-bold tracking-wide text-[#2c6671] uppercase">
                      Role
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100 bg-white">
                  {sortedUsers.map((u, index) => {
                    const isTenantAdmin = u.tenant_role === "tenant_admin";
                    return (
                      <tr
                        key={u.id}
                        className={`transition-colors ${
                          isTenantAdmin
                            ? "bg-amber-50/40 hover:bg-amber-50/80"
                            : "hover:bg-[#EFFBFD]/40"
                        }`}
                      >
                        <td className="px-4 py-3.5 font-medium text-gray-500">{index + 1}</td>
                        <td className="px-4 py-3.5 font-semibold text-gray-900">
                          {`${u.first_name || ""} ${u.last_name || ""}`.trim() || "-"}
                        </td>
                        <td className="px-4 py-3.5 font-medium text-gray-700">{u.username}</td>
                        <td className="px-4 py-3.5 text-gray-600">{u.email}</td>
                        <td className="px-4 py-3.5 text-center">
                          {isTenantAdmin ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-800">
                              <ShieldCheck className="h-3 w-3" /> Admin
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#2c6671]/20 bg-[#EFFBFD] px-2.5 py-0.5 text-[11px] font-bold text-[#2c6671]">
                              <User className="h-3 w-3" /> User
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// 2. Main Parent Component
export const EndUsersTable: React.FC<EndUsersTableProps> = ({ onEdit, onDelete }) => {
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const user = useAuthStore((state) => state.user);
  const roleName = user?.roleName.toLowerCase() || "";
  const isAdmin = roleName === "admin";

  // Fetch all company tenant superusers list
  const { data: companies = [], isLoading, error } = useTenantSuperusers();

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["manage-tenant-superusers"] });
    queryClient.invalidateQueries({ queryKey: ["manage-company-users"] });
  };

  const handleAddUserClick = (companyName: string) => {
    setSelectedCompany(companyName);
    setShowAddModal(true);
  };

  const filteredCompanies = useMemo(() => {
    if (!searchQuery.trim()) return companies;
    const q = searchQuery.toLowerCase();
    return companies.filter((c) => {
      // 1. Direct match on company properties
      const matchCompany =
        c.company_name?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.schema_name?.toLowerCase().includes(q) ||
        c.username?.toLowerCase().includes(q);

      if (matchCompany) return true;

      // 2. Check React Query cached users for this company
      const cachedUsers = queryClient.getQueryData<CompanyUser[]>([
        "manage-company-users",
        c.schema_name,
      ]);

      if (cachedUsers && Array.isArray(cachedUsers)) {
        const matchUser = cachedUsers.some(
          (u) =>
            u.username?.toLowerCase().includes(q) ||
            u.email?.toLowerCase().includes(q) ||
            u.first_name?.toLowerCase().includes(q) ||
            u.last_name?.toLowerCase().includes(q) ||
            `${u.first_name || ""} ${u.last_name || ""}`.toLowerCase().includes(q),
        );
        if (matchUser) return true;
      }

      // Keep mounted so CompanyUserAccordion can fetch & evaluate users if not in cache yet
      return true;
    });
  }, [companies, searchQuery, queryClient]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#2c6671]"></div>
        <span className="mt-3 text-xs font-medium text-gray-500">
          Loading organizations and users...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-center text-xs font-semibold text-red-600">
        ⚠️ Failed to load organizations. Please try again.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search Bar & Stats Header */}
      <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-gray-200/80 bg-white p-4 shadow-xs sm:flex-row">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-gray-900">Manage End Users</span>
          <span className="rounded-full border border-[#2c6671]/20 bg-[#EFFBFD] px-2.5 py-0.5 text-xs font-bold text-[#2c6671]">
            {companies.length} {companies.length === 1 ? "Organization" : "Organizations"}
          </span>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search company or user..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-gray-50/50 py-2 pr-4 pl-9 text-xs text-gray-800 placeholder-gray-400 transition outline-none focus:border-[#2c6671] focus:bg-white focus:ring-1 focus:ring-[#2c6671]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute top-1/2 right-3 -translate-y-1/2 text-xs font-bold text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Company Accordions */}
      <div className="space-y-3">
        {filteredCompanies.map((company) => (
          <CompanyUserAccordion
            key={company.id}
            company={company}
            isAdmin={isAdmin}
            onAddUser={handleAddUserClick}
            onEdit={onEdit}
            onDelete={onDelete}
            searchQuery={searchQuery}
          />
        ))}

        {filteredCompanies.length === 0 && (
          <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center text-xs font-medium text-gray-400">
            No matching organizations or users found.
          </div>
        )}
      </div>

      {/* Add User Modal */}
      <EndUserFormModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        companies={companies}
        defaultOrganization={selectedCompany}
        onSuccess={handleSuccess}
      />
    </div>
  );
};
