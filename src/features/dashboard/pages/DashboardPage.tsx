import React from "react";
import { useAuthStore } from "../../../store/useAuthStore";
import { performLogout } from "../../auth/api/logout";

export const DashboardPage: React.FC = () => {
  const { user } = useAuthStore();

  return (
    <div className="flex flex-col items-center justify-center h-full p-6">
      <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-100 text-center max-w-sm w-full">
        <h1 className="text-2xl font-bold text-gray-800 mb-3">
          Golden Eye Dashboard
        </h1>
        <p className="text-sm text-gray-500 mb-2">
          Successfully Authenticated! Welcome to the secure portal.
        </p>
        {user && (
          <div className="text-xs text-gray-400 mb-6">
            Logged in as: <span className="font-semibold text-gray-655">{user.user}</span> ({user.roleName})
          </div>
        )}
        <button
          onClick={() => performLogout()}
          className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 rounded-lg text-sm shadow transition-all cursor-pointer"
        >
          Logout
        </button>
      </div>
    </div>
  );
};
