import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ManagePage } from "./ManagePage";

// ------------------------
// Mock Zustand Store
// ------------------------
vi.mock("../../../store/useAuthStore", () => {
  const store = (selector: (state: any) => any) =>
    selector({
      user: {
        roleName: "Admin",
      },
      accessToken: "Bearer mock-token",
    });

  store.getState = () => ({
    user: {
      roleName: "Admin",
    },
    accessToken: "Bearer mock-token",
  });

  return { useAuthStore: store };
});

// ------------------------
// Mock Navbar
// ------------------------
vi.mock("../components/ManageNavbar", () => ({
  ManageNavbar: ({ onTabChange }: any) => (
    <div>
      <button onClick={() => onTabChange("end-users")}>End Users</button>
      <button onClick={() => onTabChange("allocated-products")}>Products</button>
      <button onClick={() => onTabChange("provider & Contracts")}>Provider</button>
      <button onClick={() => onTabChange("subscription")}>Subscription</button>
    </div>
  ),
}));

// ------------------------
// Mock Child Components
// ------------------------
vi.mock("../components/CompanyRequestsTable", () => ({
  CompanyRequestsTable: () => <div>Company Requests Table</div>,
}));

vi.mock("../components/EndUsersTable", () => ({
  EndUsersTable: () => <div>End Users Table</div>,
}));

vi.mock("../components/Provider/ProviderMain", () => ({
  default: () => <div>Provider Table</div>,
}));

vi.mock("../components/Provider/ProviderFormModal", () => ({
  default: ({ open }: any) => (open ? <div>Provider Modal</div> : null),
}));

vi.mock("../components/Subscription/SubscriptionFormModal", () => ({
  default: ({ open, onClose }: any) =>
    open ? (
      <div>
        <h2>Subscription Modal</h2>
        <button onClick={onClose}>Close</button>
      </div>
    ) : null,
}));

const renderWithRouter = (initialEntries = ["/manage"]) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>
        <ManagePage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
};


// ------------------------
// Test Cases
// ------------------------

describe("ManagePage", () => {
  it("renders End Users tab by default", () => {
    renderWithRouter();

    expect(screen.getByText("Manage End User")).toBeInTheDocument();
    expect(screen.getByText("End Users Table")).toBeInTheDocument();
  });

  it("switches to Allocated Products tab", () => {
    renderWithRouter();

    fireEvent.click(screen.getByText("Products"));

    expect(screen.getByText("No allocated products data.")).toBeInTheDocument();
  });

  it("switches to Provider tab", () => {
    renderWithRouter();

    fireEvent.click(screen.getByText("Provider"));

    expect(screen.getByText("Manage Providers")).toBeInTheDocument();

    expect(screen.getByText("Provider Table")).toBeInTheDocument();

    expect(
      screen.getByRole("button", {
        name: /add provider/i,
      }),
    ).toBeInTheDocument();
  });

  it("opens Provider modal when Add Provider is clicked", () => {
    renderWithRouter();

    fireEvent.click(screen.getByText("Provider"));
    fireEvent.click(
      screen.getByRole("button", {
        name: /add provider/i,
      }),
    );

    expect(screen.getByText("Provider Modal")).toBeInTheDocument();
  });

  it("opens and closes the subscription modal from the add action", () => {
    renderWithRouter();

    fireEvent.click(screen.getByText("Subscription"));
    fireEvent.click(screen.getByRole("button", { name: /add subscription/i }));

    expect(screen.getByText("Subscription Modal")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /close/i }));

    expect(screen.queryByText("Subscription Modal")).not.toBeInTheDocument();
  });
});

