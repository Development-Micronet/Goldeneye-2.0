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
    airbus: ["PHR", "SPOT", "PNEO", "DMC"],
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
    sentinel: ["SENTINEL-1", "SENTINEL-2"],
};

const SERVICES_OPTIONS = ["search", "api_key", "orbitography", "analytics"];

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
        if (formData.services.length === 0) {
            toast.error("Select at least one Service");
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
    }; if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 overflow-y-auto">
            <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-slate-100 overflow-hidden my-8 transition-all duration-300">

                {/* Header */}
                <div className="flex justify-between items-center border-b border-slate-100 px-6 py-4.5 bg-slate-50/50">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">
                            {plan ? "Edit Plan" : "Create Plan"}
                        </h2>
                        <p className="text-xs text-slate-550 mt-0.5">
                            Configure a new service access plan
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-xl p-2 text-slate-450 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Form Body */}
                <form onSubmit={handleSubmit}>
                    <div className="space-y-6 p-6 overflow-y-auto max-h-[65vh] text-xs sm:text-sm">

                        {/* Plan Name */}
                        <div className="space-y-2">
                            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                                Plan Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm transition-all placeholder:text-slate-400 focus:border-gray-400 focus:ring-1 focus:ring-gray-400 focus:outline-none"
                                placeholder="e.g. Enterprise Q3 2026"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>

                        {/* Dates Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            <div className="space-y-2">
                                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                                    Start Date <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="date"
                                    className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm transition-all focus:border-gray-400 focus:ring-1 focus:ring-gray-400 focus:outline-none text-slate-800"
                                    value={formData.start_date}
                                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                                    End Date <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="date"
                                    className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm transition-all focus:border-gray-400 focus:ring-1 focus:ring-gray-400 focus:outline-none text-slate-800"
                                    value={formData.end_date}
                                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Allowed Providers & Dynamic Nested Sensors */}
                        <div className="space-y-2">
                            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                                Allowed Providers & Sensors <span className="text-red-500">*</span>
                            </label>
                            <div className="space-y-3">
                                {Object.keys(PROVIDER_SENSORS_MAP).map((provider) => {
                                    const isProviderSelected = formData.allowed_providers.includes(provider);
                                    return (
                                        <div
                                            key={provider}
                                            className={`rounded-xl border transition-all duration-200 overflow-hidden ${isProviderSelected
                                                ? 'border-[#1F4E57]/30 bg-[#1F4E57]/5 shadow-sm'
                                                : 'border-slate-200 bg-white hover:border-slate-300'
                                                }`}
                                        >
                                            {/* Provider Header Row */}
                                            <div className="flex items-center justify-between p-3.5">
                                                <label className="flex items-center gap-3 font-bold capitalize text-slate-800 select-none cursor-pointer text-sm">
                                                    <input
                                                        type="checkbox"
                                                        className="h-4.5 w-4.5 rounded border-slate-300 text-[#1F4E57] focus:ring-[#1F4E57] cursor-pointer accent-[#1F4E57]"
                                                        checked={isProviderSelected}
                                                        onChange={() => handleProviderChange(provider)}
                                                    />
                                                    {provider}
                                                </label>
                                                {isProviderSelected && (
                                                    <span className="text-[11px] font-semibold text-[#1F4E57] bg-[#1F4E57]/10 px-2.5 py-0.5 rounded-full">
                                                        {formData.allowed_sensors[provider]?.length || 0} selected
                                                    </span>
                                                )}
                                            </div>

                                            {/* Sensors List */}
                                            {isProviderSelected && (
                                                <div className="px-4 pb-4 pt-1 mt-1 border-t border-[#1F4E57]/15">
                                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                                                        {PROVIDER_SENSORS_MAP[provider].map((sensor) => {
                                                            const isSensorSelected = (formData.allowed_sensors[provider] || []).includes(sensor);
                                                            return (
                                                                <label
                                                                    key={sensor}
                                                                    className={`flex items-center gap-2 p-2 rounded-lg border text-xs select-none cursor-pointer transition-all ${isSensorSelected
                                                                        ? 'bg-white border-[#1F4E57]/45 text-[#1F4E57] font-semibold shadow-xs'
                                                                        : 'bg-slate-50/50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-800'
                                                                        }`}
                                                                >
                                                                    <input
                                                                        type="checkbox"
                                                                        className="h-4 w-4 rounded border-slate-300 text-[#1F4E57] focus:ring-[#1F4E57] cursor-pointer accent-[#1F4E57]"
                                                                        checked={isSensorSelected}
                                                                        onChange={() => handleSensorChange(provider, sensor)}
                                                                    />
                                                                    {sensor}
                                                                </label>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Services Options */}
                        <div className="space-y-2.5">
                            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                                Services <span className="text-red-500">*</span>
                            </label>
                            <div className="grid grid-cols-3 gap-3">
                                {SERVICES_OPTIONS.map((service) => {
                                    const isSvcSelected = formData.services.includes(service);
                                    return (
                                        <label
                                            key={service}
                                            className={`flex flex-col gap-2 p-3.5 rounded-xl border text-center select-none cursor-pointer transition-all duration-200 ${isSvcSelected
                                                ? 'bg-[#1F4E57]/5 border-[#1F4E57] text-[#1F4E57] font-bold shadow-xs'
                                                : 'bg-white border-slate-200 text-slate-650 hover:bg-slate-50 hover:border-slate-300'
                                                }`}
                                        >
                                            <div className="flex items-center justify-between w-full">
                                                <span className="text-xs uppercase tracking-wide">
                                                    {service.replace("_", " ")}
                                                </span>
                                                <input
                                                    type="checkbox"
                                                    className="h-4.5 w-4.5 rounded border-slate-300 text-[#1F4E57] focus:ring-[#1F4E57] cursor-pointer accent-[#1F4E57]"
                                                    checked={isSvcSelected}
                                                    onChange={() => handleServiceChange(service)}
                                                />
                                            </div>
                                        </label>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Is Active Toggle Switch */}
                        <div className="flex items-center justify-between p-4 bg-slate-50/50 border border-slate-200 rounded-xl select-none">
                            <div>
                                <label className="text-xs font-semibold text-slate-800 block">
                                    Set Plan as Active
                                </label>
                                <span className="text-[11px] text-slate-500 mt-0.5 block">
                                    Active plans are immediately available for user assignment.
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${formData.is_active ? "bg-[#1F4E57]" : "bg-slate-200"
                                    }`}
                            >
                                <span
                                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${formData.is_active ? "translate-x-5" : "translate-x-0"
                                        }`}
                                />
                            </button>
                        </div>
                    </div>

                    {/* Footer Action buttons */}
                    <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4.5 bg-slate-50/50">
                        <button
                            type="button"
                            onClick={onClose}
                            className="border border-slate-250 bg-white text-slate-700 rounded-xl px-5 py-2.5 hover:bg-slate-50 transition text-xs font-semibold cursor-pointer active:scale-95"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={createMutation.isPending || updateMutation.isPending}
                            className="bg-[#1F4E57] text-white rounded-xl px-6 py-2.5 hover:bg-[#15353c] disabled:opacity-50 transition text-xs font-semibold cursor-pointer active:scale-95 shadow-sm"
                        >
                            {createMutation.isPending || updateMutation.isPending ? "Saving..." : plan ? "Update Plan" : "Create Plan"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
