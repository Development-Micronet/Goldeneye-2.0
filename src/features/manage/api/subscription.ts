
import { apiClient } from "../../../api/apiClient";

export interface Subscription {
  id: string;
  subscriptionId: string;

  providerNames: string[];
  type: string;
  url: string;
  serviceInfo: string;

  status?: string;
  startedAt?: string;
  endedAt?: string;
}

export interface SubscriptionsResponse {
  success: boolean;
  status_code: number;
  message: string;
  data: Subscription[];
}

export interface CreateSubscriptionDto {
  providerNames: string[];
  type: string;
  url: string;
  serviceInfo: string;
}

export interface UpdateSubscriptionDto {
  providerNames: string[];
  type: string;
  url: string;
  serviceInfo: string;
}

export type UpdateSubscriptionPayload = {
  subscriptionId: string;
  data: UpdateSubscriptionDto;
};

/**
 * Get List of Subscriptions
 */
export const getListOfSubscriptions =
  async (): Promise<SubscriptionsResponse> => {
    const { data } = await apiClient.get<SubscriptionsResponse>(
      "products/subscriptions/"
    );

    return data;
  };

/**
 * Get Subscription By Id
 */
export const getSubscriptionById = async (
  subscriptionId: string
): Promise<Subscription> => {
  return apiClient
    .get(`products/subscriptions/${subscriptionId}/`)
    .then((response) => response.data.data);
};

/**
 * Create Subscription
 */
export const createSubscription = async (
  subscriptionData: CreateSubscriptionDto
): Promise<Subscription> => {
  const { data } = await apiClient.post<Subscription>(
    "products/subscriptions/",
    subscriptionData
  );

  return data;
};

/**
 * Update Subscription
 */
export const updateSubscriptionById = async (
  subscriptionId: string,
  subscriptionData: UpdateSubscriptionDto
): Promise<Subscription> => {
  return apiClient
    .put(
      `products/subscriptions/${subscriptionId}/`,
      subscriptionData
    )
    .then((response) => response.data);
};

/**
 * Delete Subscription
 */
export const deleteSubscription = async (
  subscriptionId: string
): Promise<void> => {
  await apiClient.delete(
    `products/subscriptions/${subscriptionId}/`
  );
};