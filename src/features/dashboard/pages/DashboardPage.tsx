import React from "react";
import { useAuthStore } from "../../../store/useAuthStore";
import { performLogout } from "../../auth/api/logout";

export const DashboardPage: React.FC = () => {
  const { user } = useAuthStore();

  return (
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
      </div>
    </div>
  );
};
