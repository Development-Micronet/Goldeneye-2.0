import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Edit2, Save, X, Loader2, Eye, EyeOff } from "lucide-react";
import { type Status, type UpdateProviderPayload } from "../../api/provider";

import {
  UpdateProviderById,
  type UpdateProviderDto,
  type Provider,
  getProviderById,
} from "../../api/provider";

type Props = {
  providerid: string;
  onBack: () => void;
};

const ProviderViewAndEdit = ({ providerid, onBack }: Props) => {
  const queryClient = useQueryClient();
  const isValidStatus = (status: string): Status =>
    status === "Inactive" ? "Inactive" : "Active";

  // FETCH PROVIDER
  const { data, isLoading } = useQuery({
    queryKey: ["provider", providerid],
    queryFn: () => getProviderById(providerid),
    enabled: !!providerid,
  });

  const provider: Provider | undefined = data;
  const [showKey, setShowKey] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const emptyForm: UpdateProviderDto = {
    name: "",
    description: "",
    status: "Active",
    credentials: {
      api_key: "",
    },
  };

  const [formData, setFormData] = useState<UpdateProviderDto>(emptyForm);
  const isUnchanged =
    provider &&
    formData.name === provider.name &&
    formData.description === provider.description &&
    formData.status === provider.status &&
    formData.credentials.api_key === provider.credentials?.api_key;
  const openEditor = () => {
    if (!provider) return;

    setFormData({
      name: provider.name ?? "",
      description: provider.description ?? "",
      status: isValidStatus(provider.status),
      credentials: {
        api_key: provider.credentials?.api_key ?? "",
      },
    });

    setIsEditing(true);
  };

  const inputStyles =
    "w-full px-3 py-2 text-sm rounded-lg bg-primary/5 border border-primary/15 focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition";

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: UpdateProviderPayload) =>
      UpdateProviderById(id, data),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["provider", providerid] });
      queryClient.invalidateQueries({ queryKey: ["providers"] });
      setIsEditing(false);
    },

    onError: (err) => {
      console.error(err);
    },
  });

  const handleSave = () => {
    if (!provider) return;

    updateMutation.mutate({
      id: provider.id,
      data: formData,
    });
  };
  const handleCancel = () => {
    if (!provider) return;

    setIsEditing(false);

    setFormData({
      name: provider.name ?? "",
      description: provider.description ?? "",
      status: isValidStatus(provider.status),
      credentials: {
        api_key: provider.credentials?.api_key ?? "",
      },
    });
  };
  if (isLoading || !provider) {
    return (
      <div className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl border border-border shadow-xl overflow-hidden animate-pulse">

        {/* Header Skeleton */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="h-4 w-20 bg-gray-200 rounded" />
          <div className="h-8 w-20 bg-gray-200 rounded-lg" />
        </div>

        {/* Body Skeleton */}
        <div className="divide-y divide-border/60">

          {/* Name */}
          <div className="px-6 py-5 space-y-3">
            <div className="h-3 w-24 bg-gray-200 rounded" />
            <div className="h-10 w-full bg-gray-200 rounded-lg" />
          </div>

          {/* Description */}
          <div className="px-6 py-5 space-y-3">
            <div className="h-3 w-32 bg-gray-200 rounded" />
            <div className="h-20 w-full bg-gray-200 rounded-lg" />
          </div>

          {/* API Key */}
          <div className="px-6 py-5 space-y-3">
            <div className="h-3 w-24 bg-gray-200 rounded" />
            <div className="h-10 w-full bg-gray-200 rounded-lg" />
          </div>

          {/* Status */}
          <div className="px-6 py-5 space-y-3">
            <div className="h-3 w-20 bg-gray-200 rounded" />
            <div className="h-8 w-28 bg-gray-200 rounded-full" />
          </div>

        </div>
      </div>
    </div>
    );
  }

  return (
    <div className="fixed inset-0 z-9999 bg-black/20 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl border border-border shadow-xl overflow-hidden font-inter">
        {/* Header */}

        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-sm text-text-secondary hover:text-primary transition"
          >
            <ArrowLeft size={16} />
            Back
          </button>

          {!isEditing ? (
            <button
              onClick={() => {
                openEditor();
              }}
              className="
                px-3 py-1.5
                rounded-lg
                bg-primary
                text-white
                text-sm
                font-medium
                hover:opacity-90
                transition
                flex
                items-center
                gap-2
              "
            >
              <Edit2 size={14} />
              Edit
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={updateMutation.isPending || isUnchanged}
                className="
                  px-3 py-1.5
                  rounded-lg
                  bg-primary
                  text-white
                  text-sm
                  font-medium
                  disabled:opacity-50
                  flex
                  items-center
                  gap-2
                "
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
                className="
                  px-3 py-1.5
                  rounded-lg
                  border
                  border-border
                  text-sm
                  text-text-muted
                  hover:bg-gray-50
                  transition
                  flex
                  items-center
                  gap-2
                "
              >
                <X size={14} />
                Cancel
              </button>
            </div>
          )}
        </div>

        {/* Body */}

        <div className="divide-y divide-border/60">
          {/* Name */}

          <div className="px-6 py-5">
            <p className="text-xs uppercase tracking-wide text-text-secondary mb-2">
              Name
            </p>

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
              <p className="text-sm text-gray-900 font-medium">
                {provider.name}
              </p>
            )}
          </div>

          {/* Description */}

          <div className="px-6 py-5">
            <p className="text-xs uppercase tracking-wide text-text-secondary mb-2">
              Description
            </p>

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
              <p className="text-sm text-text-muted leading-6">
                {provider.description || "—"}
              </p>
            )}
          </div>

          {/* API Key */}

          <div className="px-6 py-5">
            <p className="text-xs uppercase tracking-wide text-text-secondary mb-2">
              API Key
            </p>

            {isEditing ? (
              <input
                className={`${inputStyles} font-mono`}
                value={formData.credentials.api_key}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    credentials: {
                      api_key: e.target.value,
                    },
                  })
                }
              />
            ) : (
              <div className="flex items-center gap-3">
                <code className="font-mono text-sm text-primary break-all">
                  {showKey
                    ? provider.credentials?.api_key || "—"
                    : "••••••••••••••••••••••••"}
                </code>

                <button
                  onClick={() => setShowKey(!showKey)}
                  className="text-primary hover:opacity-80 transition"
                >
                  {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            )}
          </div>

          {/* Status */}

          <div className="px-6 py-5">
            <p className="text-xs uppercase tracking-wide text-text-secondary mb-2">
              Status
            </p>

            {isEditing ? (
              <select
                className={inputStyles}
                value={formData.status}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    status: e.target.value as Status,
                  })
                }
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            ) : (
              <span
                className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${
                  provider.status === "Active"
                    ? "bg-primary/10 text-primary"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-current" />
                {provider.status}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProviderViewAndEdit;
