import React, { useState, useEffect, useRef } from "react";
import { X, ShieldCheck, Check, ArrowRight, ArrowLeft } from "lucide-react";
import { toast } from "react-toastify";
import {
  registerUser,
  updateCompanyUser,
  getCompanyUserDetail,
  type CompanyUser,
} from "../../api/enduser";
import { useAuthStore } from "../../../../store/useAuthStore";
import { decryptAESGCM } from "../../../../utils/dataDecrypt";
import { useTenantCompanyServices } from "../../hooks/useTenantCompanyServices";
import Swal from "sweetalert2";

interface EndUserFormModalProps {
  open: boolean;
  onClose: () => void;
  companies?: any[];
  defaultOrganization?: string;
  userToEdit?: CompanyUser | null;
  mode?: "create" | "edit";
  onSuccess?: () => void;
}

export const EndUserFormModal: React.FC<EndUserFormModalProps> = ({
  open,
  onClose,
  companies = [],
  defaultOrganization = "",
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

  const selectedCompanyObj = companies.find(
    (c) =>
      c.company_name?.trim().toLowerCase() ===
      formData.organization_name?.trim().toLowerCase(),
  );

  const { availableServices, assignedPlanName, isLoading: loadingServices } =
    useTenantCompanyServices(
      formData.organization_name,
      selectedCompanyObj?.schema_name,
    );

  const [selectedServices, setSelectedServices] = useState<string[]>(["search"]);

  // Track initialization so user input is preserved when changing steps or re-rendering
  const lastInitializedIdRef = useRef<number | string | null>(null);

  // Pre-fill form when modal opens or userToEdit ID changes
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
      // 1. Initial pre-population from userToEdit prop (checking all field aliases)
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

      // Filter user's existing services against company's plan so unauthorized services are not held
      const initialServices = Array.isArray(u.services) ? u.services : [];
      const validInitialServices =
        availableServices.length > 0
          ? initialServices.filter((s: string) => availableServices.includes(s))
          : initialServices;
      if (validInitialServices.length > 0) {
        setSelectedServices(validInitialServices);
      } else if (availableServices.includes("search")) {
        setSelectedServices(["search"]);
      } else if (availableServices.length > 0) {
        setSelectedServices([availableServices[0]]);
      } else {
        setSelectedServices(["search"]);
      }

      // 2. Fetch full user details from GET /api/tenants/users/${userId}/ if available
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
              const validFetched =
                availableServices.length > 0
                  ? fetchedUser.services.filter((s: string) => availableServices.includes(s))
                  : fetchedUser.services;
              if (validFetched.length > 0) {
                setSelectedServices(validFetched);
              }
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

  // Synchronize and sanitize selectedServices against availableServices from the plan
  useEffect(() => {
    if (!open) return;
    if (availableServices.length > 0) {
      setSelectedServices((prev) => {
        // Filter out any services that are not part of the company's active plan (e.g. legacy geo_3d)
        const valid = prev.filter((s) => availableServices.includes(s));
        if (valid.length > 0) {
          if (valid.length === prev.length) return prev;
          return valid;
        }
        return availableServices.includes("search") ? ["search"] : [availableServices[0]];
      });
    }
  }, [availableServices, open]);

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
      toast.error("Please select an organization");
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

    // Ensure we only submit services permitted by the company's plan
    const sanitizedServices =
      availableServices.length > 0
        ? selectedServices.filter((s) => availableServices.includes(s))
        : selectedServices;
    const finalServices =
      sanitizedServices.length > 0
        ? sanitizedServices
        : availableServices.includes("search")
          ? ["search"]
          : availableServices.length > 0
            ? [availableServices[0]]
            : ["search"];

    if (finalServices.length === 0) {
      toast.error("Please select at least one service (*)");
      return;
    }

    setLoading(true);
    try {
      // Complete payload matching user schema
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
        services: finalServices,
      };

      let response: any;
      if (isEditMode && userToEdit) {
        // PATCH /api/tenants/users/{userId}/
        response = await updateCompanyUser(userToEdit.id, payload);
      } else {
        // POST /api/tenants/register-user/
        response = await registerUser(payload);
      }

      let successMessage = isEditMode
        ? "User updated successfully!"
        : "User registered successfully!";

      if (response?.data) {
        try {
          const token = useAuthStore.getState().accessToken?.replace("Bearer ", "").trim() || "";
          const decrypted = await decryptAESGCM(response.data, token);
          successMessage = decrypted.message || successMessage;
        } catch (decryptErr) {
          console.error("Failed to decrypt success response:", decryptErr);
        }
      }

      await Swal.fire({
        title: isEditMode ? "Updated!" : "Success!",
        text: successMessage,
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      console.error(isEditMode ? "Update user error:" : "Register user error:", err);
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

      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  const steps = [
    { num: 1, title: "Account Info", desc: "Credentials & Org" },
    { num: 2, title: "Profile & Contact", desc: "Job & Location" },
    { num: 3, title: "Assigned Services", desc: "Permissions & Plan" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
      <div className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              {isEditMode ? "Edit User Details" : "Add New End User"}
            </h2>
            <p className="text-xs text-gray-500">
              {isEditMode
                ? `Update details and services for ${formData.username || "user"}`
                : "Fill in the form step-by-step to register a user to an organization"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
          >
            <X size={18} />
          </button>
        </div>

        {/* Multi-Step Wizard Indicator */}
        <div className="border-b border-gray-100 bg-[#EFFBFD]/40 px-6 py-3 select-none">
          <div className="flex items-center justify-between">
            {steps.map((step, idx) => {
              const isActive = currentStep === step.num;
              const isPassed = currentStep > step.num;
              return (
                <React.Fragment key={step.num}>
                  <button
                    type="button"
                    onClick={() => {
                      if (step.num < currentStep) {
                        setCurrentStep(step.num);
                      } else if (step.num === 2 && validateStep1()) {
                        setCurrentStep(2);
                      } else if (step.num === 3 && validateStep1() && validateStep2()) {
                        setCurrentStep(3);
                      }
                    }}
                    className={`flex items-center gap-2 rounded-xl px-2.5 py-1 text-left transition ${
                      isActive
                        ? "bg-white shadow-xs"
                        : isPassed
                          ? "cursor-pointer hover:bg-white/60"
                          : "opacity-60 cursor-not-allowed"
                    }`}
                  >
                    <div
                      className={`flex h-6 w-6 items-center justify-center rounded-lg text-xs font-bold transition-colors ${
                        isActive
                          ? "bg-[#2c6671] text-white"
                          : isPassed
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-gray-200 text-gray-600"
                      }`}
                    >
                      {isPassed ? <Check size={13} /> : step.num}
                    </div>
                    <div className="hidden sm:block">
                      <p
                        className={`text-xs font-semibold ${
                          isActive
                            ? "text-[#2c6671]"
                            : isPassed
                              ? "text-gray-900"
                              : "text-gray-500"
                        }`}
                      >
                        {step.title}
                      </p>
                    </div>
                  </button>
                  {idx < steps.length - 1 && (
                    <div
                      className={`mx-2 h-0.5 flex-1 transition-colors ${
                        currentStep > idx + 1 ? "bg-emerald-400" : "bg-gray-200"
                      }`}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Modal Body / Scrollable Form */}
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
          className="flex-1 space-y-4 overflow-y-auto p-6"
        >
          {/* ================= STEP 1: ACCOUNT INFO ================= */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-fadeIn">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold tracking-wider text-gray-700 uppercase">
                    Organization Name *
                  </label>
                  {isEditMode ? (
                    <input
                      type="text"
                      name="organization_name"
                      value={formData.organization_name}
                      readOnly
                      disabled
                      className="h-10 w-full rounded-lg border border-gray-200 bg-gray-100 px-3 text-sm text-gray-600 cursor-not-allowed focus:outline-none"
                    />
                  ) : (
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
                  )}
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
                    disabled={isEditMode}
                    placeholder="e.g. john_d"
                    className={`h-10 w-full rounded-lg border border-gray-200 px-3 text-sm focus:outline-none ${
                      isEditMode
                        ? "bg-gray-100 text-gray-500 cursor-not-allowed"
                        : "bg-white focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
                    }`}
                  />
                  {isEditMode && (
                    <span className="mt-1 block text-[10px] text-gray-400">
                      Username cannot be changed
                    </span>
                  )}
                </div>
              </div>

              {/* First Name & Last Name */}
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

              {/* Official Email */}
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
            </div>
          )}

          {/* ================= STEP 2: PROFILE & LOCATION ================= */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-fadeIn">
              {/* Designation, Department, Mobile */}
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

              {/* Personal Email & Gender */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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

              {/* Location (Country, State, City) */}
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
                    placeholder="Gujarat"
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

              {/* Locality & Full Address */}
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
                    placeholder="Andheri West"
                    className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm focus:border-teal-600 focus:ring-1 focus:ring-teal-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold tracking-wider text-gray-700 uppercase">
                    Full Address
                  </label>
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    rows={1}
                    placeholder="123 Tech Park Road"
                    className="w-full resize-none rounded-lg border border-gray-200 p-2.5 text-sm focus:border-teal-600 focus:ring-1 focus:ring-teal-600 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ================= STEP 3: SERVICES & ACCESS ================= */}
          {currentStep === 3 && (
            <div className="space-y-4 animate-fadeIn">
              <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-semibold tracking-wider text-gray-800 uppercase">
                      <ShieldCheck className="h-4 w-4 text-[#2c6671]" />
                      Assigned Services <span className="text-red-500">*</span>
                    </label>
                    <p className="text-[11px] text-gray-500">
                      {assignedPlanName
                        ? `Available under plan: "${assignedPlanName}" (${formData.organization_name || "company"})`
                        : "Select services granted to this user (defaults to Search)"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={handleSelectAllServices}
                      className="cursor-pointer font-medium text-[#2c6671] hover:underline"
                    >
                      Select All
                    </button>
                    <span className="text-gray-300">|</span>
                    <button
                      type="button"
                      onClick={handleResetServices}
                      className="cursor-pointer text-gray-500 hover:underline"
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
                ) : (
                  <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                    {availableServices.map((service) => {
                      const isSelected = selectedServices.includes(service);
                      return (
                        <label
                          key={service}
                          className={`flex cursor-pointer items-center justify-between gap-2 rounded-xl border p-2.5 text-xs transition-all select-none ${
                            isSelected
                              ? "border-[#2c6671] bg-[#EFFBFD] font-semibold text-[#2c6671] shadow-2xs"
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
                  <p className="mt-2 text-[11px] font-medium text-amber-600">
                    * Please select at least one service (Search is recommended).
                  </p>
                )}
              </div>

              {/* Summary of What Will Be Updated */}
              <div className="rounded-xl border border-gray-200/80 bg-white p-3.5 text-xs text-gray-600">
                <div className="font-semibold text-gray-900 mb-1">Review Summary:</div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-gray-400">User:</span>{" "}
                    <span className="font-medium text-gray-800">
                      {formData.first_name} {formData.last_name} ({formData.username})
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">Organization:</span>{" "}
                    <span className="font-medium text-gray-800">{formData.organization_name}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Email:</span>{" "}
                    <span className="font-medium text-gray-800">{formData.email}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Services Selected:</span>{" "}
                    <span className="font-bold text-[#2c6671]">{selectedServices.length}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Modal Footer Step Navigation */}
          <div className="flex items-center justify-between border-t border-gray-100 pt-4">
            <div>
              {currentStep > 1 ? (
                <button
                  type="button"
                  onClick={handlePrev}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 transition hover:bg-gray-50"
                >
                  <ArrowLeft size={14} /> Back
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="cursor-pointer rounded-lg border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 transition hover:bg-gray-50"
                >
                  Cancel
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {currentStep < 3 ? (
                <button
                  key="step-btn-next"
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleNext(e);
                  }}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[#2c6671] px-5 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-[#1f4e57]"
                >
                  Next <ArrowRight size={14} />
                </button>
              ) : (
                <button
                  key="step-btn-submit"
                  type="submit"
                  disabled={loading || selectedServices.length === 0}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[#2c6671] px-6 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-[#1f4e57] disabled:opacity-50"
                >
                  {loading
                    ? isEditMode
                      ? "Updating User..."
                      : "Registering User..."
                    : isEditMode
                      ? "Save Changes"
                      : "Register User"}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
