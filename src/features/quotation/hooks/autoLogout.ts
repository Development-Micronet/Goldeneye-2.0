import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

export const useLogout = () => {
  const navigate = useNavigate();

  const logout = (showToast = true): void => {
    localStorage.clear();
    sessionStorage.clear();

    if (showToast) {
      toast.error("Your session has expired. Please log in again.");
    }

    navigate("/");
  };

  return logout;
};
