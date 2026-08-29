import Swal from "sweetalert2";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  SquarePen,
  Trash2,
  Layers,
  ExternalLink,
  Filter,
  CheckCircle2,
  XCircle,
  Building2,
  Calendar,
  Globe,
} from "lucide-react";
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
      <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-xs font-semibold text-red-700 select-none">
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
              className="flex h-9.5 w-64 cursor-pointer items-center justify-between rounded-xl border border-gray-200 bg-white px-3.5 text-xs font-semibold text-gray-800 shadow-2xs transition outline-none hover:border-[#2c6671]/40 focus:border-[#2c6671] focus:ring-1 focus:ring-[#2c6671] sm:w-80"
            >
              <div className="flex items-center gap-2 truncate">
                <Filter className="h-3.5 w-3.5 shrink-0 text-[#2c6671]" />
                <span className="truncate">
                  {selectedProvider ? `Provider: ${selectedProvider}` : "Filter by Provider..."}
                </span>
              </div>
              <span className="ml-1 text-xs text-gray-400">▾</span>
            </button>

            {isProviderMenuOpen && (
              <div className="absolute z-30 mt-1.5 w-64 rounded-2xl border border-gray-200/80 bg-white p-1.5 shadow-xl transition-all sm:w-80">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedProvider("");
                    setIsProviderMenuOpen(false);
                  }}
                  className={`w-full cursor-pointer rounded-xl px-3 py-2 text-left text-xs font-bold transition ${
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
                    className={`w-full cursor-pointer rounded-xl px-3 py-2 text-left text-xs font-bold transition ${
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
              className="h-9 cursor-pointer rounded-xl bg-gray-100 px-3 py-1.5 text-xs font-bold text-gray-600 transition hover:bg-gray-200"
            >
              Clear Filter
            </button>
          )}
        </div>

        {/* Count Badge */}
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#2c6671]/20 bg-[#EFFBFD] px-3 py-1 text-xs font-bold text-[#2c6671]">
            <Layers className="h-3.5 w-3.5" />
            {currentSubscriptions.length}{" "}
            {currentSubscriptions.length === 1 ? "Subscription" : "Subscriptions"}
          </span>
        </div>
      </div>

      {/* Subscription Data Table Container */}
      <div className="min-h-0 flex-1 overflow-x-auto overflow-y-auto rounded-2xl border border-gray-200/80 bg-white shadow-xs">
        {currentSubscriptions.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center select-none">
            <Layers className="mb-2 h-10 w-10 text-[#2c6671]/40" />
            <h4 className="text-sm font-bold text-gray-800">No Subscriptions Found</h4>
            <p className="mt-1 max-w-sm text-xs text-gray-500">
              {selectedProvider
                ? `No subscriptions registered for provider "${selectedProvider}".`
                : "No provider subscriptions available."}
            </p>
          </div>
        ) : (
          <table className="w-full min-w-[1050px] border-collapse text-left text-xs">
            <thead className="sticky top-0 z-10 border-b border-gray-200 bg-[#EFFBFD] select-none">
              <tr>
                <th className="w-14 px-4 py-3 text-center font-bold tracking-wide text-[#2c6671] uppercase">
                  Sr. No.
                </th>
                <th className="w-44 px-4 py-3 font-bold tracking-wide text-[#2c6671] uppercase">
                  Provider
                </th>
                <th className="w-28 px-4 py-3 font-bold tracking-wide text-[#2c6671] uppercase">
                  Type
                </th>
                <th className="px-4 py-3 font-bold tracking-wide text-[#2c6671] uppercase">
                  Service Info & URL
                </th>
                <th className="w-60 min-w-[240px] px-4 py-3 font-bold tracking-wide text-[#2c6671] uppercase">
                  Validity Period
                </th>
                <th className="w-28 px-4 py-3 text-center font-bold tracking-wide text-[#2c6671] uppercase">
                  Status
                </th>
                <th className="w-24 px-4 py-3 text-center font-bold tracking-wide text-[#2c6671] uppercase">
                  Action
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100 bg-white">
              {currentSubscriptions.map((subscription, index) => {
                const isActive = subscription.status?.toLowerCase() === "active";

                return (
                  <tr
                    key={`${subscription.id}-${index}`}
                    className="transition-colors hover:bg-[#EFFBFD]/30"
                  >
                    {/* Sr No */}
                    <td className="px-4 py-3.5 text-center text-xs font-medium text-gray-500">
                      {index + 1}
                    </td>

                    {/* Provider */}
                    <td className="px-4 py-3.5 text-xs font-bold text-gray-900 sm:text-sm">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 shrink-0 text-[#2c6671]" />
                        <span>{subscription.provider || "—"}</span>
                      </div>
                    </td>

                    {/* Type Tag */}
                    <td className="px-4 py-3.5 text-xs">
                      <span className="inline-block rounded-md border border-[#2c6671]/20 bg-[#EFFBFD] px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-[#2c6671] uppercase">
                        {subscription.type || "N/A"}
                      </span>
                    </td>

                    {/* Service Info & URL */}
                    <td className="px-4 py-3.5 text-xs">
                      <div className="flex max-w-md flex-col gap-1">
                        <span
                          className="truncate font-semibold text-gray-800"
                          title={subscription.serviceInfo}
                        >
                          {subscription.serviceInfo || "No service info"}
                        </span>
                        {subscription.url && (
                          <a
                            href={subscription.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex max-w-sm items-center gap-1 truncate font-mono text-[11px] text-cyan-700 hover:text-cyan-900 hover:underline"
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
                    <td className="px-4 py-3.5 text-xs whitespace-nowrap text-gray-700">
                      <div className="flex flex-col gap-1 font-mono text-xs">
                        <span className="inline-flex items-center gap-1.5 font-medium whitespace-nowrap text-gray-800">
                          <strong className="shrink-0 text-[10px] font-bold text-[#2c6671] uppercase">
                            START:
                          </strong>{" "}
                          <span>{subscription.startedAt || "—"}</span>
                        </span>
                        <span className="inline-flex items-center gap-1.5 font-medium whitespace-nowrap text-gray-800">
                          <strong className="shrink-0 text-[10px] font-bold text-gray-400 uppercase">
                            END:
                          </strong>{" "}
                          <span>{subscription.endedAt || "—"}</span>
                        </span>
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="px-4 py-3.5 text-center text-xs">
                      {isActive ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
                          <CheckCircle2 className="h-3 w-3 text-emerald-600" /> ACTIVE
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-[10px] font-bold text-rose-700">
                          <XCircle className="h-3 w-3 text-rose-600" /> INACTIVE
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5 text-center text-xs">
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
                          className="cursor-pointer rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-[#EFFBFD] hover:text-[#2c6671]"
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
                          className="cursor-pointer rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
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
