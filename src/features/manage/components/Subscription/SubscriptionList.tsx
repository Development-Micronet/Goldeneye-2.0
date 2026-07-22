import Swal from "sweetalert2";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, SquarePen, Trash2 } from "lucide-react";
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
      console.error("Delete subscription failed:", error);
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

  if (isError) return <div className="p-6 text-red-500">Failed to load subscriptions.</div>;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0">
        {/* Provider Dropdown */}
        <div className="mb-8 flex items-end gap-3">
          <div>
            <p className="mb-1">Select Provider</p>

            <div className="relative">
              <button
                type="button"
                onClick={() => setIsProviderMenuOpen((prev) => !prev)}
                className="flex h-9.5 w-[400px] items-center justify-between rounded-md border border-gray-200 bg-white px-3 text-left shadow-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-200 focus:outline-none"
              >
                <span className={selectedProvider ? "text-gray-900" : "text-gray-500"}>
                  {selectedProvider || "Choose Provider"}
                </span>
                <span className="text-gray-500">▾</span>
              </button>

              {isProviderMenuOpen && (
                <div className="absolute z-10 mt-1 w-[400px] rounded-md border border-gray-200 bg-white shadow-lg">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedProvider("");
                      setIsProviderMenuOpen(false);
                    }}
                    className="w-full px-3 py-2 text-left text-gray-700 transition hover:bg-[#2C6671] hover:text-white"
                  >
                    Choose Provider
                  </button>

                  {providerNames.map((provider: string) => (
                    <button
                      key={provider}
                      type="button"
                      onClick={() => {
                        setSelectedProvider(provider);
                        setIsProviderMenuOpen(false);
                      }}
                      className="w-full px-3 py-2 text-left text-gray-700 transition hover:bg-[#2C6671] hover:text-white"
                    >
                      {provider}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {selectedProvider && (
            <button
              onClick={() => setSelectedProvider("")}
              className="h-9.5 rounded-md bg-teal-700 px-4 text-white transition hover:bg-teal-800"
            >
              Clear Filter
            </button>
          )}
        </div>

        {/* Heading */}
        <h2 className="mb-3 text-lg font-semibold">
          {selectedProvider ? `Subscriptions for ${selectedProvider}` : "All Subscriptions"}
        </h2>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto rounded-md border border-gray-200 bg-white shadow-sm">
        {currentSubscriptions.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No subscriptions available.</div>
        ) : (
          currentSubscriptions.map((subscription, index) => (
            <div key={subscription.id}>
              <div className="p-6">
                {/* Provider */}
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-primary text-lg font-semibold underline">
                    {subscription.provider}
                  </h3>

                  <div className="flex gap-2">
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
                      className="rounded-md border p-2 hover:bg-gray-100"
                    >
                      <SquarePen size={16} />
                    </button>

                    <button
                      type="button"
                      aria-label={`Delete subscription ${subscription.subscriptionId}`}
                      onClick={() =>
                        handleDelete(subscription.subscriptionId || String(subscription.id))
                      }
                      className="rounded-md border p-2 hover:bg-red-50"
                      disabled={deleteMutation.isPending}
                    >
                      {deleteMutation.isPending ? (
                        <Loader2 size={16} className="animate-spin text-red-600" />
                      ) : (
                        <Trash2 size={16} className="text-red-600" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Status */}

                <div className="flex items-center">
                  <span className="w-28 font-semibold">Status:</span>

                  <span
                    className={`rounded px-2 py-1 text-[15px] font-medium ${
                      subscription.status.toLowerCase() === "active"
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {subscription.status}
                  </span>
                </div>

                {/* Type */}

                <div className="flex items-center">
                  <span className="w-28 font-semibold">Type:</span>

                  <span className="text-[15px]">{subscription.type}</span>
                </div>

                {/* URL */}

                <div className="flex items-start">
                  <span className="w-28 font-semibold">URL:</span>

                  <a
                    href={subscription.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[15px] break-all text-blue-600 underline"
                  >
                    {subscription.url}
                  </a>
                </div>

                {/* Service Info */}
                <div className="flex items-start">
                  <span className="w-28 font-semibold">Service Info:</span>

                  <span className="flex-1 text-[15px] break-all">{subscription.serviceInfo}</span>
                </div>

                {/* Dates */}

                <div className="flex items-center">
                  <span className="w-28 font-semibold">Started At:</span>

                  <span className="text-[15px]">{subscription.startedAt}</span>
                </div>

                <div className="flex items-center">
                  <span className="w-28 font-semibold">Ended At:</span>

                  <span className="text-[15px]">{subscription.endedAt}</span>
                </div>
              </div>

              {index !== currentSubscriptions.length - 1 && <hr className="border-gray-200" />}
            </div>
          ))
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
