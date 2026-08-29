import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { toast } from "react-toastify";
import { registerUser } from "../../api/enduser";
import { useAuthStore } from "../../../../store/useAuthStore";
import { decryptAESGCM } from "../../../../utils/dataDecrypt";
import Swal from "sweetalert2";

interface EndUserFormModalProps {
  open: boolean;
  onClose: () => void;
  companies?: any[];
  defaultOrganization?: string;
  onSuccess?: () => void;
}

export const EndUserFormModal: React.FC<EndUserFormModalProps> = ({
  open,
  onClose,
  companies = [],
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

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
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
      // Send complete payload as requested
      const payload = {
        ...formData,
        email_personal: formData.email_personal || formData.email, // fallback if empty
      };

      // await registerUser(payload);
      // toast.success("User registered successfully!");
      // if (onSuccess) onSuccess();
      // onClose();
      const response = await registerUser(payload);

      let successMessage = "User registered successfully!";
      if (response?.data) {
        try {
          // Extract token and decrypt the success response data
          const token = useAuthStore.getState().accessToken?.replace("Bearer ", "").trim() || "";
          const decrypted = await decryptAESGCM(response.data, token);
          successMessage = decrypted.message || successMessage;
        } catch (decryptErr) {
          console.error("Failed to decrypt success response:", decryptErr);
        }
      }

      // Show the decrypted message in a success alert box
      await Swal.fire({
        title: "Success!",
        text: successMessage,
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      console.error("Register error detail:", err);
      let errorMessage = "Failed to register user. Please try again.";

      if (err.response?.data?.data) {
        try {
          const token = useAuthStore.getState().accessToken?.replace("Bearer ", "").trim() || "";
          const decrypted = await decryptAESGCM(err.response.data.data, token);
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
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Add New End User</h2>
            <p className="text-xs text-gray-500">
              Fill in the details to register a new user in an organization
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
          {/* Organization and Username */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold tracking-wider text-gray-700 uppercase">
                Organization Name *
              </label>
              <select
                name="organization_name"
                value={formData.organization_name}
                onChange={handleChange}
                required
                className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm focus:border-teal-600 focus:ring-1 focus:ring-teal-600 focus:outline-none"
              >
                <option value="">Select Organization</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.company_name}>
                    {company.company_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold tracking-wider text-gray-700 uppercase">
                Username *
              </label>
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

          {/* First Name and Last Name */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold tracking-wider text-gray-700 uppercase">
                First Name *
              </label>
              <input
                type="text"
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                required
                placeholder="John"
                className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm focus:border-teal-600 focus:ring-1 focus:ring-teal-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold tracking-wider text-gray-700 uppercase">
                Last Name *
              </label>
              <input
                type="text"
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                required
                placeholder="Doe"
                className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm focus:border-teal-600 focus:ring-1 focus:ring-teal-600 focus:outline-none"
              />
            </div>
          </div>

          {/* Email and Personal Email */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold tracking-wider text-gray-700 uppercase">
                Official Email *
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="john.doe@company.com"
                className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm focus:border-teal-600 focus:ring-1 focus:ring-teal-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold tracking-wider text-gray-700 uppercase">
                Personal Email
              </label>
              <input
                type="email"
                name="email_personal"
                value={formData.email_personal}
                onChange={handleChange}
                placeholder="john.personal@gmail.com"
                className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm focus:border-teal-600 focus:ring-1 focus:ring-teal-600 focus:outline-none"
              />
            </div>
          </div>

          {/* Designation, Department, and Mobile Number */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-semibold tracking-wider text-gray-700 uppercase">
                Designation *
              </label>
              <input
                type="text"
                name="designation"
                value={formData.designation}
                onChange={handleChange}
                required
                placeholder="Software Engineer"
                className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm focus:border-teal-600 focus:ring-1 focus:ring-teal-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold tracking-wider text-gray-700 uppercase">
                Department *
              </label>
              <input
                type="text"
                name="department"
                value={formData.department}
                onChange={handleChange}
                required
                placeholder="IT"
                className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm focus:border-teal-600 focus:ring-1 focus:ring-teal-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold tracking-wider text-gray-700 uppercase">
                Mobile Number *
              </label>
              <input
                type="text"
                name="mobile_number"
                value={formData.mobile_number}
                onChange={handleChange}
                required
                placeholder="1234567890"
                className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm focus:border-teal-600 focus:ring-1 focus:ring-teal-600 focus:outline-none"
              />
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* Location Info (Country, State, City) */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-semibold tracking-wider text-gray-700 uppercase">
                Country
              </label>
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
              <label className="mb-1 block text-xs font-semibold tracking-wider text-gray-700 uppercase">
                State
              </label>
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
              <label className="mb-1 block text-xs font-semibold tracking-wider text-gray-700 uppercase">
                City
              </label>
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

          {/* Locality and Gender */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold tracking-wider text-gray-700 uppercase">
                Locality
              </label>
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
              <label className="mb-1 block text-xs font-semibold tracking-wider text-gray-700 uppercase">
                Gender
              </label>
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

          {/* Full Address */}
          <div>
            <label className="mb-1 block text-xs font-semibold tracking-wider text-gray-700 uppercase">
              Full Address
            </label>
            <textarea
              name="address"
              value={formData.address}
              onChange={handleChange}
              rows={2}
              placeholder="123 Tech Park Road"
              className="w-full resize-none rounded-lg border border-gray-200 p-3 text-sm focus:border-teal-600 focus:ring-1 focus:ring-teal-600 focus:outline-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="cursor-pointer rounded-lg border border-gray-200 px-5 py-2 text-sm text-gray-600 transition hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-primary cursor-pointer rounded-lg px-6 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1F4E57] disabled:opacity-50"
            >
              {loading ? "Registering..." : "Register User"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
