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

const SubscriptionFormModal = ({
  open,
  onClose,
  subscription,
}: SubscriptionFormModalProps) => {
  const queryClient = useQueryClient();

  const { accessToken } = useAuthStore.getState();
  const token = accessToken?.replace("Bearer ", "").trim() || "";

  const [formData, setFormData] =
    useState<CreateSubscriptionDto>(initialForm);

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

      const decrypted = await decryptAESGCM(
        encryptedData,
        token
      );

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

  const isLoading =
    createMutation.isPending || updateMutation.isPending;

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
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl overflow-hidden">

        {/* Header */}

        <div className="flex justify-between items-center border-b px-6 py-4">

          <div>
            <h2 className="text-lg font-semibold">
              {subscription
                ? "Edit Subscription"
                : "Create Subscription"}
            </h2>

            <p className="text-sm text-gray-500">
              {subscription
                ? "Update subscription details"
                : "Create a new subscription"}
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
            <label className="block text-sm font-medium mb-2">
              Provider
            </label>

            <select
              className="w-full border rounded-lg p-2.5"
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
                <option
                  key={provider.provider_id}
                  value={provider.name}
                >
                  {provider.name}
                </option>
              ))}
            </select>
          </div>

          {/* Type */}

          <div>
            <label className="block text-sm font-medium mb-2">
              Type
            </label>

            <input
              className="w-full border rounded-lg p-2.5"
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
            <label className="block text-sm font-medium mb-2">
              URL
            </label>

            <input
              className="w-full border rounded-lg p-2.5"
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
            <label className="block text-sm font-medium mb-2">
              Service Info
            </label>

            <textarea
              rows={4}
              className="w-full border rounded-lg p-2.5 resize-none"
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

          <button
            onClick={onClose}
            className="border rounded-lg px-4 py-2"
          >
            Cancel
          </button>

          <button
            disabled={isLoading}
            onClick={handleSubmit}
            className="bg-primary text-white rounded-lg px-5 py-2"
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