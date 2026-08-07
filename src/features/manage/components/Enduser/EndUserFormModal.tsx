import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { toast } from "react-toastify";
import { registerUser } from "../../api/enduser";
import { useAuthStore } from "../../../../store/useAuthStore";
import { decryptAESGCM } from "../../../../utils/dataDecrypt";

interface EndUserFormModalProps {
    open: boolean;
    onClose: () => void;
    companies?: any[];
    defaultOrganization?: string;
    onSuccess?: () => void;
}

export const EndUserFormModal: React.FC<EndUserFormModalProps> = ({
    open,
    onClose,
    companies = [],
    defaultOrganization = "",
    onSuccess,
}) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        username: "",
        email: "",
        first_name: "",
        last_name: "",
        designation: "",
        department: "",
        mobile_number: "",
        organization_name: defaultOrganization,
        email_personal: "",
        country: "",
        state: "",
        city: "",
        locality: "",
        address: "",
        gender: "",
    });

    useEffect(() => {
        if (open) {
            setFormData({
                username: "",
                email: "",
                first_name: "",
                last_name: "",
                designation: "",
                department: "",
                mobile_number: "",
                organization_name: defaultOrganization,
                email_personal: "",
                country: "",
                state: "",
                city: "",
                locality: "",
                address: "",
                gender: "",
            });
        }
    }, [open, defaultOrganization]);


    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate required fields
        if (
            !formData.username ||
            !formData.email ||
            !formData.first_name ||
            !formData.last_name ||
            !formData.organization_name ||
            !formData.designation ||
            !formData.department ||
            !formData.mobile_number
        ) {
            toast.error("Please fill all required fields (*)");
            return;
        }

        setLoading(true);
        try {
            // Send complete payload as requested
            const payload = {
                ...formData,
                email_personal: formData.email_personal || formData.email, // fallback if empty
            };

            // await registerUser(payload);
            // toast.success("User registered successfully!");
            // if (onSuccess) onSuccess();
            // onClose();
            const response = await registerUser(payload);

            let successMessage = "User registered successfully!";
            if (response?.data) {
                try {
                    // Extract token and decrypt the success response data
                    const token = useAuthStore.getState().accessToken?.replace("Bearer ", "").trim() || "";
                    const decrypted = await decryptAESGCM(response.data, token);
                    successMessage = decrypted.message || successMessage;
                } catch (decryptErr) {
                    console.error("Failed to decrypt success response:", decryptErr);
                }
            }

            // Show the decrypted message in a confirmation alert box
            alert(successMessage);

            if (onSuccess) onSuccess();
            onClose();

        } catch (err: any) {
            console.error("Register error detail:", err);
            let errorMessage = "Failed to register user. Please try again.";

            if (err.response?.data?.data) {
                try {
                    const token = useAuthStore.getState().accessToken?.replace("Bearer ", "").trim() || "";
                    const decrypted = await decryptAESGCM(err.response.data.data, token);
                    errorMessage = decrypted.message || decrypted.results?.message || JSON.stringify(decrypted);
                } catch (decryptErr) {
                    console.error("Failed to decrypt error response:", decryptErr);
                }
            } else if (err.response?.data?.message) {
                errorMessage = err.response.data.message;
            }

            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40  p-4">
            <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
                {/* Modal Header */}
                <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">Add New End User</h2>
                        <p className="text-xs text-gray-500">Fill in the details to register a new user in an organization</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Modal Body / Scrollable Form */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
                    {/* Organization and Username */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wider">
                                Organization Name *
                            </label>
                            <select
                                name="organization_name"
                                value={formData.organization_name}
                                onChange={handleChange}
                                required
                                className="w-full h-10 px-3 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
                            >
                                <option value="">Select Organization</option>
                                {companies.map((company) => (
                                    <option key={company.id} value={company.company_name}>
                                        {company.company_name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wider">
                                Username *
                            </label>
                            <input
                                type="text"
                                name="username"
                                value={formData.username}
                                onChange={handleChange}
                                required
                                placeholder="e.g. john_d"
                                className="w-full h-10 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
                            />
                        </div>
                    </div>

                    {/* First Name and Last Name */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wider">
                                First Name *
                            </label>
                            <input
                                type="text"
                                name="first_name"
                                value={formData.first_name}
                                onChange={handleChange}
                                required
                                placeholder="John"
                                className="w-full h-10 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wider">
                                Last Name *
                            </label>
                            <input
                                type="text"
                                name="last_name"
                                value={formData.last_name}
                                onChange={handleChange}
                                required
                                placeholder="Doe"
                                className="w-full h-10 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
                            />
                        </div>
                    </div>

                    {/* Email and Personal Email */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wider">
                                Official Email *
                            </label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                required
                                placeholder="john.doe@company.com"
                                className="w-full h-10 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wider">
                                Personal Email
                            </label>
                            <input
                                type="email"
                                name="email_personal"
                                value={formData.email_personal}
                                onChange={handleChange}
                                placeholder="john.personal@gmail.com"
                                className="w-full h-10 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
                            />
                        </div>
                    </div>

                    {/* Designation, Department, and Mobile Number */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wider">
                                Designation *
                            </label>
                            <input
                                type="text"
                                name="designation"
                                value={formData.designation}
                                onChange={handleChange}
                                required
                                placeholder="Software Engineer"
                                className="w-full h-10 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wider">
                                Department *
                            </label>
                            <input
                                type="text"
                                name="department"
                                value={formData.department}
                                onChange={handleChange}
                                required
                                placeholder="IT"
                                className="w-full h-10 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wider">
                                Mobile Number *
                            </label>
                            <input
                                type="text"
                                name="mobile_number"
                                value={formData.mobile_number}
                                onChange={handleChange}
                                required
                                placeholder="1234567890"
                                className="w-full h-10 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
                            />
                        </div>
                    </div>

                    <hr className="border-gray-100" />

                    {/* Location Info (Country, State, City) */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wider">
                                Country
                            </label>
                            <input
                                type="text"
                                name="country"
                                value={formData.country}
                                onChange={handleChange}
                                placeholder="India"
                                className="w-full h-10 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wider">
                                State
                            </label>
                            <input
                                type="text"
                                name="state"
                                value={formData.state}
                                onChange={handleChange}
                                placeholder="Gujrat"
                                className="w-full h-10 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wider">
                                City
                            </label>
                            <input
                                type="text"
                                name="city"
                                value={formData.city}
                                onChange={handleChange}
                                placeholder="Mumbai"
                                className="w-full h-10 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
                            />
                        </div>
                    </div>

                    {/* Locality and Gender */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wider">
                                Locality
                            </label>
                            <input
                                type="text"
                                name="locality"
                                value={formData.locality}
                                onChange={handleChange}
                                placeholder="Andheri"
                                className="w-full h-10 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wider">
                                Gender
                            </label>
                            <select
                                name="gender"
                                value={formData.gender}
                                onChange={handleChange}
                                className="w-full h-10 px-3 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
                            >
                                <option value="">Select Gender</option>
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                    </div>

                    {/* Full Address */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wider">
                            Full Address
                        </label>
                        <textarea
                            name="address"
                            value={formData.address}
                            onChange={handleChange}
                            rows={2}
                            placeholder="123 Tech Park Road"
                            className="w-full p-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 resize-none"
                        />
                    </div>

                    {/* Footer Actions */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            className="rounded-lg border border-gray-200 px-5 py-2 text-sm text-gray-600 hover:bg-gray-50 transition cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="rounded-lg bg-primary hover:bg-[#1F4E57] px-6 py-2 text-sm font-semibold text-white shadow-sm transition disabled:opacity-50 cursor-pointer"
                        >
                            {loading ? "Registering..." : "Register User"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
