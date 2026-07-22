import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Swal from "sweetalert2";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useQuery } from "@tanstack/react-query";
import { deleteSubscription } from "../../api/subscription";
import SubscriptionList from "./SubscriptionList";

const deleteSubscriptionMock = vi.fn();
const invalidateQueriesMock = vi.fn();

vi.mock("@tanstack/react-query", () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(() => ({
    mutate: vi.fn((subscriptionId: string) => {
      deleteSubscriptionMock(subscriptionId);
    }),
    isPending: false,
  })),
  useQueryClient: vi.fn(() => ({
    invalidateQueries: invalidateQueriesMock,
  })),
}));

vi.mock("../../api/subscription", () => ({
  getListOfSubscriptions: vi.fn(),
  deleteSubscription: (...args: unknown[]) => deleteSubscriptionMock(...args),
}));

vi.mock("../../api/provider", () => ({
  getListOfProviders: vi.fn(),
}));

vi.mock("sweetalert2", () => ({
  default: {
    fire: vi.fn(),
  },
}));

vi.mock("./SubscriptionSkeleton", () => ({
  default: () => <div>Loading subscriptions...</div>,
}));

vi.mock("./SubscriptionFormModal", () => ({
  default: () => null,
}));

vi.mock("../../../../store/useAuthStore", () => ({
  useAuthStore: {
    getState: () => ({ accessToken: "Bearer test-token" }),
  },
}));

vi.mock("../../../../utils/dataDecrypt", () => ({
  decryptAESGCM: vi.fn(async (_encrypted: string, _token: string) => ({
    data: [{ name: "Example Provider" }],
  })),
}));

describe("SubscriptionList", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useQuery).mockImplementation((options: any) => {
      if (options.queryKey[0] === "providers-dropdown") {
        return {
          data: [{ name: "Example Provider" }],
          isLoading: false,
          isError: false,
        };
      }

      return {
        data: {
          "Example Provider": [
            {
              id: 1,
              subscriptionId: "sub-1",
              serviceInfo: "Premium plan",
              status: "Active",
              type: "Basic",
              url: "https://example.com",
              startedAt: "2024-01-01",
              endedAt: "2024-12-31",
            },
          ],
        },
        isLoading: false,
        isError: false,
      };
    });

    vi.mocked(Swal.fire).mockResolvedValue({ isConfirmed: true } as never);
  });

  it("calls the delete API when the delete action is confirmed", async () => {
    const user = userEvent.setup();

    render(<SubscriptionList />);

    await user.click(screen.getByRole("button", { name: /delete subscription sub-1/i }));

    await waitFor(() => {
      expect(deleteSubscriptionMock).toHaveBeenCalledWith("sub-1");
    });
  });
});
