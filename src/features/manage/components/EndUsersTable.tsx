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

export const EndUsersTable: React.FC<EndUsersTableProps> = ({ users, onEdit, onDelete }) => {
  return (
    <div className="min-h-0 flex-1 overflow-x-auto overflow-y-auto">
      <table className="min-w-full border-collapse border border-gray-200">
        <thead>
          <tr className="bg-white select-none">
            <th className="w-16 border border-gray-200 px-3 py-2.5 text-left text-[10px] font-bold text-gray-700 sm:px-4 sm:text-xs">
              Sr. No.
            </th>
            <th className="border border-gray-200 px-3 py-2.5 text-left text-[10px] font-bold text-gray-700 sm:px-4 sm:text-xs">
              Username
            </th>
            <th className="border border-gray-200 px-3 py-2.5 text-left text-[10px] font-bold text-gray-700 sm:px-4 sm:text-xs">
              Email ID
            </th>
            <th className="border border-gray-200 px-3 py-2.5 text-left text-[10px] font-bold text-gray-700 sm:px-4 sm:text-xs">
              Status
            </th>
            <th className="border border-gray-200 px-3 py-2.5 text-left text-[10px] font-bold text-gray-700 sm:px-4 sm:text-xs">
              Time
            </th>
            <th className="w-24 border border-gray-200 px-3 py-2.5 text-left text-[10px] font-bold text-gray-700 sm:px-4 sm:text-xs">
              Action
            </th>
          </tr>
        </thead>
        <tbody className="bg-white">
          {users.map((u, index) => (
            <tr key={u.id}>
              <td className="border border-gray-200 px-3 py-3 text-center text-xs font-medium text-gray-800 sm:px-4 sm:text-sm">
                {index + 1}
              </td>
              <td className="border border-gray-200 px-3 py-3 text-xs text-gray-800 sm:px-4 sm:text-sm">
                {u.username}
              </td>
              <td className="border border-gray-200 px-3 py-3 text-xs text-gray-800 sm:px-4 sm:text-sm">
                {u.email}
              </td>
              <td className="border border-gray-200 px-3 py-3 text-xs text-gray-800 sm:px-4 sm:text-sm">
                <div className="flex items-center select-none">
                  <span
                    className={`mr-2 inline-block h-2.5 w-2.5 rounded-full ${
                      u.status === "Approved" ? "bg-[#10B981]" : "bg-[#F59E0B]"
                    }`}
                  />
                  <span>{u.status}</span>
                </div>
              </td>
              <td className="border border-gray-200 px-3 py-3 text-xs text-gray-800 sm:px-4 sm:text-sm">
                {u.time}
              </td>
              <td className="border border-gray-200 px-3 py-3 text-xs text-gray-800 sm:px-4 sm:text-sm">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => onEdit?.(u)}
                    className="text-gray-650 hover:text-primary cursor-pointer rounded p-1 transition-colors hover:bg-gray-100"
                    title="Edit User"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => onDelete?.(u.id)}
                    className="text-gray-650 cursor-pointer rounded p-1 transition-colors hover:bg-gray-100 hover:text-red-500"
                    title="Delete User"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {users.length === 0 && (
            <tr>
              <td colSpan={6} className="py-8 text-center text-sm text-gray-400">
                No users found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};
