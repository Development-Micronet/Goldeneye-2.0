import React from "react";
import { useAuthStore } from "../../../store/useAuthStore";

export type TabType =
  "company-requests" | "end-users" | "allocated-products" | "provider & Contracts" | "subscription" | "plan";

interface TabConfig {
  value: TabType;
  label: string;
  notAllowedRoles: string[];
}

const TABS_CONFIG: TabConfig[] = [
  {
    value: "company-requests",
    label: "Company Requests",
    notAllowedRoles: ["admin", "user"],
  },
  {
    value: "end-users",
    label: "End Users",
    notAllowedRoles: [],
  },
  {
    value: "provider & Contracts",
    label: "Provider & Contracts",
    notAllowedRoles: ["admin", "user"],
  },
  {
    value: "subscription",
    label: "Subscription",
    notAllowedRoles: ["admin", "user"], // admin and user roles are not allowed to view subscription
  },
  {
    value: "plan",
    label: "Plan",
    notAllowedRoles: [],
  },
];

interface ManageNavbarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export const ManageNavbar: React.FC<ManageNavbarProps> = ({ activeTab, onTabChange }) => {
  const user = useAuthStore((state) => state.user);
  const roleName = user?.roleName.toLowerCase() || "";
  // Filter out tabs that are explicitly restricted for the current user's roleName
  const visibleTabs = TABS_CONFIG.filter((tab) => !tab.notAllowedRoles.includes(roleName));

  return (
    <div className="flex flex-wrap gap-4 border-b border-gray-200 bg-[#D5E9E9] px-4 py-4 select-none sm:gap-12 sm:px-8 sm:py-5">
      {visibleTabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onTabChange(tab.value)}
          className={`cursor-pointer border-none bg-transparent text-xs tracking-wide transition-colors sm:text-[0.8rem] ${activeTab === tab.value
            ? "font-bold text-gray-900"
            : "text-[#4B737A] hover:text-gray-950"
            }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
};
