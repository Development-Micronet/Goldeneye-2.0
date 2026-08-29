import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ProviderAccordion from "./ProviderAccordion";

const renderWithQueryClient = (ui: React.ReactNode) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
};

describe("ProviderAccordion", () => {
  it("renders gracefully when a provider entry is missing required data", () => {
    renderWithQueryClient(
      <ProviderAccordion
        providers={[null as any]}
        deleteMutation={{ isPending: false, variables: null }}
        handleDelete={vi.fn()}
        setSelectedProviderId={vi.fn()}
      />,
    );

    expect(screen.getByText(/no providers available/i)).toBeInTheDocument();
  });

  it("handles non-array providers prop without throwing", () => {
    renderWithQueryClient(
      <ProviderAccordion
        providers={{} as any}
        deleteMutation={{ isPending: false, variables: null }}
        handleDelete={vi.fn()}
        setSelectedProviderId={vi.fn()}
      />,
    );

    expect(screen.getByText(/no providers available/i)).toBeInTheDocument();
  });

  it("renders valid providers and allows header action clicks", () => {
    const handleDelete = vi.fn();
    const setSelectedProviderId = vi.fn();

    renderWithQueryClient(
      <ProviderAccordion
        providers={[
          {
            provider_id: "prov-1",
            name: "Test Provider",
            description: "A test description",
            is_active: true,
          },
        ]}
        deleteMutation={{ isPending: false, variables: null }}
        handleDelete={handleDelete}
        setSelectedProviderId={setSelectedProviderId}
      />,
    );

    expect(screen.getByText("Test Provider")).toBeInTheDocument();

    const deleteBtn = screen.getByTitle("Delete Provider");
    expect(deleteBtn).toBeInTheDocument();

    fireEvent.click(deleteBtn);
    expect(handleDelete).toHaveBeenCalledWith("prov-1");
  });
});
