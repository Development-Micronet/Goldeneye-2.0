import Swal from "sweetalert2";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, SquarePen, Trash2, Layers, ExternalLink, Filter, CheckCircle2, XCircle, Building2, Calendar, Globe } from "lucide-react";
import { useAuthStore } from "../../../../store/useAuthStore";
import { decryptAESGCM } from "../../../../utils/dataDecrypt";
import { getListOfProviders } from "../../api/provider";
import {
  type Subscription,
  deleteSubscription,
  getListOfSubscriptions,
} from "../../api/subscription";
import SubscriptionFormModal from "./SubscriptionFormModal";
import SubscriptionSkeleton from "./SubscriptionSkeleton";
import { logger } from "../../../../utils/logger";

type SubscriptionItem = {
  id: number;
  subscriptionId: string;
  serviceInfo: string;
  status: string;
  type: string;
  url: string;
  startedAt: string;
  endedAt: string;
  provider?: string;
};

type ProviderSubscriptions = Record<string, SubscriptionItem[]>;

const SubscriptionList = () => {
  const queryClient = useQueryClient();
  const [openEditModal, setOpenEditModal] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
  const { accessToken } = useAuthStore.getState();
  const token = accessToken?.replace("Bearer ", "").trim() || "";
  const [selectedProvider, setSelectedProvider] = useState("");
  const [isProviderMenuOpen, setIsProviderMenuOpen] = useState(false);

  /**
   * Provider List
   */
  const { data: providers = [] } = useQuery({
    queryKey: ["providers-dropdown"],
    queryFn: async () => {
      const res = await getListOfProviders();
      if (!token) throw new Error("Missing Token");
      const decrypted = await decryptAESGCM(res.data as unknown as string, token);
      return decrypted.data;
    },
  });

  /**
   * Subscription List
   */
  const {
    data: subscriptions = {},
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["subscriptions"],
    queryFn: async () => {
      const res = await getListOfSubscriptions();
      if (!token) throw new Error("Missing Token");
      const decrypted = await decryptAESGCM(res.data as unknown as string, token);
      return decrypted.data as ProviderSubscriptions;
    },
  });

  const providerNames = useMemo(() => {
    return providers.map((p: any) => p.name);
  }, [providers]);

  const deleteMutation = useMutation({
    mutationFn: deleteSubscription,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
    },
    onError: (error) => {
      logger.error("Delete subscription failed:", error);
    },
  });

  const handleDelete = async (subscriptionId: string) => {
    const result = await Swal.fire({
      title: "Delete Subscription?",
      text: "This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, delete it",
      cancelButtonText: "Cancel",
      reverseButtons: true,
    });

    if (!result.isConfirmed) return;

    deleteMutation.mutate(subscriptionId, {
      onSuccess: () => {
        Swal.fire({
          title: "Deleted!",
          text: "Subscription has been deleted successfully.",
          icon: "success",
          timer: 1500,
          showConfirmButton: false,
        });
      },
      onError: () => {
        Swal.fire({
          title: "Error",
          text: "Failed to delete subscription.",
          icon: "error",
        });
      },
    });
  };

  const currentSubscriptions =
    selectedProvider === ""
      ? Object.entries(subscriptions).flatMap(([provider, items]) =>
          items.map((item) => ({
            ...item,
            provider,
          })),
        )
      : (subscriptions[selectedProvider] || []).map((item) => ({
          ...item,
          provider: selectedProvider,
        }));

  if (isLoading) return <SubscriptionSkeleton />;

  if (isError) {
    return (
      <div className="p-4 bg-red-50 text-red-700 rounded-2xl text-xs font-semibold border border-red-100 select-none">
        ⚠️ Failed to load subscriptions. Please verify backend connection.
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 select-none">
      {/* Top Filter & Toolbar */}
      <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsProviderMenuOpen((prev) => !prev)}
              className="flex h-9.5 w-64 sm:w-80 items-center justify-between rounded-xl border border-gray-200 bg-white px-3.5 text-xs font-semibold text-gray-800 shadow-2xs transition hover:border-[#2c6671]/40 focus:border-[#2c6671] focus:ring-1 focus:ring-[#2c6671] outline-none cursor-pointer"
            >
              <div className="flex items-center gap-2 truncate">
                <Filter className="h-3.5 w-3.5 text-[#2c6671] shrink-0" />
                <span className="truncate">
                  {selectedProvider ? `Provider: ${selectedProvider}` : "Filter by Provider..."}
                </span>
              </div>
              <span className="text-gray-400 text-xs ml-1">▾</span>
            </button>

            {isProviderMenuOpen && (
              <div className="absolute z-30 mt-1.5 w-64 sm:w-80 rounded-2xl border border-gray-200/80 bg-white p-1.5 shadow-xl transition-all">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedProvider("");
                    setIsProviderMenuOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
                    !selectedProvider
                      ? "bg-[#2c6671] text-white"
                      : "text-gray-700 hover:bg-[#EFFBFD] hover:text-[#2c6671]"
                  }`}
                >
                  All Providers
                </button>

                {providerNames.map((provider: string) => (
                  <button
                    key={provider}
                    type="button"
                    onClick={() => {
                      setSelectedProvider(provider);
                      setIsProviderMenuOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
                      selectedProvider === provider
                        ? "bg-[#2c6671] text-white"
                        : "text-gray-700 hover:bg-[#EFFBFD] hover:text-[#2c6671]"
                    }`}
                  >
                    {provider}
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedProvider && (
            <button
              onClick={() => setSelectedProvider("")}
              className="h-9 rounded-xl bg-gray-100 px-3 py-1.5 text-xs font-bold text-gray-600 hover:bg-gray-200 transition cursor-pointer"
            >
              Clear Filter
            </button>
          )}
        </div>

        {/* Count Badge */}
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EFFBFD] px-3 py-1 text-xs font-bold text-[#2c6671] border border-[#2c6671]/20">
            <Layers className="h-3.5 w-3.5" />
            {currentSubscriptions.length} {currentSubscriptions.length === 1 ? "Subscription" : "Subscriptions"}
          </span>
        </div>
      </div>

      {/* Subscription Data Table Container */}
      <div className="flex-1 overflow-y-auto overflow-x-auto min-h-0 rounded-2xl border border-gray-200/80 bg-white shadow-xs">
        {currentSubscriptions.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center select-none">
            <Layers className="mb-2 h-10 w-10 text-[#2c6671]/40" />
            <h4 className="text-sm font-bold text-gray-800">No Subscriptions Found</h4>
            <p className="mt-1 text-xs text-gray-500 max-w-sm">
              {selectedProvider
                ? `No subscriptions registered for provider "${selectedProvider}".`
                : "No provider subscriptions available."}
            </p>
          </div>
        ) : (
          <table className="w-full min-w-[1050px] text-left text-xs border-collapse">
            <thead className="sticky top-0 bg-[#EFFBFD] border-b border-gray-200 z-10 select-none">
              <tr>
                <th className="px-4 py-3 font-bold text-[#2c6671] uppercase tracking-wide w-14 text-center">
                  Sr. No.
                </th>
                <th className="px-4 py-3 font-bold text-[#2c6671] uppercase tracking-wide w-44">
                  Provider
                </th>
                <th className="px-4 py-3 font-bold text-[#2c6671] uppercase tracking-wide w-28">
                  Type
                </th>
                <th className="px-4 py-3 font-bold text-[#2c6671] uppercase tracking-wide">
                  Service Info & URL
                </th>
                <th className="px-4 py-3 font-bold text-[#2c6671] uppercase tracking-wide w-60 min-w-[240px]">
                  Validity Period
                </th>
                <th className="px-4 py-3 font-bold text-[#2c6671] uppercase tracking-wide w-28 text-center">
                  Status
                </th>
                <th className="px-4 py-3 font-bold text-[#2c6671] uppercase tracking-wide w-24 text-center">
                  Action
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100 bg-white">
              {currentSubscriptions.map((subscription, index) => {
                const isActive = subscription.status?.toLowerCase() === "active";

                return (
                  <tr key={`${subscription.id}-${index}`} className="hover:bg-[#EFFBFD]/30 transition-colors">
                    {/* Sr No */}
                    <td className="px-4 py-3.5 text-xs text-gray-500 font-medium text-center">
                      {index + 1}
                    </td>

                    {/* Provider */}
                    <td className="px-4 py-3.5 font-bold text-gray-900 text-xs sm:text-sm">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-[#2c6671] shrink-0" />
                        <span>{subscription.provider || "—"}</span>
                      </div>
                    </td>

                    {/* Type Tag */}
                    <td className="px-4 py-3.5 text-xs">
                      <span className="inline-block px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-[#EFFBFD] text-[#2c6671] border border-[#2c6671]/20 uppercase tracking-wider">
                        {subscription.type || "N/A"}
                      </span>
                    </td>

                    {/* Service Info & URL */}
                    <td className="px-4 py-3.5 text-xs">
                      <div className="flex flex-col gap-1 max-w-md">
                        <span className="font-semibold text-gray-800 truncate" title={subscription.serviceInfo}>
                          {subscription.serviceInfo || "No service info"}
                        </span>
                        {subscription.url && (
                          <a
                            href={subscription.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-mono text-cyan-700 hover:text-cyan-900 hover:underline truncate max-w-sm"
                            title={subscription.url}
                          >
                            <Globe className="h-3 w-3 shrink-0" />
                            <span className="truncate">{subscription.url}</span>
                            <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                          </a>
                        )}
                      </div>
                    </td>

                    {/* Validity Period */}
                    <td className="px-4 py-3.5 text-xs text-gray-700 whitespace-nowrap">
                      <div className="flex flex-col gap-1 font-mono text-xs">
                        <span className="inline-flex items-center gap-1.5 font-medium text-gray-800 whitespace-nowrap">
                          <strong className="text-[#2c6671] text-[10px] uppercase font-bold shrink-0">START:</strong>{" "}
                          <span>{subscription.startedAt || "—"}</span>
                        </span>
                        <span className="inline-flex items-center gap-1.5 font-medium text-gray-800 whitespace-nowrap">
                          <strong className="text-gray-400 text-[10px] uppercase font-bold shrink-0">END:</strong>{" "}
                          <span>{subscription.endedAt || "—"}</span>
                        </span>
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="px-4 py-3.5 text-xs text-center">
                      {isActive ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="h-3 w-3 text-emerald-600" /> ACTIVE
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          <XCircle className="h-3 w-3 text-rose-600" /> INACTIVE
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5 text-xs text-center">
                      <div className="flex items-center justify-center gap-1">
                        {/* Edit Button */}
                        <button
                          onClick={() => {
                            setSelectedSubscription({
                              id: String(subscription.id),
                              subscriptionId: subscription.subscriptionId,
                              providerNames: [subscription.provider || ""],
                              type: subscription.type,
                              url: subscription.url,
                              serviceInfo: subscription.serviceInfo,
                            });
                            setOpenEditModal(true);
                          }}
                          className="p-1.5 hover:bg-[#EFFBFD] rounded-lg text-gray-400 hover:text-[#2c6671] transition-colors cursor-pointer"
                          title="Edit Subscription"
                        >
                          <SquarePen className="h-4 w-4" />
                        </button>

                        {/* Delete Button */}
                        <button
                          type="button"
                          aria-label={`Delete subscription ${subscription.subscriptionId}`}
                          onClick={() =>
                            handleDelete(subscription.subscriptionId || String(subscription.id))
                          }
                          className="p-1.5 hover:bg-rose-50 rounded-lg text-gray-400 hover:text-rose-600 transition-colors cursor-pointer"
                          disabled={deleteMutation.isPending}
                          title="Delete Subscription"
                        >
                          {deleteMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin text-rose-600" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <SubscriptionFormModal
        open={openEditModal}
        onClose={() => {
          setOpenEditModal(false);
          setSelectedSubscription(null);
        }}
        subscription={selectedSubscription}
      />
    </div>
  );
};

export default SubscriptionList;

