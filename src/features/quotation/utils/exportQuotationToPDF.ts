import { buildPreviewHTML } from "../assets/preview/Preview";
import { toast } from "react-toastify";
import { downloadAsPDF } from "../hooks/Usepdfdownload";

interface FileResource {
  url: string;
}

interface QuotationImage {
  id: number | string;
  image?: FileResource | null;
  kml_file?: FileResource | null;
  html_file?: FileResource | null;
  caption?: string;
  attachment_type?: string;
  order?: number;
}

export interface QuotationData {
  quote_no?: string;
  reference_no?: string;
  reference_date?: string;
  date?: string;
  to_company?: string;
  authorized_name?: string;
  from_company?: string;
  delivery?: string;
  incoterms?: string;
  payment?: string;
  purchase_order?: string;
  validity?: string;
  description?: unknown[];
  cgst?: number;
  sgst?: number;
  igst?: number;
  products?: unknown[];
  terms_and_specifications?: unknown[];
  metadata?: Record<string, unknown>;
  images?: QuotationImage[];
  state?: string;
  city?: string;
  country?: string;
  street?: string;
  postal_code?: string;
  verified?: boolean;
}

interface PreviewImage {
  id: number | string;
  dataUrl: string | ArrayBuffer | null;
  caption: string;
  kml_url: string | null;
  html_file: FileResource | null;
  kml_download_url: string | null;
  attachment_type: string;
  supportingfile: boolean;
  order: number;
}

async function kmlToDataURI(
  url?: string | null
): Promise<string | ArrayBuffer | null> {
  if (!url) return null;

  try {
    const res = await fetch(url, { mode: "cors" });
    const blob = await res.blob();

    return await new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);

      reader.readAsDataURL(blob);
    });
  } catch {
    return url;
  }
}

async function toBase64(
  url?: string | null
): Promise<string | ArrayBuffer | null> {
  if (!url) return null;

  try {
    const res = await fetch(url, { mode: "cors" });
    const blob = await res.blob();

    return await new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);

      reader.readAsDataURL(blob);
    });
  } catch {
    return url;
  }
}

export async function exportQuotationToPDF(
  quotationData: QuotationData
): Promise<void> {
  try {
    const q = quotationData;

    const fileName = `micronet_${q.quote_no || "quotation"}.pdf`;

    const extraImages: any[] = await Promise.all(
      (q.images ?? []).map(async (img: any, idx: number) => {
        const imgSrc = img.image?.url ?? img.image ?? img.url;
        return {
          id: img.id,
          dataUrl: await toBase64(imgSrc),
          caption: img.caption ?? img.captions ?? `Image ${idx + 1}`,
          kml_file: img.kml_file ?? img.kml ?? img.kml_url ?? null,
          html_file: img.html_file ?? img.html ?? img.html_url ?? null,
          jpg_file: img.jpg_file ?? img.jpg ?? img.jpg_url ?? null,
          supportingfiles: Array.isArray(img.supportingfiles) ? img.supportingfiles : [],
          order: img.order ?? idx,
        };
      })
    );

    extraImages.sort((a, b) => a.order - b.order);

    const html = buildPreviewHTML({
      quote_no: q.quote_no,
      reference_no: q.reference_no,
      reference_date: q.reference_date ?? q.date,
      to_company: q.to_company,
      authorized_name: q.authorized_name,
      from_company: q.from_company,
      delivery: q.delivery,
      incoterms: q.incoterms,
      payment: q.payment,
      purchase_order: q.purchase_order,
      validity: q.validity,
      items: Array.isArray(q.description) ? q.description : [],
      cgst_pct: q.cgst ?? 0,
      sgst_pct: q.sgst ?? 0,
      igst_pct: q.igst ?? 0,
      products: q.products ?? [],
      terms_and_specifications: q.terms_and_specifications ?? [],
      metadata: q.metadata ?? {},
      extraImages,
      state: q.state,
      city: q.city,
      country: q.country,
      street: q.street,
      postal_code: q.postal_code,
      verified: q.verified,
    });

    await downloadAsPDF(html, fileName);

    toast.success("PDF downloaded!", {
      id: "pdf-gen",
    });
  } catch (err) {
    console.error("PDF export failed:", err);

    toast.error(
      `PDF generation failed: ${
        err instanceof Error ? err.message : "Unknown error"
      }`,
      {
        id: "pdf-gen",
      }
    );
  }
}