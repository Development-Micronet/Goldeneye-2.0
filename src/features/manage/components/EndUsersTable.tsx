import React, { useState } from "react";
import { Edit2, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { useTenantSuperusers, useCompanyUsers } from "../hooks/useEndUsers";
import type { Company, CompanyUser } from "../api/enduser"; // <--- 'type' keyword add kiya hai


interface EndUsersTableProps {
  users?: any[]; // optional prop (kept for backward compatibility)
  onEdit?: (user: CompanyUser) => void;
  onDelete?: (id: number) => void;
}

// 1. Child Component: Har Company ke liye Accordion aur Users Table
const CompanyUserAccordion: React.FC<{
  company: Company;
  onEdit?: (user: CompanyUser) => void;
  onDelete?: (id: number) => void;
}> = ({ company, onEdit, onDelete }) => {
  const [open, setOpen] = useState(false);

  // selected company ka users data fetch karenge
  const { data: users, isLoading, error } = useCompanyUsers(company.schema_name);

  const sortedUsers = React.useMemo(() => {
    if (!users) return [];
    return [...users].sort((a, b) => {
      if (a.tenant_role === "tenant_admin" && b.tenant_role !== "tenant_admin") return -1;
      if (a.tenant_role !== "tenant_admin" && b.tenant_role === "tenant_admin") return 1;
      return 0;
    });
  }, [users]);


  return (
    <div className="border border-[#D9E2E8] rounded-md overflow-hidden bg-white shadow-sm mb-4">
      {/* Accordion Header */}
      <div
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between px-5 h-16 bg-[#EFFBFD] border-b border-[#D9E2E8] cursor-pointer hover:bg-[#e7f7fa] transition-colors select-none"
      >
        <div className="flex items-center gap-4">
          {open ? (
            <ChevronUp size={18} className="text-[#4B5563]" />
          ) : (
            <ChevronDown size={18} className="text-[#4B5563]" />
          )}

          <span className="font-semibold text-[18px] text-[#1F2937]">
            {company.company_name}
          </span>

          <span className="text-[17px] font-medium text-[#475569]">
            ({company.email})
          </span>
        </div>
      </div>

      {/* Accordion Content (Table) */}
      {open && (
        <div className="overflow-x-auto bg-white p-4">
          {isLoading ? (
            <div className="text-center py-6 text-gray-500 text-sm">
              Loading users...
            </div>
          ) : error ? (
            <div className="text-center py-6 text-red-500 text-sm">
              Failed to load users for this organization.
            </div>
          ) : !users || users.length === 0 ? (
            <div className="text-center py-6 text-gray-400 text-sm font-medium">
              No users found for this organization.
            </div>
          ) : (
            <table className="w-full border border-[#D9E2E8] border-collapse">
              <thead>
                <tr className="bg-white h-12">
                  <th className="border border-[#D9E2E8] px-4 py-3 text-left text-[14px] font-semibold text-[#374151]">
                    Sr No.
                  </th>
                  <th className="border border-[#D9E2E8] px-4 py-3 text-left text-[14px] font-semibold text-[#374151]">
                    Full Name
                  </th>
                  <th className="border border-[#D9E2E8] px-4 py-3 text-left text-[14px] font-semibold text-[#374151]">
                    Username
                  </th>
                  <th className="border border-[#D9E2E8] px-4 py-3 text-left text-[14px] font-semibold text-[#374151]">
                    Email
                  </th>
                  <th className="border border-[#D9E2E8] px-4 py-3 text-left text-[14px] font-semibold text-[#374151]">
                    Role
                  </th>
                  {/* <th className="border border-[#D9E2E8] px-4 py-3 text-left text-[14px] font-semibold text-[#374151]">
                    Action
                  </th> */}
                </tr>
              </thead>

              <tbody>
                {sortedUsers.map((u, index) => (
                  <tr
                    key={u.id}
                    className={`${u.tenant_role === "tenant_admin" ? "bg-[#FFF7C2]/50 hover:bg-[#FFF7C2]" : "bg-white hover:bg-gray-50/80"
                      } transition-colors`}
                  >

                    <td className="border border-[#D9E2E8] px-4 py-4 text-[15px] text-[#334155]">
                      {index + 1}
                    </td>

                    <td className="border border-[#D9E2E8] px-4 py-4 text-[15px] text-[#334155] font-medium">
                      {`${u.first_name || ""} ${u.last_name || ""}`.trim() || "-"}
                    </td>

                    <td className="border border-[#D9E2E8] px-4 py-4 text-[15px] text-[#334155]">
                      {u.username}
                    </td>

                    <td className="border border-[#D9E2E8] px-4 py-4 text-[15px] text-[#334155]">
                      {u.email}
                    </td>

                    <td className="border border-[#D9E2E8] px-4 py-4 text-[15px] text-[#334155]">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 capitalize">
                        {u.tenant_role ? u.tenant_role.replace("tenant_", "") : "-"}
                      </span>
                    </td>

                    {/* <td className="border border-[#D9E2E8] px-4 py-4 text-[15px] text-[#334155]">
                      <div className="flex gap-3">
                        <button
                          className="text-[#2F6E7C] hover:text-blue-700 transition-colors"
                          onClick={() => handleEdit(u)}
                        >
                          <Edit2 size={17} />
                        </button>

                        <button
                          className="text-[#2F6E7C] hover:text-red-500 transition-colors"
                          onClick={() => handleDelete(u.id)}
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>
                    </td> */}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
};

// 2. Main Parent Component
export const EndUsersTable: React.FC<EndUsersTableProps> = ({
  onEdit,
  onDelete,
}) => {
  // Sabhi Companies/Tenant-Superusers ki decrypted list fetch karenge
  const { data: companies, isLoading, error } = useTenantSuperusers();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <span className="text-gray-500 text-sm animate-pulse">Loading organizations...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 text-red-500 text-sm">
        Failed to load organizations. Please try again.
      </div>
    );
  }

  if (!companies || companies.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 text-sm font-medium">
        No organizations found.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {companies.map((company) => (
        <CompanyUserAccordion
          key={company.id}
          company={company}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
};
