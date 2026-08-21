import React, { useMemo } from "react";
import type { CompanyUser } from "../api/dashboard";
import { Edit2, Trash2, Users, UserPlus } from "lucide-react";
import { useAuthStore } from "../../../store/useAuthStore";
import Swal from "sweetalert2";

interface UserTableProps {
  users: CompanyUser[];
  companyName: string;
  schemaName: string;
  isLoading: boolean;
  onAddUserClick?: () => void;
  onDeleteUser?: (userId: number) => void;
  onEditUser?: (user: CompanyUser) => void;
}

export function UserTable({
  users,
  companyName,
  isLoading,
  onAddUserClick,
  onDeleteUser,
  onEditUser,
}: UserTableProps) {
  const loggedInUser = useAuthStore((state) => state.user);
  const isAdmin = loggedInUser?.roleName?.toLowerCase() === "admin";

  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => {
      const aAdmin = a.tenant_role === "tenant_admin";
      const bAdmin = b.tenant_role === "tenant_admin";
      if (aAdmin && !bAdmin) return -1;
      if (!aAdmin && bAdmin) return 1;
      return 0;
    });
  }, [users]);

  if (isLoading) {
    return (
      <div className="flex h-[520px] flex-col items-center justify-center rounded-2xl bg-white p-6 shadow-sm border border-gray-200">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#2c6671]"></div>
        <span className="mt-3 text-xs font-medium text-gray-500">Loading Users...</span>
      </div>
    );
  }

  return (
    <div className="flex h-[520px] flex-col rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="h-5 w-5 text-[#2c6671]" />
            Users {companyName ? `of ${companyName}` : ""}
          </h2>
          <p className="text-xs text-[#2c6671] font-medium mt-0.5">
            {companyName
              ? `Displays all users registered under ${companyName}.`
              : "Select a company from the list to view its users."}
          </p>
        </div>
        {companyName && isAdmin && (
          <button
            onClick={onAddUserClick}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#2c6671] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#1f4e57] transition active:scale-95 shadow-xs cursor-pointer"
          >
            <UserPlus className="h-4 w-4" /> Add User
          </button>
        )}
      </div>

      <div className="mt-3 flex-1 overflow-auto rounded-xl border border-gray-200/80">
        <table className="w-full min-w-[700px] border-collapse text-left text-xs">
          <thead className="sticky top-0 bg-[#EFFBFD] border-b border-gray-200 z-10">
            <tr>
              <th className="px-4 py-3 font-bold text-[#2c6671] uppercase tracking-wide">Username</th>
              <th className="px-4 py-3 font-bold text-[#2c6671] uppercase tracking-wide">Email</th>
              <th className="px-4 py-3 font-bold text-[#2c6671] uppercase tracking-wide">First Name</th>
              <th className="px-4 py-3 font-bold text-[#2c6671] uppercase tracking-wide">Last Name</th>
              <th className="px-4 py-3 font-bold text-[#2c6671] uppercase tracking-wide text-center">Role</th>
              {isAdmin && (
                <th className="px-4 py-3 font-bold text-[#2c6671] uppercase tracking-wide text-center">Action</th>
              )}
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100 bg-white">
            {sortedUsers.map((user) => (
              <tr key={user.id} className="hover:bg-[#EFFBFD]/30 transition-colors">
                <td className="px-4 py-3.5 font-semibold text-gray-900">{user.username}</td>
                <td className="px-4 py-3.5 text-gray-600">{user.email}</td>
                <td className="px-4 py-3.5 text-gray-700">{user.first_name || "-"}</td>
                <td className="px-4 py-3.5 text-gray-700">{user.last_name || "-"}</td>
                <td className="px-4 py-3.5 text-center">
                  <span
                    className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold capitalize ${
                      user.tenant_role === "tenant_admin"
                        ? "bg-amber-100 text-amber-800 border border-amber-200"
                        : "bg-[#EFFBFD] text-[#2c6671] border border-[#2c6671]/20"
                    }`}
                  >
                    {user.tenant_role ? user.tenant_role.replace("tenant_", "") : "-"}
                  </span>
                </td>

                {isAdmin && (
                  <td className="px-4 py-3.5 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => onEditUser?.(user)}
                        className="p-1 text-[#2c6671] hover:text-[#1f4e57] transition-colors rounded-md hover:bg-[#EFFBFD] cursor-pointer"
                        title="Edit User"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>

                      {user.tenant_role !== "tenant_admin" && (
                        <button
                          onClick={async () => {
                            const result = await Swal.fire({
                              title: "Are you sure?",
                              text: "This user will be permanently deleted.",
                              icon: "warning",
                              showCancelButton: true,
                              confirmButtonColor: "#ef4444",
                              cancelButtonColor: "#6b7280",
                              confirmButtonText: "Yes, delete it",
                              cancelButtonText: "Cancel",
                              reverseButtons: true,
                            });
                            if (result.isConfirmed) {
                              onDeleteUser?.(user.id);
                            }
                          }}
                          className="p-1 text-gray-400 hover:text-rose-600 transition-colors rounded-md hover:bg-rose-50 cursor-pointer"
                          title="Delete User"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {sortedUsers.length === 0 && (
              <tr>
                <td colSpan={isAdmin ? 6 : 5} className="py-8 text-center text-gray-400">
                  {companyName
                    ? "No users found for this organization."
                    : "Select a company to load users."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center gap-3 pt-3 border-t border-gray-100">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#2c6671] text-xs font-bold text-white shadow-xs">
          2
        </div>
        <div>
          <p className="text-xs font-bold text-gray-800">Company Users</p>
          <p className="text-[11px] text-gray-500">Displays all users belonging to the selected company.</p>
        </div>
      </div>
    </div>
  );
}