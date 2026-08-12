import { useEffect, useState, useRef, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CreateQuotation as CreateQuotationAPI,
  Getnextquotations,
} from "../api/Quotation";
import { toast } from "react-toastify";
import {
  buildPreviewHTML,
  // getauthorizedPersonDesignation,
  findHeader,
} from "../assets/preview/Preview.ts";
import {
  FiChevronLeft,
  FiChevronRight,
  FiPlus,
  FiUploadCloud,
  FiEye,
  FiDownload,
  FiX,
  FiRefreshCcw,
  FiCheck,
  FiRotateCw,
} from "react-icons/fi";
import { downloadAsPDF } from "../hooks/Usepdfdownload.ts";
import { COMPANY_HEADERS } from "../Shared/Quotation.ts";
import { Field, StepBar } from "../assets/Microcomponent/Component.tsx";
import {
  STEPS,
  TODAY,
  selectCls,
  inputCls,
  UNITS,
  parseSessionValue,
  parseRange,
  validateStep0,
  validateStep1,
  GEO_DATA,
  COUNTRIES,
  CLS,
} from "../Shared/Quotation.ts";
import { useQuotationItemStore } from "../mystore/features/useQuotationItemStore";
import { useQuotationInfoStore } from "../mystore/features/useQuotationInfoStore";
import { useImageStore } from "../mystore/features/useImageStore";
import { useTechSpecStore } from "../mystore/features/useTechSpecStore";
import { useAreaStore } from "../mystore/features/useAreaStore";
import { formatDate } from "../utils/dateHelpers.js";
import { Link } from "react-router-dom";
import GroupedProductEntry, {
  buildGroupKey,
} from "../reusablecomponents/Productentry/ProductEntry.tsx";
import { GetTechspec } from "../api/Techspec.ts";
import ImageCard from "../assets/Microcomponent/ImageCard.js";
import { GSTSummaryPanel } from "../assets/Microcomponent/GSTSummaryPanel.tsx";
import {
  getaddress,
  getauthorizedPerson,
  getcompanyemail,
} from "../assets/preview/Preview.ts";
import { useNavigate } from "react-router-dom";

interface ToggleProps {
  checked: string;
  onChange: () => void;
  label: string;
}

// ─── helpers ────────────────────────────────────────────────────────────────
const MAHARASHTRA = "Maharashtra";

/** Yesterday's date as yyyy-mm-dd */
const YESTERDAY = (() => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
})();

const fmtINR = (n) =>
  (parseFloat(n) || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 });
// ── Toggle switch component ──────────────────────────────────────────────────
function Toggle({ checked, onChange, label }: ToggleProps) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <div
        className={`relative w-9 h-5 rounded-full transition-colors duration-200 ${checked ? "bg-[#2c6671]" : "bg-gray-300"
          }`}
        onClick={() => onChange(!checked)}
      >
        <div
          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-md transition-transform duration-200 ${checked ? "translate-x-4" : "translate-x-0"
            }`}
        />
      </div>
      {label && (
        <span className="text-xs font-bold text-[#2c6671]">{label}</span>
      )}
    </label>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function CreateQuotation() {
  const iframeRef = useRef(null);
  // ── Zustand state ──
  const quotationItem = useQuotationItemStore((s) => s.quotationItem);
  const addQuotationItem = useQuotationItemStore((s) => s.addQuotationItem);
  const resetQuotationItems = useQuotationItemStore((s) => s.resetQuotationItems);

  const quotationinfo = useQuotationInfoStore();
  const updateField = useQuotationInfoStore((s) => s.updateField);
  const resetQuotation = useQuotationInfoStore((s) => s.resetQuotation);
  const attachFileToImage = useQuotationInfoStore((s) => s.attachFileToImage);
  const detachFileFromImage = useQuotationInfoStore((s) => s.detachFileFromImage);

  const techImages = useTechSpecStore((state) => state.techImages);
  const setTechImages = useTechSpecStore((state) => state.setTechImages);

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const images = useImageStore((state) => state.images);
  const setImagesZustand = useImageStore((state) => state.setImages);
  const removeImageZustand = useImageStore((state) => state.removeImage);
  const updateCaptionZustand = useImageStore((state) => state.updateCaption);
  const clearImages = useImageStore((state) => state.clearImages);
  const area = useAreaStore((s) => s.area);

  // ── Filter metadata from session ──
  const filterObj = parseSessionValue("filter", {});
  const cloudCoverRange = parseRange(filterObj?.cloudcover);
  const incidenceAngleRange = parseRange(filterObj?.incidenceAngle);
  const startDate = formatDate(filterObj?.startDate?.slice(0, 10) || "");
  const endDate = formatDate(filterObj?.endDate?.slice(0, 10) || "");

  // ── Step & UI state ──
  const [step, setStep] = useState<number>(0);
  const [previewOpen, setPreviewOpen] = useState<boolean>(false);
  const [formErrors, setFormErrors] = useState<any>({});
  const [pdfLoading, setPdfLoading] = useState<boolean>(false);
  const [submitAttempt, setSubmitAttempt] = useState<boolean>(false);
  const [extraImages, setExtraImages] = useState<any[]>([]);
  const [techspecimage, settechspecimage] = useState<any[]>([]);

  // ── Quote meta ──
  const [quote_no, set_quote_no] = useState<string>("");
  const [reference_no, set_reference_no] = useState<string>("");
  const [reference_date, set_reference_date] = useState<any>(YESTERDAY);

  // ── Discount ──
  const [discountEnabled, setDiscountEnabled] = useState<boolean>(false);
  const [discountPct, setDiscountPct] = useState<number>(0);

  const [allowfile, setAllowfile] = useState<any[]>(["kml", "html", "jpg"]);
  const [attachKml, setAttachKml] = useState<boolean>(true);
  const [attachHtml, setAttachHtml] = useState<boolean>(true);
  const [attachJpg, setAttachJpg] = useState<boolean>(true);
  const [enableborder, setenableborder] = useState<boolean>(false);

  const Onchangeborder = () => {
    setenableborder(!enableborder);
  };
  const toggleFileType = (key, value) => {
    if (value) {
      setAllowfile((prev) => [...prev, key]);
    } else {
      setAllowfile((prev) => prev.filter((i) => i !== key));
    }
  };

  // ── FROM COMPANY fields ──
  const [from_company, set_from_company] = useState<string>("");
  const [from_company_email, set_from_company_email] = useState<any>(quotationinfo.from_company_email || "",
  );
  const [from_company_authorized_person, set_from_company_authorized_person] =
    useState<any>(quotationinfo.from_company_authorized_person || "");
  const [
    from_company_authorized_person_designation,
    set_from_company_authorized_person_designation,
  ] = useState<any>(quotationinfo.from_company_authorized_person_designation || "");
  const [from_company_address, set_from_company_address] = useState<any>(quotationinfo.from_company_address || "",
  );

  // ── TO COMPANY fields ──
  const [to_company, set_to_company] = useState<any>(quotationinfo.to_company || "");
  const [
    receiver_company_authorized_person,
    set_receiver_company_authorized_person,
  ] = useState<any>(quotationinfo.receiver_company_authorized_person || "");
  const [
    receiver_company_authorized_person_designation,
    set_receiver_company_authorized_person_designation,
  ] = useState<any>(quotationinfo.receiver_company_authorized_person_designation || "",
  );
  const [receiver_company_email, setreceiver_company_email] = useState<string>("");
  // ── Address fields ──
  const [address_line_1, set_address_line_1] = useState<any>(quotationinfo.address_line_1 || "",
  );
  const [address_line_2, set_address_line_2] = useState<any>(quotationinfo.address_line_2 || "",
  );
  const [sameAsLine1, setSameAsLine1] = useState<boolean>(false);
  const [country, setcountry] = useState<any>(quotationinfo.country || "India");
  const [stateVal, setstateVal] = useState<any>(quotationinfo.state || "");
  const [city, setcity] = useState<any>(quotationinfo.city || "");
  const [postal_code, setpostal_code] = useState<any>(quotationinfo.postal_code || "",
  );

  const [validity, set_validity] = useState<any>(quotationinfo.validity || "30");
  const [date, set_date] = useState<any>(TODAY || "");

  const [iframeKey, setIframeKey] = useState<number>(0);

  // ── GST regime: auto-switch based on state ──
  const isInterState = stateVal !== "" && stateVal !== MAHARASHTRA;
  const cgst_pct = isInterState ? 0 : 9;
  const sgst_pct = isInterState ? 0 : 9;
  const igst_pct = isInterState ? 18 : 0;
  const Termsandconditions = [
    {
      label: "Payment",
      text: `The payment should be made by wire transfer to ${from_company} in INR only. Payment to be released 100% in Advance against Proforma Invoice.`,
    },
    {
      label: "Pricing",
      text: "The product price is in Indian rupees, considering Foreign Exchange variations.",
    },
    {
      label: "Warranty",
      text: "All data warranties are provided by our principles i.e. Airbus Defence and Space Geo SA and are subject to their data supply conditions and licenses.",
    },
    {
      label: "Delivery",
      text: "Data delivery schedule will be updated after Receiving confirm Order and 100 % advance Payment. AOI confirmation require before Placing Order.",
    },
    {
      label: "Taxes & Duties",
      text: "The quoted prices exclude any taxes (withholding taxes, VAT, GST or similar taxes), duties, stamps, surcharges, clearance costs and other fees. Any such similar taxes), or other imposts etc. payable by Airbus Defence and Space / Micronet will be charged additionally to the customer. All local taxes to be borne by Customer.",
    },
    { label: "Shipment", text: "Data delivered under FTP mode Only." },
    {
      label: "Purchase Order",
      text: `To be placed on ${from_company} within ${validity} days of quotation.`,
    },
    { label: "Validity", text: `Prices valid for ${validity} days.` },
    {
      label: "Licensing Terms",
      text: "placed on the Data provider's Order form. This quote is given for License as selected in the order form. (Also refer respective EULA). All products are subject to the licensing terms of End User License Agreement (EULA) and is governed by general conditions of supply of imagery products by Airbus Defence and Space.",
    },
  ];
  const [terms_and_specifications, set_terms_and_specifications] =
    useState<any>(Termsandconditions);
  const [editMode, setEditMode] = useState<boolean>(false);
  useEffect(() => {
    set_terms_and_specifications([
      {
        label: "Payment",
        text: `The payment should be made by wire transfer to ${from_company} in INR only. Payment to be released 100% in Advance against Proforma Invoice.`,
      },
      {
        label: "Pricing",
        text: "The product price is in Indian rupees, considering Foreign Exchange variations.",
      },
      {
        label: "Warranty",
        text: "All data warranties are provided by our principles i.e. Airbus Defence and Space Geo SA and are subject to their data supply conditions and licenses.",
      },
      {
        label: "Delivery",
        text: "Data delivery schedule will be updated after Receiving confirm Order and 100 % advance Payment. AOI confirmation require before Placing Order.",
      },
      {
        label: "Taxes & Duties",
        text: "The quoted prices exclude any taxes (withholding taxes, VAT, GST or similar taxes), duties, stamps, surcharges, clearance costs and other fees. Any such similar taxes), or other imposts etc. payable by Airbus Defence and Space / Micronet will be charged additionally to the customer. All local taxes to be borne by Customer.",
      },
      { label: "Shipment", text: "Data delivered under FTP mode Only." },
      {
        label: "Purchase Order",
        text: `To be placed on ${from_company} within ${validity} days of quotation.`,
      },
      { label: "Validity", text: `Prices valid for ${validity} days.` },
      {
        label: "Licensing Terms",
        text: "placed on the Data provider's Order form. This quote is given for License as selected in the order form. (Also refer respective EULA). All products are subject to the licensing terms of End User License Agreement (EULA) and is governed by general conditions of supply of imagery products by Airbus Defence and Space.",
      },
    ]);
  }, [from_company, validity]);
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
  // ── Cascading geo ──
  const availableStates = country
    ? Object.keys(GEO_DATA[country] || {}).sort()
    : [];
  const availableCities =
    country && stateVal ? (GEO_DATA[country]?.[stateVal] || []).sort() : [];

  useEffect(() => {
    if (!from_company) return;

    const header = findHeader(from_company);
    if (!header) return;

    set_from_company_authorized_person(header.contactPerson || "");
    set_from_company_address(header.address || "");
    set_from_company_email(header.email || "");
  }, [from_company]);

  const handleCountryChange = (val) => {
    setcountry(val);
    setstateVal("");
    setcity("");
    updateField({ field: "country", value: val });
    updateField({ field: "state", value: "" });
    updateField({ field: "city", value: "" });
  };

  const handleStateChange = (val) => {
    setstateVal(val);
    setcity("");
    updateField({ field: "state", value: val });
    updateField({ field: "city", value: "" });
    // Update GST in store
    const inter = val !== "" && val !== MAHARASHTRA;
    updateField({ field: "cgst_pct", value: inter ? 0 : 9 });
    updateField({ field: "sgst_pct", value: inter ? 0 : 9 });
    updateField({ field: "igst_pct", value: inter ? 18 : 0 });
  };

  const handleCityChange = (val) => {
    setcity(val);
    updateField({ field: "city", value: val });
  };

  // ── Commercial terms ──
  const delivery = quotationinfo.delivery || "VIA FTP ONLY";
  const incoterms = quotationinfo.incoterms || "EXW";
  const payment = quotationinfo.payment || "As per Quotation terms";
  const purchase_order = `To be Placed on ${from_company} India`;

  // ── Date display for filter pills ──
  let dateDisplay = "";
  if (startDate && endDate) dateDisplay = `From: ${startDate} To: ${endDate}`;
  else if (startDate && !endDate) dateDisplay = `After: ${startDate}`;
  else if (!startDate && endDate) dateDisplay = `Before: ${endDate}`;
  else dateDisplay = TODAY;

  // ── Next quote number ──
  const nextQuoteQuery = useQuery({
    queryKey: ["next_quote_no"],
    queryFn: Getnextquotations,
    keepPreviousData: true,
  });

  useEffect(() => {
    if (nextQuoteQuery.data) {
      set_quote_no(nextQuoteQuery.data.next_quote_no ?? "");
      set_reference_no(nextQuoteQuery.data.next_reference_no ?? "");
    }
  }, [nextQuoteQuery.data]);

  // ── Close dropdowns on outside click ──
  useEffect(() => {
    const handler = (e) => {
      const openDetails = document.querySelector("details[open]");
      if (openDetails && !openDetails.contains(e.target))
        openDetails.removeAttribute("open");
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);
  useEffect(() => {
    if (!Array.isArray(images) || images.length === 0) return;

    setExtraImages(
      images.map((img) => ({
        dataUrl: img?.dataUrl || null,
        caption: img?.caption || "Map Screenshot",
        supportingfiles: Array.isArray(img?.supportingfiles)
          ? img.supportingfiles
          : [],
      })),
    );
  }, [images]);
  useEffect(() => {
    if (!quotationItem?.length) return;

    const fetchAll = async () => {
      const uniqueItems = [
        ...new Set(quotationItem.map((i) => i?.item).filter(Boolean)),
      ];

      try {
        const results = await Promise.all(
          uniqueItems.map((item) => GetTechspec(item)),
        );
        const allImages = results.flat();
        setTechImages(allImages);
      } catch (err) {
        console.error(err);
      }
    };

    fetchAll();
  }, [quotationItem]);

  // ── "Same as Line 1" checkbox handler ──
  const handleSameAsLine1 = (checked) => {
    setSameAsLine1(checked);
    if (checked) {
      set_address_line_2(address_line_1);
      updateField({ field: "address_line_2", value: address_line_1 });
    }
  };

  // ── Grand total with GST + discount ──
  const grandTotal = (() => {
    const groups = {};
    quotationItem.forEach((item, idx) => {
      const key = buildGroupKey(item);
      if (!groups[key]) groups[key] = { indices: [], rep: item };
      groups[key].indices.push(idx);
    });
    return Object.values(groups).reduce((sum, group) => {
      const rep = group.rep;
      const c = parseFloat(rep.cgst_pct) || cgst_pct;
      const s = parseFloat(rep.sgst_pct) || sgst_pct;
      const ig = parseFloat(rep.igst_pct) || igst_pct;
      const baseTotal = group.indices.reduce(
        (acc, idx) => acc + (parseFloat(quotationItem[idx]?.amount) || 0),
        0,
      );
      const gst = (baseTotal * (c + s + ig)) / 100;
      const disc = discountEnabled ? (baseTotal * discountPct) / 100 : 0;
      return sum + baseTotal + gst - disc;
    }, 0);
  })();

  // ── Preview HTML ──
  const previewHTML = buildPreviewHTML({
    quote_no,
    reference_no,
    reference_date,
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
    items: quotationItem.map((item) => ({
      ...item,
      cgst_pct: item.cgst_pct ?? cgst_pct,
      sgst_pct: item.sgst_pct ?? sgst_pct,
      igst_pct: item.igst_pct ?? igst_pct,
    })),
    extraImages,
    logoBase64: null,
    terms_and_specifications,

    metadata: filterObj,
    techspecimage: techImages,
    address_line_1,
    address_line_2,
    city,
    state: stateVal,
    country,
    postal_code,
    discountPct,
    grandTotal,
    discountEnabled,
    date,
    enableborder,
  });

  useEffect(() => {
    if (previewOpen && iframeRef.current)
      iframeRef.current.srcdoc = previewHTML;
  }, [previewOpen, previewHTML, discountEnabled, discountPct]);

  const handleinfo = (field, val) =>
    updateField({ field, value: val });

  // ── Add blank product row ──
  const addBlankRow = () =>
    addQuotationItem({
      item: "",
      unit: "Sqkm",
      area: 25,
      qty: 25,
      price: 0,
      amount: 0,
      cloud_cover: cloudCoverRange
        ? `${cloudCoverRange[0]}-${cloudCoverRange[1]}`
        : "",
      date: TODAY,
      angle: incidenceAngleRange
        ? `${incidenceAngleRange[0]}-${incidenceAngleRange[1]}`
        : "",
      cgst_pct,
      sgst_pct,
      igst_pct,
      cgst_amt: 0,
      sgst_amt: 0,
      igst_amt: 0,
      total: 0,
      geometricprocessing: "",
      spectralbands: "",
      task_type: "Archival",
      techSpecs: ["Cloud Cover: ≤ 10%"],
    });

  // ── Image handlers ──
  const handleImageFiles = (files) =>
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith("image/")) return;

      const r = new FileReader();

      r.onload = (e) =>
        setExtraImages((p) => [
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

  const handleUpdateCaption = (i, v) => {
    setExtraImages((p) => {
      const updated = p.map((img, idx) => (idx === i ? { ...img, caption: v } : img));
      setImagesZustand(updated);
      return updated;
    });
    updateCaptionZustand({ index: i, caption: v });
  };

  const handleRemoveImage = (i) => {
    setExtraImages((p) => {
      const updated = p.filter((_, idx) => idx !== i);
      setImagesZustand(updated);
      return updated;
    });
    removeImageZustand(i);
  };

  const attachFile = (i, file, type) => {
    setExtraImages((prev) =>
      prev.map((img, idx) => {
        if (idx !== i) return img;

        const existing = img.supportingfiles || [];

        const filtered = existing.filter((f) => f.fileType !== type);

        const updated = [
          ...filtered,
          {
            file, // local only (NOT Redux)
            fileType: type,
            name: file.name,
          },
        ];

        return {
          ...img,
          supportingfiles: updated,
        };
      }),
    );

    attachFileToImage({
      index: i,
      fileType: type,
      name: file.name,
    });
  };
  const detachFile = (i, type) => {
    setExtraImages((prev) =>
      prev.map((img, idx) => {
        if (idx !== i) return img;

        return {
          ...img,
          supportingfiles: (img.supportingfiles || []).filter(
            (f) => f.fileType !== type,
          ),
        };
      }),
    );

    detachFileFromImage({ index: i, fileType: type });
  };

  // ── Step navigation ──
  const goNext = () => {
    let errors = {};
    if (step === 0)
      errors = validateStep0({
        to_company,
        from_company,
        reference_date,
      });
    if (step === 1) errors = validateStep1({ items: quotationItem });
    if (Object.keys(errors).length) {
      setFormErrors(errors);
      setSubmitAttempt(true);
      Object.values(errors).forEach((msg) => toast.error(msg));
      return;
    }
    setFormErrors({});
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goBack = () => {
    setFormErrors({});
    setStep((s) => Math.max(0, s - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ── Submit ──
  const mutation = useMutation({
    mutationFn: (payload) => CreateQuotationAPI(payload),
    onSuccess: (data) => {
      try {
        queryClient.invalidateQueries({ queryKey: ["quotations"] });
        queryClient.invalidateQueries({ queryKey: ["quotations_search"] });

        // 1. Cleanup app state first
        clearImages();
        resetQuotation();
        resetQuotationItems();
        localStorage.removeItem("initialImages");

        // 2. Show success message
        toast.success(data?.message || "Quotation created!");

        // 3. Delay navigation slightly so UI updates + toast renders properly
        setTimeout(() => {
          navigate("/quotation", {
            replace: true,
            state: {
              success: true,
              message: data?.message || "Quotation created!",
            },
          });
        }, 300);
      } catch (err) {
        console.error("Navigation flow error:", err);
        toast.error("Something went wrong after success");
      }
    },
    onError: (err) => {
      const d = err?.response?.data?.details;
      if (d && typeof d === "object")
        Object.entries(d).forEach(([f, m]) =>
          toast.error(`${f}: ${Array.isArray(m) ? m.join(", ") : m}`),
        );
      else
        toast.error(err?.response?.data?.error || "Error generating quotation");
    },
  });

  const handleSubmit = async () => {
    const allErrors = {
      ...validateStep0({
        to_company,
        from_company,
        reference_date,
      }),
      ...validateStep1({ items: quotationItem }),
    };
    if (Object.keys(allErrors).length) {
      Object.values(allErrors).forEach((m) => toast.error(m));
      return;
    }
    const fd = new FormData();
    [
      ["quote_no", quote_no],
      ["reference_no", reference_no],
      ["reference_date", reference_date],

      // sender
      ["from_company", from_company],
      ["from_company_email", from_company_email],
      ["authorized_name", from_company_authorized_person], // FIXED
      ["from_company_address", from_company_address],
      ["to_company", to_company],
      [
        "receiver_company_authorized_person",
        receiver_company_authorized_person,
      ],
      [
        "receiver_company_authorized_person_designation",
        receiver_company_authorized_person_designation,
      ],
      // address (FIXED NAMES)
      ["street", address_line_1], // FIXED
      ["city", city],
      ["state", stateVal],
      ["country", country],
      ["postal_code", postal_code],

      // quotation
      ["delivery", delivery],
      ["incoterms", incoterms],
      ["payment", payment],
      ["purchase_order", purchase_order],
      ["validity", validity],

      ["cgst", cgst_pct],
      ["sgst", sgst_pct],
      ["igst", igst_pct],
      ["discount", discountEnabled ? Number(discountPct || 0) : 0],
      ["date", date],
      ["receiver_company_email", receiver_company_email],
      ["total_amount", grandTotal],
    ].forEach(([k, v]) => fd.append(k, v ?? ""));

    fd.append(
      "products",
      JSON.stringify(
        quotationItem.map((item) => ({
          product_name: item.item || "Satellite Product",
          area: item.area || item.qty || 25,
          qty: item.qty || 1,
          price: item.price || 0,
          amount: item.amount || 0,
          unit: item.unit || "Sqkm",
          cloud_cover: item.cloud_cover ?? "",
          angle: item.angle ?? "",
          date: item.date ?? "",
          task_type: item.task_type || "Archival",
        }))
      )
    );

    fd.append(
      "terms_and_specifications",
      JSON.stringify(terms_and_specifications),
    );
    fd.append(
      "description",
      JSON.stringify(
        quotationItem.map((item) => ({
          detail: item.item || "Satellite Product",
          area: item.area,
          item: item.item,
          unit: item.unit,
          qty: item.qty,
          price: item.price,
          amount: item.amount,
          cloud_cover: item.cloud_cover,
          angle: item.angle,
          date: item.date,
          geometricprocessing: item.geometricprocessing,
          spectralbands: item.spectralbands,
          cgst_pct: item.cgst_pct ?? cgst_pct,
          sgst_pct: item.sgst_pct ?? sgst_pct,
          igst_pct: item.igst_pct ?? igst_pct,
          total: item.total || 0,
          task_type: item.task_type,
          techSpecs: item.techSpecs || [],
        })),
      ),
    );

    const resolvedImages = await Promise.all(
      extraImages.map(async (img, i) => {
        let file = img.file;
        if (!file && img.dataUrl) {
          const res = await fetch(img.dataUrl);
          const blob = await res.blob();
          file = new File(
            [blob],
            img.caption
              ? `${img.caption.replace(/\s+/g, "_")}.jpg`
              : `image_${i}.jpg`,
            { type: blob.type || "image/jpeg" },
          );
        }
        return {
          file,
          caption: img.caption || "",
          supportingfiles: img.supportingfiles || [], // ← use array
        };
      }),
    );

    resolvedImages.forEach((img, i) => {
      if (img.file) fd.append("images", img.file);
      // Send each supporting file by type
      img.supportingfiles.forEach((sf) => {
        fd.append(`supporting_${i}_${sf.fileType}`, sf.file);
      });
    });
    fd.append(
      "image_captions",
      JSON.stringify(resolvedImages.map((r) => r.caption)),
    );

    const attachmentType = [
      attachKml ? "kml" : "",
      attachHtml ? "html" : "",
      attachJpg ? "jpg" : "",
    ]
      .filter(Boolean)
      .join(",");
    fd.append("attachment_type", attachmentType || "kml");

    mutation.mutate(fd);
  };

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

  const gettechspec = useMutation({
    mutationFn: (payload) => GetTechspec(payload),
    onSuccess: (data) => {
      // toast.success("Techspec fetched!");
      settechspecimage(data || []);
    },
    onError: (err) =>
      // toast.error(err?.response?.data?.error || "Error fetching techspec"),
      console.log(err?.response?.data?.error || "Error fetching techspec"),
  });

  const fetchSpecification = () => {
    const keywords = [
      ...new Set(
        quotationItem
          .map((it) => it.item?.split(" ")[0].toLowerCase())
          .filter(Boolean),
      ),
    ];
    const toFetch = keywords.filter(
      (kw) =>
        !techspecimage.some((img) => img.product_name?.toLowerCase() === kw),
    );
    if (!toFetch.length) {
      toast.info("All tech specs already fetched!");
      return;
    }
    toFetch.forEach((kw) => gettechspec.mutate(kw));
  };

  // ── GST badge color ──
  const gstBadge = isInterState
    ? "bg-amber-50 text-amber-700 border border-amber-200"
    : "bg-green-50 text-green-700 border border-green-200";

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full">
      <StepBar step={step} steps={STEPS} onStepClick={setStep} />

      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
        {/* ══════════════════════════════════════════════ STEP 0 */}
        {step === 0 && (
          <>
            {/* Filter pills
            {Object.keys(filterObj).length > 0 && (
              <div className="flex flex-wrap gap-1 rounded border border-primary-200 bg-primary-50 px-2 py-1">
                {cloudCoverRange && (
                  <span
                    className={`${CLS.badge} bg-blue-50 text-blue-700 border border-blue-200`}
                  >
                    ☁ ≤{cloudCoverRange[1]}%
                  </span>
                )}
                {incidenceAngleRange && (
                  <span
                    className={`${CLS.badge} bg-purple-50 text-purple-700 border border-purple-200`}
                  >
                    ⊿ ≤{incidenceAngleRange[1]}°
                  </span>
                )}
                {dateDisplay && (
                  <span
                    className={`${CLS.badge} bg-white text-primary-700 border border-primary-200`}
                  >
                    {dateDisplay}
                  </span>
                )}
                {area.area && (
                  <span
                    className={`${CLS.badge} bg-white text-primary-700 border border-primary-200`}
                  >
                    {Math.round(area.area)} km²
                  </span>
                )}
              </div>
            )} */}

            <div className={CLS.card}>
              {/* Header */}
              <div className="flex items-center gap-1 justify-between ">
                <span className={CLS.sectionTitle}>
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary-600" />
                  From Company
                </span>
                <Link
                  to="/addtech"
                  className="text-[9px] font-semibold text-primary-600 hover:text-primary-700 underline"
                >
                  + Add Tech
                </Link>
              </div>

              {/* Company select */}
              <Field label="Company" required error={formErrors.from_company}>
                <select
                  className={` rounded border border-light-300 bg-white px-2 py-1 text-[11px] text-dark-700 focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-200 disabled:bg-light-100 disabled:text-light-400 w-64`}
                  value={from_company}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    const val = e.target.value;
                    set_from_company(val);
                    handleinfo("from_company", val);
                    const header = COMPANY_HEADERS.find(
                      (c) => c.match.toLowerCase() === val.toLowerCase(),
                    );
                    if (header) {
                      set_from_company_email(header.email || "");
                      set_from_company_authorized_person(
                        header.authorizedPerson || "",
                      );
                      set_from_company_address(header.address || "");
                      handleinfo("from_company_email", header.email || "");
                      handleinfo(
                        "from_company_authorized_person",
                        header.authorizedPerson || "",
                      );
                      handleinfo("from_company_address", header.address || "");
                    }
                  }}
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

            {/* ── TO COMPANY CARD ── */}
            <div className={CLS.card}>
              {/* Header */}
              <div className="flex items-center justify-between mb-2">
                <span className={CLS.sectionTitle}>
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  To Company
                </span>
                <span className="text-[9px] text-light-400">
                  Client / Receiver details
                </span>
              </div>

              {/* Row 1 — Company + Person + Designation */}
              <div className="grid grid-cols-4 gap-x-2 gap-y-1.5">
                <Field
                  label="Company Name"
                  required
                  error={formErrors.to_company}
                >
                  <input
                    className={CLS.input}
                    value={to_company}
                    placeholder="Client company name"
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      set_to_company(e.target.value);
                      handleinfo("to_company", e.target.value);
                      submitAttempt &&
                        setFormErrors((p) => ({ ...p, to_company: "" }));
                    }}
                  />
                </Field>

                <Field label="Contact Person">
                  <input
                    className={CLS.input}
                    value={receiver_company_authorized_person}
                    placeholder="Contact person"
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      set_receiver_company_authorized_person(e.target.value);
                      handleinfo(
                        "receiver_company_authorized_person",
                        e.target.value,
                      );
                    }}
                  />
                </Field>

                <Field label="Designation">
                  <input
                    className={CLS.input}
                    value={receiver_company_authorized_person_designation}
                    placeholder="e.g. Purchase Manager"
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      set_receiver_company_authorized_person_designation(
                        e.target.value,
                      );
                      handleinfo(
                        "receiver_company_authorized_person_designation",
                        e.target.value,
                      );
                    }}
                  />
                </Field>
                <Field label="Company email">
                  <input
                    className={CLS.input}
                    type="email"
                    value={receiver_company_email}
                    placeholder="Company email"
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      setreceiver_company_email(e.target.value);
                      handleinfo("receiver_company_email", e.target.value);
                    }}
                  />
                </Field>
              </div>

              {/* Divider */}
              <div className="border-t border-light-200 my-2" />

              {/* Row 2 — Address */}
              <div className="grid grid-cols-6 gap-x-2 gap-y-1.5">
                <Field label="Address Line 1" required>
                  <input
                    className={CLS.input}
                    value={address_line_1}
                    placeholder="Street / Building / Plot no."
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      set_address_line_1(e.target.value);
                      handleinfo("address_line_1", e.target.value);
                      if (sameAsLine1) {
                        set_address_line_2(e.target.value);
                        handleinfo("address_line_2", e.target.value);
                      }
                    }}
                  />
                </Field>

                <Field label="Address Line 2">
                  <input
                    className={CLS.input}
                    value={address_line_2}
                    placeholder="Area / Locality / Landmark"
                    disabled={sameAsLine1}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      set_address_line_2(e.target.value);
                      handleinfo("address_line_2", e.target.value);
                    }}
                  />
                  <label className="flex items-center gap-1 mt-0.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sameAsLine1}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleSameAsLine1(e.target.checked)}
                      className="h-3 w-3 accent-primary-600"
                    />
                    <span className="text-[9px] text-light-500">
                      Same as Line 1
                    </span>
                  </label>
                </Field>
                <Field label="Country" required>
                  <select
                    className={CLS.select}
                    value={country}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleCountryChange(e.target.value)}
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
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleStateChange(e.target.value)}
                  >
                    <option value="">
                      {country ? "Select" : "— country first"}
                    </option>
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
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleCityChange(e.target.value)}
                  >
                    <option value="">
                      {stateVal ? "Select" : "— state first"}
                    </option>
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
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      setpostal_code(e.target.value);
                      handleinfo("postal_code", e.target.value);
                    }}
                  />
                </Field>
              </div>

              {/* GST badge */}
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

            {/* ── QUOTATION META CARD ── */}
            <div className={CLS.card}>
              <div className="flex items-center justify-between mb-2">
                <span className={CLS.sectionTitle}>
                  <span className="inline-block w-2 h-2 rounded-full bg-violet-500" />
                  Quotation Details
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-x-2 gap-y-1.5 mb-2">
                <Field label="Ref No">
                  <input
                    className={CLS.input}
                    value={reference_no}
                    placeholder="REF-2024-0001"
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => set_reference_no(e.target.value)}
                  />
                </Field>

                <Field label="Ref Date (prev day)">
                  <input
                    type="date"
                    className={CLS.input}
                    value={reference_date}
                    max={YESTERDAY}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => set_reference_date(e.target.value)}
                  />
                </Field>

                <Field label="Validity">
                  <input
                    className={CLS.input}
                    value={validity}
                    placeholder="e.g. 30 days"
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      set_validity(e.target.value);
                      handleinfo("validity", e.target.value);
                    }}
                  />
                </Field>
                <Field label="Date">
                  <input
                    type="date"
                    className={CLS.input}
                    value={date}
                    placeholder="e.g. 30 days"
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      set_date(e.target.value);
                      handleinfo("date", e.target.value);
                    }}
                  />
                </Field>

                {/* Delivery */}
                {/* <Field label="Delivery">
                  <input
                    className={CLS.input}
                    value={delivery}
                    placeholder="VIA FTP ONLY"
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleinfo("delivery", e.target.value)}
                  />
                </Field> */}
              </div>

              {/* ── DISCOUNT TOGGLE ── */}
              <div className="flex items-center my-3">
                <div className="flex-1 border-t border-light-200" />
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <Toggle
                  checked={discountEnabled}
                  onChange={setDiscountEnabled}
                  label={
                    discountEnabled ? "Disable Discount" : "Enable Discount"
                  }
                />

                {discountEnabled && (
                  <div className="flex items-center gap-3 flex-wrap">
                    {/* Input */}
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        className={`${CLS.input} w-24`} // 🔥 slightly wider
                        value={discountPct}
                        min={0}
                        max={100}
                        placeholder="0"
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setDiscountPct(
                            Math.min(100, Math.max(0, +e.target.value)),
                          )
                        }
                      />
                      <span className="text-xs font-semibold text-dark-600">
                        %
                      </span>
                    </div>

                    {/* Badge */}
                    <span
                      className={`${CLS.badge} px-3 py-1 text-xs font-medium
        bg-amber-50 text-amber-700 border border-amber-200
        rounded-full whitespace-nowrap`}
                    >
                      Applied on base amount
                    </span>
                  </div>
                )}

                {!discountEnabled && (
                  <span className="text-xs text-light-400">
                    Toggle on to add client discount
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-3 mt-3">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-dark-500 uppercase tracking-wide">
                    Attachments
                  </span>
                  <div className="flex-1 border-t border-light-200" />
                </div>
                <div className="flex flex-wrap gap-4 items-center mb-2">
                  {[
                    {
                      key: "kml",
                      label: "KML / KMZ",
                      state: attachKml,
                      set: setAttachKml,
                    },
                    {
                      key: "html",
                      label: "HTML",
                      state: attachHtml,
                      set: setAttachHtml,
                    },
                    {
                      key: "jpg",
                      label: "JPG / Image",
                      state: attachJpg,
                      set: setAttachJpg,
                    },
                  ].map(({ key, label, state, set }) => (
                    <label
                      key={key}
                      className="flex items-center gap-1.5 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={state}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          set(e.target.checked);
                          toggleFileType(key, e.target.checked);
                        }}
                        className="h-3 w-3 accent-primary-600"
                      />
                      <span className="text-[10px] font-semibold text-dark-600">
                        {label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* ── PRODUCTS CARD ── */}
            <div className={CLS.card}>
              <div className="flex items-center justify-between mb-1.5">
                <span className={CLS.sectionTitle}>
                  <span className="inline-block w-2 h-2 rounded-full bg-orange-500" />
                  Products ({quotationItem.length})
                  {quotationItem.length > 0 && (
                    <span className="ml-2 text-[9px] font-normal text-light-500">
                      Grand Total:{" "}
                      <strong className="text-primary-700 font-black">
                        ₹ {fmtINR(grandTotal)}
                      </strong>
                      {discountEnabled && discountPct > 0 && (
                        <span className="ml-1 text-amber-600">
                          (incl. {discountPct}% discount)
                        </span>
                      )}
                    </span>
                  )}
                </span>
                <details className="relative inline-block text-xs">
                  <summary className="flex cursor-pointer select-none items-center gap-1.5 rounded-lg bg-[#2c6671] px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-[#204e57] transition-all">
                    <FiPlus className="h-4 w-4 stroke-[2.5]" />
                    Add Product
                  </summary>
                  <div className="absolute right-0 mt-1.5 w-44 rounded-xl border border-gray-200 bg-white shadow-xl z-20 overflow-hidden p-1">
                    <Link
                      to="/data"
                      className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-[#2c6671]/10 hover:text-[#2c6671] rounded-lg transition-colors"
                    >
                      Select from Data
                    </Link>
                    {/* <button
                      type="button"
                      onClick={addBlankRow}
                      className="flex w-full items-center gap-2 text-left px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-[#2c6671]/10 hover:text-[#2c6671] rounded-lg transition-colors cursor-pointer"
                    >
                      Enter Manually
                    </button> */}
                  </div>
                </details>
              </div>

              {formErrors.items && (
                <p className="mb-1.5 rounded bg-red-50 border border-red-200 px-2 py-0.5 text-[10px] text-red-600 font-semibold">
                  {formErrors.items}
                </p>
              )}

              {quotationItem.length === 0 ? (
                <div className="rounded border-2 border-dashed border-light-200 py-6 text-center text-[11px] text-light-400">
                  No products yet — click <strong>Add Product</strong>
                </div>
              ) : (
                /* ── Scrollable product list ── */
                <div
                  className="space-y-2 overflow-y-auto pr-1"
                  style={{ maxHeight: "420px" }}
                >
                  {(() => {
                    const groupMap = new Map();
                    quotationItem.forEach((item, idx) => {
                      const key = buildGroupKey(item);
                      if (!groupMap.has(key)) groupMap.set(key, []);
                      groupMap.get(key).push(idx);
                    });
                    return Array.from(groupMap.entries()).map(
                      ([key, indices], gNum) => {
                        const rep = quotationItem[indices[0]];
                        // Archival minimum area check
                        const isArchival = rep?.task_type === "Archival";
                        const rawArea = parseFloat(rep?.area || rep?.qty || 0);
                        const displayArea = isArchival
                          ? Math.max(rawArea, 25)
                          : rawArea;
                        const showMinWarn =
                          isArchival && rawArea > 0 && rawArea < 25;

                        return (
                          <div key={key} className="relative">
                            {showMinWarn && (
                              <div className="absolute -top-0.5 right-0 z-10">
                                <span className="text-[8px] font-bold bg-amber-100 text-amber-700 border border-amber-300 rounded px-1.5 py-0.5">
                                  ⚠ Min 25 sqkm for Archival (showing 25)
                                </span>
                              </div>
                            )}
                            {/* Cloud cover & angle display badges */}
                            {/* {(rep?.cloud_cover || rep?.angle) && (
                              <div className="flex gap-1.5 mb-1 flex-wrap">
                                {rep?.cloud_cover && (
                                  <span
                                    className={`${CLS.badge} bg-blue-50 text-blue-700 border border-blue-200`}
                                  >
                                    ☁ Cloud ≤ {rep.cloud_cover}%
                                  </span>
                                )}
                                {rep?.angle && (
                                  <span
                                    className={`${CLS.badge} bg-purple-50 text-purple-700 border border-purple-200`}
                                  >
                                    ⊿ Angle ≤ {rep.angle || displayArea}°
                                  </span>
                                )}
                              </div>
                            )} */}
                            <GroupedProductEntry
                              key={key}
                              groupIndices={indices}
                              groupNumber={gNum + 1}
                              fmt={fmtINR}
                              cgst_pct={cgst_pct}
                              sgst_pct={sgst_pct}
                              igst_pct={igst_pct}
                              discountEnabled={discountEnabled}
                              discountPct={discountPct}
                              minArchivalArea={25}
                              data={quotationItem}
                            // techSpecs={techSpecs}
                            />
                          </div>
                        );
                      },
                    );
                  })()}
                </div>
              )}
            </div>
          </>
        )}

        {/* ══════════════════════════════════════════════ STEP 1 — Images */}
        {step === 1 && (
          <div className={CLS.card}>
            <div className="flex items-center justify-between mb-1.5">
              <span className={CLS.sectionTitle}>
                Supporting Images ({extraImages.length})
              </span>
              <label className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-[#2c6671] px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-[#204e57] transition-all">
                <FiUploadCloud className="h-4 w-4" /> Upload
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleImageFiles(e.target.files)}
                />
              </label>
            </div>

            {extraImages.length === 0 ? (
              <label
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  handleImageFiles(e.dataTransfer.files);
                }}
                className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#2c6671]/40 bg-[#2c6671]/5 py-10 text-center transition-all duration-200 hover:border-[#2c6671] hover:bg-[#2c6671]/15 group"
              >
                <FiUploadCloud className="h-8 w-8 text-[#2c6671] transition-transform duration-200 group-hover:scale-110" />
                <p className="text-xs font-bold text-[#2c6671]">
                  Click or drag images here
                </p>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleImageFiles(e.target.files)}
                />
              </label>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
                {extraImages.map((img, i) => (
                  <ImageCard
                    key={i}
                    img={img}
                    index={i}
                    total={extraImages.length}
                    inputCls={CLS.input}
                    removeImage={handleRemoveImage}
                    updateCaption={handleUpdateCaption}
                    attachFile={attachFile}
                    detachFile={detachFile}
                    // attachment_type="kml,html,jpg"
                    allowfile={allowfile}
                  />
                ))}
              </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between mb-2 mt-3">
              <span className={CLS.sectionTitle}>Terms & Conditions</span>

              <Toggle
                checked={editMode}
                label={editMode ? "Edit Mode" : "View Mode"}
                onChange={() => setEditMode((prev) => !prev)}
              />
            </div>

            {/* Checkbox Selection Panel */}
            {editMode && (
              <div className="mb-3 p-2 rounded-md border bg-gray-50">
                <div className="text-xs text-gray-500 mb-1">
                  Select terms to edit
                </div>

                <div className="flex flex-wrap gap-3">
                  {terms_and_specifications.map((term, i) => (
                    <label
                      key={i}
                      className="flex items-center gap-1 text-xs cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={term.editable}
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
                  className={`flex gap-3 py-2 ${term.editable && editMode ? "bg-blue-50/40" : ""
                    }`}
                >
                  {/* Label */}
                  <div className="w-1/4 text-sm text-gray-700">
                    {term.label}
                  </div>

                  {/* Text */}
                  <textarea
                    value={term.text}
                    disabled={!editMode || !term.editable}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      handleTermChange(i, "text", e.target.value)
                    }
                    rows={2}
                    className={`w-3/4 text-sm rounded-md px-2 py-1 resize-none focus:outline-none border
          ${!editMode || !term.editable
                        ? "bg-gray-100 text-gray-500 cursor-not-allowed"
                        : "focus:ring-1 focus:ring-blue-400"
                      }`}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════ STEP 2 — Preview */}
        {step === 2 && (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 shadow-xs">
              <span className="text-xs font-bold uppercase tracking-wider text-[#2c6671]">
                Review before submitting
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <Toggle
                  checked={enableborder}
                  label="Add border"
                  onChange={Onchangeborder}
                />
                <button
                  type="button"
                  onClick={() => setPreviewOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3.5 py-1.5 text-xs font-bold text-[#2c6671] shadow-xs hover:bg-gray-50 transition-all cursor-pointer"
                >
                  <FiEye className="h-3.5 w-3.5 stroke-[2.5]" /> Preview
                </button>
                <button
                  type="button"
                  onClick={handleManualPDF}
                  disabled={pdfLoading}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3.5 py-1.5 text-xs font-bold text-[#2c6671] shadow-xs hover:bg-gray-50 disabled:opacity-50 transition-all cursor-pointer"
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
                  onClick={handleSubmit}
                  disabled={mutation.isPending}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#2c6671] hover:bg-[#204e57] px-4 py-1.5 text-xs font-bold text-white shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  {mutation.isPending ? (
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <FiCheck className="h-3.5 w-3.5 stroke-[2.5]" />
                  )}
                  Submit
                </button>
                <button
                  type="button"
                  onClick={fetchSpecification}
                  disabled={gettechspec.isPending}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3.5 py-1.5 text-xs font-bold text-[#2c6671] shadow-xs hover:bg-gray-50 disabled:opacity-50 transition-all cursor-pointer"
                >
                  {gettechspec.isPending ? (
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#2c6671] border-t-transparent" />
                  ) : (
                    <FiRefreshCcw className="h-3.5 w-3.5 stroke-[2.5]" />
                  )}
                  Fetch Specs
                </button>
                <button
                  type="button"
                  onClick={() => setIframeKey((prev) => prev + 1)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#2c6671] hover:bg-[#204e57] px-4 py-1.5 text-xs font-bold text-white shadow-md transition-all cursor-pointer"
                >
                  <FiRotateCw className="h-3.5 w-3.5 stroke-[2.5]" /> Refresh
                </button>
              </div>
            </div>
            <div
              className="rounded-lg border border-light-300 overflow-hidden"
              style={{ height: "calc(100dvh - 140px)" }}
            >
              <iframe
                key={iframeKey}
                srcDoc={previewHTML || "<p style='padding:20px'>No preview</p>"}
                title="Quotation Preview"
                className="w-full h-[90vh] border-0 overflow-auto"
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Sticky bottom nav ── */}
      <div className="flex-shrink-0 flex items-center justify-between border-t border-gray-200 bg-white px-4 py-2.5 shadow-[0_-2px_10px_rgba(0,0,0,0.06)] z-20">
        <button
          type="button"
          onClick={goBack}
          disabled={step === 0}
          className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 py-2 text-xs font-bold text-[#2c6671] hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-xs"
        >
          <FiChevronLeft className="h-4 w-4 stroke-[2.5]" /> Back
        </button>

        <div className="flex items-center gap-1.5">
          {STEPS.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setStep(i)}
              className={`rounded-full transition-all duration-200 ${i === step
                  ? "w-5 h-2 bg-[#2c6671]"
                  : i < step
                    ? "w-2 h-2 bg-[#2c6671]/40"
                    : "w-2 h-2 bg-gray-300"
                }`}
            />
          ))}
        </div>

        {step < STEPS.length - 1 ? (
          <button
            type="button"
            onClick={goNext}
            className="flex items-center gap-1.5 rounded-lg bg-[#2c6671] hover:bg-[#204e57] px-5 py-2 text-xs font-bold text-white shadow-md transition-all cursor-pointer"
          >
            Next <FiChevronRight className="h-4 w-4 stroke-[2.5]" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={mutation.isPending}
            className="flex items-center gap-1.5 rounded-lg bg-[#2c6671] hover:bg-[#204e57] px-5 py-2 text-xs font-bold text-white shadow-md transition-all cursor-pointer disabled:opacity-50"
          >
            {mutation.isPending ? "Submitting..." : "Submit Quotation"}
          </button>
        )}
      </div>

      {/* ── Full-screen preview modal ── */}
      {previewOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/80">
          <div className="flex-shrink-0 flex items-center justify-between border-b border-[#16373e] bg-[#1c474f] px-4 py-2.5 shadow-md">
            <span className="text-xs font-bold text-white tracking-wide">
              Preview — {quote_no}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleManualPDF}
                disabled={pdfLoading}
                className="flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-white/20 disabled:opacity-50 transition-all cursor-pointer"
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
                className="flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-white/20 transition-all cursor-pointer"
              >
                <FiX className="h-4 w-4 stroke-[2.5]" /> Close
              </button>
              <button
                type="button"
                onClick={() => setIframeKey((prev) => prev + 1)}
                className="flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-white/20 transition-all cursor-pointer"
              >
                <FiRotateCw className="h-3.5 w-3.5 stroke-[2.5]" /> Refresh
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-auto bg-[#e6f4f5] p-4">
            <iframe
              ref={iframeRef}
              srcDoc={previewHTML}
              title="Full Preview"
              className="mx-auto block w-full max-w-[850px] rounded-xl shadow-2xl border-none bg-white"
              style={{ minHeight: "calc(100dvh - 80px)" }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
