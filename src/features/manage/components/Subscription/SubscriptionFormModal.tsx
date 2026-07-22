import { toast } from "react-toastify";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { useAuthStore } from "../../../../store/useAuthStore";
import { decryptAESGCM } from "../../../../utils/dataDecrypt";
import { getListOfProviders } from "../../api/provider";
import {
  type CreateSubscriptionDto,
  type Subscription,
  createSubscription,
  updateSubscriptionById,
} from "../../api/subscription";

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
const SubscriptionFormModal = ({ open, onClose, subscription }: SubscriptionFormModalProps) => {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-xl">
        {/* Header */}

        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold">
              {subscription ? "Edit Subscription" : "Create Subscription"}
            </h2>

            <p className="text-sm text-gray-500">
              {subscription ? "Update subscription details" : "Create a new subscription"}
            </p>
          </div>

          <button onClick={onClose}>
            <X />
          </button>
        </div>

        {/* Body */}

        <div className="space-y-5 p-6">
          {/* Provider */}

          <div>
            <label className="mb-2 block text-sm font-medium">Provider</label>

            <select
              className="w-full rounded-lg border p-2.5"
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
            <label className="mb-2 block text-sm font-medium">Type</label>

            <input
              className="w-full rounded-lg border p-2.5"
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
            <label className="mb-2 block text-sm font-medium">URL</label>

            <input
              className="w-full rounded-lg border p-2.5"
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
            <label className="mb-2 block text-sm font-medium">Service Info</label>

            <textarea
              rows={4}
              className="w-full resize-none rounded-lg border p-2.5"
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

        <div className="flex justify-end gap-3 border-t px-6 py-4">
          <button onClick={onClose} className="rounded-lg border px-4 py-2">
            Cancel
          </button>

          <button
            disabled={isLoading}
            onClick={handleSubmit}
            className="bg-primary rounded-lg px-5 py-2 text-white"
          >
            {isLoading ? "Saving..." : subscription ? "Update Subscription" : "Create Subscription"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionFormModal;
