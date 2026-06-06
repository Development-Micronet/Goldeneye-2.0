import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuthStore } from "../../../store/useAuthStore";
import { Captcha } from "../components/Captcha";
import { useLoginMutation } from "../api/login";
import { toast } from "react-toastify";

import { logoImg, loginVideo } from "../../../assets";

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
  const setAuth = useAuthStore((state) => state.setAuth);
  const { mutate: login, isPending } = useLoginMutation();

  // Redirect if already logged in
  useEffect(() => {
    if (token) {
      navigate("/dashboard");
    }
  }, [token, navigate]);

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

    const errors: { username?: string; password?: string; captcha?: string } =
      {};

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
          navigate("/data");
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
    <div className="flex min-h-screen w-full overflow-hidden font-sans bg-gray-50">
      {/* Left Column - Video Section */}
      <div className="hidden md:flex relative w-1/2 h-screen bg-black overflow-hidden select-none">
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

      {/* Right Column - Login Form Section */}
      <div className="w-full md:w-1/2 h-screen bg-white flex flex-col justify-between items-center py-6 px-6 md:px-16 overflow-y-auto relative">
        {/* Center Login Container */}
        <div className="w-full max-w-[420px] my-30 flex flex-col">
          <h2 className="text-[34px] font-semibold text-center text-gray-900 mb-10 tracking-tight">
            Login
          </h2>

          <form onSubmit={handleLogin} className="space-y-6">
            {/* Username Field */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label htmlFor="username" className="text-sm  text-gray-700">
                  Username
                </label>
                {validationErrors.username && (
                  <span className="text-xs text-red-500 font-semibold">
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
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all duration-200 text-gray-800 placeholder-gray-400 bg-white disabled:bg-gray-100 disabled:text-gray-400"
              />
            </div>

            {/* Password Field */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label htmlFor="password" className="text-sm  text-gray-700">
                  Password
                </label>
                {validationErrors.password && (
                  <span className="text-xs text-red-500 font-semibold">
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
                  className="w-full border border-gray-300 rounded-lg pl-4 pr-10 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all duration-200 text-gray-800 placeholder-gray-400 bg-white disabled:bg-gray-100 disabled:text-gray-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer focus:outline-none"
                >
                  {showPassword ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="w-5 h-5"
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
                      className="w-5 h-5"
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
              <div className="flex justify-end mt-2">
                <a
                  href="#forgot"
                  onClick={(e) => e.preventDefault()}
                  className="text-xs text-primary font-medium hover:underline hover:text-[#1f4e57]"
                >
                  Forgot Password?
                </a>
              </div>
            </div>

            {/* Captcha Field */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label htmlFor="captcha" className="text-sm text-gray-700">
                  Captcha
                </label>
                {validationErrors.captcha && (
                  <span className="text-xs text-red-500 font-semibold">
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
                  className="w-1/2 border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all duration-200 text-gray-800 placeholder-gray-400 bg-white disabled:bg-gray-100 disabled:text-gray-400"
                />
                <Captcha code={captchaCode} onRefresh={generateCaptcha} />
              </div>
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={isPending}
                  className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary focus:ring-opacity-25 disabled:opacity-50"
                />
                <span className="text-sm text-gray-700 font-medium">
                  Remember me
                </span>
              </label>
            </div>

            {/* Validation/Error alerts */}
            {error && (
              <div className="text-red-500 text-xs font-semibold mt-1">
                ⚠️ {error}
              </div>
            )}

            {/* Submit Button */}
            <div>
              <button
                type="submit"
                disabled={isPending}
                className="w-auto bg-primary hover:bg-[#1f4e57] active:scale-[0.98] text-white font-semibold px-7 py-2.5 rounded-lg text-sm shadow transition-all duration-200 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
              >
                {isPending ? "Logging in..." : "Login"}
              </button>
            </div>

            {/* Register Company */}
            <div className="text-xs text-gray-500 select-none pt-2">
              Not Register?{" "}
              <Link
                to="/register-company"
                className="text-primary font-semibold hover:underline"
              >
                Register Company
              </Link>
            </div>
          </form>
        </div>

        {/* Bottom Footer Section */}
        <div className="w-full max-w-[420px] text-center md:text-center mt-10 md:mt-0 select-none">
          <p className="text-[10px] text-gray-400 font-semibold tracking-wide">
            © Copyright 2025 Micronet Solutions. All Right Reserved
          </p>
        </div>
      </div>
    </div>
  );
};
