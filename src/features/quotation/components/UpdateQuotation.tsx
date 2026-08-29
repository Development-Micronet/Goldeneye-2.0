// ─── KEY FIXES APPLIED ────────────────────────────────────────────────────────
//
// FIX 1: "Will use 25 sqkm" false warning on all existing items
//   API returns qty:1 with NO area field → normalizeDescItem uses area??qty??25
//
// FIX 2: Tech Spec panel always empty for existing items
//   API items have no techSpecs → normalizeDescItem initializes [] safely
//
// FIX 3: Geo/Spectral dropdowns blank on load
//   geometricprocessing/spectralbands missing from API → normalized to ""
//
// FIX 4: Terms & Specifications not populating
//   Defensive data unwrap (data?.data ?? data) + sanitizedTerms shape guard
//
// FIX 5: Existing image replace/add not working
//   Mutually exclusive if/else blocks + e.target.value="" reset
//   + from_company ref guard to stop overwriting loaded API data
//
// HOW TO USE: Replace your UpdateQuotation.jsx with this file.
// ──────────────────────────────────────────────────────────────────────────────

import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { GetQuotation, UpdateQuotation as UpdateQuotationAPI } from "../api/Quotation";
import { useState, useEffect, useRef } from "react";
import { toast } from "react-toastify";
import {
  FiSave,
  FiTrash2,
  FiUploadCloud,
  FiX,
  FiCheck,
  FiAlertCircle,
  FiArrowLeft,
  FiPlus,
  FiRefreshCw,
  FiEye,
  FiDownload,
  FiChevronLeft,
  FiChevronRight,
} from "react-icons/fi";
import {
  COMPANY_HEADERS,
  parseSessionValue,
  parseRange,
  validateStep0,
  validateStep1,
  GEO_DATA,
  COUNTRIES,
  CLS,
  STEPS,
  TODAY,
} from "../Shared/Quotation";
import { Field, StepBar } from "../assets/Microcomponent/Component";
import {
  buildPreviewHTML,
  getaddress,
  getauthorizedPerson,
  getauthorizedPersonDesignation,
  getcompanyemail,
  findHeader,
} from "../assets/preview/Preview";
import { formatDate } from "../utils/dateHelpers";
import { downloadAsPDF } from "../hooks/Usepdfdownload";
import { GetTechspec, getProductPrefix } from "../api/Techspec";
import ImageCard from "../assets/Microcomponent/ImageCard";
import GroupedProductEntryUpdate, {
  buildGroupKeyUpdate,
} from "../reusablecomponents/Productentry/Groupedproductentryupdate";

interface ToggleProps {
  checked: boolean;
  onChange: (val: boolean) => void;
  label?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const MAHARASHTRA = "Maharashtra";

const YESTERDAY = (() => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
})();

const fmtINR = (n) => (parseFloat(n) || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 });

const isObj = (r) => r !== null && typeof r === "object" && !Array.isArray(r);

/**
 * Normalize a single description item coming from the API.
 * The API omits several fields (area, techSpecs, geometricprocessing, spectralbands,
 * task_type) which causes: "Will use 25 sqkm" warnings, blank Geo/Spectral dropdowns,
 * empty Tech Spec panels, and broken group keys.
 */
const normalizeDescItem = (item) => ({
  item: item.item ?? "",
  unit: item.unit ?? "Sqkm",
  // Use area if present, else qty, else 25 — prevents false min-area warning
  qty: parseFloat(item.area ?? item.qty ?? 25) || 25,
  area: parseFloat(item.area ?? item.qty ?? 25) || 25,
  price: parseFloat(item.price) || 0,
  amount: parseFloat(item.amount) || 0,
  total: parseFloat(item.total) || 0,
  cloud_cover: item.cloud_cover ?? "",
  angle: item.angle ?? "",
  date: item.date ?? "",
  task_type: item.task_type ?? "Archival",
  cgst_pct: item.cgst_pct ?? 9,
  sgst_pct: item.sgst_pct ?? 9,
  igst_pct: item.igst_pct ?? 0,
  cgst_amt: item.cgst_amt ?? 0,
  sgst_amt: item.sgst_amt ?? 0,
  igst_amt: item.igst_amt ?? 0,
  geometricprocessing: item.geometricprocessing ?? "",
  spectralbands: item.spectralbands ?? "",

  // ✅ FIX: NEVER overwrite existing techSpecs from DB
  // Old code replaced valid DB techSpecs with [] whenever the array existed.
  // Now: keep DB techSpecs as-is, only default to [] if truly missing/invalid.
  techSpecs: Array.isArray(item.techSpecs) ? item.techSpecs : [],
});

const cleanDesc = (d) => (Array.isArray(d) ? d.filter(isObj).map(normalizeDescItem) : []);

// ─── Toggle ───────────────────────────────────────────────────────────────────
function Toggle({ checked, onChange, label }: ToggleProps) {
  return (
    <label className="flex cursor-pointer items-center gap-2 select-none">
      <div
        className={`relative h-5 w-9 rounded-full transition-colors duration-200 ${
          checked ? "bg-[#2c6671]" : "bg-gray-300"
        }`}
        onClick={() => onChange(!checked)}
      >
        <div
          className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow-md transition-transform duration-200 ${
            checked ? "translate-x-4" : "translate-x-0"
          }`}
        />
      </div>
      {label && <span className="text-xs font-bold text-[#2c6671]">{label}</span>}
    </label>
  );
}

// ─── Simple Loading Skeleton ──────────────────────────────────────────────────
function LoadingSkeleton() {
  return (
    <div className="bg-light-200 flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-2">
        <div className="border-t-primary-600 h-10 w-10 animate-spin rounded-full border-4 border-gray-300" />
        <p className="text-sm text-gray-600">Loading...</p>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
const UpdateQuotation = () => {
  const { id: paramId } = useParams();
  const [searchParams] = useSearchParams();
  const id = paramId || searchParams.get("id");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const iframeRef = useRef(null);
  const bodyRef = useRef(null);

  // ── Step & UI ──
  const [step, setStep] = useState<number>(0);
  const [previewOpen, setPreviewOpen] = useState<boolean>(false);
  const [pdfLoading, setPdfLoading] = useState<boolean>(false);
  const [iframeKey, setIframeKey] = useState<number>(0);

  // ── Quote meta ──
  const [quote_no, set_quote_no] = useState<string>("");
  const [reference_no, set_reference_no] = useState<string>("");
  const [reference_date, set_reference_date] = useState<any>(YESTERDAY);
  const [date, set_date] = useState<any>(TODAY || "");
  const [validity, set_validity] = useState<string>("30");

  // ── FROM COMPANY ──
  const [from_company, set_from_company] = useState<string>("Micronet Spacetech");
  const [from_company_email, set_from_company_email] = useState<string>("");
  const [from_company_authorized_person, set_from_company_authorized_person] = useState<string>("");
  const [
    from_company_authorized_person_designation,
    set_from_company_authorized_person_designation,
  ] = useState<string>("");
  const [from_company_address, set_from_company_address] = useState<string>("");

  // ── TO COMPANY ──
  const [to_company, set_to_company] = useState<string>("");
  const [receiver_company_authorized_person, set_receiver_company_authorized_person] =
    useState<string>("");
  const [
    receiver_company_authorized_person_designation,
    set_receiver_company_authorized_person_designation,
  ] = useState<string>("");
  const [receiver_company_email, set_receiver_company_email] = useState<string>("");

  // ── Address ──
  const [address_line_1, set_address_line_1] = useState<string>("");
  const [address_line_2, set_address_line_2] = useState<string>("");
  const [sameAsLine1, setSameAsLine1] = useState<boolean>(false);
  const [country, setcountry] = useState<string>("India");
  const [stateVal, setstateVal] = useState<string>("");
  const [city, setcity] = useState<string>("");
  const [postal_code, setpostal_code] = useState<string>("");

  // ── Products ──
  const [description, setDescription] = useState<any[]>([]);

  // ── Discount ──
  const [discountEnabled, setDiscountEnabled] = useState<boolean>(false);
  const [discountPct, setDiscountPct] = useState<number>(0);

  // ── Border toggle ──
  const [enableborder, setenableborder] = useState<boolean>(false);

  // ── Attachment toggles ──
  const [attachKml, setAttachKml] = useState<boolean>(true);
  const [attachHtml, setAttachHtml] = useState<boolean>(true);
  const [attachJpg, setAttachJpg] = useState<boolean>(true);
  const [allowfile, setAllowfile] = useState<any[]>(["kml", "html", "jpg"]);

  const toggleFileType = (key, value) => {
    if (value) {
      setAllowfile((prev) => [...prev, key]);
    } else {
      setAllowfile((prev) => prev.filter((i) => i !== key));
    }
  };

  // ── Images ──
  const [existingImages, setExistingImages] = useState<any[]>([]);
  const [newImages, setNewImages] = useState<any[]>([]);

  // ── Tech spec ──
  const [techspecimage, settechspecimage] = useState<any[]>([]);

  // ── Terms ──
  const [terms_and_specifications, set_terms_and_specifications] = useState<any[]>([]);
  const [editMode, setEditMode] = useState<boolean>(false);

  const handleTermChange = (index, field, value) => {
    const updated = [...terms_and_specifications];
    updated[index][field] = value;
    set_terms_and_specifications(updated);
  };

  const toggleEditable = (index) => {
    const updated = [...terms_and_specifications];
    updated[index].editable = !updated[index].editable;
    set_terms_and_specifications(updated);
  };

  // ── GST ──
  const isInterState = stateVal !== "" && stateVal !== MAHARASHTRA;
  const cgst_pct = isInterState ? 0 : 9;
  const sgst_pct = isInterState ? 0 : 9;
  const igst_pct = isInterState ? 18 : 0;

  // ── Geo cascading ──
  const availableStates = country ? Object.keys(GEO_DATA[country] || {}).sort() : [];
  const availableCities = country && stateVal ? (GEO_DATA[country]?.[stateVal] || []).sort() : [];

  const gstBadge = isInterState
    ? "bg-amber-50 text-amber-700 border border-amber-200"
    : "bg-green-50 text-green-700 border border-green-200";

  // ── Commercial terms ──
  const delivery = "VIA FTP ONLY";
  const incoterms = "EXW";
  const payment = "As per Quotation terms";
  const purchase_order = `To be Placed on ${from_company} India`;

  // ─── Fetch quotation ───────────────────────────────────────────────────────
  const {
    data: rawData,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["quotation", id],
    queryFn: () => GetQuotation(id!),
    enabled: !!id,
    retry: 2,
    staleTime: 30_000,
  });

  // FIX 1: Unwrap API response — handles both `response` and `response.data`
  // Many axios-based API helpers return `response.data` already, but some
  // return the full axios response object. This handles both cases.
  const data = rawData?.data ?? rawData;

  // ─── Fetch tech specs on data load ────────────────────────────────────────
  useEffect(() => {
    if (!data?.description?.length) return;
    const keywords = [
      ...new Set(
        data.description.map((it) => it.item?.split(" ")[0].toLowerCase()).filter(Boolean),
      ),
    ];
    if (!keywords.length) return;
    keywords.forEach((kw) => gettechspec.mutate(kw));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  // ─── Populate form from fetched data ──────────────────────────────────────
  useEffect(() => {
    if (!data) return;

    // FIX 1 DEBUG: Log what we actually received so you can verify the shape
    console.log("[UpdateQuotation] Populated from API data:", {
      terms_and_specifications: data.terms_and_specifications,
      description: data.description,
      images: data.images,
    });

    set_quote_no(data.quote_no ?? "");
    set_reference_no(data.reference_no ?? "");
    set_reference_date(data.reference_date ?? YESTERDAY);
    set_date(data.date ?? TODAY);
    set_validity(data.validity ?? "30");

    set_from_company(data.from_company ?? "Micronet Spacetech");
    set_from_company_authorized_person(data.authorized_name ?? "");
    set_from_company_email(data.from_company_email ?? "");
    set_from_company_address(data.from_company_address ?? "");

    set_to_company(data.to_company ?? "");
    set_receiver_company_authorized_person(data.receiver_company_authorized_person ?? "");
    set_receiver_company_authorized_person_designation(
      data.receiver_company_authorized_person_designation ?? "",
    );
    set_receiver_company_email(data.receiver_company_email ?? "");

    set_address_line_1(data.street ?? "");
    set_address_line_2(data.address_line_2 ?? "");
    setcountry(data.country ?? "India");
    setstateVal(data.state ?? "");
    setcity(data.city ?? "");
    setpostal_code(data.postal_code ?? "");

    const disc = parseFloat(data.discount || 0);
    setDiscountPct(disc);
    setDiscountEnabled(disc > 0);

    setenableborder(data.enableborder ?? false);

    setDescription(cleanDesc(data.description));

    // FIX 1: Ensure terms_and_specifications is always an array of objects
    // Guards against null, undefined, empty string, or malformed data
    const rawTerms = data.terms_and_specifications;
    if (Array.isArray(rawTerms) && rawTerms.length > 0) {
      // Ensure each term has the expected shape
      const sanitizedTerms = rawTerms.map((t) => ({
        label: t.label ?? "",
        text: t.text ?? "",
        editable: t.editable ?? false,
      }));
      set_terms_and_specifications(sanitizedTerms);
    } else {
      set_terms_and_specifications([]);
      if (rawTerms !== undefined && rawTerms !== null && !Array.isArray(rawTerms)) {
        console.warn(
          "[UpdateQuotation] terms_and_specifications had unexpected type:",
          typeof rawTerms,
          rawTerms,
        );
      }
    }

    // FIX 2: Existing images — initialize with all required fields
    setExistingImages(
      Array.isArray(data.images)
        ? data.images.map((img) => ({
            id: img.id,
            url: img.image?.url ?? "",
            caption: img.captions ?? img.caption ?? "",
            // Server-side files (already saved)
            kml_file: img.kml_file ?? null,
            html_file: img.html_file ?? null,
            jpg_file: img.jpg_file ?? null,
            // Pending local replacements (not yet uploaded)
            new_kml_file: null,
            new_html_file: null,
            new_jpg_file: null,
            _deleted: false,
          }))
        : [],
    );
  }, [data]);

  // Auto-fill from_company fields when company changes
  // NOTE: This runs AFTER the data useEffect which sets from_company,
  // so we use a ref guard to skip the auto-fill on initial load
  const didMountFromCompany = useRef(false);
  useEffect(() => {
    if (!didMountFromCompany.current) {
      didMountFromCompany.current = true;
      return;
    }
    if (!from_company) return;
    const header = findHeader(from_company);
    if (!header) return;
    set_from_company_authorized_person(header.contactPerson || "");
    set_from_company_address(header.address || "");
    set_from_company_email(header.email || "");
  }, [from_company]);

  // FIX 2: Attach a new supporting file to an existing image
  const attachFileToExisting = (id, file, type) => {
    setExistingImages((prev) =>
      prev.map((img) => (img.id !== id ? img : { ...img, [`new_${type}_file`]: file })),
    );
  };

  // FIX 2: Detach a newly attached file (before save)
  const detachFileFromExisting = (id, type) => {
    setExistingImages((prev) =>
      prev.map((img) => (img.id !== id ? img : { ...img, [`new_${type}_file`]: null })),
    );
  };

  // ── Grand total ──
  const grandTotal = (() => {
    const groups = {};
    description.forEach((item, idx) => {
      const key = buildGroupKeyUpdate(item);
      if (!groups[key]) groups[key] = { indices: [], rep: item };
      groups[key].indices.push(idx);
    });
    return Object.values(groups).reduce((sum, group) => {
      const rep = group.rep;
      const c = parseFloat(rep.cgst_pct ?? cgst_pct) || 0;
      const s = parseFloat(rep.sgst_pct ?? sgst_pct) || 0;
      const ig = parseFloat(rep.igst_pct ?? igst_pct) || 0;
      const baseTotal = group.indices.reduce(
        (acc, idx) => acc + (parseFloat(description[idx]?.amount) || 0),
        0,
      );
      const gst = (baseTotal * (c + s + ig)) / 100;
      const disc = discountEnabled ? (baseTotal * discountPct) / 100 : 0;
      return sum + baseTotal + gst - disc;
    }, 0);
  })();

  // ─── Preview HTML ──────────────────────────────────────────────────────────
  const previewHTML = buildPreviewHTML({
    quote_no,
    reference_no,
    reference_date,
    date,
    from_company,
    from_company_email,
    from_company_address,
    authorized_name: from_company_authorized_person,
    to_company,
    receiver_company_authorized_person_designation,
    receiver_company_authorized_person,
    receiver_company_email,
    delivery,
    incoterms,
    payment,
    purchase_order,
    validity,
    items: description.map((item) => ({
      ...item,
      cgst_pct: item.cgst_pct ?? cgst_pct,
      sgst_pct: item.sgst_pct ?? sgst_pct,
      igst_pct: item.igst_pct ?? igst_pct,
      geometricprocessing: item.geometricprocessing ?? "",
      spectralbands: item.spectralbands ?? "",
      techSpecs: item.techSpecs || [],
    })),
    extraImages: [
      ...existingImages
        .filter((img) => !img._deleted)
        .map((img) => ({
          id: img.id,
          url: img.url,
          dataUrl: img.url,
          caption: img.caption,
          kml: img.kml_file?.url || null,
          html: img.html_file?.url || null,
          jpg: img.jpg_file?.url || null,
          kml_file: img.kml_file,
          html_file: img.html_file,
          jpg_file: img.jpg_file,
          supportingfiles: img.supportingfiles || [],
        })),
      ...newImages.map((img) => ({
        dataUrl: img.dataUrl,
        caption: img.caption,
        supportingfiles: img.supportingfiles || [],
      })),
    ],
    terms_and_specifications,
    techspecimage,
    address_line_1,
    address_line_2,
    city,
    state: stateVal,
    country,
    postal_code,
    discountPct,
    grandTotal,
    discountEnabled,
    enableborder,
    metadata: {},
  });

  useEffect(() => {
    if (previewOpen && iframeRef.current) iframeRef.current.srcdoc = previewHTML;
  }, [previewOpen, previewHTML]);

  // ─── Navigation ────────────────────────────────────────────────────────────
  const scrollTop = () => bodyRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  const goStep = (n) => {
    setStep(n);
    scrollTop();
  };
  const goBack = () => goStep(Math.max(0, step - 1));
  const goNext = () => goStep(Math.min(STEPS.length - 1, step + 1));

  // ─── Product row handlers ──────────────────────────────────────────────────
  const addRow = () =>
    setDescription((prev) => [
      ...prev,
      {
        item: "",
        unit: "Sqkm",
        qty: 25,
        area: 25,
        price: 0,
        amount: 0,
        cloud_cover: "",
        angle: "",
        date: TODAY,
        cgst_pct,
        sgst_pct,
        igst_pct,
        cgst_amt: 0,
        sgst_amt: 0,
        igst_amt: 0,
        total: 0,
        task_type: "Archival",
        geometricprocessing: "",
        spectralbands: "",
        techSpecs: ["Cloud Cover: ≤ 10%"],
      },
    ]);

  const updateRow = (i, k, v) =>
    setDescription((prev) => {
      const d = [...prev];
      d[i] = { ...d[i], [k]: v };
      if (k === "qty" || k === "price")
        d[i].amount = (parseFloat(d[i].qty) || 0) * (parseFloat(d[i].price) || 0);
      return d;
    });

  const removeRow = (i) => setDescription((prev) => prev.filter((_, j) => j !== i));

  // ─── Image handlers ────────────────────────────────────────────────────────
  const handleNewImageFiles = (files) =>
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith("image/")) return;
      const r = new FileReader();
      r.onload = (e) =>
        setNewImages((p) => [
          ...p,
          {
            file,
            dataUrl: e.target.result,
            caption: file.name.replace(/\.[^.]+$/, ""),
            supportingfiles: [],
          },
        ]);
      r.readAsDataURL(file);
    });

  const updateNewCaption = (i, v) =>
    setNewImages((p) => p.map((img, idx) => (idx === i ? { ...img, caption: v } : img)));

  const removeNewImage = (i) => setNewImages((p) => p.filter((_, idx) => idx !== i));

  const attachFileToNew = (i, file, type) => {
    const fileUrl = URL.createObjectURL(file);
    setNewImages((prev) =>
      prev.map((img, idx) => {
        if (idx !== i) return img;
        const filtered = (img.supportingfiles || []).filter((f) => f.fileType !== type);
        return {
          ...img,
          supportingfiles: [...filtered, { file, fileType: type, name: file.name, url: fileUrl }],
        };
      }),
    );
  };

  const detachFileFromNew = (i, type) =>
    setNewImages((prev) =>
      prev.map((img, idx) => {
        if (idx !== i) return img;
        return {
          ...img,
          supportingfiles: (img.supportingfiles || []).filter((f) => f.fileType !== type),
        };
      }),
    );

  const updateExistingCaption = (id, v) =>
    setExistingImages((p) => p.map((i) => (i.id === id ? { ...i, caption: v } : i)));
  const markDeleted = (id) =>
    setExistingImages((p) => p.map((i) => (i.id === id ? { ...i, _deleted: true } : i)));
  const restoreImage = (id) =>
    setExistingImages((p) => p.map((i) => (i.id === id ? { ...i, _deleted: false } : i)));

  // ─── Tech spec ─────────────────────────────────────────────────────────────
  const gettechspec = useMutation({
    mutationFn: (payload) => GetTechspec(payload),
    onSuccess: (data) => {
      settechspecimage((prev) => {
        const merged = [...prev];
        (data || []).forEach((incoming) => {
          const exists = merged.some(
            (existing) =>
              getProductPrefix(existing.product_name) === getProductPrefix(incoming.product_name) ||
              existing.product_name === incoming.product_name,
          );
          if (!exists) merged.push(incoming);
        });
        return merged;
      });
    },
    onError: (err) => console.log(err?.response?.data?.error || "Error fetching techspec"),
  });

  const fetchSpecification = () => {
    const keywords = [
      ...new Set(
        description
          .map((it) => getProductPrefix(it.item?.split(" ")[0]).toLowerCase())
          .filter(Boolean),
      ),
    ];
    if (!keywords.length) {
      toast.info("No items to fetch specs for");
      return;
    }
    const toFetch = keywords.filter(
      (kw) =>
        !techspecimage.some(
          (img) =>
            getProductPrefix(img.product_name)?.toLowerCase() === kw ||
            img.product_name?.toLowerCase() === kw,
        ),
    );
    if (!toFetch.length) {
      toast.info("All tech specs already fetched!");
      return;
    }
    toFetch.forEach((kw) => gettechspec.mutate(kw));
  };

  // ─── PDF ───────────────────────────────────────────────────────────────────
  const handleManualPDF = async () => {
    try {
      setPdfLoading(true);
      await downloadAsPDF(previewHTML, `Quotation-${quote_no || "draft"}.pdf`);
      toast.success("PDF downloaded!");
    } catch {
      toast.error("PDF generation failed.");
    } finally {
      setPdfLoading(false);
    }
  };

  // ─── Submit ────────────────────────────────────────────────────────────────
  const mutation = useMutation({
    mutationFn: (fd: FormData) => UpdateQuotationAPI(id!, fd),
    onSuccess: () => {
      toast.success("Quotation updated!");
      setNewImages([]);
      queryClient.invalidateQueries({ queryKey: ["quotation", id] });
      queryClient.invalidateQueries({ queryKey: ["quotations"] });
      navigate("/quotation");
    },
    onError: (err: any) => {
      const d = err?.response?.data?.details;
      if (d && typeof d === "object") {
        Object.entries(d).forEach(([f, m]) =>
          toast.error(`${f}: ${Array.isArray(m) ? m.join(", ") : String(m)}`),
        );
      } else {
        toast.error(err?.response?.data?.error || "Update failed");
      }
    },
  });

  const handleSubmit = async () => {
    if (!to_company) {
      toast.error("To Company is required");
      return;
    }
    if (!from_company) {
      toast.error("From Company is required");
      return;
    }

    const fd = new FormData();
    [
      ["quote_no", quote_no],
      ["reference_no", reference_no],
      ["reference_date", reference_date],
      ["date", date],
      ["from_company", from_company],
      ["from_company_email", from_company_email],
      ["authorized_name", from_company_authorized_person],
      ["from_company_address", from_company_address],
      ["to_company", to_company],
      ["receiver_company_authorized_person", receiver_company_authorized_person],
      [
        "receiver_company_authorized_person_designation",
        receiver_company_authorized_person_designation,
      ],
      ["receiver_company_email", receiver_company_email],
      ["street", address_line_1],
      ["city", city],
      ["state", stateVal],
      ["country", country],
      ["postal_code", postal_code],
      ["delivery", delivery],
      ["incoterms", incoterms],
      ["payment", payment],
      ["purchase_order", purchase_order],
      ["validity", validity],
      ["cgst", cgst_pct],
      ["sgst", sgst_pct],
      ["igst", igst_pct],
      ["discount", discountEnabled ? Number(discountPct || 0) : 0],
      ["enableborder", enableborder],
      ["total_amount", grandTotal],
    ].forEach(([k, v]) => fd.append(k, v));

    fd.append(
      "description",
      JSON.stringify(
        description.map((item) => ({
          item: item.item,
          unit: item.unit,
          qty: item.qty,
          area: item.area,
          price: item.price,
          amount: item.amount,
          cloud_cover: item.cloud_cover,
          angle: item.angle,
          date: item.date,
          cgst_pct: item.cgst_pct ?? cgst_pct,
          sgst_pct: item.sgst_pct ?? sgst_pct,
          igst_pct: item.igst_pct ?? igst_pct,
          total: item.total || 0,
          task_type: item.task_type,
          geometricprocessing: item.geometricprocessing ?? "",
          spectralbands: item.spectralbands ?? "",
          techSpecs: item.techSpecs || [],
        })),
      ),
    );

    fd.append("terms_and_specifications", JSON.stringify(terms_and_specifications));

    const attachmentType = [
      attachKml ? "kml" : "",
      attachHtml ? "html" : "",
      attachJpg ? "jpg" : "",
    ]
      .filter(Boolean)
      .join(",");
    fd.append("attachment_type", attachmentType || "kml");

    const kept = existingImages.filter((i) => !i._deleted);
    fd.append("keep_image_ids", JSON.stringify(kept.map((i) => i.id)));
    fd.append(
      "updated_captions",
      JSON.stringify(kept.map((i) => ({ id: i.id, caption: i.caption }))),
    );

    // FIX 2: Send newly attached supporting files for existing images
    existingImages
      .filter((img) => !img._deleted)
      .forEach((img) => {
        if (img.new_kml_file) fd.append(`existing_supporting_${img.id}_kml`, img.new_kml_file);
        if (img.new_html_file) fd.append(`existing_supporting_${img.id}_html`, img.new_html_file);
        if (img.new_jpg_file) fd.append(`existing_supporting_${img.id}_jpg`, img.new_jpg_file);
      });

    const resolvedNewImages = await Promise.all(
      newImages.map(async (img, i) => {
        let file = img.file;
        if (!file && img.dataUrl) {
          const res = await fetch(img.dataUrl);
          const blob = await res.blob();
          file = new File(
            [blob],
            img.caption ? `${img.caption.replace(/\s+/g, "_")}.jpg` : `image_${i}.jpg`,
            { type: blob.type || "image/jpeg" },
          );
        }
        return {
          file,
          caption: img.caption || "",
          supportingfiles: img.supportingfiles || [],
        };
      }),
    );

    resolvedNewImages.forEach((img, i) => {
      if (img.file) fd.append("images", img.file);
      img.supportingfiles.forEach((sf) => {
        fd.append(`supporting_${i}_${sf.fileType}`, sf.file);
      });
    });
    fd.append("image_captions", JSON.stringify(resolvedNewImages.map((r) => r.caption)));

    mutation.mutate(fd);
  };

  // ─── Guard ────────────────────────────────────────────────────────────────
  if (isLoading) return <LoadingSkeleton />;
  if (isError || (!isLoading && !data))
    return (
      <div className="bg-light-200 flex min-h-screen items-center justify-center">
        <div className="mx-2 flex max-w-sm flex-col items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-6">
          <FiAlertCircle size={24} className="text-red-600" />
          <p className="font-bold text-red-700">Failed to load quotation</p>
          <button
            onClick={(e: React.MouseEvent<HTMLButtonElement>) => navigate(-1)}
            className="bg-primary-600 hover:bg-primary-500 flex items-center gap-2 rounded-lg px-3 py-2 text-[11px] font-semibold text-white"
          >
            <FiArrowLeft className="h-3 w-3" /> Go Back
          </button>
        </div>
      </div>
    );

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex h-full flex-col">
      <StepBar step={step} steps={STEPS} onStepClick={goStep} />

      <div ref={bodyRef} className="flex-1 space-y-2 overflow-y-auto px-3 py-2">
        {/* ══════════════════════════════ STEP 0 — Details */}
        {step === 0 && (
          <>
            {/* FROM COMPANY */}
            <div className={CLS.card}>
              <div className="mb-2 flex items-center justify-between">
                <span className={CLS.sectionTitle}>
                  <span className="bg-primary-600 inline-block h-2 w-2 rounded-full" />
                  From Company
                </span>
              </div>
              <Field label="Company" required>
                <select
                  className="border-light-300 text-dark-700 focus:border-primary-400 focus:ring-primary-200 w-64 rounded border bg-white px-2 py-1 text-[11px] focus:ring-1 focus:outline-none"
                  value={from_company}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    set_from_company(e.target.value)
                  }
                >
                  <option value="">Select company</option>
                  {COMPANY_HEADERS.map((c) => (
                    <option key={c.id} value={c.match}>
                      {c.match}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            {/* TO COMPANY */}
            <div className={CLS.card}>
              <div className="mb-2 flex items-center justify-between">
                <span className={CLS.sectionTitle}>
                  <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                  To Company
                </span>
                <span className="text-light-400 text-[9px]">Client / Receiver details</span>
              </div>
              <div className="mb-1.5 grid grid-cols-4 gap-x-2 gap-y-1.5">
                <Field label="Company Name" required>
                  <input
                    className={CLS.input}
                    value={to_company}
                    placeholder="Client company name"
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      set_to_company(e.target.value)
                    }
                  />
                </Field>
                <Field label="Contact Person">
                  <input
                    className={CLS.input}
                    value={receiver_company_authorized_person}
                    placeholder="Contact person"
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      set_receiver_company_authorized_person(e.target.value)
                    }
                  />
                </Field>
                <Field label="Designation">
                  <input
                    className={CLS.input}
                    value={receiver_company_authorized_person_designation}
                    placeholder="e.g. Purchase Manager"
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      set_receiver_company_authorized_person_designation(e.target.value)
                    }
                  />
                </Field>
                <Field label="Company Email">
                  <input
                    className={CLS.input}
                    type="email"
                    value={receiver_company_email}
                    placeholder="Company email"
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      set_receiver_company_email(e.target.value)
                    }
                  />
                </Field>
              </div>

              <div className="border-light-200 my-2 border-t" />

              <div className="grid grid-cols-6 gap-x-2 gap-y-1.5">
                <Field label="Address Line 1" required>
                  <input
                    className={CLS.input}
                    value={address_line_1}
                    placeholder="Street / Building / Plot no."
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      set_address_line_1(e.target.value);
                      if (sameAsLine1) set_address_line_2(e.target.value);
                    }}
                  />
                </Field>
                <Field label="Address Line 2">
                  <input
                    className={CLS.input}
                    value={address_line_2}
                    placeholder="Area / Locality / Landmark"
                    disabled={sameAsLine1}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      set_address_line_2(e.target.value)
                    }
                  />
                  <label className="mt-0.5 flex cursor-pointer items-center gap-1">
                    <input
                      type="checkbox"
                      checked={sameAsLine1}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        setSameAsLine1(e.target.checked);
                        if (e.target.checked) set_address_line_2(address_line_1);
                      }}
                      className="accent-primary-600 h-3 w-3"
                    />
                    <span className="text-light-500 text-[9px]">Same as Line 1</span>
                  </label>
                </Field>
                <Field label="Country" required>
                  <select
                    className={CLS.select}
                    value={country}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      setcountry(e.target.value);
                      setstateVal("");
                      setcity("");
                    }}
                  >
                    <option value="">Select</option>
                    {COUNTRIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="State" required>
                  <select
                    className={CLS.select}
                    value={stateVal}
                    disabled={!country}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      setstateVal(e.target.value);
                      setcity("");
                    }}
                  >
                    <option value="">{country ? "Select" : "— country first"}</option>
                    {availableStates.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="City">
                  <select
                    className={CLS.select}
                    value={city}
                    disabled={!stateVal}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setcity(e.target.value)}
                  >
                    <option value="">{stateVal ? "Select" : "— state first"}</option>
                    {availableCities.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Postal Code">
                  <input
                    className={CLS.input}
                    value={postal_code}
                    placeholder="440013"
                    maxLength={10}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setpostal_code(e.target.value)
                    }
                  />
                </Field>
              </div>

              {stateVal && (
                <div
                  className={`mt-2 flex items-center gap-1.5 rounded px-2 py-1 text-[9px] font-semibold ${gstBadge}`}
                >
                  {isInterState
                    ? `⚡ Inter-state → IGST ${igst_pct}% applied`
                    : `✓ Intra-state → CGST ${cgst_pct}% + SGST ${sgst_pct}% applied`}
                </div>
              )}
            </div>

            {/* QUOTATION META */}
            <div className={CLS.card}>
              <div className="mb-2 flex items-center justify-between">
                <span className={CLS.sectionTitle}>
                  <span className="inline-block h-2 w-2 rounded-full bg-violet-500" />
                  Quotation Details
                </span>
              </div>
              <div className="mb-2 grid grid-cols-2 gap-x-2 gap-y-1.5 sm:grid-cols-3 md:grid-cols-5">
                <Field label="Quote No">
                  <input className={`${CLS.input} opacity-60`} value={quote_no} readOnly />
                </Field>
                <Field label="Ref No">
                  <input
                    className={CLS.input}
                    value={reference_no}
                    placeholder="REF-2024-0001"
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      set_reference_no(e.target.value)
                    }
                  />
                </Field>
                <Field label="Ref Date">
                  <input
                    type="date"
                    className={CLS.input}
                    value={reference_date}
                    max={YESTERDAY}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      set_reference_date(e.target.value)
                    }
                  />
                </Field>
                <Field label="Date">
                  <input
                    type="date"
                    className={CLS.input}
                    value={date}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => set_date(e.target.value)}
                  />
                </Field>
                <Field label="Validity">
                  <input
                    className={CLS.input}
                    value={validity}
                    placeholder="e.g. 30"
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      set_validity(e.target.value)
                    }
                  />
                </Field>
              </div>

              <div className="my-2 flex items-center">
                <div className="border-light-200 flex-1 border-t" />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Toggle
                  checked={discountEnabled}
                  onChange={setDiscountEnabled}
                  label={discountEnabled ? "Disable Discount" : "Enable Discount"}
                />
                {discountEnabled && (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      className={`${CLS.input} w-24`}
                      value={discountPct}
                      min={0}
                      max={100}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setDiscountPct(Math.min(100, Math.max(0, +e.target.value)))
                      }
                    />
                    <span className="text-dark-600 text-xs font-semibold">%</span>
                    <span
                      className={`${CLS.badge} rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs text-amber-700`}
                    >
                      Applied on base amount
                    </span>
                  </div>
                )}
                {!discountEnabled && (
                  <span className="text-light-400 text-xs">Toggle on to add client discount</span>
                )}
              </div>

              <div className="mt-3 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-dark-500 text-[10px] font-bold tracking-wide uppercase">
                    Attachments
                  </span>
                  <div className="border-light-200 flex-1 border-t" />
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  {[
                    { key: "kml", label: "KML / KMZ", state: attachKml, set: setAttachKml },
                    { key: "html", label: "HTML", state: attachHtml, set: setAttachHtml },
                    { key: "jpg", label: "JPG / Image", state: attachJpg, set: setAttachJpg },
                  ].map(({ key, label, state, set }) => (
                    <label key={key} className="flex cursor-pointer items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={state}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          set(e.target.checked);
                          toggleFileType(key, e.target.checked);
                        }}
                        className="accent-primary-600 h-3 w-3"
                      />
                      <span className="text-dark-600 text-[10px] font-semibold">{label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* PRODUCTS */}
            <div className={CLS.card}>
              <div className="mb-1.5 flex items-center justify-between">
                <span className={CLS.sectionTitle}>
                  <span className="inline-block h-2 w-2 rounded-full bg-orange-500" />
                  Products ({description.length})
                  {description.length > 0 && (
                    <span className="text-light-500 ml-2 text-[9px] font-normal">
                      Grand Total:{" "}
                      <strong className="text-primary-700 font-black">
                        ₹ {fmtINR(grandTotal)}
                      </strong>
                      {discountEnabled && discountPct > 0 && (
                        <span className="ml-1 text-amber-600">(incl. {discountPct}% discount)</span>
                      )}
                    </span>
                  )}
                </span>
                <button
                  type="button"
                  onClick={addRow}
                  className="bg-primary-600 hover:bg-primary-500 flex items-center gap-1 rounded px-2.5 py-1 text-[10px] font-semibold text-white"
                >
                  <FiPlus className="h-3 w-3" /> Add Row
                </button>
              </div>

              {description.length === 0 ? (
                <div className="border-light-200 text-light-400 rounded border-2 border-dashed py-6 text-center text-[11px]">
                  No products. Click <strong>Add Row</strong> to add items.
                </div>
              ) : (
                <div className="space-y-2 overflow-y-auto pr-1" style={{ maxHeight: "520px" }}>
                  {(() => {
                    const groupMap = new Map();
                    description.forEach((item, idx) => {
                      const key = buildGroupKeyUpdate(item);
                      if (!groupMap.has(key)) groupMap.set(key, []);
                      groupMap.get(key).push(idx);
                    });
                    return Array.from(groupMap.entries()).map(([key, indices], gNum) => (
                      <GroupedProductEntryUpdate
                        key={key}
                        description={description}
                        groupIndices={indices}
                        groupNumber={gNum + 1}
                        cgst_pct={cgst_pct}
                        sgst_pct={sgst_pct}
                        igst_pct={igst_pct}
                        discountEnabled={discountEnabled}
                        discountPct={discountPct}
                        minArchivalArea={25}
                        onUpdateRow={updateRow}
                        onRemoveRow={removeRow}
                        onAddToGroup={(template) => setDescription((prev) => [...prev, template])}
                      />
                    ));
                  })()}
                </div>
              )}
            </div>
          </>
        )}

        {/* ══════════════════════════════ STEP 1 — Images + Terms */}
        {step === 1 && (
          <div className="space-y-2">
            {/* Existing Images */}
            {existingImages.length > 0 && (
              <div className={CLS.card}>
                <div className="mb-2 flex items-center justify-between">
                  <span className={CLS.sectionTitle}>
                    <span className="inline-block h-2 w-2 rounded-full bg-blue-500" />
                    Existing Images ({existingImages.filter((i) => !i._deleted).length} active)
                  </span>
                  <span className="text-light-400 text-[9px]">
                    {existingImages.filter((i) => i._deleted).length} marked for deletion
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  {existingImages.map((img) => (
                    <div
                      key={img.id}
                      className={`group relative overflow-hidden rounded-lg border transition-all ${
                        img._deleted
                          ? "border-red-300 opacity-40"
                          : "border-light-200 hover:shadow-md"
                      }`}
                    >
                      <img
                        src={img.url}
                        alt={img.caption}
                        className="h-20 w-full object-cover"
                        onError={(e) => {
                          e.target.style.display = "none";
                          e.target.nextSibling?.classList?.remove("hidden");
                        }}
                      />
                      <div className="bg-light-200 text-light-500 flex hidden h-20 w-full items-center justify-center text-[9px]">
                        No preview
                      </div>

                      <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                        {img._deleted ? (
                          <button
                            type="button"
                            onClick={(e: React.MouseEvent<HTMLButtonElement>) =>
                              restoreImage(img.id)
                            }
                            className="rounded-full bg-green-500 p-1.5 text-white hover:bg-green-600"
                          >
                            <FiCheck className="h-3 w-3" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={(e: React.MouseEvent<HTMLButtonElement>) =>
                              markDeleted(img.id)
                            }
                            className="rounded-full bg-red-500 p-1.5 text-white hover:bg-red-600"
                          >
                            <FiTrash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>

                      {img._deleted && (
                        <span className="absolute top-1 left-1 rounded bg-red-600 px-1 text-[8px] font-bold text-white">
                          DEL
                        </span>
                      )}

                      <div className="space-y-1.5 p-1.5">
                        <input
                          value={img.caption || ""}
                          placeholder="Caption…"
                          disabled={img._deleted}
                          className={`${CLS.input} w-full text-[9px]`}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            updateExistingCaption(img.id, e.target.value)
                          }
                        />

                        {/* FIX 2: Supporting files per existing image — mutually exclusive conditions */}
                        {["kml", "html", "jpg"].map((type) => {
                          const serverFile = img[`${type}_file`];
                          const newFile = img[`new_${type}_file`];
                          const label = type === "jpg" ? "Image" : type.toUpperCase();
                          const colorMap = {
                            kml: {
                              bg: "bg-green-50",
                              border: "border-green-200",
                              text: "text-green-700",
                            },
                            html: {
                              bg: "bg-blue-50",
                              border: "border-blue-200",
                              text: "text-blue-700",
                            },
                            jpg: {
                              bg: "bg-purple-50",
                              border: "border-purple-200",
                              text: "text-purple-700",
                            },
                          };
                          const c = colorMap[type];
                          const accept =
                            type === "kml"
                              ? ".kml,.kmz"
                              : type === "html"
                                ? ".html,.htm"
                                : "image/*";

                          return (
                            <div
                              key={type}
                              className={`rounded border ${c.border} ${c.bg} px-1.5 py-1`}
                            >
                              <div className="flex items-center justify-between gap-1">
                                <span className={`text-[9px] font-bold uppercase ${c.text}`}>
                                  {label}
                                </span>

                                <div className="flex items-center gap-1">
                                  {/* CASE 1: New replacement file is staged (pending upload) */}
                                  {newFile ? (
                                    <>
                                      <span
                                        className={`text-[9px] font-semibold ${c.text} max-w-[70px] truncate`}
                                        title={newFile.name}
                                      >
                                        ✓{" "}
                                        {newFile.name.length > 10
                                          ? newFile.name.slice(0, 10) + "…"
                                          : newFile.name}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={(e: React.MouseEvent<HTMLButtonElement>) =>
                                          detachFileFromExisting(img.id, type)
                                        }
                                        className="text-red-400 hover:text-red-600"
                                        title="Cancel replacement"
                                      >
                                        <FiX className="h-2.5 w-2.5" />
                                      </button>
                                    </>
                                  ) : serverFile?.url ? (
                                    /* CASE 2: File exists on server, no pending replacement */
                                    <>
                                      <a
                                        href={serverFile.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className={`text-[9px] ${c.text} underline`}
                                      >
                                        View
                                      </a>
                                      {!img._deleted && (
                                        /* Replace button — picking a file moves us to CASE 1 */
                                        <label
                                          className={`cursor-pointer text-[8px] font-bold ${c.text} hover:opacity-70`}
                                          title={`Replace ${label}`}
                                        >
                                          ↺
                                          <input
                                            type="file"
                                            className="hidden"
                                            accept={accept}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                              const file = e.target.files?.[0];
                                              if (file) attachFileToExisting(img.id, file, type);
                                              // Reset input so same file can be re-selected
                                              e.target.value = "";
                                            }}
                                          />
                                        </label>
                                      )}
                                    </>
                                  ) : !img._deleted ? (
                                    /* CASE 3: No server file, not deleted → allow adding */
                                    <label
                                      className={`flex cursor-pointer items-center gap-0.5 text-[9px] font-bold ${c.text} hover:opacity-70`}
                                    >
                                      <FiUploadCloud className="h-2.5 w-2.5" /> Add
                                      <input
                                        type="file"
                                        className="hidden"
                                        accept={accept}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                          const file = e.target.files?.[0];
                                          if (file) attachFileToExisting(img.id, file, type);
                                          e.target.value = "";
                                        }}
                                      />
                                    </label>
                                  ) : (
                                    /* CASE 4: No server file + deleted */
                                    <span className="text-light-400 text-[9px]">—</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* New Images */}
            <div className={CLS.card}>
              <div className="mb-1.5 flex items-center justify-between">
                <span className={CLS.sectionTitle}>
                  <span className="bg-primary-600 inline-block h-2 w-2 rounded-full" />
                  New Images ({newImages.length})
                </span>
                <label className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-[#2c6671] px-4 py-2 text-xs font-bold text-white shadow-md transition-all hover:bg-[#204e57]">
                  <FiUploadCloud className="h-4 w-4" /> Upload
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    className="hidden"
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      handleNewImageFiles(e.target.files)
                    }
                  />
                </label>
              </div>
              {newImages.length === 0 ? (
                <label
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    handleNewImageFiles(e.dataTransfer.files);
                  }}
                  className="group flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#2c6671]/40 bg-[#2c6671]/5 py-10 text-center transition-all duration-200 hover:border-[#2c6671] hover:bg-[#2c6671]/15"
                >
                  <FiUploadCloud className="h-8 w-8 text-[#2c6671] transition-transform duration-200 group-hover:scale-110" />
                  <p className="text-xs font-bold text-[#2c6671]">Click or drag new images here</p>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    className="hidden"
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      handleNewImageFiles(e.target.files)
                    }
                  />
                </label>
              ) : (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                  {newImages.map((img, i) => (
                    <ImageCard
                      key={i}
                      img={img}
                      index={i}
                      total={newImages.length}
                      inputCls={CLS.input}
                      removeImage={removeNewImage}
                      updateCaption={updateNewCaption}
                      attachFile={attachFileToNew}
                      detachFile={detachFileFromNew}
                      allowfile={allowfile}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Terms & Conditions */}
            <div className={CLS.card}>
              <div className="mb-2 flex items-center justify-between">
                <span className={CLS.sectionTitle}>
                  Terms & Conditions
                  {/* FIX 1 DEBUG: Show count so you can verify data loaded */}
                  <span className="text-light-400 ml-2 text-[9px] font-normal">
                    ({terms_and_specifications.length} terms)
                  </span>
                </span>
                <Toggle
                  checked={editMode}
                  label={editMode ? "Edit Mode" : "View Mode"}
                  onChange={() => setEditMode((prev) => !prev)}
                />
              </div>

              {/* If terms didn't load, show a helpful message */}
              {terms_and_specifications.length === 0 && (
                <div className="rounded border border-dashed border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-700">
                  No terms loaded. Check the browser console for API data shape details.
                </div>
              )}

              {editMode && terms_and_specifications.length > 0 && (
                <div className="mb-3 rounded-md border bg-gray-50 p-2">
                  <div className="mb-1 text-xs text-gray-500">Select terms to edit</div>
                  <div className="flex flex-wrap gap-3">
                    {terms_and_specifications.map((term, i) => (
                      <label key={i} className="flex cursor-pointer items-center gap-1 text-xs">
                        <input
                          type="checkbox"
                          checked={term.editable || false}
                          onChange={() => toggleEditable(i)}
                        />
                        {term.label}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className={CLS.card}>
                {terms_and_specifications.map((term, i) => (
                  <div
                    key={i}
                    className={`border-light-100 flex gap-3 border-b py-2 last:border-b-0 ${term.editable && editMode ? "bg-blue-50/40" : ""}`}
                  >
                    <div className="w-1/4 text-sm font-medium text-gray-700">{term.label}</div>
                    <textarea
                      value={term.text}
                      disabled={!editMode || !term.editable}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        handleTermChange(i, "text", e.target.value)
                      }
                      rows={2}
                      className={`w-3/4 resize-none rounded-md border px-2 py-1 text-sm focus:outline-none ${
                        !editMode || !term.editable
                          ? "cursor-not-allowed border-transparent bg-gray-100 text-gray-500"
                          : "border-blue-200 focus:ring-1 focus:ring-blue-400"
                      }`}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════ STEP 2 — Preview & Submit */}
        {step === 2 && (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 shadow-xs">
              <span className="text-xs font-bold tracking-wider text-[#2c6671] uppercase">
                Review before updating
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <Toggle
                  checked={enableborder}
                  label="Add border"
                  onChange={() => setenableborder((p) => !p)}
                />
                <button
                  type="button"
                  onClick={() => setPreviewOpen(true)}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3.5 py-1.5 text-xs font-bold text-[#2c6671] shadow-xs transition-all hover:bg-gray-50"
                >
                  <FiEye className="h-3.5 w-3.5 stroke-[2.5]" /> Preview
                </button>
                <button
                  type="button"
                  onClick={handleManualPDF}
                  disabled={pdfLoading}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3.5 py-1.5 text-xs font-bold text-[#2c6671] shadow-xs transition-all hover:bg-gray-50 disabled:opacity-50"
                >
                  {pdfLoading ? (
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#2c6671] border-t-transparent" />
                  ) : (
                    <FiDownload className="h-3.5 w-3.5 stroke-[2.5]" />
                  )}
                  PDF
                </button>
                <button
                  type="button"
                  onClick={fetchSpecification}
                  disabled={gettechspec.isPending}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3.5 py-1.5 text-xs font-bold text-[#2c6671] shadow-xs transition-all hover:bg-gray-50 disabled:opacity-50"
                >
                  {gettechspec.isPending ? (
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#2c6671] border-t-transparent" />
                  ) : (
                    <FiRefreshCw className="h-3.5 w-3.5 stroke-[2.5]" />
                  )}
                  Fetch Specs
                </button>
                <button
                  type="button"
                  onClick={() => setIframeKey((p) => p + 1)}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3.5 py-1.5 text-xs font-bold text-[#2c6671] shadow-xs transition-all hover:bg-gray-50"
                >
                  <FiRefreshCw className="h-3.5 w-3.5 stroke-[2.5]" /> Refresh
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={mutation.isLoading}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[#2c6671] px-4 py-1.5 text-xs font-bold text-white shadow-md transition-all hover:bg-[#204e57] disabled:opacity-50"
                >
                  {mutation.isLoading ? (
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <FiSave className="h-3.5 w-3.5 stroke-[2.5]" />
                  )}
                  Save
                </button>
              </div>
            </div>
            <div
              className="border-light-300 overflow-hidden rounded-lg border"
              style={{ height: "calc(100dvh - 140px)" }}
            >
              <iframe
                key={iframeKey}
                srcDoc={previewHTML || "<p style='padding:20px'>No preview</p>"}
                title="Quotation Preview"
                className="h-full w-full border-0"
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Sticky bottom nav ── */}
      <div className="z-20 flex flex-shrink-0 items-center justify-between border-t border-gray-200 bg-white px-4 py-2.5 shadow-[0_-2px_10px_rgba(0,0,0,0.06)]">
        <button
          type="button"
          onClick={goBack}
          disabled={step === 0}
          className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 py-2 text-xs font-bold text-[#2c6671] shadow-xs transition-all hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <FiChevronLeft className="h-4 w-4 stroke-[2.5]" /> Back
        </button>
        <div className="flex items-center gap-1.5">
          {STEPS.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goStep(i)}
              className={`rounded-full transition-all duration-200 ${
                i === step
                  ? "h-2 w-5 bg-[#2c6671]"
                  : i < step
                    ? "h-2 w-2 bg-[#2c6671]/40"
                    : "h-2 w-2 bg-gray-300"
              }`}
            />
          ))}
        </div>
        {step < STEPS.length - 1 ? (
          <button
            type="button"
            onClick={goNext}
            className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-[#2c6671] px-5 py-2 text-xs font-bold text-white shadow-md transition-all hover:bg-[#204e57]"
          >
            Next <FiChevronRight className="h-4 w-4 stroke-[2.5]" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={mutation.isLoading}
            className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-[#2c6671] px-5 py-2 text-xs font-bold text-white shadow-md transition-all hover:bg-[#204e57] disabled:opacity-50"
          >
            {mutation.isLoading ? (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <FiSave className="h-4 w-4" />
            )}
            {mutation.isLoading ? "Updating..." : "Update Quotation"}
          </button>
        )}
      </div>

      {/* ── Full-screen preview modal ── */}
      {previewOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/80">
          <div className="flex flex-shrink-0 items-center justify-between border-b border-[#16373e] bg-[#1c474f] px-4 py-2.5 shadow-md">
            <span className="text-xs font-bold tracking-wide text-white">Preview — {quote_no}</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleManualPDF}
                disabled={pdfLoading}
                className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition-all hover:bg-white/20 disabled:opacity-50"
              >
                {pdfLoading ? (
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <FiDownload className="h-3.5 w-3.5 stroke-[2.5]" />
                )}
                {pdfLoading ? "Generating..." : "Download PDF"}
              </button>
              <button
                type="button"
                onClick={() => setPreviewOpen(false)}
                className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition-all hover:bg-white/20"
              >
                <FiX className="h-4 w-4 stroke-[2.5]" /> Close
              </button>
              <button
                type="button"
                onClick={() => setIframeKey((p) => p + 1)}
                className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition-all hover:bg-white/20"
              >
                <FiRefreshCw className="h-3.5 w-3.5 stroke-[2.5]" /> Refresh
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-auto bg-[#e6f4f5] p-4">
            <iframe
              ref={iframeRef}
              srcDoc={previewHTML}
              title="Full Preview"
              className="mx-auto block w-full max-w-[850px] rounded-xl border-none bg-white shadow-2xl"
              style={{ minHeight: "calc(100dvh - 80px)" }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default UpdateQuotation;
