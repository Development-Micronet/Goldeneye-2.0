import { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createProvider, type CreateProviderDto } from "../../api/provider";
import { toast } from "react-toastify";
type ProviderFormModalProps = {
  open: boolean;
  onClose: () => void;
};

const ProviderFormModal = ({ open, onClose }: ProviderFormModalProps) => {
  const queryClient = useQueryClient();
  const modalRef = useRef<HTMLDivElement>(null);
  const [formData, setFormData] = useState<CreateProviderDto>({
    name: "",
    description: "",
    is_active: true,
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
        is_active: true,
      });

      onClose();
    },
  });
  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        modalRef.current &&
        !modalRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open, onClose]);
  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast.error("Provider name is required");
      return;
    }

    if (!formData.description.trim()) {
      toast.error("Provider description is required");
      return;
    }

    createMutation.mutate(formData);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm p-4">
      <div
        ref={modalRef}
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-white shadow-xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="font-mona text-base font-semibold text-gray-900">
              Create Provider
            </h2>
            <p className="mt-0.5 text-xs text-text-secondary">
              Add a new provider 
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

          {/* Status */}
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-text-secondary">
              Status
            </label>

            <div className="relative">
              <select
                value={formData.is_active ? "Active" : "Inactive"}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    is_active: e.target.value === "Active",
                  })
                }
                className="
        w-full appearance-none rounded-lg 
        border border-border 
        bg-white 
        px-3 py-2.5 pr-10
        text-sm font-medium text-gray-700
        outline-none
        transition-all
        hover:border-primary/40
        focus:border-primary
        focus:bg-primary/5
        focus:ring-2 focus:ring-primary/10
      "
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>

              {/* Custom arrow */}
              <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                <svg
                  className="h-4 w-4 text-gray-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            </div>

            {/* Status preview */}
            <div className="mt-2 flex items-center gap-2 text-xs text-text-secondary">
              <span
                className={`h-2 w-2 rounded-full ${
                  formData.is_active ? "bg-emerald-500" : "bg-gray-400"
                }`}
              />

              <span>
                {formData.is_active
                  ? "Provider is active"
                  : "Provider is inactive"}
              </span>
            </div>
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
