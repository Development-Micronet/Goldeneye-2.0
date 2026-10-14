import React, { useState } from "react";
import {
  Key,
  Trash2,
  Copy,
  Check,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldAlert,
  Search,
  Plus,
} from "lucide-react";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import { useApiKeys, useRevokeApiKeyMutation } from "../../hooks/useApiKeys";
import type { ApiKeyItem } from "../../api/apiKey";

interface ApiKeyTableProps {
  onGenerateKey?: () => void;
}

export const ApiKeyTable: React.FC<ApiKeyTableProps> = ({ onGenerateKey }) => {
  const { data: keys = [], isLoading, isError, error, refetch } = useApiKeys();
  const revokeMutation = useRevokeApiKeyMutation();
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const handleCopyKey = (id: number, keyVal?: string) => {
    if (!keyVal) return;
    navigator.clipboard.writeText(keyVal);
    setCopiedId(id);
    toast.success("API Key copied to clipboard");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRevoke = async (item: ApiKeyItem) => {
    const result = await Swal.fire({
      title: "Revoke API Key?",
      text: `Are you sure you want to revoke "${item.name}"? Applications or scripts using this key will immediately lose access.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, Revoke Key",
      cancelButtonText: "Cancel",
      reverseButtons: true,
    });

    if (!result.isConfirmed) return;

    revokeMutation.mutate(item.id, {
      onSuccess: () => {
        Swal.fire({
          title: "Revoked!",
          text: `API key "${item.name}" has been revoked successfully.`,
          icon: "success",
          timer: 1800,
          showConfirmButton: false,
        });
      },
      onError: (err: any) => {
        const msg =
          err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          "Failed to revoke API key.";
        Swal.fire({
          title: "Error",
          text: msg,
          icon: "error",
        });
      },
    });
  };

  const isExpired = (expiresAt?: string) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  const getStatusBadge = (item: ApiKeyItem) => {
    const expired = isExpired(item.expires_at);
    const isRevoked =
      item.revoked === true ||
      item.is_active === false ||
      item.status?.toLowerCase() === "revoked" ||
      item.status?.toLowerCase() === "inactive";

    if (isRevoked) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-[11px] font-semibold text-red-700">
          <XCircle className="h-3 w-3" />
          Revoked
        </span>
      );
    }

    if (expired) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700">
          <Clock className="h-3 w-3" />
          Expired
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
        <CheckCircle2 className="h-3 w-3" />
        Active
      </span>
    );
  };

  const filteredKeys = keys.filter((k) =>
    k.name?.toLowerCase().includes(searchQuery.toLowerCase().trim()),
  );

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 select-none">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#1F4E57]"></div>
        <span className="mt-3 text-xs font-medium text-gray-500">Loading API keys...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-2xl border border-red-100 bg-red-50 p-5 text-xs text-red-700 select-none">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold">
            <ShieldAlert className="h-4 w-4" />
            <span>Failed to load API keys: {(error as any)?.message || "Unknown error occurred"}</span>
          </div>
          <button
            onClick={() => refetch()}
            className="cursor-pointer rounded-lg bg-red-600 px-3 py-1 text-xs text-white hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
      {/* Search and Filters Bar */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search API keys by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white py-1.5 pl-8 pr-3 text-xs text-gray-800 placeholder-gray-400 focus:border-[#1F4E57] focus:outline-none focus:ring-1 focus:ring-[#1F4E57]"
          />
        </div>

        <div className="text-xs text-gray-500 font-medium">
          Total Keys: <span className="font-bold text-gray-700">{keys.length}</span>
        </div>
      </div>

      {/* Table Container Card */}
      {filteredKeys.length === 0 ? (
        <div className="flex min-h-[260px] flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-gray-50/50 p-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#1F4E57]/10 text-[#1F4E57]">
            <Key className="h-6 w-6" />
          </div>
          <h3 className="mt-3 text-sm font-semibold text-gray-800">
            {searchQuery ? "No matching API keys" : "No API keys created yet"}
          </h3>
          <p className="mt-1 max-w-sm text-xs text-gray-500">
            {searchQuery
              ? `No API keys match "${searchQuery}". Try a different keyword.`
              : "Generate an API key to authenticate external systems, automated scripts, or backend services."}
          </p>
          {onGenerateKey && !searchQuery && (
            <button
              onClick={onGenerateKey}
              className="mt-4 inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-[#1F4E57] px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-[#15353c] active:scale-95"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Generate API Key</span>
            </button>
          )}
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-x-auto overflow-y-auto rounded-2xl border border-gray-200/80 bg-white shadow-sm">
          <table className="w-full min-w-[760px] border-collapse text-left text-xs">
            <thead className="sticky top-0 z-10 border-b border-gray-200 bg-[#EFFBFD] select-none">
              <tr>
                <th className="w-14 px-4 py-3 text-center font-bold tracking-wide text-[#2c6671] uppercase">
                  Sr. No.
                </th>
                <th className="w-64 px-4 py-3 font-bold tracking-wide text-[#2c6671] uppercase">
                  Key Name
                </th>
                <th className="w-48 px-4 py-3 font-bold tracking-wide text-[#2c6671] uppercase">
                  Key Token
                </th>
                <th className="w-36 px-4 py-3 font-bold tracking-wide text-[#2c6671] uppercase">
                  Created Date
                </th>
                <th className="w-36 px-4 py-3 font-bold tracking-wide text-[#2c6671] uppercase">
                  Expires At
                </th>
                <th className="w-28 px-4 py-3 text-center font-bold tracking-wide text-[#2c6671] uppercase">
                  Status
                </th>
                <th className="w-24 px-4 py-3 text-center font-bold tracking-wide text-[#2c6671] uppercase">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {filteredKeys.map((item, index) => {
                const keyDisplay = item.key || item.api_key || item.token || item.masked_key || item.prefix;
                const isRevoked =
                  item.revoked === true ||
                  item.is_active === false ||
                  item.status?.toLowerCase() === "revoked" ||
                  item.status?.toLowerCase() === "inactive";

                return (
                  <tr key={item.id} className="transition-colors hover:bg-[#EFFBFD]/30">
                    {/* Sr No */}
                    <td className="px-4 py-3.5 text-center text-xs font-medium text-gray-500">
                      {index + 1}
                    </td>

                    {/* Key Name */}
                    <td className="px-4 py-3.5 text-sm font-semibold text-gray-900">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#1F4E57]/10 text-[#1F4E57]">
                          <Key className="h-3.5 w-3.5" />
                        </div>
                        <span className="truncate max-w-[220px]" title={item.name}>
                          {item.name}
                        </span>
                      </div>
                    </td>

                    {/* Key Token */}
                    <td className="px-4 py-3.5 text-xs text-gray-600 font-mono">
                      {keyDisplay ? (
                        <div className="flex items-center gap-1.5">
                          <span className="truncate max-w-[140px] rounded bg-gray-100 px-1.5 py-0.5 text-[11px] text-gray-700">
                            {keyDisplay}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyKey(item.id, keyDisplay)}
                            title="Copy Key"
                            className="cursor-pointer text-gray-400 hover:text-gray-700 transition"
                          >
                            {copiedId === item.id ? (
                              <Check className="h-3.5 w-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">••••••••••••</span>
                      )}
                    </td>

                    {/* Created Date */}
                    <td className="px-4 py-3.5 text-xs text-gray-600">
                      {item.created_at
                        ? new Date(item.created_at).toLocaleDateString()
                        : "—"}
                    </td>

                    {/* Expiration Date */}
                    <td className="px-4 py-3.5 text-xs font-medium text-gray-700">
                      {item.expires_at || "—"}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5 text-center">
                      {getStatusBadge(item)}
                    </td>

                    {/* Action */}
                    <td className="px-4 py-3.5 text-center">
                      <button
                        type="button"
                        onClick={() => handleRevoke(item)}
                        disabled={isRevoked || revokeMutation.isPending}
                        title={isRevoked ? "Key is already revoked" : "Revoke API Key"}
                        className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition ${
                          isRevoked
                            ? "cursor-not-allowed border-gray-200 text-gray-300 bg-gray-50"
                            : "cursor-pointer border-red-200 bg-red-50 text-red-600 hover:bg-red-100 hover:border-red-300 active:scale-95"
                        }`}
                      >
                        <Trash2 className="h-3 w-3" />
                        <span>Revoke</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
