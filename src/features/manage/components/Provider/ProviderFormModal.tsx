import { useState } from "react";
import { X } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createProvider,
  type CreateProviderDto,
  type Status,
} from "../../api/provider";
import { toast } from "react-toastify";
type ProviderFormModalProps = {
  open: boolean;
  onClose: () => void;
};

const ProviderFormModal = ({ open, onClose }: ProviderFormModalProps) => {
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<CreateProviderDto>({
    name: "",
    description: "",
    status: "Active",
    credentials: {
      api_key: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: createProvider,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["providers"],
      });

      setFormData({
        name: "",
        description: "",
        status: "Active",
        credentials: {
          api_key: "",
        },
      });

      onClose();
    },
  });

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast.error("Provider name is required");
      return;
    }

    if (!formData.credentials.api_key.trim()) {
      toast.error("API key is required");
      return;
    }

    createMutation.mutate(formData);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="font-mona text-base font-semibold text-gray-900">
              Create Provider
            </h2>
            <p className="mt-0.5 text-xs text-text-secondary">
              Add a new provider configuration
            </p>
          </div>

          <button
            onClick={onClose}
            disabled={createMutation.isPending}
            className="rounded-lg p-2 text-text-secondary hover:bg-gray-100 hover:text-gray-900 transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-5 p-6">
          {/* Name */}
          <div>
            <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-text-secondary">
              Provider Name
            </label>

            <input
              type="text"
              placeholder="Airbus"
              value={formData.name}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  name: e.target.value,
                })
              }
              className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:bg-primary/5 focus:ring-2 focus:ring-primary/10"
            />
          </div>

          {/* Description */}
          <div>
            <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-text-secondary">
              Description
            </label>

            <textarea
              rows={3}
              placeholder="Provider description..."
              value={formData.description}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  description: e.target.value,
                })
              }
              className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm outline-none resize-none transition focus:border-primary focus:bg-primary/5 focus:ring-2 focus:ring-primary/10"
            />
          </div>

          {/* API Key */}
          <div>
            <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-text-secondary">
              API Key
            </label>

            <input
              type="text"
              placeholder="Enter API key"
              value={formData.credentials.api_key}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  credentials: {
                    api_key: e.target.value,
                  },
                })
              }
              className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm font-mono outline-none transition focus:border-primary focus:bg-primary/5 focus:ring-2 focus:ring-primary/10"
            />
          </div>

          {/* Status */}
          <div>
            <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-text-secondary">
              Status
            </label>

            <select
              value={formData.status}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  status: e.target.value as Status,
                })
              }
              className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:bg-primary/5 focus:ring-2 focus:ring-primary/10"
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          {/* Error */}
          {createMutation.isError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
              Failed to create provider.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
          <button
            onClick={onClose}
            disabled={createMutation.isPending}
            className="rounded-lg border border-border px-4 py-2 text-sm text-text-muted hover:bg-gray-50 transition"
          >
            Cancel
          </button>

          <button
            onClick={handleSubmit}
            disabled={createMutation.isPending}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition disabled:opacity-50"
          >
            {createMutation.isPending ? "Creating..." : "Create Provider"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProviderFormModal;
