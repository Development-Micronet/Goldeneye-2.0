import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, PackageOpen } from "lucide-react";
import { toast } from "react-toastify";

import { CancelOrderDialog, OrderCard, OrderFilters } from "../component/Order/Ordercomponents";
import {
  cancelTasking,
  errorMessage,
  getTaskings,
  isActive,
  isCancelled,
  matchesFilter,
} from "../api/Order.service";
import type { OrderFilter, Tasking } from "../api/Order.service";
import { useAuthStore } from "../../../../../store/useAuthStore";


export const TASKINGS_QUERY_KEY = ["taskings"];

const EMPTY_MESSAGES: Record<OrderFilter, string> = {
  all: "No orders found",
  "in-progress": "No in-progress orders found",
  cancelled: "No cancelled orders found",
};

export const MyOrderMenu: React.FC = () => {
  const accessToken = useAuthStore((state) => state.accessToken);
  // The decrypt utility wants the raw token, without the Bearer prefix.
  const token = accessToken?.replace("Bearer ", "").trim() ?? "";

  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<OrderFilter>("all");
  const [pendingCancel, setPendingCancel] = useState<Tasking | null>(null);

  const {
    data: taskings = [],
    isLoading,
    isError,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: TASKINGS_QUERY_KEY,
    queryFn: () => getTaskings(token),
    enabled: Boolean(token),
    // Development remounts the panel twice. A stale time lets the second mount
    // read the cache instead of firing a second request.
    staleTime: 30_000,
  });

  const cancelMutation = useMutation({
    mutationFn: (taskingId: string) => cancelTasking(taskingId, token),

    // Awaiting the refetch keeps the mutation pending until the fresh list is
    // in, so the dialog stays up and the UI never shows a stale status.
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: TASKINGS_QUERY_KEY });
      setPendingCancel(null);
      toast.success(data?.message || "Order cancelled.");
    },

    onError: (error) => {
      toast.error(errorMessage(error) || "Could not cancel this order. Please try again.");
    },
  });

  const counts = {
    all: taskings.length,
    "in-progress": taskings.filter((tasking) => isActive(tasking.status)).length,
    cancelled: taskings.filter((tasking) => isCancelled(tasking.status)).length,
  };

  // Filtering is client side, so switching tabs never calls the API.
  const visible = taskings.filter((tasking) => matchesFilter(tasking.status, filter));

  return (
    <div className="relative flex h-full min-h-0 flex-col bg-gray-50">
      <div className="shrink-0 space-y-2.5 border-b border-gray-200 bg-white px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">My Orders</h2>
          <p className="mt-0.5 text-xs text-gray-500">
            {isLoading ? "Loading orders" : `${taskings.length} tasking orders`}
          </p>
        </div>

        <OrderFilters value={filter} counts={counts} onChange={setFilter} />
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
        {isLoading &&
          [0, 1, 2].map((index) => (
            <div key={index} className="animate-pulse rounded-lg border border-gray-200 bg-white p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="h-3 w-32 rounded bg-gray-200" />
                <div className="h-4 w-20 rounded-full bg-gray-200" />
              </div>
              <div className="mt-3 space-y-2">
                <div className="h-2.5 w-24 rounded bg-gray-100" />
                <div className="h-2.5 w-40 rounded bg-gray-100" />
              </div>
            </div>
          ))}

        {isError && !isLoading && (
          <div className="flex items-center justify-between gap-4 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
              <p className="text-sm font-semibold">Unable to load orders.</p>
            </div>

            <button
              type="button"
              onClick={() => refetch()}
              disabled={isFetching}
              className="rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-60"
            >
              Retry
            </button>
          </div>
        )}

        {!isLoading && !isError && visible.length === 0 && (
          <div className="rounded-lg border border-dashed border-gray-200 bg-white px-4 py-10 text-center">
            <PackageOpen className="text-primary/60 mx-auto" size={22} />
            <p className="mt-2 text-sm font-semibold text-gray-900">{EMPTY_MESSAGES[filter]}</p>
          </div>
        )}

        {!isLoading &&
          !isError &&
          visible.map((tasking) => (
            <OrderCard key={tasking.tasking_id} tasking={tasking} onCancel={setPendingCancel} />
          ))}
      </div>

      {pendingCancel && (
        <CancelOrderDialog
          tasking={pendingCancel}
          isCancelling={cancelMutation.isPending}
          onConfirm={() => cancelMutation.mutate(pendingCancel.tasking_id)}
          onClose={() => setPendingCancel(null)}
        />
      )}
    </div>
  );
};