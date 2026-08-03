import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit2, Save, X, Loader2 } from "lucide-react";
import { type UpdateProviderPayload } from "../../api/provider";

import {
  UpdateProviderById,
  type UpdateProviderDto,
  type Provider,
  getProviderById,
} from "../../api/provider";
import { decryptAESGCM } from "../../../../utils/dataDecrypt";
import { useAuthStore } from "../../../../store/useAuthStore";
import { logger } from "../../../../utils/logger";
type Props = {
  providerid: string;
  onBack: () => void;
  startInEditMode?: boolean;
};

const ProviderViewAndEdit = ({ providerid, onBack, startInEditMode = false }: Props) => {
  const queryClient = useQueryClient();
  const { accessToken } = useAuthStore.getState();
  const token = accessToken?.replace("Bearer ", "").trim() || "";
  const modalRef = useRef<HTMLDivElement>(null);

  // FETCH PROVIDER
  const { data, isLoading } = useQuery({
    queryKey: ["provider", providerid],
    queryFn: async () => {
      const res = await getProviderById(providerid);
      if (!res) throw new Error("No provider data");

      if (!token) throw new Error("Missing token");
      const encryptedData = res as unknown as string;
      const decrypted = await decryptAESGCM(encryptedData, token);

      return decrypted.data as Provider;
    },
    enabled: !!providerid,
  });

  const provider: Provider | undefined = data;
  const [isEditing, setIsEditing] = useState(false);
  const emptyForm: UpdateProviderDto = {
    name: "",
    description: "",
    is_active: true,
  };
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onBack();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onBack]);
  const [formData, setFormData] = useState<UpdateProviderDto>(emptyForm);
  const isUnchanged =
    provider &&
    formData.name === provider.name &&
    formData.description === provider.description &&
    formData.is_active === provider.is_active;
  const openEditor = () => {
    if (!provider) return;

    setFormData({
      name: provider.name ?? "",
      description: provider.description ?? "",
      is_active: provider.is_active,
    });

    setIsEditing(true);
  };

  useEffect(() => {
    if (provider && startInEditMode) {
      setFormData({
        name: provider.name ?? "",
        description: provider.description ?? "",
        is_active: provider.is_active,
      });

      setIsEditing(true);
    }
  }, [provider, startInEditMode]);

  const inputStyles =
    "w-full px-3 py-2 text-sm rounded-lg bg-primary/5 border border-primary/15 focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition";

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: UpdateProviderPayload) => UpdateProviderById(id, data),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["provider", providerid] });
      queryClient.invalidateQueries({ queryKey: ["providers"] });
      setIsEditing(false);
    },

    onError: (err) => {
      logger.error(err);
    },
  });

  const handleSave = () => {
    if (!provider) return;

    updateMutation.mutate({
      id: provider.provider_id,
      data: formData,
    });
  };
  const handleCancel = () => {
    if (!provider) return;

    setFormData({
      name: provider.name ?? "",
      description: provider.description ?? "",
      is_active: provider.is_active,
    });

    onBack(); // Close the modal
  };
  if (isLoading || !provider) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4 backdrop-blur-sm">
        <div className="border-border w-full max-w-lg animate-pulse overflow-hidden rounded-2xl border bg-white shadow-xl">
          {/* Header Skeleton */}
          <div className="border-border flex items-center justify-between border-b px-6 py-4">
            <div className="h-4 w-20 rounded bg-gray-200" />
            <div className="h-8 w-20 rounded-lg bg-gray-200" />
          </div>

          {/* Body Skeleton */}
          <div className="divide-border/60 divide-y">
            {/* Name */}
            <div className="space-y-3 px-6 py-5">
              <div className="h-3 w-24 rounded bg-gray-200" />
              <div className="h-10 w-full rounded-lg bg-gray-200" />
            </div>

            {/* description */}
            <div className="space-y-3 px-6 py-5">
              <div className="h-3 w-32 rounded bg-gray-200" />
              <div className="h-20 w-full rounded-lg bg-gray-200" />
            </div>

            {/* Status */}
            <div className="space-y-3 px-6 py-5">
              <div className="h-3 w-20 rounded bg-gray-200" />
              <div className="h-8 w-28 rounded-full bg-gray-200" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/20 p-4 backdrop-blur-sm">
      <div
        ref={modalRef}
        className="border-border font-inter w-full max-w-lg overflow-hidden rounded-2xl border bg-white shadow-xl"
      >
        {/* Header */}

        <div className="border-border flex items-center justify-between border-b px-6 py-4">
          <button
            onClick={onBack}
            className="text-text-secondary hover:text-primary flex items-center gap-2 text-sm transition"
          >
            <X size={16} />
            Back
          </button>

          {!isEditing ? (
            <button
              onClick={() => {
                openEditor();
              }}
              className="bg-primary flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-white transition hover:opacity-90"
            >
              <Edit2 size={14} />
              Edit
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={updateMutation.isPending || isUnchanged}
                className="bg-primary flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
              >
                {updateMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving
                  </>
                ) : (
                  <>
                    <Save size={14} />
                    Save
                  </>
                )}
              </button>

              <button
                onClick={handleCancel}
                className="border-border text-text-muted flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition hover:bg-gray-50"
              >
                <X size={14} />
                Cancel
              </button>
            </div>
          )}
        </div>

        {/* Body */}

        <div className="divide-border/60 divide-y">
          {/* Name */}

          <div className="px-6 py-5">
            <p className="text-text-secondary mb-2 text-xs tracking-wide uppercase">Name</p>

            {isEditing ? (
              <input
                className={inputStyles}
                value={formData.name}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    name: e.target.value,
                  })
                }
              />
            ) : (
              <p className="text-sm font-medium text-gray-900">{provider.name}</p>
            )}
          </div>

          {/* description */}

          <div className="px-6 py-5">
            <p className="text-text-secondary mb-2 text-xs tracking-wide uppercase">description</p>

            {isEditing ? (
              <textarea
                rows={3}
                className={inputStyles}
                value={formData.description}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    description: e.target.value,
                  })
                }
              />
            ) : (
              <p className="text-text-muted text-sm leading-6">{provider.description || "—"}</p>
            )}
          </div>

          {/* Status */}
          <div className="px-6 py-5">
            <p className="text-text-secondary mb-2 text-xs tracking-wide uppercase">Status</p>

            {isEditing ? (
              <select
                className={inputStyles}
                value={formData.is_active ? "Active" : "Inactive"}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    is_active: e.target.value === "Active",
                  })
                }
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            ) : (
              <div className="space-y-2">
                <span
                  className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${
                    provider.is_active
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
                      provider.is_active ? "bg-emerald-500" : "bg-gray-400"
                    }`}
                  />

                  {provider.is_active ? "Active" : "Inactive"}
                </span>

                <p className="text-text-secondary text-xs">
                  {provider.is_active
                    ? "Provider is active and available for use."
                    : "Provider is inactive and currently unavailable."}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProviderViewAndEdit;
