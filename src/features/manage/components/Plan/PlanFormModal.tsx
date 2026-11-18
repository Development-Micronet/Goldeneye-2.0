import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { useQueryClient } from "@tanstack/react-query";
import {
  X,
  Check,
  ArrowRight,
  ArrowLeft,
  Calendar,
  Layers,
  ShieldCheck,
  Radio,
  FileText,
  ShoppingCart,
  Compass,
  Activity,
  Key,
  Box,
  Receipt,
  Map,
  Search,
} from "lucide-react";
import { type CreatePlanDto, type Plan } from "../../api/plans";
import { useCreatePlanMutation, useUpdatePlanMutation } from "../../hooks/usePlans";

type PlanFormModalProps = {
  open: boolean;
  onClose: () => void;
  plan?: Plan | null;
};

// Provider dynamic selection mapping options
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

const SERVICES_CONFIG = [
  { id: "search", label: "Search", desc: "Catalog & Archive AOI Search", icon: Search },
  { id: "tasking", label: "Tasking", desc: "Satellite Tasking Requests", icon: Radio },
  { id: "my_indent", label: "My Indent", desc: "Indent Requests & Feasibility", icon: FileText },
  { id: "my_orders", label: "My Orders", desc: "Purchased Orders & Delivery", icon: ShoppingCart },
  { id: "orbitography", label: "Orbitography", desc: "Passes & Satellite Orbits", icon: Compass },
  { id: "analytics", label: "Analytics", desc: "Raster & Model Execution", icon: Activity },
  { id: "api_key", label: "API Key", desc: "Programmatic API Key Access", icon: Key },
  { id: "geo_3d", label: "Geo 3D", desc: "3D Globe & Elevation Views", icon: Box },
  { id: "quotations", label: "Quotations", desc: "Pricing & Quote Estimates", icon: Receipt },
  { id: "wmts", label: "WMTS", desc: "OGC Tile Streaming Service", icon: Map },
];

const initialForm: CreatePlanDto = {
  name: "",
  description: "",
  start_date: "",
  end_date: "",
  allowed_providers: [],
  allowed_sensors: {},
  services: ["search"],
  is_active: true,
};

export const PlanFormModal = ({ open, onClose, plan }: PlanFormModalProps) => {
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [formData, setFormData] = useState<CreatePlanDto>(initialForm);

  const createMutation = useCreatePlanMutation();
  const updateMutation = useUpdatePlanMutation();

  // Pre-fill form when modal opens or plan changes
  useEffect(() => {
    if (open) {
      setCurrentStep(1);
      if (plan) {
        setFormData({
          name: plan.name || "",
          description: plan.description || "",
          start_date: plan.start_date || "",
          end_date: plan.end_date || "",
          allowed_providers: plan.allowed_providers || [],
          allowed_sensors: plan.allowed_sensors || {},
          services: plan.services || ["search"],
          is_active: plan.is_active ?? true,
        });
      } else {
        setFormData(initialForm);
      }
    }
  }, [plan, open]);

  // Provider Selection Logic
  const handleProviderChange = (provider: string) => {
    const isSelected = formData.allowed_providers.includes(provider);
    let newProviders = [...formData.allowed_providers];
    let newSensors = { ...formData.allowed_sensors };

    if (isSelected) {
      newProviders = newProviders.filter((p) => p !== provider);
      delete newSensors[provider];
    } else {
      newProviders.push(provider);
      // Auto-select all child sensors for convenience
      newSensors[provider] = [...PROVIDER_SENSORS_MAP[provider]];
    }

    setFormData({
      ...formData,
      allowed_providers: newProviders,
      allowed_sensors: newSensors,
    });
  };

  const handleSelectAllProviders = () => {
    const allProviders = Object.keys(PROVIDER_SENSORS_MAP);
    const allSensors: Record<string, string[]> = {};
    allProviders.forEach((p) => {
      allSensors[p] = [...PROVIDER_SENSORS_MAP[p]];
    });
    setFormData({
      ...formData,
      allowed_providers: allProviders,
      allowed_sensors: allSensors,
    });
  };

  const handleClearAllProviders = () => {
    setFormData({
      ...formData,
      allowed_providers: [],
      allowed_sensors: {},
    });
  };

  const handleSelectAllSensorsForProvider = (provider: string) => {
    setFormData({
      ...formData,
      allowed_sensors: {
        ...formData.allowed_sensors,
        [provider]: [...PROVIDER_SENSORS_MAP[provider]],
      },
    });
  };

  const handleClearSensorsForProvider = (provider: string) => {
    setFormData({
      ...formData,
      allowed_sensors: {
        ...formData.allowed_sensors,
        [provider]: [],
      },
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

  // Services Selection Logic
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

  const handleSelectAllServices = () => {
    setFormData({
      ...formData,
      services: SERVICES_CONFIG.map((s) => s.id),
    });
  };

  const handleResetServicesToDefault = () => {
    setFormData({
      ...formData,
      services: ["search"],
    });
  };

  // Step-wise Validation
  const validateStep1 = (): boolean => {
    if (!formData.name.trim()) {
      toast.error("Plan Name is required");
      return false;
    }
    if (!formData.start_date) {
      toast.error("Start Date is required");
      return false;
    }
    if (!formData.end_date) {
      toast.error("End Date is required");
      return false;
    }
    if (formData.start_date > formData.end_date) {
      toast.error("Start Date cannot be after End Date");
      return false;
    }
    return true;
  };

  const validateStep2 = (): boolean => {
    if (formData.allowed_providers.length === 0) {
      toast.error("Please select at least one provider");
      return false;
    }
    for (const provider of formData.allowed_providers) {
      const sensors = formData.allowed_sensors[provider] || [];
      if (sensors.length === 0) {
        toast.error(`Please select at least one sensor for "${provider}"`);
        return false;
      }
    }
    return true;
  };

  const validateStep3 = (): boolean => {
    if (formData.services.length === 0) {
      toast.error("Please select at least one service (*)");
      return false;
    }
    return true;
  };

  const handleNext = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (currentStep === 1) {
      if (validateStep1()) setCurrentStep(2);
    } else if (currentStep === 2) {
      if (validateStep2()) setCurrentStep(3);
    }
  };

  const handlePrev = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Guard: Prevent early submit before Step 3
    if (currentStep < 3) {
      handleNext();
      return;
    }

    if (!validateStep1() || !validateStep2() || !validateStep3()) {
      return;
    }

    if (plan) {
      updateMutation.mutate(
        { id: plan.id, data: formData },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["plans"] });
            queryClient.invalidateQueries({ queryKey: ["tenant-plans"] });
            queryClient.invalidateQueries({ queryKey: ["my-plan"] });
            toast.success("Plan updated successfully");
            onClose();
          },
          onError: (err: any) => {
            toast.error("Failed to update: " + (err.message || "Unknown error"));
          },
        },
      );
    } else {
      createMutation.mutate(formData, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["plans"] });
          queryClient.invalidateQueries({ queryKey: ["tenant-plans"] });
          queryClient.invalidateQueries({ queryKey: ["my-plan"] });
          toast.success("Plan created successfully");
          onClose();
        },
        onError: (err: any) => {
          toast.error("Failed to create: " + (err.message || "Unknown error"));
        },
      });
    }
  };

  if (!open) return null;

  const totalSelectedSensors = Object.values(formData.allowed_sensors).reduce(
    (acc, s) => acc + s.length,
    0,
  );

  const steps = [
    { num: 1, title: "Plan Details", desc: "Name & Validity" },
    { num: 2, title: "Providers & Sensors", desc: "Data Sources" },
    { num: 3, title: "Services & Review", desc: "Modules & Finalize" },
  ];

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
      <div className="relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl transition-all duration-300">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-gray-100 bg-gradient-to-r from-[#EFFBFD] via-[#f7fdfd] to-white px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              {plan ? "Edit Plan" : "Create Plan"}
            </h2>
            <p className="text-xs text-gray-500">
              {plan
                ? `Update configuration and services for ${plan.name}`
                : "Configure a new service access plan step-by-step"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="cursor-pointer rounded-lg p-1.5 text-gray-400 transition hover:bg-white hover:text-gray-700"
          >
            <X size={18} />
          </button>
        </div>

        {/* Wizard Step Progress Tracker */}
        <div className="border-b border-gray-100 bg-[#EFFBFD]/40 px-6 py-3 select-none">
          <div className="flex items-center justify-between">
            {steps.map((step, idx) => {
              const isActive = currentStep === step.num;
              const isPassed = currentStep > step.num;
              return (
                <React.Fragment key={step.num}>
                  <button
                    type="button"
                    onClick={() => {
                      if (step.num === 1) setCurrentStep(1);
                      if (step.num === 2 && validateStep1()) setCurrentStep(2);
                      if (step.num === 3 && validateStep1() && validateStep2()) setCurrentStep(3);
                    }}
                    className="flex cursor-pointer items-center gap-2.5 text-left transition outline-none"
                  >
                    <div
                      className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all ${
                        isActive
                          ? "bg-[#2c6671] text-white shadow-xs"
                          : isPassed
                            ? "bg-[#2c6671]/20 font-bold text-[#2c6671]"
                            : "bg-gray-200 text-gray-500"
                      }`}
                    >
                      {isPassed ? <Check size={14} /> : step.num}
                    </div>
                    <div className="hidden sm:block">
                      <p
                        className={`text-xs font-semibold ${
                          isActive
                            ? "text-[#2c6671]"
                            : isPassed
                              ? "text-gray-900"
                              : "text-gray-500"
                        }`}
                      >
                        {step.title}
                      </p>
                      <p className="text-[10px] text-gray-400">{step.desc}</p>
                    </div>
                  </button>

                  {idx < steps.length - 1 && (
                    <div
                      className={`mx-2 h-0.5 flex-1 transition-colors ${
                        currentStep > idx + 1 ? "bg-[#2c6671]" : "bg-gray-200"
                      }`}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Modal Form Content */}
        <form
          onSubmit={handleSubmit}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.target as HTMLElement).tagName !== "TEXTAREA") {
              if (currentStep < 3) {
                e.preventDefault();
                handleNext();
              }
            }
          }}
          className="flex flex-1 flex-col overflow-hidden"
        >
          <div className="flex-1 overflow-y-auto p-6">
            {/* ================= STEP 1: PLAN DETAILS ================= */}
            {currentStep === 1 && (
              <div className="space-y-5 animate-fadeIn">
                <div className="rounded-xl border border-[#2c6671]/20 bg-[#EFFBFD]/50 p-3 text-xs text-[#2c6671]">
                  <span className="font-bold">Step 1 of 3:</span> Specify the plan identification,
                  validity date range, and whether the plan is immediately active.
                </div>

                {/* Plan Name */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-gray-700">
                    Plan Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-xs text-gray-900 transition outline-none placeholder:text-gray-400 focus:border-[#2c6671] focus:ring-1 focus:ring-[#2c6671]"
                    placeholder="e.g. Enterprise Q3 2026"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                {/* Description (Optional) */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-gray-700">
                    Description <span className="text-gray-400 font-normal">(Optional)</span>
                  </label>
                  <textarea
                    rows={2}
                    className="w-full resize-none rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs text-gray-900 transition outline-none placeholder:text-gray-400 focus:border-[#2c6671] focus:ring-1 focus:ring-[#2c6671]"
                    placeholder="Brief description about the plan scope and target organizations..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                {/* Dates Grid */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700">
                      <Calendar className="h-3.5 w-3.5 text-[#2c6671]" />
                      Start Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs text-gray-900 transition outline-none focus:border-[#2c6671] focus:ring-1 focus:ring-[#2c6671]"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700">
                      <Calendar className="h-3.5 w-3.5 text-[#2c6671]" />
                      End Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs text-gray-900 transition outline-none focus:border-[#2c6671] focus:ring-1 focus:ring-[#2c6671]"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    />
                  </div>
                </div>

                {/* Is Active Toggle Card */}
                <div className="flex items-center justify-between rounded-xl border border-gray-200/80 bg-gray-50/60 p-4 transition select-none">
                  <div>
                    <label className="block text-xs font-semibold text-gray-900">
                      Set Plan as Active
                    </label>
                    <span className="mt-0.5 block text-[11px] text-gray-500">
                      Active plans can be assigned to tenant organizations immediately.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      formData.is_active ? "bg-[#2c6671]" : "bg-gray-200"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                        formData.is_active ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>
            )}

            {/* ================= STEP 2: ALLOWED PROVIDERS & SENSORS ================= */}
            {currentStep === 2 && (
              <div className="space-y-5 animate-fadeIn">
                <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-bold text-gray-900">
                      <Layers className="h-4 w-4 text-[#2c6671]" />
                      Allowed Providers & Sensors <span className="text-red-500">*</span>
                    </label>
                    <p className="text-[11px] text-gray-500">
                      Select which satellite imagery providers and sensor types are accessible.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={handleSelectAllProviders}
                      className="cursor-pointer font-bold text-[#2c6671] transition hover:underline"
                    >
                      Select All
                    </button>
                    <span className="text-gray-300">|</span>
                    <button
                      type="button"
                      onClick={handleClearAllProviders}
                      className="cursor-pointer font-medium text-gray-500 transition hover:underline"
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                {/* Providers List with Nested Sensors */}
                <div className="space-y-3.5">
                  {Object.keys(PROVIDER_SENSORS_MAP).map((provider) => {
                    const isProviderSelected = formData.allowed_providers.includes(provider);
                    const selectedSensorsCount =
                      formData.allowed_sensors[provider]?.length || 0;
                    const totalSensorsCount = PROVIDER_SENSORS_MAP[provider].length;

                    return (
                      <div
                        key={provider}
                        className={`overflow-hidden rounded-xl border transition-all duration-200 ${
                          isProviderSelected
                            ? "border-[#2c6671]/40 bg-[#EFFBFD]/25 shadow-xs"
                            : "border-gray-200 bg-white hover:border-gray-300"
                        }`}
                      >
                        {/* Provider Header Row */}
                        <div className="flex items-center justify-between p-3.5">
                          <label className="flex cursor-pointer items-center gap-3 text-sm font-bold text-gray-900 capitalize select-none">
                            <input
                              type="checkbox"
                              className="h-4 w-4 cursor-pointer rounded border-gray-300 accent-[#2c6671] focus:ring-[#2c6671]"
                              checked={isProviderSelected}
                              onChange={() => handleProviderChange(provider)}
                            />
                            {provider}
                          </label>

                          <div className="flex items-center gap-2">
                            {isProviderSelected && (
                              <span className="rounded-full border border-[#2c6671]/20 bg-[#2c6671]/10 px-2.5 py-0.5 text-[11px] font-bold text-[#2c6671]">
                                {selectedSensorsCount} / {totalSensorsCount} sensors
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Child Sensors Grid */}
                        {isProviderSelected && (
                          <div className="border-t border-[#2c6671]/15 bg-white/70 px-4 pt-2.5 pb-4">
                            <div className="mb-2 flex items-center justify-between text-[11px] text-gray-500">
                              <span>Sensors for {provider}:</span>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleSelectAllSensorsForProvider(provider)}
                                  className="cursor-pointer text-[#2c6671] hover:underline"
                                >
                                  All
                                </button>
                                <span className="text-gray-300">|</span>
                                <button
                                  type="button"
                                  onClick={() => handleClearSensorsForProvider(provider)}
                                  className="cursor-pointer text-gray-500 hover:underline"
                                >
                                  None
                                </button>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                              {PROVIDER_SENSORS_MAP[provider].map((sensor) => {
                                const isSensorSelected = (
                                  formData.allowed_sensors[provider] || []
                                ).includes(sensor);
                                return (
                                  <label
                                    key={sensor}
                                    className={`flex cursor-pointer items-center justify-between gap-1.5 rounded-lg border p-2 text-xs transition-all select-none ${
                                      isSensorSelected
                                        ? "border-[#2c6671] bg-[#EFFBFD] font-bold text-[#2c6671] shadow-2xs"
                                        : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-800"
                                    }`}
                                  >
                                    <span className="truncate">{sensor}</span>
                                    <input
                                      type="checkbox"
                                      className="h-3.5 w-3.5 cursor-pointer rounded border-gray-300 accent-[#2c6671] focus:ring-[#2c6671]"
                                      checked={isSensorSelected}
                                      onChange={() => handleSensorChange(provider, sensor)}
                                    />
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

                {formData.allowed_providers.length === 0 && (
                  <p className="text-[11px] font-medium text-amber-600">
                    * Please select at least one provider and its sensors before continuing.
                  </p>
                )}
              </div>
            )}

            {/* ================= STEP 3: SERVICES & REVIEW ================= */}
            {currentStep === 3 && (
              <div className="space-y-5 animate-fadeIn">
                <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-bold text-gray-900">
                      <ShieldCheck className="h-4 w-4 text-[#2c6671]" />
                      Assigned Services & Features <span className="text-red-500">*</span>
                    </label>
                    <p className="text-[11px] text-gray-500">
                      Select which application modules are unlocked for users under this plan.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={handleSelectAllServices}
                      className="cursor-pointer font-bold text-[#2c6671] transition hover:underline"
                    >
                      Select All
                    </button>
                    <span className="text-gray-300">|</span>
                    <button
                      type="button"
                      onClick={handleResetServicesToDefault}
                      className="cursor-pointer font-medium text-gray-500 transition hover:underline"
                    >
                      Default (Search)
                    </button>
                  </div>
                </div>

                {/* Services Grid */}
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                  {SERVICES_CONFIG.map((service) => {
                    const isSvcSelected = formData.services.includes(service.id);
                    const ServiceIcon = service.icon;

                    return (
                      <label
                        key={service.id}
                        className={`flex cursor-pointer flex-col justify-between gap-2 rounded-xl border p-3 transition-all select-none ${
                          isSvcSelected
                            ? "border-[#2c6671] bg-[#EFFBFD] font-bold text-[#2c6671] shadow-2xs"
                            : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div
                              className={`flex h-6 w-6 items-center justify-center rounded-lg ${
                                isSvcSelected
                                  ? "bg-[#2c6671] text-white"
                                  : "bg-gray-100 text-gray-500"
                              }`}
                            >
                              <ServiceIcon size={13} />
                            </div>
                            <span className="text-xs uppercase">{service.label}</span>
                          </div>
                          <input
                            type="checkbox"
                            className="h-4 w-4 cursor-pointer rounded border-gray-300 accent-[#2c6671] focus:ring-[#2c6671]"
                            checked={isSvcSelected}
                            onChange={() => handleServiceChange(service.id)}
                          />
                        </div>
                        <p className="text-[10px] font-normal text-gray-500 leading-tight">
                          {service.desc}
                        </p>
                      </label>
                    );
                  })}
                </div>

                {formData.services.length === 0 && (
                  <p className="text-[11px] font-bold text-red-600">
                    * Please select at least one service before creating the plan.
                  </p>
                )}

                {/* Configuration Summary Review Card */}
                <div className="rounded-xl border border-gray-200/90 bg-gray-50/70 p-4">
                  <div className="flex items-center justify-between border-b border-gray-200/60 pb-2">
                    <span className="text-xs font-bold text-gray-800">
                      Configuration Summary Review
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        formData.is_active
                          ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
                          : "border border-gray-200 bg-gray-100 text-gray-600"
                      }`}
                    >
                      {formData.is_active ? "Active Plan" : "Inactive"}
                    </span>
                  </div>

                  <div className="mt-2.5 grid grid-cols-1 gap-2.5 text-xs sm:grid-cols-2">
                    <div>
                      <span className="text-gray-400">Plan Name:</span>{" "}
                      <span className="font-semibold text-gray-900">{formData.name || "-"}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Validity Period:</span>{" "}
                      <span className="font-semibold text-gray-900">
                        {formData.start_date || "-"} → {formData.end_date || "-"}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">Providers & Sensors:</span>{" "}
                      <span className="font-semibold text-gray-900">
                        {formData.allowed_providers.length} Providers ({totalSelectedSensors}{" "}
                        Sensors)
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">Services ({formData.services.length}):</span>{" "}
                      <span className="font-semibold text-[#2c6671]">
                        {formData.services.map((s) => s.replace(/_/g, " ")).join(", ") || "None"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer Step Navigation */}
          <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50/80 px-6 py-4">
            <div>
              {currentStep > 1 ? (
                <button
                  type="button"
                  onClick={handlePrev}
                  disabled={isSaving}
                  className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-700 transition hover:bg-gray-100 active:scale-95 disabled:opacity-50"
                >
                  <ArrowLeft size={14} />
                  <span>Previous</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSaving}
                  className="cursor-pointer rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-600 transition hover:bg-gray-100 disabled:opacity-50"
                >
                  Cancel
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {currentStep < 3 ? (
                <button
                  key="plan-step-btn-next"
                  type="button"
                  onClick={handleNext}
                  className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-[#2c6671] px-5 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-[#1f4e57] active:scale-95"
                >
                  <span>Next Step</span>
                  <ArrowRight size={14} />
                </button>
              ) : (
                <button
                  key="plan-step-btn-submit"
                  type="submit"
                  disabled={isSaving || formData.services.length === 0}
                  className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-[#2c6671] px-6 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-[#1f4e57] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSaving ? (
                    <div className="flex items-center gap-2">
                      <div className="h-3.5 w-3.5 animate-spin rounded-full border-b-2 border-white"></div>
                      <span>{plan ? "Updating Plan..." : "Creating Plan..."}</span>
                    </div>
                  ) : (
                    <span>{plan ? "Update Plan" : "Create Plan"}</span>
                  )}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
