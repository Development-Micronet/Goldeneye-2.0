import { useState } from "react";
import { Link } from "react-router-dom";
import {
  FiEdit3,
  FiEye,
  FiDownload,
  FiCheck,
  FiTrash2,
  FiX,
} from "react-icons/fi";
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
}

const QuotationRow: React.FC<QuotationRowProps> = ({
  q,
  index,
  currentPage,
  handleDelete,
  deleteMutation,
  Exportpdf,
  verificationmutation,
}) => {
  const { role } = useUser() || {};
  const [previewOpen, setPreviewOpen] = useState<boolean>(false);
  const [previewHtml, setPreviewHtml] = useState<string>("");

  const quotationMutation = useMutation({
    mutationFn: GetQuotation,
    onSuccess: async (res) => {
      const specResults = await Promise.all(
        (res.description || []).map((it: any) => GetTechspec(it.item).catch(() => null))
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
        receiver_company_authorized_person:
          res.receiver_company_authorized_person,
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
              dataUrl: img.image?.url ?? "",
              caption: img.captions ?? img.caption ?? "",
              kml_download_url: img.kml_file?.url ?? img.html_file?.url ?? null,
              kml_url: img.kml_file?.url ?? null,
              supportingfile: img.kml_file?.url ?? null,
              attachment_type: img.html_file?.url
                ? "html"
                : img.kml_file?.url
                  ? "kml"
                  : null,

              html_file: img.html_file?.url ?? null,
              jpg_file: img.jpg_file?.url ?? null,
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
      <tr className="hover:bg-primary-50/30 transition-colors duration-150 border-b border-light-200">
        <td className="px-3 py-2.5 text-primary-500 text-[11px] font-mono font-semibold">
          {String((currentPage - 1) * 10 + index + 1).padStart(2, "0")}
        </td>

        <td className="px-3 py-2.5 font-semibold text-primary-900 max-w-[140px]">
          <div className="truncate text-sm" title={q.to_company}>
            {q.to_company}
          </div>
        </td>

        <td className="px-3 py-2.5 text-primary-700 max-w-[120px] hidden lg:table-cell">
          <div className="truncate text-sm" title={q.authorized_name}>
            {q.authorized_name}
          </div>
        </td>

        <td className="px-3 py-2.5 font-mono text-[11px] font-bold text-primary-600">
          {q.quote_no}
        </td>

        <td className="px-3 py-2.5 text-primary-700 whitespace-nowrap text-xs hidden sm:table-cell">
          {q.date}
        </td>

        <td className="px-3 py-2.5 text-primary-700 whitespace-nowrap text-xs hidden xl:table-cell">
          {q.validity}
        </td>

        <td className="px-3 py-2.5 font-bold text-sm text-primary-900">
          ₹{Number(q.total_amount || 0).toLocaleString()}
        </td>

        <td className="px-3 py-2.5 hidden sm:table-cell">
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded-full ${
              q.verified
                ? "bg-green-100 text-green-700"
                : "bg-yellow-100 text-yellow-700"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                q.verified ? "bg-green-600" : "bg-yellow-500 animate-pulse"
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
              className="p-1.5 rounded-md hover:bg-purple-50 text-purple-600 transition-colors"
            >
              <FiEye size={16} />
            </button>

            {/* Edit */}
            <Link
              to={`/quotation?view=update&id=${q.quote_no}`}
              title="Edit Quotation"
              className="p-1.5 rounded-md hover:bg-blue-50 text-blue-600 transition-colors inline-flex items-center"
            >
              <FiEdit3 size={16} />
            </Link>

            {/* Export PDF */}
            <button
              type="button"
              onClick={() => Exportpdf.mutate(q.quote_no)}
              disabled={!q.verified}
              title={q.verified ? "Export PDF" : "Must be verified to export PDF"}
              className={`p-1.5 rounded-md transition-colors ${
                q.verified
                  ? "hover:bg-emerald-50 text-emerald-600 cursor-pointer"
                  : "text-gray-300 cursor-not-allowed opacity-50"
              }`}
            >
              <FiDownload size={16} />
            </button>

            {/* Verify / Unverify */}
            <button
              type="button"
              onClick={handleVerify}
              title={q.verified ? "Unverify Quotation" : "Verify Quotation"}
              className={`p-1.5 rounded-md transition-colors ${
                q.verified
                  ? "hover:bg-amber-50 text-amber-600"
                  : "hover:bg-teal-50 text-teal-600"
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
              className={`p-1.5 rounded-md transition-colors ${
                isAuthorize
                  ? "hover:bg-red-50 text-red-600 cursor-pointer"
                  : "text-gray-300 cursor-not-allowed opacity-50"
              }`}
            >
              <FiTrash2 size={16} />
            </button>
          </div>
        </td>
      </tr>
      {previewOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/70 p-4">
          <div className="flex items-center justify-between bg-primary-800 px-4 py-2.5 rounded-t-lg">
            <span className="text-white text-sm font-bold">
              Quotation Preview — {q.quote_no}
            </span>

            <button
              onClick={() => setPreviewOpen(false)}
              className="text-white hover:text-gray-300 p-1 rounded"
            >
              <FiX size={18} />
            </button>
          </div>

          <div className="flex-1 bg-light-300 p-4 overflow-auto rounded-b-lg">
            {quotationMutation.isPending ? (
              <div className="flex items-center justify-center py-20 text-white font-medium">
                Loading preview...
              </div>
            ) : (
              <iframe
                srcDoc={previewHtml}
                title={`Preview ${q.quote_no}`}
                className="w-full max-w-[850px] mx-auto block rounded shadow-lg bg-white"
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
