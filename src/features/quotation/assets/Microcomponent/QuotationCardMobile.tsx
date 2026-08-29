import React from "react";
import { Link } from "react-router-dom";
import { useUser } from "../../../auth/AuthProvider/AuthContext";

interface QuotationCardMobileProps {
  q: any;
  descAmount: number;
  handleDelete: (quoteNo: string) => void;
  deleteMutation: any;
  Exportpdf: any;
  isSelected?: boolean;
  onToggleSelect?: (quoteNo: string) => void;
}

const QuotationCardMobile: React.FC<QuotationCardMobileProps> = ({
  q,
  descAmount,
  handleDelete,
  deleteMutation,
  Exportpdf,
  isSelected,
  onToggleSelect,
}) => {
  const { role } = useUser() || {};
  const isAuthorize = role === "superadmin" || role === "admin";

  return (
    <div
      key={q.quote_no}
      className={`border-light-200 rounded-lg border bg-white p-3 shadow-sm ${isSelected ? "bg-primary-50/20 ring-2 ring-[#2c6671]/40" : ""}`}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <input
            type="checkbox"
            checked={isSelected || false}
            onChange={() => onToggleSelect && onToggleSelect(q.quote_no)}
            className="mt-0.5 h-4 w-4 flex-shrink-0 cursor-pointer rounded border-gray-300 text-[#2c6671] focus:ring-[#2c6671]"
          />
          <div className="min-w-0">
            <p className="text-primary-900 truncate text-sm font-semibold">{q.to_company}</p>
            <p className="text-primary-500 mt-0.5 font-mono text-xs font-semibold">{q.quote_no}</p>
          </div>
        </div>
        <span
          className={`inline-flex flex-shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
            q.verified ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${q.verified ? "bg-green-600" : "animate-pulse bg-yellow-500"}`}
          />
          {q.verified ? "Verified" : "Pending"}
        </span>
      </div>

      <div className="border-light-200 mb-3 grid grid-cols-2 gap-x-4 gap-y-1.5 border-b pb-2 text-xs">
        {[
          ["Contact", q.authorized_name],
          ["Date", q.date],
          ["Validity", q.validity],
          ["Amount", `₹${(descAmount || 0).toLocaleString()}`],
        ].map(([label, val]) => (
          <div key={label}>
            <span className="text-primary-500 text-[10px] font-semibold uppercase">{label}</span>
            <p className="text-primary-900 truncate font-medium">{val}</p>
          </div>
        ))}
      </div>

      <div className="mb-2.5 flex items-center justify-between">
        <div>
          <span className="text-primary-500 text-[10px] font-semibold uppercase">Total</span>
          <p className="text-primary-900 text-lg font-bold">
            ₹{Number(q.total_amount || 0).toLocaleString()}
          </p>
        </div>
      </div>

      <div className="flex gap-1.5 text-xs">
        <Link
          to={`/quotation?view=update&id=${q.quote_no}`}
          className="bg-primary-600 hover:bg-primary-700 inline-flex flex-1 items-center justify-center rounded px-3 py-1.5 font-semibold text-white transition-colors"
        >
          Edit
        </Link>

        <button
          onClick={() => Exportpdf.mutate(q.quote_no)}
          disabled={!q.verified}
          className={`inline-flex flex-1 items-center justify-center rounded px-3 py-1.5 font-semibold transition-colors ${
            q.verified
              ? "bg-light-100 text-primary-700 hover:bg-light-200"
              : "cursor-not-allowed bg-gray-100 text-gray-400"
          }`}
        >
          Export
        </button>

        <button
          onClick={() => handleDelete(q.quote_no)}
          disabled={deleteMutation.isPending || !isAuthorize}
          className={`inline-flex items-center justify-center rounded px-2.5 py-1.5 transition-colors ${
            isAuthorize
              ? "bg-red-100 text-red-600 hover:bg-red-200"
              : "cursor-not-allowed bg-gray-100 text-gray-400"
          }`}
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22"
            />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default QuotationCardMobile;
