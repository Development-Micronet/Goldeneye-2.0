import React from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../../Auth/AuthProvider/AuthContext";
import "./UserProfile.css";
import { usericons } from "../../constant";
import { useSearchMap } from "../../Contexts/SearchMapContext";
import axios from "axios";
import { getAccessToken } from "../../hooks";

interface UserProfileProps {
  openUpdateProfileModal?: () => void;
  closeModal?: () => void;
  ref?: any;
  userProfile?: any;
}

const UserProfile: React.FC<UserProfileProps> = ({
  userProfile,
  ref,
}) => {
  const { user, logout } = useUser();
  const navigate = useNavigate();
  const { handleClearAll, closeModifylayer } = useSearchMap();

  const handleLogout = async () => {
    try {
      closeModifylayer();
      handleClearAll();
      const refresh = user?.refresh;
      const accessToken = getAccessToken();

      const storageKey = `importedFiles_${user?.user}`;
      sessionStorage.removeItem(storageKey);

      const response = await axios.post(
        `${import.meta.env.VITE_REACT_APP_BASE_URL}/logout/`,
        { refresh },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );
      if (response) {
        logout();
        navigate("/");
      }
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const handleChangePassword = () => {
    const username = encodeURIComponent(user?.user || "");
    const roleName = encodeURIComponent(user?.roleName || "");
    const accessToken = encodeURIComponent(user?.access || "");
    navigate(
      `/ChangePassword?username=${username}&roleName=${roleName}&accessToken=${accessToken}`
    );
  };

  const handleUpdateProfile = () => {
    navigate("/UpdateAccount", { state: { userProfile: userProfile } });
  };

  return (
    <div>
      <div className="modern-card bg-transparent " ref={ref}>
        <div className="flex justify-end px-[1.5rem]">
          <svg width="20" height="10" viewBox="0 0 20 10">
            <polygon points="10,0 20,10 0,10" fill="white" />
          </svg>
        </div>
        <div className=" bg-white p-2 rounded-lg ">
          <header className="p-3 text-center">
            <div className="avatar">{user?.user?.charAt(0).toUpperCase()}</div>
            <h5 className="modern-card-title">{user?.user}</h5>
          </header>
          <div className="modern-card-item" onClick={handleUpdateProfile}>
            <img
              src={usericons?.User_Profile}
              alt="user profile"
              className="w-8 h-8"
            />
            <span className="text-[.95rem]">Update Account</span>
          </div>
          <div className="modern-card-item" onClick={handleChangePassword}>
            <img
              src={usericons?.Reset}
              alt="change password"
              className="w-7 h-7"
            />
            <span className="text-[.95rem]">Change Password</span>
          </div>
          <div
            className="modern-card-item"
            onClick={handleLogout}
          >
            <img src={usericons?.Logout} alt="Logout" className="w-7 h-7" />
            <span className="text-[.95rem]">Logout</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
