import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
// import { logoImg } from "../../../assets";
import { resetPassword } from "../api/resetPassword";

export const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Get uid and token from URL query params
  const uid = searchParams.get("uid") || "";
  const token = searchParams.get("token") || "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{
    newPassword?: string;
    confirmPassword?: string;
  }>({});

  const handleResetPassword = async (e: React.FormEvent) => {
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

    if (!uid || !token) {
      toast.error("Invalid reset link. Please request a new password reset.");
      return;
    }

    const toastId = toast.loading("Resetting password...");
    setLoading(true);

    try {
      await resetPassword({
        uid,
        token,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });

      toast.update(toastId, {
        render: "Password reset successful! Redirecting to login...",
        type: "success",
        isLoading: false,
        autoClose: 3000,
      });

      // Redirect to login page after a short delay
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (err: any) {
      console.error("Reset password error:", err);
      const errorMessage =
        err.response?.data?.message ||
        err.response?.data?.detail ||
        "Failed to reset password. Please request a new link.";
      toast.update(toastId, {
        render: errorMessage,
        type: "error",
        isLoading: false,
        autoClose: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-gray-50 px-4 font-sans">
      <div className="flex w-full max-w-[420px] flex-col rounded-xl border border-gray-100 bg-white px-6 py-8 shadow-lg">
        {/* Logo */}
        {/* <div className="flex w-full items-center justify-center mb-6">
                    <img src={logoImg} alt="Golden Eye Logo" className="h-14 w-48 object-contain" />
                </div> */}

        <h2 className="mb-2 text-center text-2xl font-semibold tracking-tight text-gray-900">
          Reset Password
        </h2>
        <p className="mb-6 text-center text-xs leading-relaxed text-gray-500">
          Please enter and confirm your new password below.
        </p>

        <form onSubmit={handleResetPassword} className="space-y-4">
          {/* New Password Field */}
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

          {/* Confirm Password Field */}
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
                setConfirmPassword(e.target.value);
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

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="bg-primary w-full cursor-pointer rounded-lg px-7 py-2.5 text-sm font-semibold text-white shadow transition-all duration-200 hover:bg-[#1f4e57] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-75"
            >
              {loading ? "Resetting..." : "Reset Password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
