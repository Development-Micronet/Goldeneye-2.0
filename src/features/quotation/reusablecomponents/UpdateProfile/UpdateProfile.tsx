import React, { useState, useEffect } from "react";
import { City, Country, State } from "country-state-city";
import { useNavigate, useLocation } from "react-router-dom";
import { useUser } from "../../Auth/AuthProvider/AuthContext";
import "./UpdateProfile.css";
import leftarrow from "../../assets/Icons/sidebar-icons/arrow-left.png";
import { validationRules } from "../../constant";
import CustomBtn from "../button/CustomBtn";
import ModalManager from "../GeopicxPopupModals/ModalManager";
import { Spin } from "antd";
import CustomFieldsets from "../formLayout/CustomFieldset";
import validateInput from "../CentralizedInput/CentralizedInput";
import { useGetData, usePostData } from "../../hooks";

interface UpdateProfileProps {
  profileUpdatekey?: any;
  hadleblockUnblockUser?: any;
  isBlurred?: any;
  isVisibleproductbutton?: any;
  handleDelete?: any;
  handleProductallocation?: any;
  isActions?: any;
  isparentUsernameOfuser?: any;
  closeModal?: any;
  userProfile?: any;
}

const UpdateProfile: React.FC<UpdateProfileProps> = ({
  profileUpdatekey,
  isBlurred,
  isparentUsernameOfuser,
  userProfile: propUserProfile,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const userProfile = propUserProfile || location.state?.userProfile || {};
  const { userName, role } = useUser();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formErrors, setFormErrors] = useState<any>({});

  const countryvalue = userProfile?.country;
  const stateValue = userProfile?.state;

  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedState, setSelectedState] = useState("");
  const [cities, setCities] = useState<any[]>([]);

  const getCountryName = (isoCode: string) => {
    if (countryvalue === isoCode) {
      return countryvalue;
    } else {
      const country = Country.getAllCountries().find(
        (c) => c.isoCode === isoCode
      );
      return country ? country.name : "";
    }
  };

  const getStateName = (countryIsoCode: string, stateIsoCode: string) => {
    if (stateValue === stateIsoCode) {
      return stateValue;
    } else {
      const states = State.getStatesOfCountry(countryIsoCode);
      const state = states.find((s) => s.isoCode === stateIsoCode);
      return state ? state.name : "";
    }
  };

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

  const initialValues = {
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
  };

  useEffect(() => {
    if (userProfile?.country) {
      setSelectedCountry(userProfile.country);
      setCities(City.getCitiesOfState(userProfile.country, userProfile.state));
    }
  }, [userProfile]);

  const handleSubmit = async () => {
    setIsSubmitted(true);

    const isSame = Object.keys(initialValues).every(
      (key) => (initialValues as any)[key] === formData[key]
    );

    if (isSame) {
      ModalManager.warning({
        modalHeaderHeading: "Update Profile",
        modalBodyHeading: "",
        message: `No changes detected in this Form.`,
        confirmButtonText: "OK",
      });
      return;
    }

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
      office_contact_number:
        role === "superadmin" || role === "admin"
          ? formData.officeContactNumber
          : 0,
      office_lan_number:
        role === "superadmin" || role === "admin"
          ? formData.officelanNumber
          : 0,
      registration_number: formData.registrationNumber,
      pin: formData.pin,
    };

    ModalManager.confirm({
      modalHeaderHeading: "Update User Profile",
      modalBodyHeading: "Are you sure?",
      message: "Do you want to update user profile?",
      confirmButtonText: "Submit",
    }).then(async (result) => {
      if (result.isConfirmed) {
        updateProfile(registrationPayload, {
          onSuccess: (response: any) => {
            if (response) {
              ModalManager.success({
                modalHeaderHeading: "User Updated",
                message: "Profile updated Successfully",
                confirmButtonText: "OK",
              });
              setIsSubmitted(false);
              navigate(location.pathname, {
                state: { userProfile: registrationPayload },
              });
            }
          },
          onError: (registerError: any) => {
            if (registerError.response && registerError.response.data) {
              const data = registerError.response.data;
              const usernameErrors = data?.username || [];
              const emailErrors = data?.email || [];
              let errorMessage = "";

              if (usernameErrors.length > 0) {
                errorMessage += `${usernameErrors.join(", ")}`;
              }
              if (emailErrors.length > 0) {
                errorMessage +=
                  (errorMessage ? "\n" : "") + `${emailErrors.join(", ")}`;
              }
              if (errorMessage) {
                ModalManager.warning({
                  modalHeaderHeading: "Update user",
                  modalBodyHeading: "Warning",
                  message: errorMessage,
                  confirmButtonText: "OK",
                });
              }
            }
          },
        });
      }
    });
  };

  const handleCancelClick = () => {
    navigate(-1);
  };

  const requiredFields = [
    "firstName",
    "lastName",
    "gender",
    "mobileNo",
    "emailIdPersonal",
    "organization",
    "designation",
    "department",
    "entityType",
    "address",
    "country",
    "state",
    "city",
    "pin",
    "officeContactNumber",
    "organizationEmail",
    "username",
    "emailId",
  ];

  const [inputError, setInputError] = useState<any>({});

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    const lowercaseFields = ["emailIdPersonal", "organizationEmail", "emailId"];

    if (name === "mobileNo" || name === "officeContactNumber") {
      if (value.length < 10) {
        setInputError((prev: any) => ({ ...prev, [name]: "10 digits required" }));
      } else {
        setInputError((prev: any) => ({ ...prev, [name]: null }));
      }
    }

    if (name === "pin") {
      if (value.length < 6) {
        setInputError((prev: any) => ({ ...prev, [name]: "6 digits required" }));
      } else {
        setInputError((prev: any) => ({ ...prev, [name]: null }));
      }
    }

    if (
      name !== "mobileNo" &&
      name !== "officeContactNumber" &&
      name !== "pin"
    ) {
      if (requiredFields.includes(name)) {
        if (value.trim().length > 0) {
          setInputError((prev: any) => ({ ...prev, [name]: null }));
        }
      }
    }

    const updatedValue = lowercaseFields.includes(name)
      ? value.toLowerCase()
      : value;

    setFormData((prevData: any) => ({ ...prevData, [name]: updatedValue }));
  };

  return (
    <div className="h-full overflow-y-scroll bg-gray-100 p-6 mb-10">
      <div className="flex items-center text-[#444444] font-inter text-[30px] font-semibold leading-[43.57px] text-left underline-from-font decoration-skip-ink-none">
        <button onClick={handleCancelClick} className="mr-2 pb-2">
          <img src={leftarrow} alt="Back" className="w-7 h-7" />
        </button>
        Modify Your Account
      </div>

      <Spin spinning={isLoading} tip="Loading...">
        <div className="bg-white p-6 rounded-lg shadow mt-6 mb-4">
          <div className={`GECreateUsersForm w-full ${isBlurred ? "blurred" : ""}`}>
            <div className="p-2 overflow-y-auto scrollbar-thin">
              <CustomFieldsets legend="Personal Details">
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-4">
                  <div className="flex flex-col justify-center gap-1">
                    <label className="text-[.9rem]">
                      First Name
                      {requiredFields.includes("firstName") && (
                        <span className="text-red-500 mx-1">*</span>
                      )}
                      {inputError.firstName && (
                        <span className="text-[.8rem] text-red-500 italic ml-[1rem]">
                          {inputError.firstName}
                        </span>
                      )}
                    </label>
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
                    <label htmlFor="middleName" className="text-[.9rem]">
                      Middle Name
                    </label>
                    <input
                      type="text"
                      value={formData.middleName}
                      onChange={handleChange}
                      name="middleName"
                      id="middleName"
                      placeholder="Middle Name"
                      className="border-[.12rem] rounded-md focus:border-[#036aa1] focus:outline-none px-2 py-[.41rem]"
                    />
                  </div>

                  <div className="flex flex-col justify-center gap-1">
                    <label htmlFor="lastName" className="text-[.9rem]">
                      Last Name
                      {requiredFields.includes("lastName") && (
                        <span className="text-red-500 mx-1">*</span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={handleChange}
                      name="lastName"
                      id="lastName"
                      placeholder="Last Name"
                      className="border-[.12rem] rounded-md focus:border-[#036aa1] focus:outline-none px-2 py-[.41rem]"
                    />
                  </div>

                  <div className="flex flex-col justify-center gap-1">
                    <label htmlFor="gender" className="text-[.9rem]">
                      Gender
                    </label>
                    <select
                      name="gender"
                      id="gender"
                      value={formData.gender}
                      onChange={handleChange}
                      className="border-[.12rem] rounded-md focus:border-[#036aa1] focus:outline-none px-2 py-[.41rem]"
                    >
                      <option value="">Choose Gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="others">Others</option>
                    </select>
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4 mt-4">
                  <div className="flex flex-col justify-center gap-1">
                    <label htmlFor="mobileNo" className="text-[.9rem]">
                      Mobile No
                    </label>
                    <input
                      type="text"
                      value={formData.mobileNo}
                      onChange={handleChange}
                      name="mobileNo"
                      id="mobileNo"
                      placeholder="Enter Mobile No"
                      className="border-[.12rem] rounded-md focus:border-[#036aa1] focus:outline-none px-2 py-[.41rem]"
                    />
                  </div>

                  <div className="flex flex-col justify-center gap-1">
                    <label htmlFor="phoneLan" className="text-[.9rem]">
                      LAN Number
                    </label>
                    <input
                      type="text"
                      name="phoneLan"
                      id="phoneLan"
                      value={formData.phoneLan}
                      onChange={handleChange}
                      placeholder="Enter LAN No"
                      className="border-[.12rem] rounded-md focus:border-[#036aa1] focus:outline-none px-2 py-[.41rem]"
                    />
                  </div>

                  <div className="flex flex-col justify-center gap-1">
                    <label htmlFor="emailIdPersonal" className="text-[.9rem]">
                      Email ID
                    </label>
                    <input
                      type="email"
                      value={formData.emailIdPersonal}
                      onChange={handleChange}
                      name="emailIdPersonal"
                      id="emailIdPersonal"
                      placeholder="Enter email id"
                      className="border-[.12rem] rounded-md focus:border-[#036aa1] focus:outline-none px-2 py-[.41rem]"
                    />
                  </div>
                </div>
              </CustomFieldsets>

              <CustomFieldsets legend="Official Details">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="flex flex-col justify-center gap-1">
                    <label htmlFor="organization" className="text-[.9rem]">
                      Organization
                    </label>
                    <input
                      type="text"
                      value={formData.organization || ""}
                      onChange={role !== "admin" ? handleChange : undefined}
                      disabled={role === "admin"}
                      name="organization"
                      id="organization"
                      placeholder="Enter Organization Name"
                      className="border-[.12rem] rounded-md focus:border-[#036aa1] focus:outline-none px-2 py-[.41rem] disabled:cursor-not-allowed"
                    />
                  </div>

                  <div className="flex flex-col justify-center gap-1">
                    <label htmlFor="designation" className="text-[.9rem]">
                      Designation
                    </label>
                    <input
                      type="text"
                      value={formData.designation}
                      onChange={handleChange}
                      name="designation"
                      id="designation"
                      placeholder="Enter Designation"
                      className="border-[.12rem] rounded-md focus:border-[#036aa1] focus:outline-none px-2 py-[.41rem]"
                    />
                  </div>

                  <div className="flex flex-col justify-center gap-1">
                    <label htmlFor="department" className="text-[.9rem]">
                      Department
                    </label>
                    <input
                      type="text"
                      value={formData.department}
                      onChange={handleChange}
                      name="department"
                      id="department"
                      placeholder="Enter Department"
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
        </div>
      </Spin>
    </div>
  );
};

export default UpdateProfile;
