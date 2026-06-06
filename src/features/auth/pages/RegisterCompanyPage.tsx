import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "react-toastify";
import { logoImg, loginVideo } from "../../../assets";
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
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
    <div className="flex min-h-screen w-full overflow-hidden font-sans bg-gray-50">
      {/* Left Column - Video Section */}
      <div className="hidden md:flex relative w-5/12 h-screen bg-black overflow-hidden select-none">
        {/* Logo and Name Top Left overlay */}
        <div className="absolute top-6 left-8 flex items-center z-10">
          <img
            src={logoImg}
            alt="Golden Eye Logo"
            className="w-48 h-14 object-contain"
          />
        </div>

        {/* Loop Background Video */}
        <video
          src={loginVideo}
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-80"
        />
      </div>

      {/* Right Column - Registration Form Section */}
      <div className="w-full md:w-7/12 h-screen bg-white flex flex-col justify-between items-center py-6 px-6 md:px-12 overflow-y-auto relative">
        
        {/* Registration Container */}
        <div className="w-full max-w-[640px] my-auto flex flex-col py-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2 tracking-tight">
            Register Organization
          </h2>
          <p className="text-xs text-gray-500 mb-6">
            Register your company to request access to the GoldenEye secure portal.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Form grid (2-column layout on medium screens) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Organization Name */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label htmlFor="name" className="text-xs text-gray-700 font-medium">
                    Organization Name *
                  </label>
                  {validationErrors.name && (
                    <span className="text-[10px] text-red-500 font-semibold">
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
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-gray-800 bg-white"
                />
              </div>

              {/* Username */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label htmlFor="username" className="text-xs text-gray-700 font-medium">
                    Admin Username *
                  </label>
                  {validationErrors.username && (
                    <span className="text-[10px] text-red-500 font-semibold">
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
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-gray-800 bg-white"
                />
              </div>

              {/* Admin Email */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label htmlFor="admin_email" className="text-xs text-gray-700 font-medium">
                    Admin Email ID *
                  </label>
                  {validationErrors.admin_email && (
                    <span className="text-[10px] text-red-500 font-semibold">
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
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-gray-800 bg-white"
                />
              </div>

              {/* Password */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label htmlFor="password" className="text-xs text-gray-700 font-medium">
                    Password *
                  </label>
                  {validationErrors.password && (
                    <span className="text-[10px] text-red-500 font-semibold">
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
                    className="w-full border border-gray-300 rounded-lg pl-3 pr-10 py-2 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-gray-800 bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-650 transition-colors focus:outline-none cursor-pointer"
                  >
                    {showPassword ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.644C3.76 10.274 7.533 6 12 6c4.467 0 8.243 4.273 9.964 5.678a1.012 1.012 0 010 .644C20.24 13.726 16.467 18 12 18c-4.467 0-8.243-4.273-9.964-5.678z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* First Name */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label htmlFor="first_name" className="text-xs text-gray-700 font-medium">
                    First Name *
                  </label>
                  {validationErrors.first_name && (
                    <span className="text-[10px] text-red-500 font-semibold">
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
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-gray-800 bg-white"
                />
              </div>

              {/* Last Name */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label htmlFor="last_name" className="text-xs text-gray-700 font-medium">
                    Last Name *
                  </label>
                  {validationErrors.last_name && (
                    <span className="text-[10px] text-red-500 font-semibold">
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
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-gray-800 bg-white"
                />
              </div>

              {/* Phone Number */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label htmlFor="phoneNumber" className="text-xs text-gray-700 font-medium">
                    Phone Number *
                  </label>
                  {validationErrors.phoneNumber && (
                    <span className="text-[10px] text-red-500 font-semibold">
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
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-gray-800 bg-white"
                />
              </div>

              {/* Domain Name */}
              <div>
                <label htmlFor="domainName" className="block text-xs text-gray-700 font-medium mb-1">
                  Domain Name
                </label>
                <input
                  id="domainName"
                  type="text"
                  name="domainName"
                  value={formData.domainName}
                  onChange={handleInputChange}
                  placeholder="e.g. goldeneye.net"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-gray-800 bg-white"
                />
              </div>

              {/* Business Type */}
              <div>
                <label htmlFor="businessType" className="block text-xs text-gray-700 font-medium mb-1">
                  Business Type
                </label>
                <input
                  id="businessType"
                  type="text"
                  name="businessType"
                  value={formData.businessType}
                  onChange={handleInputChange}
                  placeholder="e.g. GIS Provider"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-gray-800 bg-white"
                />
              </div>

              {/* Organization Type Selector */}
              <div>
                <label htmlFor="type" className="block text-xs text-gray-700 font-medium mb-1">
                  Organization Type
                </label>
                <select
                  id="type"
                  name="type"
                  value={formData.type}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-gray-850 bg-white"
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
              <label htmlFor="address" className="block text-xs text-gray-700 font-medium mb-1">
                Address
              </label>
              <textarea
                id="address"
                name="address"
                rows={2}
                value={formData.address}
                onChange={handleInputChange}
                placeholder="Enter organization address..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-gray-800 bg-white resize-none font-sans"
              />
            </div>

            {/* Submit and Login redirects */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="submit"
                disabled={isPending}
                className="w-auto bg-primary hover:bg-[#1f4e57] active:scale-[0.98] text-white font-semibold px-8 py-2.5 rounded-lg text-xs shadow transition-all cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isPending ? "Submitting..." : "Register Company"}
              </button>
              
              <Link
                to={isPending ? "#" : "/login"}
                onClick={(e) => isPending && e.preventDefault()}
                className={`text-xs text-primary font-semibold hover:underline ${isPending ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                Already registered? Login
              </Link>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="w-full max-w-[640px] text-center mt-6 select-none">
          <p className="text-[10px] text-gray-400 font-semibold tracking-wide">
            © Copyright 2025 Micronet Solutions. All Right Reserved
          </p>
        </div>
      </div>
    </div>
  );
};
