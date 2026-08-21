import { useState } from "react";
import * as Accordion from "@radix-ui/react-accordion";
import ContractsTable from "../Contracts/ContractsTable";
import ContractFormModal from "../Contracts/ContractsFormModal";
import { ChevronDown, Plus, Trash2, Edit2, Loader2 } from "lucide-react";

type Props = {
  providers: any[];
  deleteMutation: any;
  handleDelete: (id: string) => void;
  setSelectedProviderId: (id: string) => void;
};

export default function ProviderAccordion({
  providers,
  deleteMutation,
  handleDelete,
  setSelectedProviderId,
}: Props) {
  const [activeTab, setActiveTab] = useState<Record<string, "details" | "contracts">>({});

  const [isContractModalOpen, setIsContractModalOpen] = useState(false);
  const [selectedProviderIdForContract, setSelectedProviderIdForContract] = useState("");

  const validProviders = (Array.isArray(providers) ? providers : [])
    .filter(
      (provider): provider is Record<string, any> => !!provider && typeof provider === "object",
    )
    .map((provider, index) => ({
      ...provider,
      provider_id: String(provider.provider_id ?? `provider-${index}`),
      name: String(provider.name ?? "Unnamed Provider"),
      description: String(provider.description ?? ""),
      is_active: Boolean(provider.is_active ?? false),
    }));

  if (!validProviders.length) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 text-center text-gray-500">
        No providers available.
      </div>
    );
  }

  return (
    <>
      <Accordion.Root type="single" collapsible className="space-y-4">
        {validProviders.map((provider) => (
          <Accordion.Item
            key={provider.provider_id}
            value={provider.provider_id}
            className="overflow-hidden rounded-lg border bg-white"
          >
            {/* Header */}

            <Accordion.Header className="flex w-full items-center justify-between bg-cyan-50 px-5 py-4 transition hover:bg-cyan-100">
              <Accordion.Trigger className="group flex flex-1 items-center gap-2 text-left cursor-pointer">
                <ChevronDown className="h-5 w-5 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                <span className="font-semibold text-gray-800">{provider.name}</span>
              </Accordion.Trigger>

              <div className="flex items-center gap-3">
                {/* Add Contract */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedProviderIdForContract(provider.provider_id);
                    setIsContractModalOpen(true);
                  }}
                  className="rounded p-2 text-blue-600 hover:bg-blue-100"
                  title="Add Contract"
                >
                  <Plus size={18} />
                </button>

                {/* Delete */}
                <button
                  type="button"
                  onClick={() => handleDelete(provider.provider_id)}
                  disabled={
                    Boolean(deleteMutation?.isPending) &&
                    deleteMutation?.variables === provider.provider_id
                  }
                  className="rounded p-2 text-red-600 hover:bg-red-100"
                  title="Delete Provider"
                >
                  {Boolean(deleteMutation?.isPending) &&
                  deleteMutation?.variables === provider.provider_id ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Trash2 size={18} />
                  )}
                </button>
              </div>
            </Accordion.Header>

            {/* Content */}

            <Accordion.Content className="data-[state=open]:animate-slideDown data-[state=closed]:animate-slideUp overflow-hidden">
              <div className="p-5">
                {/* Top Buttons */}
                <div className="mb-4 flex gap-3">
                  <button
                    onClick={() =>
                      setActiveTab((prev) => ({
                        ...prev,
                        [provider.provider_id]: "details",
                      }))
                    }
                    className={`rounded-md px-4 py-2 text-sm font-medium ${
                      activeTab[provider.provider_id] !== "contracts"
                        ? "bg-primary text-white"
                        : "bg-gray-200"
                    }`}
                  >
                    Details
                  </button>

                  <button
                    onClick={() =>
                      setActiveTab((prev) => ({
                        ...prev,
                        [provider.provider_id]: "contracts",
                      }))
                    }
                    className={`rounded-md px-4 py-2 text-sm font-medium ${
                      activeTab[provider.provider_id] === "contracts"
                        ? "bg-primary text-white"
                        : "bg-gray-200"
                    }`}
                  >
                    Contracts
                  </button>
                </div>

                {/* DETAILS */}

                {activeTab[provider.provider_id] !== "contracts" && (
                  <table className="min-w-full border border-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="border p-3 text-left">Provider Name</th>
                        <th className="border p-3 text-left">Description</th>
                        <th className="border p-3 text-left">Status</th>
                        <th className="border p-3 text-center">Action</th>
                      </tr>
                    </thead>

                    <tbody>
                      <tr>
                        <td className="border p-3">{provider.name}</td>

                        <td className="border p-3">{provider.description || "-"}</td>

                        <td className="border p-3">
                          <div className="flex items-center gap-2">
                            <span
                              className={`h-2.5 w-2.5 rounded-full ${
                                provider.is_active ? "bg-green-500" : "bg-yellow-500"
                              }`}
                            />
                            {provider.is_active ? "Active" : "Inactive"}
                          </div>
                        </td>

                        <td className="border p-3">
                          <div className="flex justify-center">
                            <button
                              onClick={() => setSelectedProviderId(provider.provider_id)}
                              className="rounded-md p-2 text-blue-600 transition hover:bg-blue-100"
                              title="Edit Provider"
                            >
                              <Edit2 size={17} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                )}

                {/* CONTRACTS */}

                {activeTab[provider.provider_id] === "contracts" && (
                  <ContractsTable providerId={provider.provider_id} providerName={provider.name} />
                )}
              </div>
            </Accordion.Content>
          </Accordion.Item>
        ))}
      </Accordion.Root>

      <ContractFormModal
        isOpen={isContractModalOpen}
        onClose={() => {
          setIsContractModalOpen(false);
          setSelectedProviderIdForContract("");
        }}
        selectedProviderId={selectedProviderIdForContract}
      />
    </>
  );
}
