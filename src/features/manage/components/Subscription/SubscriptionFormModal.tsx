import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createSubscription,
  updateSubscriptionById,
  type CreateSubscriptionDto,
  type Subscription,
} from "../../api/subscription";

import { getListOfProviders } from "../../api/provider";
import { toast } from "react-toastify";
import { useAuthStore } from "../../../../store/useAuthStore";
import { decryptAESGCM } from "../../../../utils/dataDecrypt";

type Provider = {
  provider_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
};

type SubscriptionFormModalProps = {
  open: boolean;
  onClose: () => void;
  subscription?: Subscription | null;
};

const initialForm: CreateSubscriptionDto = {
  providerNames: [],
  type: "",
  url: "",
  serviceInfo: "",
};

const isValidUrl = (url: string): boolean => {
  try {
    const parsedUrl = new URL(url);

    return parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:";
  } catch {
    return false;
  }
};

const SubscriptionFormModal = ({
  open,
  onClose,
  subscription,
}: SubscriptionFormModalProps) => {
  const queryClient = useQueryClient();

  const { accessToken } = useAuthStore.getState();
  const token = accessToken?.replace("Bearer ", "").trim() || "";

  const [formData, setFormData] = useState<CreateSubscriptionDto>(initialForm);

  useEffect(() => {
    if (subscription) {
      setFormData({
        providerNames: subscription.providerNames,
        type: subscription.type,
        url: subscription.url,
        serviceInfo: subscription.serviceInfo,
      });
    } else {
      setFormData(initialForm);
    }
  }, [subscription, open]);

  /**
   * Providers
   */
  const { data: providers = [] } = useQuery({
    queryKey: ["providers-dropdown"],
    queryFn: async () => {
      const res = await getListOfProviders();

      if (!token) throw new Error("Missing token");

      const encryptedData = res.data as unknown as string;

      const decrypted = await decryptAESGCM(encryptedData, token);

      return decrypted.data as Provider[];
    },
  });

  /**
   * Create
   */
  const createMutation = useMutation({
    mutationFn: createSubscription,

    onSuccess: () => {
      toast.success("Subscription created successfully");

      queryClient.invalidateQueries({
        queryKey: ["subscriptions"],
      });

      setFormData(initialForm);

      onClose();
    },

    onError: () => {
      toast.error("Failed to create subscription");
    },
  });

  /**
   * Update
   */
  const updateMutation = useMutation({
    mutationFn: (data: CreateSubscriptionDto) =>
      updateSubscriptionById(subscription!.subscriptionId, data),

    onSuccess: () => {
      toast.success("Subscription updated successfully");

      queryClient.invalidateQueries({
        queryKey: ["subscriptions"],
      });

      onClose();
    },

    onError: () => {
      toast.error("Failed to update subscription");
    },
  });

  const isLoading = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = () => {
    if (formData.providerNames.length === 0) {
      toast.error("Please select a provider");
      return;
    }

    if (!formData.type.trim()) {
      toast.error("Type is required");
      return;
    }

    if (!formData.url.trim()) {
      toast.error("URL is required");
      return;
    }

    if (!isValidUrl(formData.url.trim())) {
      toast.error("Please enter a valid URL");
      return;
    }

    if (!formData.serviceInfo.trim()) {
      toast.error("Service Info is required");
      return;
    }

    if (subscription) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-white shadow-xl">
        {/* Header */}

        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="font-mona text-base font-semibold text-gray-900">
              {subscription ? "Edit Subscription" : "Create Subscription"}
            </h2>

            <p className="mt-0.5 text-xs text-text-secondary">
              {subscription
                ? "Update subscription details"
                : "Create a new subscription"}
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-2 text-text-secondary hover:bg-gray-100 hover:text-gray-900 transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}

        <div className="space-y-5 p-6">
          {/* Provider */}

          <div>
            <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-text-secondary">
              Provider
            </label>

            <select
              className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:bg-primary/5 focus:ring-2 focus:ring-primary/10"
              value={formData.providerNames[0] || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  providerNames: [e.target.value],
                })
              }
            >
              <option value="">Select Provider</option>

              {providers.map((provider) => (
                <option key={provider.provider_id} value={provider.name}>
                  {provider.name}
                </option>
              ))}
            </select>
          </div>

          {/* Type */}

          <div>
            <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-text-secondary">
              Type
            </label>

            <input
              className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:bg-primary/5 focus:ring-2 focus:ring-primary/10"
              placeholder="Premium"
              value={formData.type}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  type: e.target.value,
                })
              }
            />
          </div>

          {/* URL */}

          <div>
            <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-text-secondary">
              URL
            </label>

            <input
              className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:bg-primary/5 focus:ring-2 focus:ring-primary/10"
              placeholder="https://api.example.com"
              value={formData.url}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  url: e.target.value,
                })
              }
            />
          </div>

          {/* Service Info */}

          <div>
            <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-text-secondary">
              Service Info
            </label>

            <textarea
              rows={4}
              className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm outline-none resize-none transition focus:border-primary focus:bg-primary/5 focus:ring-2 focus:ring-primary/10"
              placeholder="Enter service information..."
              value={formData.serviceInfo}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  serviceInfo: e.target.value,
                })
              }
            />
          </div>
        </div>

        {/* Footer */}

        <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="rounded-lg border border-border px-4 py-2 text-sm text-text-muted hover:bg-gray-50 transition"
          >
            Cancel
          </button>

          <button
            disabled={isLoading}
            onClick={handleSubmit}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition disabled:opacity-50"
          >
            {isLoading
              ? "Saving..."
              : subscription
                ? "Update Subscription"
                : "Create Subscription"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionFormModal;
