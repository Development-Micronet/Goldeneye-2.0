import React, { useState } from "react";
import { ManageNavbar, type TabType } from "../components/ManageNavbar";
import { CompanyRequestsTable } from "../components/CompanyRequestsTable";
import { EndUsersTable, type EndUser } from "../components/EndUsersTable";
import { AllocatedProductsTable, type AllocatedProduct } from "../components/AllocatedProductsTable";
import type { Customer } from "../api/customers";
import { useAuthStore } from "../../../store/useAuthStore";

export const ManagePage: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const roleName = user?.roleName.toLowerCase() || "";

  // Set default active tab dynamically based on user role
  const [activeTab, setActiveTab] = useState<TabType>(
    roleName === "superadmin" ? "company-requests" : "end-users"
  );

  // State hooks for endUsers and allocatedProducts mock datasets
  const [endUsers, setEndUsers] = useState<EndUser[]>([
    { id: 1, username: "sagar", email: "sagarsanamath88@gmail.com", status: "Approved", time: "19 May 2025 05:25" },
    { id: 2, username: "ankush", email: "ankushsg02@gmail.com", status: "Pending", time: "17 Nov 2025 10:46" },
    { id: 3, username: "test", email: "test@gmail.com", status: "Pending", time: "25 Dec 2025 12:00" },
    { id: 4, username: "rit", email: "ritesh.acetech@nagpuranalytics.com", status: "Approved", time: "12 May 2026 06:29" },
    { id: 5, username: "sahil", email: "sahilssharma2201@gmail.com", status: "Approved", time: "05 Jun 2025 05:57" },
    { id: 6, username: "swapnil", email: "swapnilmeshram036@gmail.com", status: "Approved", time: "29 Apr 2026 11:00" },
    { id: 7, username: "Vedant@81", email: "vedant.ace@nagpuranalytics.com", status: "Approved", time: "05 Mar 2026 10:25" },
    { id: 8, username: "tejas", email: "tejasz.cse22@sbjit.edu.in", status: "Approved", time: "30 Apr 2026 06:11" },
    { id: 9, username: "atharva", email: "watharva383@gmail.com", status: "Approved", time: "28 Dec 2025 06:11" },
    { id: 10, username: "ritesh", email: "riteshborikar2133@gmail.com", status: "Approved", time: "08 May 2025 07:40" },
    { id: 11, username: "isha", email: "ishabairam07@gmail.com", status: "Approved", time: "29 Apr 2026 11:44" },
    { id: 12, username: "shekhar", email: "shekhar.deulkar23@gmail.com", status: "Pending", time: "12 May 2026 06:26" },
    { id: 13, username: "nisha", email: "nisha.dhamanage02@gmail.com", status: "Approved", time: "29 Apr 2026 11:27" },
  ]);

  const [allocatedProducts, setAllocatedProducts] = useState<AllocatedProduct[]>([
    { id: 1, productName: "Satellite Imagery BaseMap", user: "sagar", license: "Enterprise", status: "Active", time: "19 May 2025" },
    { id: 2, productName: "GoldenEye AI Analytics API", user: "rit", license: "Developer", status: "Active", time: "12 May 2026" },
    { id: 3, productName: "Quotation Modeler Tool", user: "ankush", license: "Trial", status: "Pending", time: "17 Nov 2025" },
  ]);

  // Add Item Action Handlers
  const handleAddItem = () => {
    if (activeTab === "company-requests") {
      alert("To register a new organization request, please use the public Organization Registration flow (/register-company).");
    } else if (activeTab === "end-users") {
      const username = prompt("Enter Username:");
      const email = prompt("Enter Email ID:");
      if (username && email) {
        setEndUsers((prev) => [
          ...prev,
          {
            id: Date.now(),
            username,
            email,
            status: "Pending",
            time: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) + " " + new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
      }
    } else if (activeTab === "allocated-products") {
      const productName = prompt("Enter Product Name:");
      const user = prompt("Enter User Name:");
      const license = prompt("Enter License Type (e.g. Enterprise, Trial, Developer):");
      if (productName && user && license) {
        setAllocatedProducts((prev) => [
          ...prev,
          {
            id: Date.now(),
            productName,
            user,
            license,
            status: "Pending",
            time: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
          },
        ]);
      }
    }
  };

  // Edit Action Handlers
  const handleEditRequest = (customer: Customer) => {
    alert(`Editing customer profile: ${customer.name}\nUsername: ${customer.userName}\nStatus: ${customer.status}`);
  };

  const handleEditUser = (usr: EndUser) => {
    const newStatus = prompt("Enter status (Approved / Pending):", usr.status);
    if (newStatus === "Approved" || newStatus === "Pending") {
      setEndUsers((prev) =>
        prev.map((u) => (u.id === usr.id ? { ...u, status: newStatus } : u))
      );
    }
  };

  const handleEditProduct = (prod: AllocatedProduct) => {
    const newStatus = prompt("Enter status (Active / Pending / Expired):", prod.status);
    if (newStatus === "Active" || newStatus === "Pending" || newStatus === "Expired") {
      setAllocatedProducts((prev) =>
        prev.map((p) => (p.id === prod.id ? { ...p, status: newStatus } : p))
      );
    }
  };

  // Delete Action Handlers
  const handleDeleteRequest = (id: number) => {
    if (confirm(`Are you sure you want to delete customer ID ${id}?`)) {
      alert("Delete action triggered for backend client ID: " + id);
    }
  };

  const handleDeleteUser = (id: number) => {
    if (confirm("Are you sure you want to delete this user?")) {
      setEndUsers((prev) => prev.filter((u) => u.id !== id));
    }
  };

  const handleDeleteProduct = (id: number) => {
    if (confirm("Are you sure you want to delete this product allocation?")) {
      setAllocatedProducts((prev) => prev.filter((p) => p.id !== id));
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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 flex-shrink-0">
            <h2 className="text-gray-800 text-base sm:text-lg font-semibold select-none">
              {activeTab === "company-requests" && "Manage Company Requests"}
              {activeTab === "end-users" && "Manage End User"}
              {activeTab === "allocated-products" && "Manage Allocated Product"}
            </h2>

            <button
              onClick={handleAddItem}
              className="bg-primary hover:bg-[#1f4e57] text-white px-4 py-1.5 sm:px-5 rounded-full text-[11px] sm:text-xs font-medium transition-colors shadow-sm cursor-pointer select-none active:scale-[0.98] self-start sm:self-center"
            >
              {activeTab === "company-requests" && "Add Request"}
              {activeTab === "end-users" && "Add User"}
              {activeTab === "allocated-products" && "Allocate Product"}
            </button>
          </div>

          {/* Render Active Table Component */}
          {activeTab === "company-requests" && (
            <CompanyRequestsTable
              onEdit={handleEditRequest}
              onDelete={handleDeleteRequest}
            />
          )}

          {activeTab === "end-users" && (
            <EndUsersTable
              users={endUsers}
              onEdit={handleEditUser}
              onDelete={handleDeleteUser}
            />
          )}

          {activeTab === "allocated-products" && (
            <AllocatedProductsTable
              products={allocatedProducts}
              onEdit={handleEditProduct}
              onDelete={handleDeleteProduct}
            />
          )}
        </div>
      </div>
    </div>
  );
};
