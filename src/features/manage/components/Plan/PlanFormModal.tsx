import { toast } from "react-toastify";
import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { createPlan, updatePlan, type CreatePlanDto, type Plan } from "../../api/plans";
import { useCreatePlanMutation, useUpdatePlanMutation } from "../../hooks/usePlans";

type PlanFormModalProps = {
    open: boolean;
    onClose: () => void;
    plan?: Plan | null;
};

// Provider dynamic selection ke mapping options
const PROVIDER_SENSORS_MAP: Record<string, string[]> = {
    airbus: ["PHR", "SPOT", "PNEO"],
    planet: [
        "PELICANSCENE",
        "PSSCENE",
        "REORTHOTILE",
        "RESCENE",
        "SKYSATCOLLECT",
        "SKYSATSCENE",
        "SKYSATVIDEO",
        "TANAGERSCENE",
        "TANAGERMETHANE",
    ],
    sentinel: ["sentinel-2-l2a", "sentinel-1-grd"],
};

const SERVICES_OPTIONS = ["search", "api_key"];

const initialForm: CreatePlanDto = {
    name: "",
    description: "",
    start_date: "",
    end_date: "",
    allowed_providers: [],
    allowed_sensors: {},
    services: [],
    is_active: true,
};

export const PlanFormModal = ({ open, onClose, plan }: PlanFormModalProps) => {
    const queryClient = useQueryClient();
    const [formData, setFormData] = useState<CreatePlanDto>(initialForm);
    const createMutation = useCreatePlanMutation(); // Standard react-query hook
    const updateMutation = useUpdatePlanMutation(); // ← update hook

    // Edit state me inputs ko prefill karne ke liye
    React.useEffect(() => {
        if (plan) {
            setFormData({
                name: plan.name,
                description: plan.description,
                start_date: plan.start_date,
                end_date: plan.end_date,
                allowed_providers: plan.allowed_providers,
                allowed_sensors: plan.allowed_sensors,
                services: plan.services,
                is_active: plan.is_active,
            });
        } else {
            setFormData(initialForm);
        }
    }, [plan, open]);

    const handleProviderChange = (provider: string) => {
        const isSelected = formData.allowed_providers.includes(provider);
        let newProviders = [...formData.allowed_providers];
        let newSensors = { ...formData.allowed_sensors };

        if (isSelected) {
            newProviders = newProviders.filter((p) => p !== provider);
            delete newSensors[provider];
        } else {
            newProviders.push(provider);
            // Checked hote hi saare child sensors ko auto-select karein
            newSensors[provider] = [...PROVIDER_SENSORS_MAP[provider]];
        }

        setFormData({
            ...formData,
            allowed_providers: newProviders,
            allowed_sensors: newSensors,
        });
    };

    const handleSensorChange = (provider: string, sensor: string) => {
        const providerSensors = formData.allowed_sensors[provider] || [];
        const isSelected = providerSensors.includes(sensor);
        let newSensorsForProvider = [...providerSensors];

        if (isSelected) {
            newSensorsForProvider = newSensorsForProvider.filter((s) => s !== sensor);
        } else {
            newSensorsForProvider.push(sensor);
        }

        setFormData({
            ...formData,
            allowed_sensors: {
                ...formData.allowed_sensors,
                [provider]: newSensorsForProvider,
            },
        });
    };

    const handleServiceChange = (service: string) => {
        const isSelected = formData.services.includes(service);
        let newServices = [...formData.services];

        if (isSelected) {
            newServices = newServices.filter((s) => s !== service);
        } else {
            newServices.push(service);
        }

        setFormData({
            ...formData,
            services: newServices,
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name.trim()) {
            toast.error("Plan Name is required");
            return;
        }
        if (!formData.start_date) {
            toast.error("Start Date is required");
            return;
        }
        if (!formData.end_date) {
            toast.error("End Date is required");
            return;
        }
        if (formData.allowed_providers.length === 0) {
            toast.error("Select at least one Provider");
            return;
        }

        // Check karein ki har checked provider ke andar kam se kam ek sensor checked ho
        for (const provider of formData.allowed_providers) {
            const sensors = formData.allowed_sensors[provider] || [];
            if (sensors.length === 0) {
                toast.error(`Please select at least one sensor for "${provider}"`);
                return;
            }
        }

        if (plan) {
            updateMutation.mutate({ id: plan.id, data: formData }, {
                onSuccess: () => {
                    toast.success("Plan updated successfully");
                    onClose();
                },
                onError: (err: any) => {
                    toast.error("Failed to update: " + (err.message || "Unknown error"));
                }
            });
        } else {
            createMutation.mutate(formData, {
                onSuccess: () => {
                    toast.success("Plan created successfully");
                    onClose();
                },
                onError: (err: any) => {
                    toast.error("Failed to create: " + (err.message || "Unknown error"));
                }
            });
        }
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30  p-4 overflow-y-auto">
            <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl overflow-hidden my-8">

                {/* Header */}
                <div className="flex justify-between items-center border-b px-6 py-4 bg-gray-50/20">
                    <div>
                        <h2 className="font-mona text-base font-semibold text-gray-900">
                            {plan ? "Edit Plan" : "Create Plan"}
                        </h2>
                        <p className="text-xs text-gray-550 mt-0.5">
                            Configure a new service access plan
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-lg p-2 text-gray-450 hover:bg-gray-150 hover:text-gray-900 transition cursor-pointer"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Form Body */}
                <form onSubmit={handleSubmit}>
                    <div className="space-y-5 p-6 overflow-y-auto max-h-[60vh] text-xs sm:text-sm">

                        {/* Plan Name */}
                        <div>
                            <label className="block text-xs font-semibold mb-1.5 text-gray-700">Plan Name</label>
                            <input
                                type="text"
                                className="w-full border rounded-lg p-2.5 border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1F4E57]/15 focus:border-[#1F4E57] transition-all placeholder-gray-400"
                                placeholder="e.g. Enterprise Q3 2026"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-xs font-semibold mb-1.5 text-gray-700">Description</label>
                            <textarea
                                rows={3}
                                className="w-full border rounded-lg p-2.5 resize-none border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1F4E57]/15 focus:border-[#1F4E57] transition-all placeholder-gray-400"
                                placeholder="Enter plan details..."
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>

                        {/* Dates Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold mb-1.5 text-gray-700">Start Date</label>
                                <input
                                    type="date"
                                    className="w-full border rounded-lg p-2.5 border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1F4E57]/15 focus:border-[#1F4E57] transition-all text-gray-800"
                                    value={formData.start_date}
                                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold mb-1.5 text-gray-700">End Date</label>
                                <input
                                    type="date"
                                    className="w-full border rounded-lg p-2.5 border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1F4E57]/15 focus:border-[#1F4E57] transition-all text-gray-800"
                                    value={formData.end_date}
                                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Allowed Providers & Dynamic Nested Sensors */}
                        <div>
                            <label className="block text-xs font-semibold mb-2 text-gray-700">Allowed Providers & Sensors</label>
                            <div className="space-y-3 border border-gray-200 rounded-xl p-4 bg-gray-50/30">
                                {Object.keys(PROVIDER_SENSORS_MAP).map((provider) => {
                                    const isProviderSelected = formData.allowed_providers.includes(provider);
                                    return (
                                        <div key={provider} className={`p-3 rounded-lg border transition-all ${isProviderSelected ? 'bg-white border-gray-250 shadow-xs' : 'bg-transparent border-transparent'}`}>
                                            <label className="flex items-center gap-2.5 font-bold capitalize text-gray-800 select-none cursor-pointer text-xs sm:text-sm">
                                                <input
                                                    type="checkbox"
                                                    className="h-4.5 w-4.5 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer accent-[#1F4E57]"
                                                    checked={isProviderSelected}
                                                    onChange={() => handleProviderChange(provider)}
                                                />
                                                {provider}
                                            </label>

                                            {/* Sensors selection nested border list */}
                                            {isProviderSelected && (
                                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pl-7 pt-3 mt-2 border-t border-gray-150">
                                                    {PROVIDER_SENSORS_MAP[provider].map((sensor) => {
                                                        const isSensorSelected = (formData.allowed_sensors[provider] || []).includes(sensor);
                                                        return (
                                                            <label key={sensor} className="flex items-center gap-2 text-xs text-gray-600 select-none cursor-pointer hover:text-gray-900 transition-colors">
                                                                <input
                                                                    type="checkbox"
                                                                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer accent-[#1F4E57]"
                                                                    checked={isSensorSelected}
                                                                    onChange={() => handleSensorChange(provider, sensor)}
                                                                />
                                                                {sensor}
                                                            </label>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Services Options */}
                        <div>
                            <label className="block text-xs font-semibold mb-2 text-gray-700">Services</label>
                            <div className="flex gap-6 pl-1">
                                {SERVICES_OPTIONS.map((service) => {
                                    const isSvcSelected = formData.services.includes(service);
                                    return (
                                        <label key={service} className="flex items-center gap-2 font-medium capitalize text-gray-700 select-none cursor-pointer hover:text-gray-900 transition-colors">
                                            <input
                                                type="checkbox"
                                                className="h-4.5 w-4.5 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer accent-[#1F4E57]"
                                                checked={isSvcSelected}
                                                onChange={() => handleServiceChange(service)}
                                            />
                                            {service.replace("_", " ")}
                                        </label>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Is Active Switch */}
                        <div className="flex items-center gap-2 pl-1 select-none">
                            <input
                                type="checkbox"
                                id="is_active_toggle"
                                className="h-4.5 w-4.5 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer accent-[#1F4E57]"
                                checked={formData.is_active}
                                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                            />
                            <label htmlFor="is_active_toggle" className="text-xs font-semibold text-gray-700 cursor-pointer hover:text-gray-900 transition-colors">
                                Set Plan as Active
                            </label>
                        </div>
                    </div>

                    {/* Footer Action buttons */}
                    <div className="flex justify-end gap-3 border-t px-6 py-4 bg-gray-50/50">
                        <button
                            type="button"
                            onClick={onClose}
                            className="border border-gray-300 rounded-lg px-4 py-2 hover:bg-gray-100 transition text-xs font-semibold cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={createMutation.isPending || updateMutation.isPending}
                            className="bg-primary text-white rounded-lg px-5 py-2 hover:bg-[#1F4E57] disabled:opacity-50 transition text-xs font-semibold cursor-pointer"
                        >
                            {createMutation.isPending || updateMutation.isPending ? "Saving..." : plan ? "Update Plan" : "Create Plan"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
