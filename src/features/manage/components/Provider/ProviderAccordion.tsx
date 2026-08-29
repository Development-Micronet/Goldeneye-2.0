import { useState } from "react";
import * as Accordion from "@radix-ui/react-accordion";
import ContractsTable from "../Contracts/ContractsTable";
import ContractFormModal from "../Contracts/ContractsFormModal";
import {
  ChevronDown,
  Plus,
  Trash2,
  Edit2,
  Loader2,
  Building2,
  ShieldCheck,
  FileText,
  Info,
} from "lucide-react";

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
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#2c6671]/30 bg-[#EFFBFD]/30 p-10 text-center select-none">
        <Building2 className="mb-2 h-10 w-10 text-[#2c6671]/40" />
        <h4 className="text-sm font-bold text-gray-800">No Providers Found</h4>
        <p className="mt-1 max-w-sm text-xs text-gray-500">
          No provider details available. Click the "Add Provider" button to configure a new GIS
          satellite provider.
        </p>
      </div>
    );
  }

  return (
    <>
      <Accordion.Root type="single" collapsible className="space-y-3.5 select-none">
        {validProviders.map((provider) => {
          const isCurrentTabContracts = activeTab[provider.provider_id] === "contracts";

          return (
            <Accordion.Item
              key={provider.provider_id}
              value={provider.provider_id}
              className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-2xs transition-all duration-200 hover:border-[#2c6671]/30"
            >
              {/* Accordion Header */}
              <Accordion.Header className="flex w-full items-center justify-between bg-[#EFFBFD] px-5 py-3.5 transition-colors">
                <Accordion.Trigger className="group flex flex-1 cursor-pointer items-center gap-3 text-left">
                  <ChevronDown className="h-4 w-4 shrink-0 text-[#2c6671] transition-transform duration-200 group-data-[state=open]:rotate-180" />
                  <div className="flex items-center gap-2.5">
                    <Building2 className="h-4 w-4 shrink-0 text-[#2c6671]" />
                    <span className="text-sm font-bold text-gray-900 sm:text-base">
                      {provider.name}
                    </span>
                  </div>

                  {/* Status Badge */}
                  <span
                    className={`ml-2 inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${
                      provider.is_active
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-rose-200 bg-rose-50 text-rose-700"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        provider.is_active ? "bg-emerald-500" : "bg-rose-500"
                      }`}
                    />
                    {provider.is_active ? "Active" : "Inactive"}
                  </span>
                </Accordion.Trigger>

                {/* Right Action Buttons */}
                <div className="flex items-center gap-2">
                  {/* Add Contract Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedProviderIdForContract(provider.provider_id);
                      setIsContractModalOpen(true);
                    }}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-[#2c6671] px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-[#1f4e57] active:scale-[0.98]"
                    title="Add Contract to Provider"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add Contract</span>
                  </button>

                  {/* Delete Provider Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(provider.provider_id);
                    }}
                    disabled={
                      Boolean(deleteMutation?.isPending) &&
                      deleteMutation?.variables === provider.provider_id
                    }
                    className="cursor-pointer rounded-lg p-1.5 text-gray-400 transition hover:bg-rose-50 hover:text-rose-600"
                    title="Delete Provider"
                  >
                    {Boolean(deleteMutation?.isPending) &&
                    deleteMutation?.variables === provider.provider_id ? (
                      <Loader2 className="h-4 w-4 animate-spin text-rose-600" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </Accordion.Header>

              {/* Accordion Content */}
              <Accordion.Content className="data-[state=open]:animate-slideDown data-[state=closed]:animate-slideUp overflow-hidden border-t border-[#2c6671]/10">
                <div className="space-y-4 bg-white p-4 sm:p-5">
                  {/* Inner Sub-Navigation Tabs */}
                  <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                    <button
                      onClick={() =>
                        setActiveTab((prev) => ({
                          ...prev,
                          [provider.provider_id]: "details",
                        }))
                      }
                      className={`inline-flex cursor-pointer items-center gap-1.5 rounded-xl px-4 py-1.5 text-xs font-bold transition-all ${
                        !isCurrentTabContracts
                          ? "bg-[#2c6671] text-white shadow-xs"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      <Info className="h-3.5 w-3.5" />
                      <span>Details</span>
                    </button>

                    <button
                      onClick={() =>
                        setActiveTab((prev) => ({
                          ...prev,
                          [provider.provider_id]: "contracts",
                        }))
                      }
                      className={`inline-flex cursor-pointer items-center gap-1.5 rounded-xl px-4 py-1.5 text-xs font-bold transition-all ${
                        isCurrentTabContracts
                          ? "bg-[#2c6671] text-white shadow-xs"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      <FileText className="h-3.5 w-3.5" />
                      <span>Contracts</span>
                    </button>
                  </div>

                  {/* DETAILS TAB */}
                  {!isCurrentTabContracts && (
                    <div className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-2xs">
                      <table className="w-full border-collapse text-left text-xs">
                        <thead className="border-b border-gray-200/80 bg-[#EFFBFD]">
                          <tr>
                            <th className="w-48 px-4 py-3 font-bold tracking-wide text-[#2c6671] uppercase">
                              Provider Name
                            </th>
                            <th className="px-4 py-3 font-bold tracking-wide text-[#2c6671] uppercase">
                              Description
                            </th>
                            <th className="w-32 px-4 py-3 font-bold tracking-wide text-[#2c6671] uppercase">
                              Status
                            </th>
                            <th className="w-24 px-4 py-3 text-center font-bold tracking-wide text-[#2c6671] uppercase">
                              Action
                            </th>
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-gray-100 bg-white">
                          <tr className="transition-colors hover:bg-[#EFFBFD]/30">
                            <td className="px-4 py-3.5 text-xs font-bold text-gray-900 sm:text-sm">
                              <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4 shrink-0 text-[#2c6671]" />
                                <span>{provider.name}</span>
                              </div>
                            </td>

                            <td className="px-4 py-3.5 text-xs leading-relaxed font-normal text-gray-600">
                              {provider.description || "No description provided."}
                            </td>

                            <td className="px-4 py-3.5 text-xs">
                              <span
                                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${
                                  provider.is_active
                                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                    : "border-rose-200 bg-rose-50 text-rose-700"
                                }`}
                              >
                                <span
                                  className={`h-1.5 w-1.5 rounded-full ${
                                    provider.is_active ? "bg-emerald-500" : "bg-rose-500"
                                  }`}
                                />
                                {provider.is_active ? "Active" : "Inactive"}
                              </span>
                            </td>

                            <td className="px-4 py-3.5 text-center text-xs">
                              <button
                                onClick={() => setSelectedProviderId(provider.provider_id)}
                                className="cursor-pointer rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-[#EFFBFD] hover:text-[#2c6671]"
                                title="Edit Provider"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* CONTRACTS TAB */}
                  {isCurrentTabContracts && (
                    <ContractsTable
                      providerId={provider.provider_id}
                      providerName={provider.name}
                    />
                  )}
                </div>
              </Accordion.Content>
            </Accordion.Item>
          );
        })}
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
