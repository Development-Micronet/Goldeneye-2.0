import type { CompanyUser } from "../api/dashboard";
import { Edit2, Trash2 } from "lucide-react";
import { useAuthStore } from "../../../store/useAuthStore";

interface UserTableProps {
  users: CompanyUser[];
  companyName: string;
  schemaName: string;
  isLoading: boolean;
  onAddUserClick?: () => void;
  onDeleteUser?: (userId: number) => void; // <-- Add this line
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
  const isAdmin = loggedInUser?.roleName?.toLowerCase() === "admin"; // Check if role is 'admin' or 'Admin'

  if (isLoading) {
    return <div>Loading Users...</div>;
  }

  return (
    <div className="flex h-[530px] flex-col rounded-xl bg-white p-5 shadow-md">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-2xl font-bold">
          Users of {companyName}
        </h2>
        {companyName && isAdmin && ( // <-- Added 'isAdmin' check here
          <button
            onClick={onAddUserClick}
            className="rounded-lg bg-teal-700 px-4 py-1 text-sm font-medium text-white hover:bg-teal-800 transition active:scale-95 cursor-pointer"
          >
            Add User
          </button>
        )}

      </div>

      <p className="mb-5 text-green-600">
        Displays all users belonging to the selected company.
      </p>

      <div className="flex-1 overflow-auto">
        <table className="w-full min-w-[800px] border-collapse">
          <thead className="sticky top-0 bg-yellow-100">
            <tr className="bg-yellow-100">
              <th className="border border-gray-200 px-4 py-3 text-left font-semibold">
                ID
              </th>
              <th className="border border-gray-200 px-4 py-3 text-left font-semibold">
                Username
              </th>
              <th className="border border-gray-200 px-4 py-3 text-left font-semibold">
                Email
              </th>
              <th className="border border-gray-200 px-4 py-3 text-left font-semibold">
                First Name
              </th>
              <th className="border border-gray-200 px-4 py-3 text-left font-semibold">
                Last Name
              </th>
              <th className="border border-gray-200 px-4 py-3 text-left font-semibold">
                Role
              </th>
              {isAdmin && ( // <-- Wrap Action header here
                <th className="border border-gray-200 px-4 py-3 text-left font-semibold">
                  Action
                </th>
              )}

            </tr>
          </thead>

          <tbody>
            {users.map((user) => (
              <tr
                key={user.id}
                className="border border-gray-200 transition hover:bg-blue-50"
              >
                <td className="border border-gray-200 px-4 py-3">{user.id}</td>

                <td className="border border-gray-200 px-4 py-3">
                  {user.username}
                </td>

                <td className="border border-gray-200 px-4 py-3">
                  {user.email}
                </td>

                <td className="border border-gray-200 px-4 py-3">
                  {user.first_name}
                </td>

                <td className="border border-gray-200 px-4 py-3">
                  {user.last_name}
                </td>

                <td className="border border-gray-200 px-4 py-3">
                  <span
                    className={`rounded-md px-3 py-1 text-xs font-medium ${user.tenant_role === "tenant_admin"
                      ? "bg-green-100 text-green-700"
                      : "bg-blue-100 text-blue-700"
                      }`}
                  >
                    {user.tenant_role}
                  </span>
                </td>

                {isAdmin && ( // <-- Wrap action cells here
                  <td className="border border-gray-200 px-4 py-3">
                    <div className="flex gap-3">
                      <button
                        onClick={() => onEditUser?.(user)} // <-- Add this onClick handler
                        className="text-[#2F6E7C] hover:text-red-500 transition-colors cursor-pointer"
                      >
                        <Edit2 size={17} />
                      </button>


                      <button
                        onClick={() => {
                          if (window.confirm("Are you sure you want to delete this user?")) {
                            onDeleteUser?.(user.id);
                          }
                        }}
                        className="text-[#2F6E7C] hover:text-red-500 transition-colors cursor-pointer"
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                  </td>
                )}

              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-8 flex items-center">
        <div className="mr-4 flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 font-bold text-white">
          2
        </div>

        <div>
          <p className="text-gray-700 font-medium">
            Company Users
          </p>

          <p className="text-gray-500 text-sm">
            Displays all users belonging to the selected company.
          </p>
        </div>
      </div>
    </div>
  );
}