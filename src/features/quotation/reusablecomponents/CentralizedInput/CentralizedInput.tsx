import React, { useState, useEffect } from "react";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import validateInput from "./validationUtils";

interface CentralizedInputsProps {
  name: string;
  type?: string;
  value: any;
  onChange: (e: { target: { name: string; value: any } }) => void;
  label?: string;
  options?: Array<{ value: string | number; label: string }>;
  required?: boolean;
  placeholder?: string;
  validationRules?: Record<string, any>;
  onValidationError?: (name: string, error: string) => void;
  isSubmitted?: boolean;
  errorMessage?: string;
  disable?: boolean;
  hasCountryCode?: boolean;
}

const CentralizedInputs: React.FC<CentralizedInputsProps> = ({
  name,
  type = "text",
  value,
  onChange,
  label,
  options = [],
  required = false,
  placeholder,
  validationRules,
  onValidationError = () => {},
  isSubmitted,
  errorMessage,
  disable,
  hasCountryCode,
}) => {
  const [error, setError] = useState<string>("");
  const [maxLengthWarning, setMaxLengthWarning] = useState<string>("");

  const letterRegex = /^[A-Za-z]*$/;
  const usernameRegex = /^[a-zA-Z0-9@%&*_\-]*$/;

  const handleChange = (e: any, countryData?: any) => {
    let inputName: string, inputValue: any;

    if (typeof e === "string") {
      inputName = "mobileNo";
      inputValue = e;
    } else {
      const { name: fieldName, value: fieldValue } = e.target;
      inputName = fieldName;
      inputValue = fieldValue;
    }

    const rules = validationRules ? validationRules[inputName] : null;
    let formattedValue = inputValue;

    if (inputName === "firstName" || inputName === "middleName" || inputName === "lastName") {
      if (!letterRegex.test(formattedValue)) return;
      formattedValue =
        formattedValue.charAt(0).toUpperCase() + formattedValue.slice(1).toLowerCase();
    } else if (
      inputName === "organization" ||
      inputName === "designation" ||
      inputName === "department"
    ) {
      formattedValue = formattedValue.trimStart();
      formattedValue =
        formattedValue.charAt(0).toUpperCase() + formattedValue.slice(1).toLowerCase();
    } else if (inputName === "registrationNumber") {
      formattedValue = formattedValue.trimStart().toUpperCase();
    } else if (inputName === "username") {
      if (!usernameRegex.test(formattedValue) && formattedValue !== "") return;
    } else if (inputName === "mobileNo" || inputName === "officeContactNumber") {
      if (formattedValue.charAt(0) === "0" || !/^\d*$/.test(formattedValue)) return;
    } else if (inputName === "phoneLan" || inputName === "officelanNumber") {
      formattedValue = formattedValue.replace(/[^0-9\s()-]/g, "");
    } else if (inputName === "pin") {
      if (!/^\d*$/.test(formattedValue)) return;
    }

    if (rules?.maxLength) {
      formattedValue = formattedValue.slice(0, rules.maxLength);
      if (formattedValue.length >= rules.maxLength) {
        setMaxLengthWarning(`Max ${rules.maxLength} characters.`);
        setTimeout(() => setMaxLengthWarning(""), 3000);
      } else {
        setMaxLengthWarning("");
      }
    }

    onChange({ target: { name: inputName, value: formattedValue } });

    const validationError = validateInput(formattedValue, rules);
    setError(validationError);
    onValidationError(inputName, validationError);
  };

  const handleBlur = () => {
    if (validationRules && validationRules[name]?.required) {
      const validationError = validateInput(value, validationRules[name]);
      setError(validationError);
      onValidationError(name, validationError);
    }
  };

  useEffect(() => {
    if (isSubmitted && validationRules) {
      const validationError = validateInput(value, validationRules[name]);
      setError(validationError);
      onValidationError(name, validationError);
    }
  }, [isSubmitted]);

  return (
    <div className="form-group w-full">
      {label && (
        <label htmlFor={name} className="mb-2 block text-sm font-medium text-gray-700">
          {label} <span className="text-red-500">{required && "*"}</span>
        </label>
      )}

      {(error || errorMessage || maxLengthWarning) && (
        <span
          className={`text-xs font-medium ${
            error || errorMessage ? "text-red-500" : "text-gray-500"
          }`}
        >
          {error || errorMessage || maxLengthWarning}
        </span>
      )}

      {hasCountryCode ? (
        <PhoneInput
          country={"in"}
          value={value}
          onChange={handleChange}
          inputProps={{
            name: "mobileNo",
            required: required,
          }}
          containerClass="w-full"
          inputClass={`w-full h-12 border rounded-lg px-3 py-2 
                        ${error || errorMessage ? "border-red-500" : "border-gray-300"} 
                        ${disable ? "cursor-not-allowed bg-gray-200" : ""}`}
        />
      ) : type === "select" ? (
        <select
          name={name}
          className={`h-12 w-full rounded-lg border px-3 py-2 ${
            error || errorMessage ? "border-red-500" : "border-gray-300"
          } ${disable ? "cursor-not-allowed bg-gray-200" : ""}`}
          value={value}
          onChange={handleChange}
          disabled={disable}
        >
          <option value="" disabled>
            {value ? value : `Choose ${label}`}
          </option>
          {options?.map((option) => (
            <option key={option?.value} value={option?.value}>
              {option?.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={type}
          className={`w-full rounded-lg border px-3 py-2 ${
            error || errorMessage ? "border-red-500" : "border-gray-300"
          } ${disable ? "cursor-not-allowed bg-gray-200" : ""}`}
          name={name}
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disable}
        />
      )}
    </div>
  );
};

export default CentralizedInputs;
