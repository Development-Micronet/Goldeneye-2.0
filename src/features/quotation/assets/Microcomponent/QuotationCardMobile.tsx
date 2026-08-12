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
      className={`bg-white rounded-lg border border-light-200 p-3 shadow-sm ${isSelected ? "ring-2 ring-[#2c6671]/40 bg-primary-50/20" : ""}`}
    >
      <div className="flex items-start justify-between mb-2 gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <input
            type="checkbox"
            checked={isSelected || false}
            onChange={() => onToggleSelect && onToggleSelect(q.quote_no)}
            className="rounded border-gray-300 text-[#2c6671] focus:ring-[#2c6671] cursor-pointer w-4 h-4 flex-shrink-0 mt-0.5"
          />
          <div className="min-w-0">
            <p className="font-semibold text-primary-900 text-sm truncate">
              {q.to_company}
            </p>
            <p className="font-mono text-xs text-primary-500 font-semibold mt-0.5">
              {q.quote_no}
            </p>
          </div>
        </div>
        <span
          className={`flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded-full ${
            q.verified
              ? "bg-green-100 text-green-700"
              : "bg-yellow-100 text-yellow-700"
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${q.verified ? "bg-green-600" : "bg-yellow-500 animate-pulse"}`}
          />
          {q.verified ? "Verified" : "Pending"}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mb-3 pb-2 border-b border-light-200 text-xs">
        {[
          ["Contact", q.authorized_name],
          ["Date", q.date],
          ["Validity", q.validity],
          ["Amount", `₹${(descAmount || 0).toLocaleString()}`],
        ].map(([label, val]) => (
          <div key={label}>
            <span className="text-[10px] font-semibold text-primary-500 uppercase">
              {label}
            </span>
            <p className="text-primary-900 font-medium truncate">{val}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mb-2.5">
        <div>
          <span className="text-[10px] font-semibold text-primary-500 uppercase">
            Total
          </span>
          <p className="text-lg font-bold text-primary-900">
            ₹{Number(q.total_amount || 0).toLocaleString()}
          </p>
        </div>
      </div>

      <div className="flex gap-1.5 text-xs">
        <Link
          to={`/quotation?view=update&id=${q.quote_no}`}
          className="flex-1 inline-flex items-center justify-center px-3 py-1.5 font-semibold rounded bg-primary-600 text-white hover:bg-primary-700 transition-colors"
        >
          Edit
        </Link>

        <button
          onClick={() => Exportpdf.mutate(q.quote_no)}
          disabled={!q.verified}
          className={`flex-1 inline-flex items-center justify-center px-3 py-1.5 font-semibold rounded transition-colors ${
            q.verified
              ? "bg-light-100 text-primary-700 hover:bg-light-200"
              : "bg-gray-100 text-gray-400 cursor-not-allowed"
          }`}
        >
          Export
        </button>

        <button
          onClick={() => handleDelete(q.quote_no)}
          disabled={deleteMutation.isPending || !isAuthorize}
          className={`inline-flex items-center justify-center px-2.5 py-1.5 rounded transition-colors ${
            isAuthorize
              ? "bg-red-100 text-red-600 hover:bg-red-200"
              : "bg-gray-100 text-gray-400 cursor-not-allowed"
          }`}
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
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
