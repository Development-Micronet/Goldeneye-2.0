import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ManageNavbar, type TabType } from "../components/ManageNavbar";
import { CompanyRequestsTable } from "../components/CompanyRequestsTable";
import { EndUsersTable } from "../components/EndUsersTable";
import type { Customer } from "../api/customers";
import { useAuthStore } from "../../../store/useAuthStore";
import ProviderTable from "../components/Provider/ProviderMain";
import ProviderFormModal from "../components/Provider/ProviderFormModal";
import SubscriptionFormModal from "../components/Subscription/SubscriptionFormModal";
import SubscriptionList from "../components/Subscription/SubscriptionList";
import { buildManageTabSearch, getTabFromSearch } from "../utils/manageTabs";

export const ManagePage: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const roleName = user?.roleName.toLowerCase() || "";
  const location = useLocation();
  const navigate = useNavigate();
  const [showProviderModalform, setshowProviderModalform] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

  const [activeTab, setActiveTab] = useState<TabType>(() =>
    getTabFromSearch(location.search, roleName),
  );

  useEffect(() => {
    const tabFromUrl = getTabFromSearch(location.search, roleName);
    if (tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [activeTab, location.search, roleName]);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    navigate({ pathname: location.pathname, search: buildManageTabSearch(tab) }, { replace: true });
  };

  // Add Item Action Handlers
  const handleAddItem = () => {
    if (activeTab === "company-requests") {
      alert(
        "To register a new organization request, please use the public Organization Registration flow (/register-company).",
      );
    } else if (activeTab === "provider & Contracts") {
      setshowProviderModalform(true);
    } else if (activeTab === "subscription") {
      setShowSubscriptionModal(true);
    }
  };

  // Edit Action Handlers
  const handleEditRequest = (customer: Customer) => {
    alert(
      `Editing customer profile: ${customer.name}\nUsername: ${customer.userName}\nStatus: ${customer.status}`,
    );
  };

  // Delete Action Handlers
  const handleDeleteRequest = (id: number) => {
    if (confirm(`Are you sure you want to delete customer ID ${id}?`)) {
      alert("Delete action triggered for backend client ID: " + id);
    }
  };

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-gray-50/50 font-sans">
      {/* Top sub-navigation - EXACT same teal background color */}
      <ManageNavbar activeTab={activeTab} onTabChange={handleTabChange} />

      {/* Main card area with padding */}
      <div className="flex w-full flex-1 flex-col overflow-hidden p-4 sm:p-6">
        <div className="flex flex-1 flex-col overflow-hidden rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
          {/* Header of the table card */}
          <div className="mb-6 flex shrink-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-base font-semibold text-gray-800 select-none sm:text-lg">
              {activeTab === "company-requests" && "Manage Company Requests"}
              {activeTab === "end-users" && "Manage End User"}
              {activeTab === "provider & Contracts" && "Manage Providers"}
              {activeTab === "subscription" && "Manage Subscriptions"}
            </h2>

            {activeTab !== "end-users" && (
              <button
                onClick={handleAddItem}
                className="bg-primary cursor-pointer self-start rounded-full px-4 py-1.5 text-[11px] font-medium text-white shadow-sm transition-colors select-none hover:bg-[#1F4E57] active:scale-[0.98] sm:self-center sm:px-5 sm:text-xs"
              >
                {activeTab === "company-requests" && "Add Request"}
                {activeTab === "provider & Contracts" && "Add Provider"}
                {activeTab === "subscription" && "Add Subscription"}
              </button>
            )}
          </div>

          {/* Render Active Table Component */}
          <div className="flex-1 overflow-y-auto pr-1">
            {activeTab === "company-requests" && (
              <CompanyRequestsTable onEdit={handleEditRequest} onDelete={handleDeleteRequest} />
            )}

            {activeTab === "end-users" && <EndUsersTable users={[]} />}

            {activeTab === "allocated-products" && (
              <div className="text-sm text-gray-500">No allocated products data.</div>
            )}
            {activeTab === "provider & Contracts" && <ProviderTable />}
            {activeTab === "subscription" && <SubscriptionList />}
          </div>
        </div>
      </div>
      {showProviderModalform && (
        <ProviderFormModal
          open={showProviderModalform}
          onClose={() => setshowProviderModalform(false)}
        />
      )}
      {activeTab === "subscription" && (
        <SubscriptionFormModal
          open={showSubscriptionModal}
          onClose={() => setShowSubscriptionModal(false)}
        />
      )}
    </div>
  );
};
