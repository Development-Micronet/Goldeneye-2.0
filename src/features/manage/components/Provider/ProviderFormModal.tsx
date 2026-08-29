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
      toast.success("Provider created successfully.");

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

    onError: () => {
      toast.error("Failed to create provider");
    },
  });
  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4 backdrop-blur-sm">
      <div
        ref={modalRef}
        className="border-border w-full max-w-lg overflow-hidden rounded-2xl border bg-white shadow-xl"
      >
        {/* Header */}
        <div className="border-border flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="font-mona text-base font-semibold text-gray-900">Create Provider</h2>
            <p className="text-text-secondary mt-0.5 text-xs">Add a new provider</p>
          </div>

          <button
            onClick={onClose}
            disabled={createMutation.isPending}
            className="text-text-secondary rounded-lg p-2 transition hover:bg-gray-100 hover:text-gray-900"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-5 p-6">
          {/* Name */}
          <div>
            <label className="text-text-secondary mb-2 block text-xs font-medium tracking-wide uppercase">
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
              className="border-border focus:border-primary focus:bg-primary/5 focus:ring-primary/10 w-full rounded-lg border bg-white px-3 py-2.5 text-sm transition outline-none focus:ring-2"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-text-secondary mb-2 block text-xs font-medium tracking-wide uppercase">
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
              className="border-border focus:border-primary focus:bg-primary/5 focus:ring-primary/10 w-full resize-none rounded-lg border bg-white px-3 py-2.5 text-sm transition outline-none focus:ring-2"
            />
          </div>

          {/* Status */}
          <div>
            <label className="text-text-secondary mb-2 block text-xs font-semibold tracking-wide uppercase">
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
                className="border-border hover:border-primary/40 focus:border-primary focus:bg-primary/5 focus:ring-primary/10 w-full appearance-none rounded-lg border bg-white px-3 py-2.5 pr-10 text-sm font-medium text-gray-700 transition-all outline-none focus:ring-2"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>

              {/* Custom arrow */}
              <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                <svg className="h-4 w-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            </div>

            {/* Status preview */}
            <div className="text-text-secondary mt-2 flex items-center gap-2 text-xs">
              <span
                className={`h-2 w-2 rounded-full ${
                  formData.is_active ? "bg-emerald-500" : "bg-gray-400"
                }`}
              />

              <span>{formData.is_active ? "Provider is active" : "Provider is inactive"}</span>
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
        <div className="border-border flex justify-end gap-2 border-t px-6 py-4">
          <button
            onClick={onClose}
            disabled={createMutation.isPending}
            className="border-border text-text-muted rounded-lg border px-4 py-2 text-sm transition hover:bg-gray-50"
          >
            Cancel
          </button>

          <button
            onClick={handleSubmit}
            disabled={createMutation.isPending}
            className="bg-primary rounded-lg px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {createMutation.isPending ? "Creating..." : "Create Provider"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProviderFormModal;
