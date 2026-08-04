import React, { useState, useEffect } from "react";
import { City, Country, State } from "country-state-city";
import { useNavigate, useLocation } from "react-router-dom";
import { useUser } from "../../Auth/AuthProvider/AuthContext";
import "./UpdateProfile.css";
import leftarrow from "../../assets/Icons/sidebar-icons/arrow-left.png";
import CustomBtn from "../button/CustomBtn";
import ModalManager from "../GeopicxPopupModals/ModalManager";
import { Spin, Tabs } from "antd";
import CustomFieldsets from "../formLayout/CustomFieldset";
import { useGetData, usePostData } from "../../hooks";
import { useQueryClient } from "@tanstack/react-query";

interface UpdateProfilesProps {
  profileUpdatekey?: any;
  hadleblockUnblockUser?: any;
  isBlurred?: any;
  isVisibleproductbutton?: any;
  handleDelete?: any;
  handleProductallocation?: any;
  isActions?: any;
  isparentUsernameOfuser?: any;
}

const UpdateProfiles: React.FC<UpdateProfilesProps> = ({
  profileUpdatekey,
  isBlurred,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const editedUser = location.state?.userProfile || {};

  const userProfile = location.state?.userProfile || {};
  const { userName, role } = useUser();
  const [activeTab, setActiveTab] = useState("0");
  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedState, setSelectedState] = useState("");

  const [formData, setFormData] = useState<any>({
    firstName: userProfile?.first_name || "",
    middleName: userProfile?.middle_name || "",
    lastName: userProfile?.last_name || "",
    organization: userProfile?.organization_name || "",
    designation: userProfile?.designation || "",
    department: userProfile?.department || "",
    gender: userProfile?.gender || "",
    country: userProfile?.country || "",
    state: userProfile?.state || "",
    city: userProfile?.city || "",
    mobileNo: userProfile?.mobile_number || "",
    phoneLan: userProfile?.phone_lan || "",
    locationName: userProfile?.location_name || "",
    username: userProfile?.username || "",
    emailId: userProfile?.email || "",
    emailIdPersonal: userProfile?.email_personal || "",
    organizationEmail: userProfile?.organization_email || "",
    emailIdAlt: userProfile?.email_alt || "",
    entityType: userProfile?.entity_type || "",
    legalName: userProfile?.legal_name || "",
    brandName: userProfile?.brand_name || "",
    address: userProfile?.address || "",
    locality: userProfile?.locality || "",
    officeContactNumber: userProfile?.office_contact_number || "",
    officelanNumber: userProfile?.office_lan_number || "",
    registrationNumber: userProfile?.registration_number || "",
    pin: userProfile?.pin || "",
  });

  const { mutate: updateProfile, isLoading } = usePostData(
    `customers/profile/${userProfile?.username}/`,
    ["update-user-profile", userName],
    profileUpdatekey ? "profiledata" : ["user-profile", userName]
  );

  const handleCancelClick = () => {
    navigate("/manage/user");
  };

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setFormData((prevData: any) => ({ ...prevData, [name]: value }));
  };

  const handleSubmit = async () => {
    const registrationPayload = {
      perentUsername: userName,
      username: formData.username,
      first_name: formData.firstName,
      middle_name: formData.middleName,
      last_name: formData.lastName,
      organization_name: formData.organization,
      designation: formData.designation,
      department: formData.department,
      gender: formData.gender,
      mobile_number: formData.mobileNo,
      phone_lan: formData.phoneLan,
      location_name: formData.locationName,
      email: formData.emailId,
      email_personal: formData.emailIdPersonal,
      email_alt: formData.emailIdAlt,
      organization_email: formData.organizationEmail,
      country: formData.country,
      state: formData.state,
      city: formData.city,
      entity_type: formData.entityType,
      legal_name: formData.legalName,
      brand_name: formData.brandName,
      address: formData.address,
      locality: formData.locality,
      office_contact_number: formData.officeContactNumber,
      office_lan_number: formData.officelanNumber,
      registration_number: formData.registrationNumber,
      pin: formData.pin,
    };

    updateProfile(registrationPayload, {
      onSuccess: () => {
        ModalManager.success({
          modalHeaderHeading: "User Updated",
          message: "Profile updated Successfully",
          confirmButtonText: "OK",
        });
      },
    });
  };

  return (
    <div className="h-full overflow-y-scroll bg-[#f0f0f0] mb-10">
      <div className="flex items-center text-[#444444] md:text-[1.6rem] font-inter font-semibold leading-[43.57px] text-left">
        <button onClick={handleCancelClick} className="mr-2">
          <img src={leftarrow} alt="Back" className="w-7 h-7" />
        </button>
        Authorized User Details and Products
      </div>

      <Spin spinning={isLoading} tip="Loading...">
        <div className="bg-white p-6 rounded-lg shadow mt-3 mb-4">
          <Tabs activeKey={activeTab} onChange={setActiveTab}>
            <Tabs.TabPane
              tab={<span style={{ color: "#2C6671" }}>User Details</span>}
              key="0"
            >
              <div className={`GECreateUsersForm w-full ${isBlurred ? "blurred" : ""}`}>
                <div className="p-2 overflow-y-auto scrollbar-thin">
                  <CustomFieldsets legend="Personal Details">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-[50px]">
                      <div className="flex flex-col justify-center gap-1">
                        <label className="text-[.9rem]">First Name</label>
                        <input
                          type="text"
                          value={formData.firstName}
                          onChange={handleChange}
                          name="firstName"
                          placeholder="First Name"
                          className="border-[.12rem] rounded-md focus:border-[#036aa1] focus:outline-none px-2 py-[.41rem]"
                        />
                      </div>
                      <div className="flex flex-col justify-center gap-1">
                        <label className="text-[.9rem]">Last Name</label>
                        <input
                          type="text"
                          value={formData.lastName}
                          onChange={handleChange}
                          name="lastName"
                          placeholder="Last Name"
                          className="border-[.12rem] rounded-md focus:border-[#036aa1] focus:outline-none px-2 py-[.41rem]"
                        />
                      </div>
                    </div>
                  </CustomFieldsets>

                  <div className="flex justify-end gap-3 mt-6">
                    <CustomBtn
                      type="button"
                      label="Cancel"
                      onClick={handleCancelClick}
                      className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                    />
                    <CustomBtn
                      type="button"
                      label="Submit"
                      onClick={handleSubmit}
                      className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                    />
                  </div>
                </div>
              </div>
            </Tabs.TabPane>
          </Tabs>
        </div>
      </Spin>
    </div>
  );
};

export default UpdateProfiles;
