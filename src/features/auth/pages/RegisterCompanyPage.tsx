import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import React, { useState } from "react";
import { loginVideo, logoImg } from "../../../assets";
import { useRegisterCompanyMutation } from "../api/register";

export const RegisterCompanyPage: React.FC = () => {
  const navigate = useNavigate();
  const { mutate: registerCompany, isPending } = useRegisterCompanyMutation();
  // Form states
  const [formData, setFormData] = useState({
    name: "",
    username: "",
    admin_email: "",
    password: "",
    first_name: "",
    last_name: "",
    phoneNumber: "",
    address: "",
    businessType: "",
    domainName: "",
    type: "Enterprise", // default value
  });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (validationErrors[name]) {
      setValidationErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isPending) return;
    const errors: Record<string, string> = {};

    // Basic Validation
    if (!formData.name.trim()) errors.name = "Org Name is required";
    if (!formData.username.trim()) errors.username = "Username is required";
    if (!formData.admin_email.trim()) {
      errors.admin_email = "Admin Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.admin_email)) {
      errors.admin_email = "Invalid email address";
    }
    if (!formData.password) errors.password = "Password is required";
    if (!formData.first_name.trim()) errors.first_name = "First name is required";
    if (!formData.last_name.trim()) errors.last_name = "Last name is required";

    const phoneVal = formData.phoneNumber.trim();
    if (!phoneVal) {
      errors.phoneNumber = "Phone is required";
    } else if (isNaN(Number(phoneVal))) {
      errors.phoneNumber = "Must be a valid number";
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      toast.error("Please fill in all required fields correctly.");
      return;
    }

    // Build exactly the requested payload
    const payload = {
      name: formData.name,
      username: formData.username,
      admin_email: formData.admin_email,
      password: formData.password,
      first_name: formData.first_name,
      last_name: formData.last_name,
      phoneNumber: Number(formData.phoneNumber),
      address: formData.address,
      businessType: formData.businessType,
      domainName: formData.domainName,
      type: formData.type,
    };
    const toastId = toast.loading("Submitting organization registration...");

    registerCompany(payload, {
      onSuccess: (response) => {
        const msg = response.message || "Company registration request submitted successfully!";
        toast.update(toastId, {
          render: msg,
          type: "success",
          isLoading: false,
          autoClose: 3000,
        });
        navigate("/login");
      },
      onError: (err) => {
        const apiError =
          (err as any).response?.data?.message ||
          err.message ||
          "Registration failed. Please try again.";
        toast.update(toastId, {
          render: apiError,
          type: "error",
          isLoading: false,
          autoClose: 3000,
        });
      },
    });
  };

  return (
    <div className="flex min-h-screen w-full overflow-hidden bg-gray-50 font-sans">
      {/* Left Column - Video Section */}
      <div className="relative hidden h-screen w-5/12 overflow-hidden bg-black select-none md:flex">
        {/* Logo and Name Top Left overlay */}
        <div className="absolute top-6 left-8 z-10 flex items-center">
          <img src={logoImg} alt="Golden Eye Logo" className="h-14 w-48 object-contain" />
        </div>

        {/* Loop Background Video */}
        <video
          src={loginVideo}
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 h-full w-full object-cover opacity-80"
        />
      </div>

      {/* Right Column - Registration Form Section */}
      <div className="relative flex h-screen w-full flex-col items-center justify-between overflow-y-auto bg-white px-6 py-6 md:w-7/12 md:px-12">
        {/* Registration Container */}
        <div className="my-auto flex w-full max-w-[640px] flex-col py-6">
          <h2 className="mb-2 text-2xl font-semibold tracking-tight text-gray-900">
            Register Organization
          </h2>
          <p className="mb-6 text-xs text-gray-500">
            Register your company to request access to the GoldenEye secure portal.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Form grid (2-column layout on medium screens) */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Organization Name */}
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label htmlFor="name" className="text-xs font-medium text-gray-700">
                    Organization Name *
                  </label>
                  {validationErrors.name && (
                    <span className="text-[10px] font-semibold text-red-500">
                      {validationErrors.name}
                    </span>
                  )}
                </div>
                <input
                  id="name"
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="e.g. GoldenEye Solutions"
                  className="focus:border-primary focus:ring-primary w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-gray-800 transition-all outline-none focus:ring-1"
                />
              </div>

              {/* Username */}
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label htmlFor="username" className="text-xs font-medium text-gray-700">
                    Admin Username *
                  </label>
                  {validationErrors.username && (
                    <span className="text-[10px] font-semibold text-red-500">
                      {validationErrors.username}
                    </span>
                  )}
                </div>
                <input
                  id="username"
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  placeholder="e.g. org_admin"
                  className="focus:border-primary focus:ring-primary w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-gray-800 transition-all outline-none focus:ring-1"
                />
              </div>

              {/* Admin Email */}
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label htmlFor="admin_email" className="text-xs font-medium text-gray-700">
                    Admin Email ID *
                  </label>
                  {validationErrors.admin_email && (
                    <span className="text-[10px] font-semibold text-red-500">
                      {validationErrors.admin_email}
                    </span>
                  )}
                </div>
                <input
                  id="admin_email"
                  type="email"
                  name="admin_email"
                  value={formData.admin_email}
                  onChange={handleInputChange}
                  placeholder="org_admin@example.com"
                  className="focus:border-primary focus:ring-primary w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-gray-800 transition-all outline-none focus:ring-1"
                />
              </div>

              {/* Password */}
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label htmlFor="password" className="text-xs font-medium text-gray-700">
                    Password *
                  </label>
                  {validationErrors.password && (
                    <span className="text-[10px] font-semibold text-red-500">
                      {validationErrors.password}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="Enter secure password"
                    className="focus:border-primary focus:ring-primary w-full rounded-lg border border-gray-300 bg-white py-2 pr-10 pl-3 text-xs text-gray-800 transition-all outline-none focus:ring-1"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="hover:text-gray-650 absolute top-1/2 right-3 -translate-y-1/2 cursor-pointer text-gray-400 transition-colors focus:outline-none"
                  >
                    {showPassword ? (
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M2.036 12.322a1.012 1.012 0 010-.644C3.76 10.274 7.533 6 12 6c4.467 0 8.243 4.273 9.964 5.678a1.012 1.012 0 010 .644C20.24 13.726 16.467 18 12 18c-4.467 0-8.243-4.273-9.964-5.678z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* First Name */}
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label htmlFor="first_name" className="text-xs font-medium text-gray-700">
                    First Name *
                  </label>
                  {validationErrors.first_name && (
                    <span className="text-[10px] font-semibold text-red-500">
                      {validationErrors.first_name}
                    </span>
                  )}
                </div>
                <input
                  id="first_name"
                  type="text"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleInputChange}
                  placeholder="Org"
                  className="focus:border-primary focus:ring-primary w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-gray-800 transition-all outline-none focus:ring-1"
                />
              </div>

              {/* Last Name */}
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label htmlFor="last_name" className="text-xs font-medium text-gray-700">
                    Last Name *
                  </label>
                  {validationErrors.last_name && (
                    <span className="text-[10px] font-semibold text-red-500">
                      {validationErrors.last_name}
                    </span>
                  )}
                </div>
                <input
                  id="last_name"
                  type="text"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleInputChange}
                  placeholder="Admin"
                  className="focus:border-primary focus:ring-primary w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-gray-800 transition-all outline-none focus:ring-1"
                />
              </div>

              {/* Phone Number */}
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label htmlFor="phoneNumber" className="text-xs font-medium text-gray-700">
                    Phone Number *
                  </label>
                  {validationErrors.phoneNumber && (
                    <span className="text-[10px] font-semibold text-red-500">
                      {validationErrors.phoneNumber}
                    </span>
                  )}
                </div>
                <input
                  id="phoneNumber"
                  type="text"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleInputChange}
                  placeholder="e.g. 9876543210"
                  className="focus:border-primary focus:ring-primary w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-gray-800 transition-all outline-none focus:ring-1"
                />
              </div>

              {/* Domain Name */}
              <div>
                <label
                  htmlFor="domainName"
                  className="mb-1 block text-xs font-medium text-gray-700"
                >
                  Domain Name
                </label>
                <input
                  id="domainName"
                  type="text"
                  name="domainName"
                  value={formData.domainName}
                  onChange={handleInputChange}
                  placeholder="e.g. goldeneye.net"
                  className="focus:border-primary focus:ring-primary w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-gray-800 transition-all outline-none focus:ring-1"
                />
              </div>

              {/* Business Type */}
              <div>
                <label
                  htmlFor="businessType"
                  className="mb-1 block text-xs font-medium text-gray-700"
                >
                  Business Type
                </label>
                <input
                  id="businessType"
                  type="text"
                  name="businessType"
                  value={formData.businessType}
                  onChange={handleInputChange}
                  placeholder="e.g. GIS Provider"
                  className="focus:border-primary focus:ring-primary w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-gray-800 transition-all outline-none focus:ring-1"
                />
              </div>

              {/* Organization Type Selector */}
              <div>
                <label htmlFor="type" className="mb-1 block text-xs font-medium text-gray-700">
                  Organization Type
                </label>
                <select
                  id="type"
                  name="type"
                  value={formData.type}
                  onChange={handleInputChange}
                  className="focus:border-primary focus:ring-primary text-gray-850 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs transition-all outline-none focus:ring-1"
                >
                  <option value="Enterprise">Enterprise</option>
                  <option value="Small Business">Small Business</option>
                  <option value="Academic">Academic</option>
                  <option value="Government">Government</option>
                </select>
              </div>
            </div>

            {/* Address (Full Width) */}
            <div>
              <label htmlFor="address" className="mb-1 block text-xs font-medium text-gray-700">
                Address
              </label>
              <textarea
                id="address"
                name="address"
                rows={2}
                value={formData.address}
                onChange={handleInputChange}
                placeholder="Enter organization address..."
                className="focus:border-primary focus:ring-primary w-full resize-none rounded-lg border border-gray-300 bg-white px-3 py-2 font-sans text-xs text-gray-800 transition-all outline-none focus:ring-1"
              />
            </div>

            {/* Submit and Login redirects */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="submit"
                disabled={isPending}
                className="bg-primary w-auto cursor-pointer rounded-lg px-8 py-2.5 text-xs font-semibold text-white shadow transition-all hover:bg-[#1f4e57] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isPending ? "Submitting..." : "Register Company"}
              </button>

              <Link
                to={isPending ? "#" : "/login"}
                onClick={(e) => isPending && e.preventDefault()}
                className={`text-primary text-xs font-semibold hover:underline ${isPending ? "cursor-not-allowed opacity-50" : ""}`}
              >
                Already registered? Login
              </Link>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="mt-6 w-full max-w-[640px] text-center select-none">
          <p className="text-[10px] font-semibold tracking-wide text-gray-400">
            © Copyright 2025 Micronet Solutions. All Right Reserved
          </p>
        </div>
      </div>
    </div>
  );
};
