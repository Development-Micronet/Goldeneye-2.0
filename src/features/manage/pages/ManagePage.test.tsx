import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ManagePage } from "./ManagePage";

// ------------------------
// Mock Zustand Store
// ------------------------
vi.mock("../../../store/useAuthStore", () => ({
  useAuthStore: (selector: (state: { user: { roleName: string } }) => any) =>
    selector({
      user: {
        roleName: "Admin",
      },
    }),
}));
// ------------------------
// Mock Navbar
// ------------------------
vi.mock("../components/ManageNavbar", () => ({
  ManageNavbar: ({ onTabChange }: any) => (
    <div>
      <button onClick={() => onTabChange("end-users")}>End Users</button>
      <button onClick={() => onTabChange("allocated-products")}>
        Products
      </button>
      <button onClick={() => onTabChange("provider")}>Provider</button>
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

vi.mock("../components/AllocatedProductsTable", () => ({
  AllocatedProductsTable: () => <div>Allocated Products Table</div>,
}));

vi.mock("../components/Provider/ProviderTable", () => ({
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

// ------------------------
// Test Cases
// ------------------------

describe("ManagePage", () => {
  it("renders End Users tab by default", () => {
    render(<ManagePage />);

    expect(screen.getByText("Manage End User")).toBeInTheDocument();
    expect(screen.getByText("End Users Table")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /add user/i }),
    ).toBeInTheDocument();
  });

  it("switches to Allocated Products tab", () => {
    render(<ManagePage />);

    fireEvent.click(screen.getByText("Products"));

    expect(screen.getByText("Manage Allocated Product")).toBeInTheDocument();

    expect(screen.getByText("Allocated Products Table")).toBeInTheDocument();

    expect(
      screen.getByRole("button", {
        name: /allocate product/i,
      }),
    ).toBeInTheDocument();
  });

  it("switches to Provider tab", () => {
    render(<ManagePage />);

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
    render(<ManagePage />);

    fireEvent.click(screen.getByText("Provider"));
    fireEvent.click(
      screen.getByRole("button", {
        name: /add provider/i,
      }),
    );

    expect(screen.getByText("Provider Modal")).toBeInTheDocument();
  });

  it("opens and closes the subscription modal from the add action", () => {
    render(<ManagePage />);

    fireEvent.click(screen.getByText("Subscription"));
    fireEvent.click(screen.getByRole("button", { name: /add subscription/i }));

    expect(screen.getByText("Subscription Modal")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /close/i }));

    expect(screen.queryByText("Subscription Modal")).not.toBeInTheDocument();
  });

  it("debug page UI", () => {
    render(<ManagePage />);
    screen.debug(); // 👈 THIS prints HTML in terminal
  });
});
