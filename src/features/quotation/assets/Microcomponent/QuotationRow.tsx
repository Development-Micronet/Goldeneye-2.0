import { useState } from "react";
import { Link } from "react-router-dom";
import { FiEdit3, FiEye, FiDownload, FiCheck, FiTrash2, FiX } from "react-icons/fi";
import { useUser } from "../../../auth/AuthProvider/AuthContext";
import { useMutation } from "@tanstack/react-query";
import { GetQuotation } from "../../api/Quotation";
import { GetTechspec } from "../../api/Techspec";
import { toast } from "react-toastify";
import { buildPreviewHTML } from "../preview/Preview";

interface QuotationRowProps {
  q: any;
  index: number;
  currentPage: number;
  descAmount: number;
  handleDelete: (quoteNo: string) => void;
  deleteMutation: any;
  Exportpdf: any;
  verificationmutation: any;
  isSelected?: boolean;
  onToggleSelect?: (quoteNo: string) => void;
}

const QuotationRow: React.FC<QuotationRowProps> = ({
  q,
  index,
  currentPage,
  handleDelete,
  deleteMutation,
  Exportpdf,
  verificationmutation,
  isSelected,
  onToggleSelect,
}) => {
  const { role } = useUser() || {};
  const [previewOpen, setPreviewOpen] = useState<boolean>(false);
  const [previewHtml, setPreviewHtml] = useState<string>("");

  const quotationMutation = useMutation({
    mutationFn: GetQuotation,
    onSuccess: async (res) => {
      const specResults = await Promise.all(
        (res.description || []).map((it: any) => GetTechspec(it.item).catch(() => null)),
      );
      const freshSpecs = specResults.flat().filter(Boolean);

      const specsByItem: Record<string, any> = {};
      (res.description || []).forEach((item: any, i: number) => {
        if (item.item) specsByItem[item.item] = specResults[i] ?? [];
      });

      const disc = parseFloat(res.discount || 0);
      const discountPct = disc;
      const discountEnabled = disc > 0;

      const html = buildPreviewHTML({
        quote_no: res.quote_no,
        reference_no: res.reference_no,
        reference_date: res.reference_date,
        date: res.date,

        from_company: res.from_company,
        from_company_email: res.from_company_email,
        from_company_address: res.from_company_address,
        authorized_name: res.from_company_authorized_person,
        from_company_authorized_person: res.from_company_authorized_person,
        from_company_authorized_person_designation:
          res.from_company_authorized_person_designation ?? "",

        to_company: res.to_company,
        receiver_company_authorized_person: res.receiver_company_authorized_person,
        receiver_company_authorized_person_designation:
          res.receiver_company_authorized_person_designation,
        receiver_company_email: res.receiver_company_email ?? "",

        delivery: res.delivery,
        incoterms: res.incoterms,
        payment: res.payment,
        purchase_order: res.purchase_order,
        validity: res.validity,

        address_line_1: res.address_line_1 ?? res.street ?? "",
        address_line_2: res.address_line_2 ?? "",
        city: res.city ?? "",
        state: res.state ?? "",
        country: res.country ?? "",
        postal_code: res.postal_code ?? "",

        items: (res.description || []).map((item: any) => ({
          ...item,
          cgst_pct: item.cgst_pct ?? res.cgst_pct,
          sgst_pct: item.sgst_pct ?? res.sgst_pct,
          igst_pct: item.igst_pct ?? res.igst_pct,
          geometricprocessing: item.geometricprocessing ?? "",
          spectralbands: item.spectralbands ?? "",
          techSpecs: item.techSpecs ?? [],
        })),

        extraImages: Array.isArray(res.images)
          ? res.images.map((img: any) => ({
              id: img.id,
              dataUrl: img.image?.url ?? img.image ?? img.url ?? "",
              caption: img.captions ?? img.caption ?? "",
              kml_file: img.kml_file ?? img.kml ?? img.kml_url ?? null,
              html_file: img.html_file ?? img.html ?? img.html_url ?? null,
              jpg_file: img.jpg_file ?? img.jpg ?? img.jpg_url ?? null,
              supportingfiles: Array.isArray(img.supportingfiles) ? img.supportingfiles : [],
              _deleted: false,
            }))
          : [],

        techspecimage: freshSpecs,
        discountPct: discountPct,
        discountEnabled: discountEnabled,
        grandTotal: res.total_amount,

        terms_and_specifications: res.terms_and_specifications || [],
        verified: res.verified ?? false,
        metadata: {},
      });

      setPreviewHtml(html);
      setPreviewOpen(true);
    },

    onError: () => {
      toast.error("Failed to load preview");
    },
  });

  const handleVerify = () => {
    verificationmutation.mutate(q.quote_no);
  };

  const handlePreview = () => {
    quotationMutation.mutate(q.quote_no);
  };

  const isAuthorize = role === "superadmin" || role === "admin";

  return (
    <>
      <tr
        className={`hover:bg-primary-50/30 border-light-200 border-b transition-colors duration-150 ${isSelected ? "bg-primary-50/60" : ""}`}
      >
        <td className="w-10 px-3 py-2.5 text-center">
          <input
            type="checkbox"
            checked={isSelected || false}
            onChange={() => onToggleSelect && onToggleSelect(q.quote_no)}
            className="h-4 w-4 cursor-pointer rounded border-gray-300 text-[#2c6671] focus:ring-[#2c6671]"
          />
        </td>
        <td className="text-primary-500 px-3 py-2.5 font-mono text-[11px] font-semibold">
          {String((currentPage - 1) * 10 + index + 1).padStart(2, "0")}
        </td>

        <td className="text-primary-900 max-w-[140px] px-3 py-2.5 font-semibold">
          <div className="truncate text-sm" title={q.to_company}>
            {q.to_company}
          </div>
        </td>

        <td className="text-primary-700 hidden max-w-[120px] px-3 py-2.5 lg:table-cell">
          <div className="truncate text-sm" title={q.authorized_name}>
            {q.authorized_name}
          </div>
        </td>

        <td className="text-primary-600 px-3 py-2.5 font-mono text-[11px] font-bold">
          {q.quote_no}
        </td>

        <td className="text-primary-700 hidden px-3 py-2.5 text-xs whitespace-nowrap sm:table-cell">
          {q.date}
        </td>

        <td className="text-primary-700 hidden px-3 py-2.5 text-xs whitespace-nowrap xl:table-cell">
          {q.validity}
        </td>

        <td className="text-primary-900 px-3 py-2.5 text-sm font-bold">
          ₹{Number(q.total_amount || 0).toLocaleString()}
        </td>

        <td className="hidden px-3 py-2.5 sm:table-cell">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
              q.verified ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                q.verified ? "bg-green-600" : "animate-pulse bg-yellow-500"
              }`}
            />
            {q.verified ? "Verified" : "Pending"}
          </span>
        </td>

        <td className="px-3 py-2 text-center whitespace-nowrap">
          <div className="flex items-center justify-center gap-1.5">
            {/* Preview */}
            <button
              type="button"
              onClick={handlePreview}
              title="Preview Quotation"
              className="rounded-md p-1.5 text-purple-600 transition-colors hover:bg-purple-50"
            >
              <FiEye size={16} />
            </button>

            {/* Edit */}
            <Link
              to={`/quotation?view=update&id=${q.quote_no}`}
              title="Edit Quotation"
              className="inline-flex items-center rounded-md p-1.5 text-blue-600 transition-colors hover:bg-blue-50"
            >
              <FiEdit3 size={16} />
            </Link>

            {/* Export PDF */}
            <button
              type="button"
              onClick={() => Exportpdf.mutate(q.quote_no)}
              disabled={!q.verified}
              title={q.verified ? "Export PDF" : "Must be verified to export PDF"}
              className={`rounded-md p-1.5 transition-colors ${
                q.verified
                  ? "cursor-pointer text-emerald-600 hover:bg-emerald-50"
                  : "cursor-not-allowed text-gray-300 opacity-50"
              }`}
            >
              <FiDownload size={16} />
            </button>

            {/* Verify / Unverify */}
            <button
              type="button"
              onClick={handleVerify}
              title={q.verified ? "Unverify Quotation" : "Verify Quotation"}
              className={`rounded-md p-1.5 transition-colors ${
                q.verified ? "text-amber-600 hover:bg-amber-50" : "text-teal-600 hover:bg-teal-50"
              }`}
            >
              <FiCheck size={16} />
            </button>

            {/* Delete */}
            <button
              type="button"
              onClick={() => handleDelete(q.quote_no)}
              disabled={deleteMutation.isPending || !isAuthorize}
              title={isAuthorize ? "Delete Quotation" : "Unauthorized to delete"}
              className={`rounded-md p-1.5 transition-colors ${
                isAuthorize
                  ? "cursor-pointer text-red-600 hover:bg-red-50"
                  : "cursor-not-allowed text-gray-300 opacity-50"
              }`}
            >
              <FiTrash2 size={16} />
            </button>
          </div>
        </td>
      </tr>
      {previewOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/70 p-4">
          <div className="bg-primary-800 flex items-center justify-between rounded-t-lg px-4 py-2.5">
            <span className="text-sm font-bold text-white">Quotation Preview — {q.quote_no}</span>

            <button
              onClick={() => setPreviewOpen(false)}
              className="rounded p-1 text-white hover:text-gray-300"
            >
              <FiX size={18} />
            </button>
          </div>

          <div className="bg-light-300 flex-1 overflow-auto rounded-b-lg p-4">
            {quotationMutation.isPending ? (
              <div className="flex items-center justify-center py-20 font-medium text-white">
                Loading preview...
              </div>
            ) : (
              <iframe
                srcDoc={previewHtml}
                title={`Preview ${q.quote_no}`}
                className="mx-auto block w-full max-w-[850px] rounded bg-white shadow-lg"
                style={{ minHeight: "calc(100vh - 100px)", border: "none" }}
              />
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default QuotationRow;
