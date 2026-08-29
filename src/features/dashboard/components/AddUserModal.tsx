import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { toast } from "react-toastify";
import { registerUser } from "../api/dashboard";
import { useAuthStore } from "../../../store/useAuthStore";
import { decryptAESGCM } from "../../../utils/dataDecrypt";

interface AddUserModalProps {
  open: boolean;
  onClose: () => void;
  defaultOrganization?: string;
  onSuccess?: () => void;
}

export const AddUserModal: React.FC<AddUserModalProps> = ({
  open,
  onClose,
  defaultOrganization = "",
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    first_name: "",
    last_name: "",
    designation: "",
    department: "",
    mobile_number: "",
    organization_name: defaultOrganization,
    email_personal: "",
    country: "",
    state: "",
    city: "",
    locality: "",
    address: "",
    gender: "",
  });

  //----------------------------------------------------------//
  //Jab bhi company change hogi or Modal open hoga, organization name pre-fill ho jayega
  //----------------------------------------------------------//
  useEffect(() => {
    if (open) {
      setFormData({
        username: "",
        email: "",
        first_name: "",
        last_name: "",
        designation: "",
        department: "",
        mobile_number: "",
        organization_name: defaultOrganization,
        email_personal: "",
        country: "",
        state: "",
        city: "",
        locality: "",
        address: "",
        gender: "",
      });
    }
  }, [open, defaultOrganization]);

  //----------------------------------------------------------//
  //Handle Form Input Changes
  //----------------------------------------------------------//
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  //----------------------------------------------------------//
  //Form Submit Handling Logic
  //----------------------------------------------------------//
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic Validation (email_personal ko frontend check se hata diya hai)
    if (
      !formData.username ||
      !formData.email ||
      !formData.first_name ||
      !formData.last_name ||
      !formData.organization_name ||
      !formData.designation ||
      !formData.department ||
      !formData.mobile_number
    ) {
      toast.error("Please fill all required fields (*)");
      return;
    }

    setLoading(true);
    try {
      // Hum payload me email_personal ko automatic 'email' ki value de rahe hain
      const payload = {
        ...formData,
        email_personal: formData.email,
      };

      await registerUser(payload);
      toast.success("User registered successfully!");
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      console.error("Register error detail:", err);
      let errorMessage = "Failed to register user. Please try again.";

      // Agar backend se encrypted error response mila hai toh decode karein
      if (err.response?.data?.data) {
        try {
          const token = useAuthStore.getState().accessToken?.replace("Bearer ", "").trim() || "";
          const decrypted = await decryptAESGCM(err.response.data.data, token);

          // Decrypted response se error message extract karein
          errorMessage =
            decrypted.message || decrypted.results?.message || JSON.stringify(decrypted);
        } catch (decryptErr) {
          console.error("Failed to decrypt error response:", decryptErr);
        }
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      }

      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="border-gray-150 relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Add New User</h2>
            <p className="text-xs text-gray-500">
              Fill details to register a user to {formData.organization_name || "company"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body / Scrollable Form */}
        <form onSubmit={handleSubmit} className="flex-1 space-y-4 overflow-y-auto p-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">
                Organization Name *
              </label>
              <input
                type="text"
                name="organization_name"
                value={formData.organization_name}
                onChange={handleChange}
                required
                className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm focus:border-teal-600 focus:ring-1 focus:ring-teal-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Username *</label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                required
                placeholder="e.g. john_d"
                className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm focus:border-teal-600 focus:ring-1 focus:ring-teal-600 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">First Name *</label>
              <input
                type="text"
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                required
                className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm focus:border-teal-600 focus:ring-1 focus:ring-teal-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Last Name *</label>
              <input
                type="text"
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                required
                className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm focus:border-teal-600 focus:ring-1 focus:ring-teal-600 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Email *</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="john.doe@example.com"
              className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm focus:border-teal-600 focus:ring-1 focus:ring-teal-600 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Designation *</label>
              <input
                type="text"
                name="designation"
                value={formData.designation}
                onChange={handleChange}
                placeholder="Software Engineer"
                className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm focus:border-teal-600 focus:ring-1 focus:ring-teal-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Department *</label>
              <input
                type="text"
                name="department"
                value={formData.department}
                onChange={handleChange}
                placeholder="IT"
                className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm focus:border-teal-600 focus:ring-1 focus:ring-teal-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">
                Mobile Number *
              </label>
              <input
                type="text"
                name="mobile_number"
                value={formData.mobile_number}
                onChange={handleChange}
                className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm focus:border-teal-600 focus:ring-1 focus:ring-teal-600 focus:outline-none"
              />
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* Location details */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Country</label>
              <input
                type="text"
                name="country"
                value={formData.country}
                onChange={handleChange}
                placeholder="India"
                className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm focus:border-teal-600 focus:ring-1 focus:ring-teal-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">State</label>
              <input
                type="text"
                name="state"
                value={formData.state}
                onChange={handleChange}
                placeholder="Gujrat"
                className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm focus:border-teal-600 focus:ring-1 focus:ring-teal-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">City</label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                placeholder="Mumbai"
                className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm focus:border-teal-600 focus:ring-1 focus:ring-teal-600 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Locality</label>
              <input
                type="text"
                name="locality"
                value={formData.locality}
                onChange={handleChange}
                placeholder="Andheri"
                className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm focus:border-teal-600 focus:ring-1 focus:ring-teal-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Gender</label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm focus:border-teal-600 focus:ring-1 focus:ring-teal-600 focus:outline-none"
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">Full Address</label>
            <textarea
              name="address"
              value={formData.address}
              onChange={handleChange}
              rows={2}
              className="w-full resize-none rounded-lg border border-gray-200 p-3 text-sm focus:border-teal-600 focus:ring-1 focus:ring-teal-600 focus:outline-none"
            />
          </div>

          {/* Modal Footer Actions */}
          <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-lg border border-gray-200 px-5 py-2 text-sm text-gray-600 transition hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-teal-700 px-6 py-2 text-sm font-medium text-white transition hover:bg-teal-800 disabled:opacity-50"
            >
              {loading ? "Registering..." : "Register User"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
