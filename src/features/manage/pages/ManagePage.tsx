import React, { useState } from "react";
import { ManageNavbar, type TabType } from "../components/ManageNavbar";
import { CompanyRequestsTable } from "../components/CompanyRequestsTable";
import { EndUsersTable } from "../components/EndUsersTable";
import type { Customer } from "../api/customers";
import { useAuthStore } from "../../../store/useAuthStore";
import ProviderTable from "../components/Provider/ProviderTable";
import ProviderFormModal from "../components/Provider/ProviderFormModal";
import SubscriptionFormModal from "../components/Subscription/SubscriptionFormModal";
import SubscriptionList from "../components/Subscription/SubscriptionList";

export const ManagePage: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const roleName = user?.roleName.toLowerCase() || "";
  const [showProviderModalform, setshowProviderModalform] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

  // Set default active tab dynamically based on user role
  const [activeTab, setActiveTab] = useState<TabType>(
    roleName === "superadmin" ? "company-requests" : "end-users",
  );

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
    <div className="w-full h-full flex flex-col bg-gray-50/50 font-sans overflow-hidden">
      {/* Top sub-navigation - EXACT same teal background color */}
      <ManageNavbar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main card area with padding */}
      <div className="flex-1 p-4 sm:p-6 w-full overflow-hidden flex flex-col">
        <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 shadow-sm flex-1 flex flex-col overflow-hidden">
          {/* Header of the table card */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 shrink-0">
            <h2 className="text-gray-800 text-base sm:text-lg font-semibold select-none">
              {activeTab === "company-requests" && "Manage Company Requests"}
              {activeTab === "end-users" && "Manage End User"}
              {/* {activeTab === "allocated-products" && "Manage Allocated Product"} */}
              {activeTab === "provider & Contracts" && "Manage Providers"}
              {activeTab === "subscription" && "Manage Subscriptions"}
            </h2>

            <button
              onClick={handleAddItem}
              className="bg-primary hover:bg-[#1f4e57] text-white px-4 py-1.5 sm:px-5 rounded-full text-[11px] sm:text-xs font-medium transition-colors shadow-sm cursor-pointer select-none active:scale-[0.98] self-start sm:self-center"
            >
              {activeTab === "company-requests" && "Add Request"}
              {activeTab === "end-users" && "Add User"}
              {/* {activeTab === "allocated-products" && "Allocate Product"} */}
              {activeTab === "provider & Contracts" && "Add Provider"}
              {activeTab === "subscription" && "Add Subscription"}
            </button>
          </div>

          {/* Render Active Table Component */}
          {activeTab === "company-requests" && (
            <CompanyRequestsTable
              onEdit={handleEditRequest}
              onDelete={handleDeleteRequest}
            />
          )}

          {activeTab === "end-users" && <EndUsersTable users={[]} />}

          {activeTab === "allocated-products" && (
            <div className="text-sm text-gray-500">
              No allocated products data.
            </div>
          )}
          {activeTab === "provider & Contracts" && <ProviderTable />}
          {activeTab === "subscription" && <SubscriptionList />}
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
