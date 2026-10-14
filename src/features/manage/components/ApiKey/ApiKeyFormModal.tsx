import React, { useState } from "react";
import { X, Key, Copy, Check, AlertTriangle, Calendar } from "lucide-react";
import { useCreateApiKeyMutation } from "../../hooks/useApiKeys";
import { toast } from "react-toastify";

interface ApiKeyFormModalProps {
  open: boolean;
  onClose: () => void;
}

export const ApiKeyFormModal: React.FC<ApiKeyFormModalProps> = ({ open, onClose }) => {
  const [name, setName] = useState("");
  const [expiresAt, setExpiresAt] = useState("2026-12-31");
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const createMutation = useCreateApiKeyMutation();

  if (!open) return null;

  const handleResetAndClose = () => {
    setName("");
    setExpiresAt("2026-12-31");
    setCreatedKey(null);
    setCopied(false);
    onClose();
  };

  const handlePresetDate = (days: number | "2026") => {
    if (days === "2026") {
      setExpiresAt("2026-12-31");
      return;
    }
    const d = new Date();
    d.setDate(d.getDate() + days);
    setExpiresAt(d.toISOString().split("T")[0]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Please enter a key name");
      return;
    }
    if (!expiresAt) {
      toast.error("Please select an expiration date");
      return;
    }

    createMutation.mutate(
      {
        name: name.trim(),
        expires_at: expiresAt,
      },
      {
        onSuccess: (data: any) => {
          // Extract the token/key from response
          const secret =
            data?.key ||
            data?.api_key ||
            data?.token ||
            data?.secret ||
            data?.data?.key ||
            data?.data?.api_key ||
            data?.data?.token;

          if (secret) {
            setCreatedKey(secret);
          } else {
            toast.success("API key created successfully!");
            handleResetAndClose();
          }
        },
        onError: (err: any) => {
          const msg =
            err?.response?.data?.message ||
            err?.response?.data?.error ||
            err?.message ||
            "Failed to generate API key";
          toast.error(msg);
        },
      },
    );
  };

  const handleCopy = () => {
    if (!createdKey) return;
    navigator.clipboard.writeText(createdKey);
    setCopied(true);
    toast.success("API key copied to clipboard");
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity duration-200"
        onClick={handleResetAndClose}
      />

      {/* Modal Dialog */}
      <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl transition-all">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-6 py-4.5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1F4E57]/10 text-[#1F4E57]">
              <Key className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">
                {createdKey ? "API Key Generated" : "Generate New API Key"}
              </h3>
              <p className="text-xs text-slate-500">
                {createdKey
                  ? "Save this key securely. It will not be shown again."
                  : "Create credentials to access API endpoints securely."}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleResetAndClose}
            className="cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        {createdKey ? (
          <div className="p-6 space-y-5">
            {/* Warning Callout */}
            <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800">
              <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-900">Save your secret API key</p>
                <p className="mt-1 text-amber-800 leading-relaxed">
                  Please copy this secret key now and store it in a safe place. For security
                  reasons, you will not be able to view it again after closing this window.
                </p>
              </div>
            </div>

            {/* Generated Key Box */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">
                Secret API Key
              </label>
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2.5">
                <input
                  type="text"
                  readOnly
                  value={createdKey}
                  className="flex-1 bg-transparent px-2 font-mono text-xs font-semibold text-slate-800 outline-none select-all"
                />
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[#1F4E57] px-3 py-1.5 text-xs font-medium text-white shadow-xs transition hover:bg-[#15353c] active:scale-95"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-300" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Key Meta details */}
            <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5 text-xs text-slate-600 space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-400">Key Name:</span>
                <span className="font-semibold text-slate-800">{name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Expires At:</span>
                <span className="font-semibold text-slate-800">{expiresAt}</span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleResetAndClose}
                className="cursor-pointer rounded-xl bg-[#1F4E57] px-6 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#15353c] active:scale-95"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="p-6 space-y-4">
              {/* Key Name Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Key Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Production Server Key"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:border-[#1F4E57] focus:outline-none focus:ring-1 focus:ring-[#1F4E57]"
                />
                <span className="block text-[11px] text-slate-400">
                  A descriptive name to identify which service or application uses this key.
                </span>
              </div>

              {/* Expiry Date Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Expires At <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="date"
                    required
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-800 focus:border-[#1F4E57] focus:outline-none focus:ring-1 focus:ring-[#1F4E57]"
                  />
                  <Calendar className="pointer-events-none absolute right-3.5 top-2.5 h-4 w-4 text-slate-400" />
                </div>

                {/* Quick Presets */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[11px] text-slate-400 mr-1">Presets:</span>
                  <button
                    type="button"
                    onClick={() => handlePresetDate(30)}
                    className="cursor-pointer rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-600 hover:bg-slate-100 transition"
                  >
                    30 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePresetDate(90)}
                    className="cursor-pointer rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-600 hover:bg-slate-100 transition"
                  >
                    90 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePresetDate(365)}
                    className="cursor-pointer rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-600 hover:bg-slate-100 transition"
                  >
                    1 Year
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePresetDate("2026")}
                    className="cursor-pointer rounded-md border border-[#1F4E57]/20 bg-[#EFFBFD] px-2 py-0.5 text-[11px] font-medium text-[#1F4E57] hover:bg-[#EFFBFD]/80 transition"
                  >
                    2026-12-31
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50/50 px-6 py-4">
              <button
                type="button"
                onClick={handleResetAndClose}
                className="cursor-pointer rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 active:scale-95"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="cursor-pointer rounded-xl bg-[#1F4E57] px-6 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#15353c] active:scale-95 disabled:opacity-50"
              >
                {createMutation.isPending ? "Generating..." : "Generate Key"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
