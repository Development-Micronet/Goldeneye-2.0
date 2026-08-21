import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { toast } from "react-toastify";
import { updateCompanyUser, type CompanyUser } from "../api/dashboard";
import { useAuthStore } from "../../../store/useAuthStore";
import { decryptAESGCM } from "../../../utils/dataDecrypt";
import Swal from "sweetalert2";

interface EditUserModalProps {
    open: boolean;
    onClose: () => void;
    user: CompanyUser | null;
    onSuccess?: () => void;

}

export const EditUserModal: React.FC<EditUserModalProps> = ({
    open,
    onClose,
    user,
    onSuccess,
}) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        username: "",
        email: "",
        first_name: "",
        last_name: "",
        tenant_role: "tenant_user",
        password: "",
    });

    // Pre-fill form values when modal opens with a selected user
    useEffect(() => {
        if (open && user) {
            setFormData({
                username: user.username || "",
                email: user.email || "",
                first_name: user.first_name || "",
                last_name: user.last_name || "",
                tenant_role: user.tenant_role || "tenant_user",
                password: "",
            });
        }
    }, [open, user]);

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
    ) => {
        const { name, value } = e.target;
        if (name === "username" && user && value !== user.username) {
            Swal.fire({
                title: "Warning",
                text: "Username cannot be changed",
                icon: "warning",
                confirmButtonColor: "#2F6E7C",
            });
            return;
        }
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!user) return;

        if (formData.username !== user.username) {
            Swal.fire({
                title: "Warning",
                text: "Username cannot be changed",
                icon: "warning",
                confirmButtonColor: "#2F6E7C",
            });
            return;
        }

        if (
            !formData.username ||
            !formData.email ||
            !formData.first_name ||
            !formData.last_name
        ) {
            toast.error("Please fill all required fields (*)");
            return;
        }
        const payload: any = {
            username: formData.username,
            email: formData.email,
            first_name: formData.first_name,
            last_name: formData.last_name,
            tenant_role: formData.tenant_role,
        };
        // Only include password if a new one is typed
        if (formData.password.trim() !== "") {
            payload.password = formData.password;
        }

        setLoading(true);
        try {
            await updateCompanyUser(user.id, formData);
            toast.success("User updated successfully!");
            if (onSuccess) onSuccess();
            onClose();
        } catch (err: any) {
            console.error("Update error detail:", err);
            let errorMessage = "Failed to update user. Please try again.";

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

    if (!open || !user) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border-gray-150 flex flex-col max-h-[90vh] overflow-hidden">
                {/* Modal Header */}
                <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">Edit User</h2>
                        <p className="text-xs text-gray-500">Update details for {user.username}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition cursor-pointer"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Modal Body / Form */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">First Name *</label>
                            <input
                                type="text"
                                name="first_name"
                                value={formData.first_name}
                                onChange={handleChange}
                                required
                                className="w-full h-10 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Last Name *</label>
                            <input
                                type="text"
                                name="last_name"
                                value={formData.last_name}
                                onChange={handleChange}
                                required
                                className="w-full h-10 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Username *</label>
                        <input
                            type="text"
                            name="username"
                            value={formData.username}
                            onChange={handleChange}
                            onClick={() => {
                                Swal.fire({
                                    title: "Warning",
                                    text: "Username cannot be changed",
                                    icon: "warning",
                                    confirmButtonColor: "#2F6E7C",
                                });
                            }}
                            readOnly
                            required
                            className="w-full h-10 px-3 text-sm border border-gray-200 rounded-lg bg-gray-100 cursor-not-allowed text-gray-500 focus:outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Email *</label>
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            required
                            className="w-full h-10 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
                        />
                    </div>

                    {/* <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                            Password (leave blank to keep current)
                        </label>
                        <input
                            type="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            placeholder="••••••••"
                            className="w-full h-10 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
                        />
                    </div> */}

                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Tenant Role</label>
                        <select
                            name="tenant_role"
                            value={formData.tenant_role}
                            onChange={handleChange}
                            className="w-full h-10 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 bg-white"
                        >
                            <option value="tenant_user">Tenant User</option>
                            <option value="tenant_admin">Tenant Admin</option>
                        </select>
                    </div>

                    {/* Modal Footer */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 text-sm font-medium text-white bg-teal-700 rounded-lg hover:bg-teal-800 transition disabled:opacity-50 cursor-pointer"
                        >
                            {loading ? "Updating..." : "Save Changes"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
