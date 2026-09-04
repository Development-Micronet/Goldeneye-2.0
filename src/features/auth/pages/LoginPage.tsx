import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import React, { useEffect, useState } from "react";
import { loginVideo, logoImg } from "../../../assets";
import { useAuthStore } from "../../../store/useAuthStore";
import { useLoginMutation } from "../api/login";
import { Captcha } from "../components/Captcha";
import { forgotPassword } from "../api/forgotPassword";

const safeBtoa = (str: string) => {
  try {
    return btoa(unescape(encodeURIComponent(str)));
  } catch (e) {
    return str;
  }
};
const safeAtob = (str: string) => {
  try {
    return decodeURIComponent(escape(atob(str)));
  } catch (e) {
    return str;
  }
};

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const token = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const setAuth = useAuthStore((state) => state.setAuth);
  const { mutate: login, isPending } = useLoginMutation();

  // Redirect if already logged in
  useEffect(() => {
    if (token) {
      if (user?.must_reset_password) {
        navigate("/force-reset-password");
      } else {
        navigate("/data");
      }
    }
  }, [token, user, navigate]);

  // Form states
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [captchaInput, setCaptchaInput] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  // CAPTCHA states
  const [captchaCode, setCaptchaCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<{
    username?: string;
    password?: string;
    captcha?: string;
  }>({});

  // Forgot Password View states
  const [view, setView] = useState<"login" | "forgot">("login");
  const [forgotEmail, setForgotEmail] = useState("isha.bairam@acetechnologys.com");
  const [forgotLoading, setForgotLoading] = useState(false);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      toast.error("Please enter your email address.");
      return;
    }

    const toastId = toast.loading("Submitting reset request...");
    setForgotLoading(true);
    try {
      const response = await forgotPassword({ email: forgotEmail.trim() });
      toast.update(toastId, {
        render: response?.message || "Password reset request submitted successfully!",
        type: "success",
        isLoading: false,
        autoClose: 3000,
      });
      setView("login");
    } catch (err: any) {
      console.error("Forgot password error:", err);
      const errorMessage =
        err.response?.data?.message ||
        err.response?.data?.detail ||
        "Failed to request password reset. Please try again.";
      toast.update(toastId, {
        render: errorMessage,
        type: "error",
        isLoading: false,
        autoClose: 3000,
      });
    } finally {
      setForgotLoading(false);
    }
  };
  const generateCaptcha = () => {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCaptchaCode(code);
    setCaptchaInput("");
    setError(null);
  };

  useEffect(() => {
    generateCaptcha();
    // Load saved credentials if remember me was checked
    const savedUsername = localStorage.getItem("remembered_username");
    const savedPasswordObfuscated = localStorage.getItem("remembered_password");
    if (savedUsername && savedPasswordObfuscated) {
      setUsername(savedUsername);
      setPassword(safeAtob(savedPasswordObfuscated));
      setRememberMe(true);
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setValidationErrors({});

    const errors: { username?: string; password?: string; captcha?: string } = {};

    if (!username.trim()) {
      errors.username = "Username is required";
    }

    if (!password) {
      errors.password = "Password is required";
    }

    if (!captchaInput.trim()) {
      errors.captcha = "Captcha is required";
    } else if (captchaInput.toLowerCase() !== captchaCode.toLowerCase()) {
      errors.captcha = "Invalid CAPTCHA code";
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      toast.error("Please resolve the validation errors");
      if (errors.captcha === "Invalid CAPTCHA code") {
        generateCaptcha();
      }
      return;
    }

    const toastId = toast.loading("Logging in, please wait...");

    login(
      { username, password },
      {
        onSuccess: (response) => {
          const { access, refresh, ...user } = response.data;
          setAuth(access, refresh, user);

          if (rememberMe) {
            localStorage.setItem("remembered_username", username);
            localStorage.setItem("remembered_password", safeBtoa(password));
          } else {
            localStorage.removeItem("remembered_username");
            localStorage.removeItem("remembered_password");
          }

          toast.update(toastId, {
            render: `Welcome back, ${user.user || "Admin"}!`,
            type: "success",
            isLoading: false,
            autoClose: 3000,
          });
          if (user.must_reset_password) {
            navigate("/force-reset-password");
          } else {
            navigate("/data");
          }
        },
        onError: (err) => {
          const apiError =
            (err as any).response?.data?.message ||
            err.message ||
            "Login failed. Please check your credentials.";
          setError(apiError);
          toast.update(toastId, {
            render: apiError,
            type: "error",
            isLoading: false,
            autoClose: 3000,
          });
          generateCaptcha();
        },
      },
    );
  };

  return (
    <div className="flex min-h-screen w-full overflow-hidden bg-gray-50 font-sans">
      {/* Left Column - Video Section */}
      <div className="relative hidden h-screen w-1/2 overflow-hidden bg-black select-none md:flex">
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

      {/* Right Column - Login Form Section */}
      <div className="relative flex h-screen w-full flex-col items-center justify-between overflow-y-auto bg-white px-6 py-6 md:w-1/2 md:px-16">
        {/* Mobile Logo overlay */}
        <div className="bg-primary mb-4 flex w-full flex-shrink-0 items-center justify-center rounded-lg p-2 md:hidden">
          <img src={logoImg} alt="Golden Eye Logo" className="h-12 w-40 object-contain" />
        </div>

        {/* Center Login Container */}
        <div className="my-auto flex w-full max-w-[420px] flex-col py-4">
          {view === "login" ? (
            <>
              <h2 className="mb-6 text-center text-2xl font-semibold tracking-tight text-gray-900 sm:mb-10 sm:text-[34px]">
                Login
              </h2>

              <form onSubmit={handleLogin} className="space-y-4 sm:space-y-6">
                {/* Username Field */}
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label htmlFor="username" className="text-sm text-gray-700">
                      Username
                    </label>
                    {validationErrors.username && (
                      <span className="text-xs font-semibold text-red-500">
                        {validationErrors.username}
                      </span>
                    )}
                  </div>
                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      if (validationErrors.username) {
                        setValidationErrors((prev) => ({
                          ...prev,
                          username: undefined,
                        }));
                      }
                    }}
                    placeholder="Enter your username"
                    disabled={isPending}
                    className="focus:border-primary focus:ring-primary w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 transition-all duration-200 outline-none focus:ring-1 disabled:bg-gray-100 disabled:text-gray-400"
                  />
                </div>

                {/* Password Field */}
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label htmlFor="password" className="text-sm text-gray-700">
                      Password
                    </label>
                    {validationErrors.password && (
                      <span className="text-xs font-semibold text-red-500">
                        {validationErrors.password}
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (validationErrors.password) {
                          setValidationErrors((prev) => ({
                            ...prev,
                            password: undefined,
                          }));
                        }
                      }}
                      placeholder="Enter your password"
                      disabled={isPending}
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
                  <div className="mt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setView("forgot")}
                      className="text-primary cursor-pointer border-0 bg-transparent text-xs font-medium outline-none hover:text-[#1f4e57] hover:underline"
                    >
                      Forgot Password?
                    </button>
                  </div>
                </div>

                {/* Captcha Field */}
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label htmlFor="captcha" className="text-sm text-gray-700">
                      Captcha
                    </label>
                    {validationErrors.captcha && (
                      <span className="text-xs font-semibold text-red-500">
                        {validationErrors.captcha}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      id="captcha"
                      type="text"
                      value={captchaInput}
                      onChange={(e) => {
                        setCaptchaInput(e.target.value);
                        if (validationErrors.captcha) {
                          setValidationErrors((prev) => ({
                            ...prev,
                            captcha: undefined,
                          }));
                        }
                      }}
                      placeholder="Enter Captcha"
                      disabled={isPending}
                      className="focus:border-primary focus:ring-primary w-1/2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 transition-all duration-200 outline-none focus:ring-1 disabled:bg-gray-100 disabled:text-gray-400"
                    />
                    <Captcha code={captchaCode} onRefresh={generateCaptcha} />
                  </div>
                </div>

                {/* Remember Me Checkbox */}
                <div className="flex items-center">
                  <label className="flex cursor-pointer items-center gap-2.5 select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      disabled={isPending}
                      className="text-primary focus:ring-primary focus:ring-opacity-25 h-4 w-4 rounded border-gray-300 disabled:opacity-50"
                    />
                    <span className="text-sm font-medium text-gray-700">Remember me</span>
                  </label>
                </div>

                {/* Validation/Error alerts */}
                {error && <div className="mt-1 text-xs font-semibold text-red-500">⚠️ {error}</div>}

                {/* Submit Button */}
                <div> 
                  <button
                    type="submit"
                    disabled={isPending}
                    className="bg-primary w-full cursor-pointer rounded-lg px-7 py-2.5 text-sm font-semibold text-white shadow transition-all duration-200 hover:bg-[#1f4e57] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-75 sm:w-auto"
                  >
                    {isPending ? "Logging in..." : "Login"}
                  </button>
                </div>

                {/* Register Company */}
                <div className="pt-2 text-xs text-gray-500 select-none">
                  Don't have an account?{" "}
                  <Link
                    to="/register-company"
                    className="text-primary font-semibold hover:underline"
                  >
                    Register Company
                  </Link>
                </div>
              </form>
            </>
          ) : (
            <>
              <h2 className="mb-6 text-center text-2xl font-semibold tracking-tight text-gray-900 sm:mb-10 sm:text-[34px]">
                Forgot Password
              </h2>

              <form onSubmit={handleForgotPassword} className="space-y-4 sm:space-y-6">
                <p className="text-xs leading-relaxed text-gray-600 select-none">
                  Enter the email address associated with your account. We will send you
                  instructions to reset your password.
                </p>

                {/* Email Field */}
                <div>
                  <label htmlFor="forgot-email" className="mb-1.5 block text-sm text-gray-700">
                    Email Address
                  </label>
                  <input
                    id="forgot-email"
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    required
                    placeholder="e.g. john.doe@example.com"
                    className="focus:border-primary focus:ring-primary w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 transition-all duration-200 outline-none focus:ring-1 disabled:bg-gray-100 disabled:text-gray-400"
                  />
                </div>

                {/* Submit and Back to Login Buttons */}
                <div className="flex flex-col gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="bg-primary w-full cursor-pointer rounded-lg px-7 py-2.5 text-sm font-semibold text-white shadow transition-all duration-200 hover:bg-[#1f4e57] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-75"
                  >
                    {forgotLoading ? "Submitting..." : "Submit"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setView("login")}
                    disabled={forgotLoading}
                    className="text-primary mt-2 cursor-pointer border-0 bg-transparent text-center text-xs font-semibold outline-none hover:underline"
                  >
                    Back to Login
                  </button>
                </div>
              </form>
            </>
          )}
        </div>

        {/* Bottom Footer Section */}
        <div className="mt-10 w-full max-w-[420px] text-center select-none md:mt-0 md:text-center">
          <p className="text-[10px] font-semibold tracking-wide text-gray-400">
            © Copyright {new Date().getFullYear()} Micronet Solutions. All Right Reserved
          </p>
        </div>
      </div>
    </div>
  );
};
