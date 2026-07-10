import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { SquarePen, Loader2, Trash2 } from "lucide-react";
import Swal from "sweetalert2";

import {
  deleteSubscription,
  getListOfSubscriptions,
  type Subscription,
} from "../../api/subscription";
import { getListOfProviders } from "../../api/provider";

import SubscriptionSkeleton from "./SubscriptionSkeleton";

import { useAuthStore } from "../../../../store/useAuthStore";
import { decryptAESGCM } from "../../../../utils/dataDecrypt";
import SubscriptionFormModal from "./SubscriptionFormModal";

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

  const [selectedSubscription, setSelectedSubscription] =
    useState<Subscription | null>(null);
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

      const decrypted = await decryptAESGCM(
        res.data as unknown as string,
        token,
      );

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

      const decrypted = await decryptAESGCM(
        res.data as unknown as string,
        token,
      );

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

  if (isError)
    return (
      <div className="p-6 text-red-500">Failed to load subscriptions.</div>
    );

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="shrink-0">
        {/* Provider Dropdown */}
        <div className="flex items-end gap-3 mb-8">
          <div>
            <p className="mb-1">Select Provider</p>

            <div className="relative">
              <button
                type="button"
                onClick={() => setIsProviderMenuOpen((prev) => !prev)}
                className="w-[400px] h-9.5 px-3 rounded-md border border-gray-200 shadow-sm bg-white text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
              >
                <span
                  className={
                    selectedProvider ? "text-gray-900" : "text-gray-500"
                  }
                >
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
                    className="w-full px-3 py-2 text-left text-gray-700 hover:bg-[#2C6671] hover:text-white transition"
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
                      className="w-full px-3 py-2 text-left text-gray-700 hover:bg-[#2C6671] hover:text-white transition"
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
              className="h-9.5 px-4 rounded-md bg-teal-700 text-white hover:bg-teal-800 transition"
            >
              Clear Filter
            </button>
          )}
        </div>

        {/* Heading */}
        <h2 className="text-lg font-semibold mb-3">
          {selectedProvider
            ? `Subscriptions for ${selectedProvider}`
            : "All Subscriptions"}
        </h2>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto border border-gray-200 shadow-sm rounded-md bg-white">
        {currentSubscriptions.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No subscriptions available.
          </div>
        ) : (
          currentSubscriptions.map((subscription, index) => (
            <div key={subscription.id}>
              <div className="p-6">
                {/* Provider */}
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg font-semibold text-primary underline">
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
                      className="border rounded-md p-2 hover:bg-gray-100"
                    >
                      <SquarePen size={16} />
                    </button>

                    <button
                      type="button"
                      aria-label={`Delete subscription ${subscription.subscriptionId}`}
                      onClick={() =>
                        handleDelete(
                          subscription.subscriptionId ||
                            String(subscription.id),
                        )
                      }
                      className="border rounded-md p-2 hover:bg-red-50"
                      disabled={deleteMutation.isPending}
                    >
                      {deleteMutation.isPending ? (
                        <Loader2
                          size={16}
                          className="animate-spin text-red-600"
                        />
                      ) : (
                        <Trash2 size={16} className="text-red-600" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Status */}

                <div className="flex items-center">
                  <span className="font-semibold w-28">Status:</span>

                  <span
                    className={`px-2 py-1 rounded text-[15px] font-medium ${
                      subscription.status.toLowerCase() === "active"
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {subscription.status}
                  </span>
                </div>

                {/* Type */}

                <div className="flex items-center ">
                  <span className="font-semibold w-28">Type:</span>

                  <span className="text-[15px]">{subscription.type}</span>
                </div>

                {/* URL */}

                <div className="flex items-start ">
                  <span className="font-semibold w-28">URL:</span>

                  <a
                    href={subscription.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 underline break-all text-[15px]"
                  >
                    {subscription.url}
                  </a>
                </div>

                {/* Service Info */}
                <div className="flex items-start">
                  <span className="font-semibold w-28">Service Info:</span>

                  <span className="text-[15px] break-all flex-1">
                    {subscription.serviceInfo}
                  </span>
                </div>

                {/* Dates */}

                <div className="flex items-center ">
                  <span className="font-semibold w-28">Started At:</span>

                  <span className="text-[15px]">{subscription.startedAt}</span>
                </div>

                <div className="flex items-center ">
                  <span className="font-semibold w-28">Ended At:</span>

                  <span className="text-[15px]">{subscription.endedAt}</span>
                </div>
              </div>

              {index !== currentSubscriptions.length - 1 && (
                <hr className="border-gray-200" />
              )}
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
