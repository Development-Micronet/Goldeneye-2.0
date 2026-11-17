import React, { useState, useEffect, useRef } from "react";
import { X, ShieldCheck, Check, ArrowRight, ArrowLeft } from "lucide-react";
import { toast } from "react-toastify";
import {
  registerUser,
  updateCompanyUser,
  getCompanyUserDetail,
  type Company,
  type CompanyUser,
} from "../api/dashboard";
import { useAuthStore } from "../../../store/useAuthStore";
import { decryptAESGCM } from "../../../utils/dataDecrypt";
import { useTenantCompanyServices } from "../hooks/useTenantCompanyServices";
import Swal from "sweetalert2";

interface AddUserModalProps {
  open: boolean;
  onClose: () => void;
  defaultOrganization?: string;
  selectedCompany?: Company | null;
  userToEdit?: CompanyUser | null;
  mode?: "create" | "edit";
  onSuccess?: () => void;
}

export const AddUserModal: React.FC<AddUserModalProps> = ({
  open,
  onClose,
  defaultOrganization = "",
  selectedCompany = null,
  userToEdit = null,
  mode = "create",
  onSuccess,
}) => {
  const isEditMode = mode === "edit" || !!userToEdit;
  const [currentStep, setCurrentStep] = useState<number>(1);
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

  const { availableServices, assignedPlanName, isLoading: loadingServices } =
    useTenantCompanyServices(
      formData.organization_name || defaultOrganization,
      selectedCompany?.schema_name,
    );

  const [selectedServices, setSelectedServices] = useState<string[]>(["search"]);

  // Track initialization so user input is preserved when changing steps or re-rendering
  const lastInitializedIdRef = useRef<number | string | null>(null);

  useEffect(() => {
    if (!open) {
      lastInitializedIdRef.current = null;
      return;
    }

    const currentTargetId = isEditMode && userToEdit ? userToEdit.id : "new";
    if (lastInitializedIdRef.current === currentTargetId) {
      return; // Already initialized for this user session; hold user input
    }
    lastInitializedIdRef.current = currentTargetId;

    if (isEditMode && userToEdit?.tenant_role === "tenant_admin") {
      toast.warn("Tenant Admin cannot be edited via End User API");
      onClose();
      return;
    }

    setCurrentStep(1);

    if (isEditMode && userToEdit) {
      const u = userToEdit as any;
      setFormData({
        username: u.username || u.user || "",
        email: u.email || "",
        first_name: u.first_name || u.firstName || "",
        last_name: u.last_name || u.lastName || "",
        designation: u.designation || u.role || "",
        department: u.department || "",
        mobile_number:
          u.mobile_number || u.mobile_no || u.mobileNo || u.phone_number || u.phone || "",
        organization_name:
          defaultOrganization ||
          u.organization_name ||
          u.company_name ||
          u.schema_name ||
          "",
        email_personal:
          u.email_personal ||
          u.personal_email ||
          u.emailIdPersonal ||
          u.email ||
          "",
        country: u.country || "",
        state: u.state || "",
        city: u.city || "",
        locality: u.locality || "",
        address: u.address || "",
        gender: u.gender || "",
      });

      if (Array.isArray(u.services) && u.services.length > 0) {
        setSelectedServices(u.services);
      } else if (availableServices.includes("search")) {
        setSelectedServices(["search"]);
      }

      // Fetch full user details from GET /api/tenants/users/${userId}/ if available
      let isMounted = true;
      getCompanyUserDetail(userToEdit.id)
        .then(async (raw) => {
          if (!isMounted) return;
          let detail = raw;
          if (raw?.data) {
            try {
              const token =
                useAuthStore.getState().accessToken?.replace("Bearer ", "").trim() || "";
              detail = await decryptAESGCM(raw.data, token);
            } catch {}
          }
          const fetchedUser =
            detail?.results?.results?.[0] || detail?.results || detail?.data || detail;
          if (fetchedUser && typeof fetchedUser === "object") {
            setFormData((prev) => ({
              ...prev,
              username: fetchedUser.username || fetchedUser.user || prev.username,
              email: fetchedUser.email || prev.email,
              first_name: fetchedUser.first_name || fetchedUser.firstName || prev.first_name,
              last_name: fetchedUser.last_name || fetchedUser.lastName || prev.last_name,
              designation: fetchedUser.designation || fetchedUser.role || prev.designation,
              department: fetchedUser.department || prev.department,
              mobile_number:
                fetchedUser.mobile_number ||
                fetchedUser.mobile_no ||
                fetchedUser.mobileNo ||
                fetchedUser.phone_number ||
                fetchedUser.phone ||
                prev.mobile_number,
              organization_name:
                fetchedUser.organization_name ||
                fetchedUser.company_name ||
                prev.organization_name,
              email_personal:
                fetchedUser.email_personal ||
                fetchedUser.personal_email ||
                fetchedUser.emailIdPersonal ||
                prev.email_personal,
              country: fetchedUser.country || prev.country,
              state: fetchedUser.state || prev.state,
              city: fetchedUser.city || prev.city,
              locality: fetchedUser.locality || prev.locality,
              address: fetchedUser.address || prev.address,
              gender: fetchedUser.gender || prev.gender,
            }));
            if (Array.isArray(fetchedUser.services) && fetchedUser.services.length > 0) {
              setSelectedServices(fetchedUser.services);
            }
          }
        })
        .catch(() => {
          // Fallback data already populated
        });

      return () => {
        isMounted = false;
      };
    } else {
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

      if (availableServices.includes("search")) {
        setSelectedServices(["search"]);
      } else if (availableServices.length > 0) {
        setSelectedServices([availableServices[0]]);
      } else {
        setSelectedServices(["search"]);
      }
    }
  }, [open, userToEdit?.id, isEditMode, defaultOrganization]);

  // Default services for new user creation if services list loads asynchronously
  useEffect(() => {
    if (!isEditMode && open && selectedServices.length === 0 && availableServices.length > 0) {
      setSelectedServices(
        availableServices.includes("search") ? ["search"] : [availableServices[0]],
      );
    }
  }, [availableServices, isEditMode, open]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleToggleService = (service: string) => {
    setSelectedServices((prev) =>
      prev.includes(service) ? prev.filter((s) => s !== service) : [...prev, service],
    );
  };

  const handleSelectAllServices = () => {
    setSelectedServices([...availableServices]);
  };

  const handleResetServices = () => {
    setSelectedServices(
      availableServices.includes("search")
        ? ["search"]
        : availableServices.slice(0, 1),
    );
  };

  // Step-wise Validation
  const validateStep1 = (): boolean => {
    if (!formData.organization_name?.trim()) {
      toast.error("Please provide an organization name");
      return false;
    }
    if (!formData.username?.trim()) {
      toast.error("Username is required");
      return false;
    }
    if (!formData.email?.trim()) {
      toast.error("Official Email is required");
      return false;
    }
    if (!formData.first_name?.trim() || !formData.last_name?.trim()) {
      toast.error("First Name and Last Name are required");
      return false;
    }
    return true;
  };

  const validateStep2 = (): boolean => {
    if (!formData.designation?.trim()) {
      toast.error("Designation is required");
      return false;
    }
    if (!formData.department?.trim()) {
      toast.error("Department is required");
      return false;
    }
    if (!formData.mobile_number?.trim()) {
      toast.error("Mobile Number is required");
      return false;
    }
    return true;
  };

  const handleNext = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (currentStep === 1) {
      if (validateStep1()) setCurrentStep(2);
    } else if (currentStep === 2) {
      if (validateStep2()) setCurrentStep(3);
    }
  };

  const handlePrev = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Guard: Prevent premature submission before Step 3
    if (currentStep < 3) {
      handleNext();
      return;
    }

    if (!validateStep1() || !validateStep2()) {
      return;
    }

    if (selectedServices.length === 0) {
      toast.error("Please select at least one service (*)");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        username: formData.username,
        email: formData.email,
        first_name: formData.first_name,
        last_name: formData.last_name,
        organization_name: formData.organization_name,
        designation: formData.designation,
        department: formData.department,
        mobile_number: formData.mobile_number,
        email_personal: formData.email_personal || formData.email,
        country: formData.country,
        state: formData.state,
        city: formData.city,
        locality: formData.locality,
        address: formData.address,
        gender: formData.gender,
        services: selectedServices.length > 0 ? selectedServices : ["search"],
      };

      let response: any;
      if (isEditMode && userToEdit) {
        response = await updateCompanyUser(userToEdit.id, payload);
      } else {
        response = await registerUser(payload);
      }

      let successMessage = isEditMode
        ? "User updated successfully!"
        : "User registered successfully!";

      if (response?.data) {
        try {
          const token = useAuthStore.getState().accessToken?.replace("Bearer ", "").trim() || "";
          const decrypted = await decryptAESGCM(response.data, token);
          if (decrypted?.message) {
            successMessage = decrypted.message;
          }
        } catch {
          // fallback to default success message
        }
      }

      await Swal.fire({
        icon: "success",
        title: isEditMode ? "User Updated" : "User Created",
        text: successMessage,
        timer: 2000,
        showConfirmButton: false,
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      console.error("Register/Update error detail:", err);
      let errorMessage = isEditMode
        ? "Failed to update user. Please try again."
        : "Failed to register user. Please try again.";

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

      Swal.fire({
        icon: "error",
        title: isEditMode ? "Update Failed" : "Registration Failed",
        text: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-gray-100 bg-gradient-to-r from-[#EFFBFD] via-[#f7fdfd] to-white px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              {isEditMode ? "Edit End User" : "Add New User"}
            </h2>
            <p className="text-xs text-gray-500">
              {isEditMode
                ? `Modify account and services for ${formData.username || "user"}`
                : `Fill details to register a user to ${formData.organization_name || "company"}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="cursor-pointer rounded-lg p-1.5 text-gray-400 transition hover:bg-white hover:text-gray-700"
          >
            <X size={18} />
          </button>
        </div>

        {/* Wizard Step Progress Tracker */}
        <div className="border-b border-gray-100 bg-gray-50/70 px-6 py-3">
          <div className="flex items-center justify-between">
            {/* Step 1 */}
            <div
              onClick={() => setCurrentStep(1)}
              className="flex cursor-pointer items-center gap-2"
            >
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all ${
                  currentStep === 1
                    ? "bg-[#2c6671] text-white shadow-xs"
                    : currentStep > 1
                      ? "bg-[#2c6671]/20 font-bold text-[#2c6671]"
                      : "bg-gray-200 text-gray-500"
                }`}
              >
                {currentStep > 1 ? <Check size={14} /> : "1"}
              </div>
              <div className="hidden sm:block">
                <span
                  className={`text-xs font-bold ${
                    currentStep === 1 ? "text-[#2c6671]" : "text-gray-600"
                  }`}
                >
                  Account Info
                </span>
              </div>
            </div>

            <div
              className={`mx-2 h-0.5 flex-1 transition-all ${
                currentStep >= 2 ? "bg-[#2c6671]" : "bg-gray-200"
              }`}
            />

            {/* Step 2 */}
            <div
              onClick={() => {
                if (validateStep1()) setCurrentStep(2);
              }}
              className="flex cursor-pointer items-center gap-2"
            >
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all ${
                  currentStep === 2
                    ? "bg-[#2c6671] text-white shadow-xs"
                    : currentStep > 2
                      ? "bg-[#2c6671]/20 font-bold text-[#2c6671]"
                      : "bg-gray-200 text-gray-500"
                }`}
              >
                {currentStep > 2 ? <Check size={14} /> : "2"}
              </div>
              <div className="hidden sm:block">
                <span
                  className={`text-xs font-bold ${
                    currentStep === 2 ? "text-[#2c6671]" : "text-gray-600"
                  }`}
                >
                  Profile & Contact
                </span>
              </div>
            </div>

            <div
              className={`mx-2 h-0.5 flex-1 transition-all ${
                currentStep >= 3 ? "bg-[#2c6671]" : "bg-gray-200"
              }`}
            />

            {/* Step 3 */}
            <div
              onClick={() => {
                if (validateStep1() && validateStep2()) setCurrentStep(3);
              }}
              className="flex cursor-pointer items-center gap-2"
            >
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all ${
                  currentStep === 3
                    ? "bg-[#2c6671] text-white shadow-xs"
                    : "bg-gray-200 text-gray-500"
                }`}
              >
                3
              </div>
              <div className="hidden sm:block">
                <span
                  className={`text-xs font-bold ${
                    currentStep === 3 ? "text-[#2c6671]" : "text-gray-600"
                  }`}
                >
                  Services & Access
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Form Content */}
        <form
          onSubmit={handleSubmit}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.target as HTMLElement).tagName !== "TEXTAREA") {
              if (currentStep < 3) {
                e.preventDefault();
                handleNext();
              }
            }
          }}
          className="flex flex-1 flex-col overflow-hidden"
        >
          <div className="flex-1 overflow-y-auto p-6">
            {/* STEP 1: Account Information */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div className="rounded-xl border border-[#2c6671]/20 bg-[#EFFBFD]/40 p-3 text-xs text-[#2c6671]">
                  <span className="font-bold">Step 1 of 3:</span> Specify the user's primary
                  account credentials and organization assignment.
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-700">
                      Organization Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="organization_name"
                      value={formData.organization_name}
                      onChange={handleChange}
                      readOnly={isEditMode}
                      className={`h-10 w-full rounded-xl border border-gray-200 px-3 text-xs transition outline-none focus:border-[#2c6671] focus:ring-1 focus:ring-[#2c6671] ${
                        isEditMode ? "cursor-not-allowed bg-gray-100 text-gray-500" : "bg-white"
                      }`}
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-700">
                      Username <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="username"
                      value={formData.username}
                      onChange={handleChange}
                      placeholder="e.g. john_d"
                      readOnly={isEditMode}
                      className={`h-10 w-full rounded-xl border border-gray-200 px-3 text-xs transition outline-none focus:border-[#2c6671] focus:ring-1 focus:ring-[#2c6671] ${
                        isEditMode ? "cursor-not-allowed bg-gray-100 text-gray-500" : "bg-white"
                      }`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-700">
                      First Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="first_name"
                      value={formData.first_name}
                      onChange={handleChange}
                      placeholder="John"
                      className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-xs transition outline-none focus:border-[#2c6671] focus:ring-1 focus:ring-[#2c6671]"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-700">
                      Last Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="last_name"
                      value={formData.last_name}
                      onChange={handleChange}
                      placeholder="Doe"
                      className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-xs transition outline-none focus:border-[#2c6671] focus:ring-1 focus:ring-[#2c6671]"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700">
                    Official Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="john.doe@company.com"
                    className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-xs transition outline-none focus:border-[#2c6671] focus:ring-1 focus:ring-[#2c6671]"
                  />
                  <p className="mt-1 text-[11px] text-gray-400">
                    Credentials and activation notices will be sent to this email address.
                  </p>
                </div>
              </div>
            )}

            {/* STEP 2: Profile & Contact Information */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <div className="rounded-xl border border-[#2c6671]/20 bg-[#EFFBFD]/40 p-3 text-xs text-[#2c6671]">
                  <span className="font-bold">Step 2 of 3:</span> Provide user job profile, contact
                  numbers, and address details.
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-700">
                      Designation <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="designation"
                      value={formData.designation}
                      onChange={handleChange}
                      placeholder="GIS Analyst"
                      className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-xs transition outline-none focus:border-[#2c6671] focus:ring-1 focus:ring-[#2c6671]"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-700">
                      Department <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="department"
                      value={formData.department}
                      onChange={handleChange}
                      placeholder="Operations"
                      className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-xs transition outline-none focus:border-[#2c6671] focus:ring-1 focus:ring-[#2c6671]"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-700">
                      Mobile Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="mobile_number"
                      value={formData.mobile_number}
                      onChange={handleChange}
                      placeholder="+91 9876543210"
                      className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-xs transition outline-none focus:border-[#2c6671] focus:ring-1 focus:ring-[#2c6671]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-700">
                      Personal Email
                    </label>
                    <input
                      type="email"
                      name="email_personal"
                      value={formData.email_personal}
                      onChange={handleChange}
                      placeholder="personal@example.com"
                      className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-xs transition outline-none focus:border-[#2c6671] focus:ring-1 focus:ring-[#2c6671]"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-700">Gender</label>
                    <select
                      name="gender"
                      value={formData.gender}
                      onChange={handleChange}
                      className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-xs transition outline-none focus:border-[#2c6671] focus:ring-1 focus:ring-[#2c6671]"
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-700">Country</label>
                    <input
                      type="text"
                      name="country"
                      value={formData.country}
                      onChange={handleChange}
                      placeholder="India"
                      className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-xs transition outline-none focus:border-[#2c6671] focus:ring-1 focus:ring-[#2c6671]"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-700">State</label>
                    <input
                      type="text"
                      name="state"
                      value={formData.state}
                      onChange={handleChange}
                      placeholder="Gujarat"
                      className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-xs transition outline-none focus:border-[#2c6671] focus:ring-1 focus:ring-[#2c6671]"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-700">City</label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      placeholder="Ahmedabad"
                      className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-xs transition outline-none focus:border-[#2c6671] focus:ring-1 focus:ring-[#2c6671]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-700">Locality</label>
                    <input
                      type="text"
                      name="locality"
                      value={formData.locality}
                      onChange={handleChange}
                      placeholder="Vastrapur"
                      className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-xs transition outline-none focus:border-[#2c6671] focus:ring-1 focus:ring-[#2c6671]"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-700">Address</label>
                    <input
                      type="text"
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      placeholder="Street, Building, Flat"
                      className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-xs transition outline-none focus:border-[#2c6671] focus:ring-1 focus:ring-[#2c6671]"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: Services & Access */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <div className="rounded-xl border border-[#2c6671]/20 bg-[#EFFBFD]/40 p-3 text-xs text-[#2c6671]">
                  <span className="font-bold">Step 3 of 3:</span> Select which modules and services
                  are active for this user account. The right-side tabs and modules will strictly
                  reflect these assigned services.
                </div>

                <div className="space-y-3 rounded-2xl border border-gray-200/80 bg-white p-4">
                  <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                    <div>
                      <label className="flex items-center gap-1.5 text-xs font-bold text-gray-900">
                        <ShieldCheck className="h-4 w-4 text-[#2c6671]" />
                        Assigned Services <span className="text-red-500">*</span>
                      </label>
                      <p className="text-[11px] text-gray-500">
                        {assignedPlanName
                          ? `Services retrieved from ${formData.organization_name || "company"} plan ("${assignedPlanName}")`
                          : "Services dynamically loaded for this organization."}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      <button
                        type="button"
                        onClick={handleSelectAllServices}
                        className="cursor-pointer font-bold text-[#2c6671] transition hover:underline"
                      >
                        Select All
                      </button>
                      <span className="text-gray-300">|</span>
                      <button
                        type="button"
                        onClick={handleResetServices}
                        className="cursor-pointer font-medium text-gray-500 transition hover:underline"
                      >
                        Default (Search)
                      </button>
                    </div>
                  </div>

                  {loadingServices ? (
                    <div className="flex items-center gap-2 py-4 text-xs text-gray-500">
                      <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-[#2c6671]"></div>
                      <span>Loading company services...</span>
                    </div>
                  ) : availableServices.length === 0 ? (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                      No services configured for this tenant plan. Defaulting to Search service.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                      {availableServices.map((service) => {
                        const isSelected = selectedServices.includes(service);
                        return (
                          <label
                            key={service}
                            className={`flex cursor-pointer items-center justify-between gap-2 rounded-xl border p-3 text-xs transition-all select-none ${
                              isSelected
                                ? "border-[#2c6671] bg-[#EFFBFD] font-bold text-[#2c6671] shadow-2xs"
                                : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                            }`}
                          >
                            <span className="capitalize">{service.replace(/_/g, " ")}</span>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleService(service)}
                              className="h-4 w-4 cursor-pointer rounded border-gray-300 accent-[#2c6671] focus:ring-[#2c6671]"
                            />
                          </label>
                        );
                      })}
                    </div>
                  )}

                  {selectedServices.length === 0 && (
                    <p className="text-[11px] font-bold text-red-600">
                      * Please select at least one service before proceeding.
                    </p>
                  )}
                </div>

                {/* Summary box before submitting */}
                <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-3.5 text-xs text-gray-600">
                  <div className="font-bold text-gray-800">Review Summary:</div>
                  <div className="mt-1 grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-gray-400">User:</span> {formData.first_name}{" "}
                      {formData.last_name} ({formData.username || "-"})
                    </div>
                    <div>
                      <span className="text-gray-400">Email:</span> {formData.email || "-"}
                    </div>
                    <div>
                      <span className="text-gray-400">Organization:</span>{" "}
                      {formData.organization_name || "-"}
                    </div>
                    <div>
                      <span className="text-gray-400">Services ({selectedServices.length}):</span>{" "}
                      {selectedServices.join(", ") || "None"}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer with Step Navigation */}
          <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50/80 px-6 py-4">
            <div>
              {currentStep > 1 ? (
                <button
                  type="button"
                  onClick={handlePrev}
                  disabled={loading}
                  className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-700 transition hover:bg-gray-100 active:scale-95 disabled:opacity-50"
                >
                  <ArrowLeft size={14} />
                  <span>Previous</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="cursor-pointer rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-600 transition hover:bg-gray-100 disabled:opacity-50"
                >
                  Cancel
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {currentStep < 3 ? (
                <button
                  key="dashboard-step-btn-next"
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleNext(e);
                  }}
                  className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-[#2c6671] px-5 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-[#1f4e57] active:scale-95"
                >
                  <span>Next Step</span>
                  <ArrowRight size={14} />
                </button>
              ) : (
                <button
                  key="dashboard-step-btn-submit"
                  type="submit"
                  disabled={loading || selectedServices.length === 0}
                  className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-[#2c6671] px-6 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-[#1f4e57] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="h-3.5 w-3.5 animate-spin rounded-full border-b-2 border-white"></div>
                      <span>{isEditMode ? "Saving Changes..." : "Registering..."}</span>
                    </div>
                  ) : (
                    <span>{isEditMode ? "Save Changes" : "Register User"}</span>
                  )}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
