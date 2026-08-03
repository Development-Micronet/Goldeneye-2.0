import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ProviderAccordion from "./ProviderAccordion";

describe("ProviderAccordion", () => {
  it("renders gracefully when a provider entry is missing required data", () => {
    render(
      <ProviderAccordion
        providers={[null as any]}
        deleteMutation={{ isPending: false, variables: null }}
        handleDelete={vi.fn()}
        setSelectedProviderId={vi.fn()}
      />,
    );

    expect(screen.getByText(/no providers available/i)).toBeInTheDocument();
  });
});
