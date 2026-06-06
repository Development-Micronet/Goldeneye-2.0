import React from "react";
import { Edit2, Trash2 } from "lucide-react";

export interface EndUser {
  id: number;
  username: string;
  email: string;
  status: "Approved" | "Pending";
  time: string;
}

interface EndUsersTableProps {
  users: EndUser[];
  onEdit?: (user: EndUser) => void;
  onDelete?: (id: number) => void;
}

export const EndUsersTable: React.FC<EndUsersTableProps> = ({
  users,
  onEdit,
  onDelete,
}) => {
  return (
    <div className="flex-1 overflow-y-auto overflow-x-auto min-h-0">
      <table className="min-w-full border-collapse border border-gray-200">
        <thead>
          <tr className="bg-white select-none">
            <th className="border border-gray-200 px-3 py-2.5 sm:px-4 text-left text-[10px] sm:text-xs font-bold text-gray-700 w-16">
              Sr. No.
            </th>
            <th className="border border-gray-200 px-3 py-2.5 sm:px-4 text-left text-[10px] sm:text-xs font-bold text-gray-700">
              Username
            </th>
            <th className="border border-gray-200 px-3 py-2.5 sm:px-4 text-left text-[10px] sm:text-xs font-bold text-gray-700">
              Email ID
            </th>
            <th className="border border-gray-200 px-3 py-2.5 sm:px-4 text-left text-[10px] sm:text-xs font-bold text-gray-700">
              Status
            </th>
            <th className="border border-gray-200 px-3 py-2.5 sm:px-4 text-left text-[10px] sm:text-xs font-bold text-gray-700">
              Time
            </th>
            <th className="border border-gray-200 px-3 py-2.5 sm:px-4 text-left text-[10px] sm:text-xs font-bold text-gray-700 w-24">
              Action
            </th>
          </tr>
        </thead>
        <tbody className="bg-white">
          {users.map((u, index) => (
            <tr key={u.id}>
              <td className="border border-gray-200 px-3 py-3 sm:px-4 text-xs sm:text-sm text-gray-800 text-center font-medium">
                {index + 1}
              </td>
              <td className="border border-gray-200 px-3 py-3 sm:px-4 text-xs sm:text-sm text-gray-800">
                {u.username}
              </td>
              <td className="border border-gray-200 px-3 py-3 sm:px-4 text-xs sm:text-sm text-gray-800">
                {u.email}
              </td>
              <td className="border border-gray-200 px-3 py-3 sm:px-4 text-xs sm:text-sm text-gray-800">
                <div className="flex items-center select-none">
                  <span
                    className={`inline-block w-2.5 h-2.5 rounded-full mr-2 ${
                      u.status === "Approved" ? "bg-[#10B981]" : "bg-[#F59E0B]"
                    }`}
                  />
                  <span>{u.status}</span>
                </div>
              </td>
              <td className="border border-gray-200 px-3 py-3 sm:px-4 text-xs sm:text-sm text-gray-800">
                {u.time}
              </td>
              <td className="border border-gray-200 px-3 py-3 sm:px-4 text-xs sm:text-sm text-gray-800">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => onEdit?.(u)}
                    className="p-1 hover:bg-gray-100 rounded text-gray-650 hover:text-primary transition-colors cursor-pointer"
                    title="Edit User"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDelete?.(u.id)}
                    className="p-1 hover:bg-gray-100 rounded text-gray-650 hover:text-red-500 transition-colors cursor-pointer"
                    title="Delete User"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {users.length === 0 && (
            <tr>
              <td colSpan={6} className="text-center py-8 text-sm text-gray-400">
                No users found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};
