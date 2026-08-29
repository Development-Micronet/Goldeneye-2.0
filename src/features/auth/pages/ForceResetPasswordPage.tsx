import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuthStore } from "../../../store/useAuthStore";
import { loginVideo, logoImg } from "../../../assets";
import { useForceResetPasswordMutation } from "../hooks/useForceResetPassword"; // Import the mutation hook

export const ForceResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, accessToken, refreshToken, setAuth, clearAuth } = useAuthStore();
  const { mutateAsync: resetPassword, isPending: loading } = useForceResetPasswordMutation(); // Use React Query mutation

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setNewConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{
    newPassword?: string;
    confirmPassword?: string;
  }>({});

  const handleForceReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationErrors({});

    const errors: { newPassword?: string; confirmPassword?: string } = {};

    if (!newPassword) {
      errors.newPassword = "New password is required";
    } else if (newPassword.length < 6) {
      errors.newPassword = "Password must be at least 6 characters";
    }

    if (!confirmPassword) {
      errors.confirmPassword = "Confirm password is required";
    } else if (newPassword !== confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    const toastId = toast.loading("Updating password...");

    try {
      // The hook will handle the call and decryption automatically
      await resetPassword({
        new_password: newPassword,
        confirm_password: confirmPassword,
      });

      toast.update(toastId, {
        render: "Password updated successfully!",
        type: "success",
        isLoading: false,
        autoClose: 3000,
      });

      if (user && accessToken && refreshToken) {
        setAuth(accessToken, refreshToken, {
          ...user,
          must_reset_password: false,
        });
      }

      const role = user?.roleName?.toLowerCase();
      if (role === "user") {
        navigate("/data");
      } else {
        navigate("/dashboard");
      }
    } catch (err: any) {
      console.error("Force reset password error:", err);
      toast.update(toastId, {
        render: err.message || "Failed to update password. Please try again.",
        type: "error",
        isLoading: false,
        autoClose: 3000,
      });
    }
  };

  const handleBackToLogin = () => {
    clearAuth();
    navigate("/login");
  };

  return (
    <div className="flex min-h-screen w-full overflow-hidden bg-gray-50 font-sans">
      {/* Left Column - Video Section */}
      <div className="relative hidden h-screen w-1/2 overflow-hidden bg-black select-none md:flex">
        <div className="absolute top-6 left-8 z-10 flex items-center">
          <img src={logoImg} alt="Golden Eye Logo" className="h-14 w-48 object-contain" />
        </div>
        <video
          src={loginVideo}
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 h-full w-full object-cover opacity-80"
        />
      </div>

      {/* Right Column - Force Reset Form Section */}
      <div className="relative flex h-screen w-full flex-col items-center justify-between overflow-y-auto bg-white px-6 py-6 md:w-1/2 md:px-16">
        <div className="bg-primary mb-4 flex w-full flex-shrink-0 items-center justify-center rounded-lg p-2 md:hidden">
          <img src={logoImg} alt="Golden Eye Logo" className="h-12 w-40 object-contain" />
        </div>

        <div className="my-auto flex w-full max-w-[420px] flex-col py-4">
          <h2 className="mb-2 text-center text-2xl font-semibold tracking-tight text-gray-900 sm:text-[34px]">
            Set New Password
          </h2>
          <p className="mb-6 text-center text-xs leading-relaxed text-gray-500">
            You must change your password before continuing.
          </p>

          <form onSubmit={handleForceReset} className="space-y-4">
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="newPassword" className="text-sm text-gray-700">
                  New Password
                </label>
                {validationErrors.newPassword && (
                  <span className="text-xs font-semibold text-red-500">
                    {validationErrors.newPassword}
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  id="newPassword"
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    if (validationErrors.newPassword) {
                      setValidationErrors((prev) => ({
                        ...prev,
                        newPassword: undefined,
                      }));
                    }
                  }}
                  placeholder="Enter new password"
                  disabled={loading}
                  className="focus:border-primary focus:ring-primary w-full rounded-lg border border-gray-300 bg-white py-2.5 pr-10 pl-4 text-sm text-gray-800 placeholder-gray-400 transition-all duration-200 outline-none focus:ring-1 disabled:bg-gray-100 disabled:text-gray-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute top-1/2 right-3 -translate-y-1/2 cursor-pointer text-gray-400 transition-colors hover:text-gray-600 focus:outline-none"
                >
                  {showPassword ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="h-5 w-5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
                      />
                    </svg>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="h-5 w-5"
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

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="confirmPassword" className="text-sm text-gray-700">
                  Confirm Password
                </label>
                {validationErrors.confirmPassword && (
                  <span className="text-xs font-semibold text-red-500">
                    {validationErrors.confirmPassword}
                  </span>
                )}
              </div>
              <input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => {
                  setNewConfirmPassword(e.target.value);
                  if (validationErrors.confirmPassword) {
                    setValidationErrors((prev) => ({
                      ...prev,
                      confirmPassword: undefined,
                    }));
                  }
                }}
                placeholder="Confirm new password"
                disabled={loading}
                className="focus:border-primary focus:ring-primary w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 transition-all duration-200 outline-none focus:ring-1 disabled:bg-gray-100 disabled:text-gray-400"
              />
            </div>

            <div className="flex flex-col gap-3 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="bg-primary w-full cursor-pointer rounded-lg px-7 py-2.5 text-sm font-semibold text-white shadow transition-all duration-200 hover:bg-[#1f4e57] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-75"
              >
                {loading ? "Updating..." : "Update Password"}
              </button>
              <button
                type="button"
                onClick={handleBackToLogin}
                disabled={loading}
                className="text-primary mt-2 cursor-pointer border-0 bg-transparent text-center text-xs font-semibold outline-none hover:underline"
              >
                Back to Login
              </button>
            </div>
          </form>
        </div>

        <div className="mt-10 w-full max-w-[420px] text-center select-none md:mt-0">
          <p className="text-[10px] font-semibold tracking-wide text-gray-400">
            © Copyright 2025 Micronet Solutions. All Right Reserved
          </p>
        </div>
      </div>
    </div>
  );
};
