import header1 from "../images/micronetsolutionheader.png";
import footer1 from "../images/micronetsolutionfooter.png";
import sign1 from "../images/sign/sign.png";
import stamp1 from "../images/sign/stamp.png";

import header2 from "../images/micronetsolutionllpheader.png";
import footer2 from "../images/micronetsolutionllpfooter.png";

import header3 from "../images/micronetspacetechdwcllcheader.png";
import footer3 from "../images/micronetspacetechdwcllcfooter.png";
import { buildTechSpecs } from "../../utils/Buildtechnicalspecification";
const BASE_URL = import.meta.env.VITE_REACT_APP_BASE_URL;
export const COMPANY_HEADERS = [
  {
    id: 1,
    match: "MICRONET SOLUTIONS",
    img: header1,
    footer: footer1,
    sign: sign1,
    stamp: stamp1,
    address: "Bunglow No. 80, Khare Tarkunde Nagar, Gittikhadan, Nagpur 440013",
    contactPerson: "Manik Kotarwar",
    email: "manik@micronetsolutions.in",
    palette: {
      primary: "#2563eb",
      primaryLight: "#dbeafe",
      accent: "#60a5fa",
      bodyText: "#1a1a2e",
      labelText: "#1e3a8a",
      mutedText: "#374151",
      totalRowBg: "#dbeafe",
      specHeaderBg: "#bfdbfe",
      specHeaderTxt: "#1e3a8a",
      gstBand: "#eff6ff",
      subTotalBg: "#e0f2fe",
      tcHeaderBg: "#bfdbfe",
      tcHeaderTxt: "#1e3a8a",
      tcNoColor: "#1e3a8a",
      tcStrongColor: "#1e3a8a",
      stripBg: "#2563eb",
      stripTxt: "#ffffff",
      forNameColor: "#1e3a8a",
      fromLabelColor: "#1e3a8a",
      rowOdd: "#f9fcff",
      rowEven: "#eef4fb",
      borderColor: "#1e293b",
    },
  },
  {
    id: 2,
    match: "MICRONET SPACETECH LLP",
    img: header2,
    footer: footer2,
    sign: sign1,
    stamp: stamp1,
    address: "Plot No. 25, Friends Colony, Katol Road, Nagpur 440013",
    contactPerson: "Devendra Gaidhane",
    email: "devendra@spacetechindia.in",
    palette: {
      primary: "#2563eb",
      primaryLight: "#dbeafe",
      accent: "#60a5fa",
      bodyText: "#000000",
      labelText: "#000000",
      mutedText: "#000000",
      totalRowBg: "#dbeafe",
      specHeaderBg: "#bfdbfe",
      specHeaderTxt: "#000000",
      gstBand: "#eff6ff",
      subTotalBg: "#e0f2fe",
      tcHeaderBg: "#bfdbfe",
      tcHeaderTxt: "#000000",
      tcNoColor: "#1e3a8a",
      tcStrongColor: "#1e3a8a",
      stripBg: "#2563eb",
      stripTxt: "#000000",
      forNameColor: "#1e3a8a",
      fromLabelColor: "#1e3a8a",
      rowOdd: "#f9fcff",
      rowEven: "#eef4fb",
      borderColor: "#1e293b",
    },
  },
  {
    id: 3,
    match: "MICRONET SPACETECH DWC-LLC",
    img: header3,
    footer: footer3,
    sign: sign1,
    stamp: stamp1,
    address: "Dubai South Business Centre, Building C, 3rd Floor, O Box 390667, Dubai, UAE",
    contactPerson: "Amrit Walia",
    email: "sales@spacetechdubai.com",
    palette: {
      primary: "#2563eb",
      primaryLight: "#dbeafe",
      accent: "#60a5fa",
      bodyText: "#1a1a2e",
      labelText: "#1e3a8a",
      mutedText: "#374151",
      totalRowBg: "#dbeafe",
      specHeaderBg: "#bfdbfe",
      specHeaderTxt: "#1e3a8a",
      gstBand: "#eff6ff",
      subTotalBg: "#e0f2fe",
      tcHeaderBg: "#bfdbfe",
      tcHeaderTxt: "#1e3a8a",
      tcNoColor: "#1e3a8a",
      tcStrongColor: "#1e3a8a",
      stripBg: "#2563eb",
      stripTxt: "#ffffff",
      forNameColor: "#1e3a8a",
      fromLabelColor: "#1e3a8a",
      rowOdd: "#f9fcff",
      rowEven: "#eef4fb",
      borderColor: "#1e293b",
    },
  },
];

const DEFAULT_PALETTE = COMPANY_HEADERS[0].palette;

export function findHeader(fromCompany = "") {
  return COMPANY_HEADERS.find(
    (c) => c.match.toLowerCase().trim() === fromCompany.toLowerCase().trim(),
  );
}
export function getCompanyPalette(fromCompany = "") {
  return findHeader(fromCompany)?.palette ?? DEFAULT_PALETTE;
}
export function getHeaderImage(fromCompany = "") {
  return findHeader(fromCompany)?.img ?? header1;
}
export function getFooterImage(fromCompany = "") {
  return findHeader(fromCompany)?.footer ?? footer1;
}
export function getaddress(fromCompany = "") {
  return findHeader(fromCompany)?.address ?? "";
}
export function getauthorizedPerson(fromCompany = "") {
  return findHeader(fromCompany)?.contactPerson ?? "";
}
export function getauthorizedPersonDesignation(fromCompany = "") {
  return findHeader(fromCompany)?.authorizedPersonDesignation ?? "";
}
export function getcompanyemail(fromCompany = "") {
  return findHeader(fromCompany)?.email ?? "";
}
export function getCompanyDetails(fromCompany = "") {
  return findHeader(fromCompany) ?? null;
}
export function getCompanySign(fromCompany = "") {
  return findHeader(fromCompany)?.sign ?? sign1;
}
export function getCompanyStamp(fromCompany = "") {
  return findHeader(fromCompany)?.stamp ?? stamp1;
}

export function formatRangeDisplay(range, unit) {
  if (!range) return "—";
  let [min, max] = Array.isArray(range) ? range : [];
  if (!Array.isArray(range) && typeof range === "string") {
    const parts = range.split("-").map(Number);
    [min, max] = parts;
  }
  min = parseFloat(min);
  max = parseFloat(max);
  const u = unit ?? "";
  if (isNaN(min) && isNaN(max)) return "—";
  if (!isNaN(min) && isNaN(max)) return `≤ ${min}${u}`;
  if (isNaN(min) && !isNaN(max)) return `≤ ${max}${u}`;
  if (min === 0) return `≤ ${max}${u}`;
  if (min > 0 && max > min) return `≤ ${max}${u}`;
  return `≤ ${max}${u}`;
}

export function formatDateRange(dateInput) {
  if (!dateInput) return "—";
  let startDate, endDate;
  if (Array.isArray(dateInput)) {
    [startDate, endDate] = dateInput;
  } else if (typeof dateInput === "string") {
    const cleaned = dateInput.replace(/\[|\]/g, "");
    [startDate, endDate] = cleaned.split(",");
  } else {
    return "—";
  }
  const fmt = (iso) => (iso ? iso.split("T")[0] : null);
  startDate = fmt(startDate?.trim());
  endDate = fmt(endDate?.trim());
  if (startDate && endDate) return `From: ${startDate} To: ${endDate}`;
  if (startDate && !endDate) return `After: ${startDate}`;
  if (!startDate && endDate) return `Before: ${endDate}`;
  return "—";
}

function parseJsonData(data) {
  const parsed = {};
  for (const key in data) {
    const value = data[key];
    if (typeof value === "string" && value.startsWith("[") && value.endsWith("]")) {
      parsed[key] = value
        .slice(1, -1)
        .split(",")
        .map((v) => {
          const num = Number(v);
          return isNaN(num) ? v : num;
        });
    } else {
      parsed[key] = value;
    }
  }
  return parsed;
}

export function groupItems(items) {
  // console.log("Grouping items with tech specs:", items);
  const groups = [];
  const indexMap = {};

  items.forEach((item) => {
    const techSpecs = buildTechSpecs(item.item, item.geometricprocessing, item.spectralbands);

    // Group key = original fields + every single techSpec value
    const key = [
      item.cloud_cover,
      item.angle,
      item.task_type,
      item.geometricprocessing,
      item.spectralbands,
      ...techSpecs, // ✅ spread each techSpec as its own key segment
    ].join("|");

    if (indexMap[key] === undefined) {
      indexMap[key] = groups.length;
      groups.push({
        // original fields
        cloud_cover: item.cloud_cover,
        angle: item.angle,
        geometricprocessing: item.geometricprocessing,
        spectralbands: item.spectralbands,
        task_type: item.task_type,
        // ✅ techSpecs array ready to render directly in PDF
        techSpecs,
        items: [],
      });
    }

    groups[indexMap[key]].items.push(item);
  });

  return groups;
}
function partLabel(index) {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  if (index < 26) return letters[index];
  return letters[Math.floor(index / 26) - 1] + letters[index % 26];
}

function renderProductRow({ item, fmt, rowIndex, minArchivalArea = 25, pal, isWhitePage = false }) {
  const rowBg = isWhitePage
    ? "#ffffff"
    : rowIndex % 2 === 0
      ? pal.rowOdd || "#f9fcff"
      : pal.rowEven || "#eef4fb";

  if (!item || Object.keys(item).length === 0) {
    return `<tr>
      <td style="border:1px solid ${pal.borderColor};padding:5px 6px;font-size:9px;background:${rowBg};text-align:center;color:${pal.bodyText};">${rowIndex + 1}</td>
      <td style="border:1px solid ${pal.borderColor};padding:5px 6px;font-size:9px;background:${rowBg};color:${pal.bodyText};">&nbsp;</td>
      <td style="border:1px solid ${pal.borderColor};padding:5px 6px;font-size:9px;text-align:center;background:${rowBg};color:${pal.bodyText};">&nbsp;</td>
      <td style="border:1px solid ${pal.borderColor};padding:5px 6px;font-size:9px;text-align:right;background:${rowBg};color:${pal.bodyText};">&nbsp;</td>
      <td style="border:1px solid ${pal.borderColor};padding:5px 6px;font-size:9px;text-align:center;background:${rowBg};color:${pal.bodyText};">&nbsp;</td>
      <td style="border:1px solid ${pal.borderColor};padding:5px 6px;font-size:9px;text-align:right;background:${rowBg};font-weight:bold;color:${pal.primary};">&nbsp;</td>
    </tr>`;
  }

  const cell = `border:1px solid ${pal.borderColor};padding:5px 6px;font-size:9px;background:${rowBg};color:${pal.bodyText};`;
  // const isArchival = (item.task_type || "archival") === "archival";
  // const rawQty = parseFloat(item.qty || item.area || 0);
  // console.log("item  renderProductRow ",item)

  return `<tr>
    <td style="${cell}text-align:center;">${rowIndex + 1}</td>
    <td style="${cell}">${item.item || "—"}</td>
    <td style="${cell}text-align:center;">${item.unit || "—"}</td>
    <td style="${cell}text-align:right;">₹ ${fmt(parseFloat(item.price) || 0)}</td>
    <td style="${cell}text-align:center;">${item.area || "—"}</td>
    <td style="${cell}text-align:right;font-weight:bold;color:${pal.primary};">₹ ${fmt(item.amount || 0)}</td>
  </tr>`;
}

function renderGroupedProductTable({
  group,
  groupIndex,
  fmt,
  metadata,
  discountEnabled = false,
  discountPct = 0,
  pal,
}) {
  const label = partLabel(groupIndex);
  const isWhitePage = groupIndex % 2 === 0;

  const productRows = group.items
    .map((item, i) => renderProductRow({ item, fmt, rowIndex: i, pal, isWhitePage }))
    .join("");
  const emptyRowCount = Math.max(0, 4 - group.items.length);
  const emptyRows = Array.from({ length: emptyRowCount })
    .map((_, i) =>
      renderProductRow({
        item: {},
        fmt,
        rowIndex: group.items.length + i,
        pal,
        isWhitePage,
      }),
    )
    .join("");
  const finalProductRows = productRows + emptyRows;

  const parsedMetadata = parseJsonData(metadata);
  const firstItem = group.items[0];
  const cgst_pct = parseFloat(firstItem.cgst_pct) || 0;
  const sgst_pct = parseFloat(firstItem.sgst_pct) || 0;
  const igst_pct = parseFloat(firstItem.igst_pct) || 0;

  const groupBaseTotal = group.items.reduce((s, it) => s + (parseFloat(it.amount) || 0), 0);
  const discAmt = discountEnabled ? (groupBaseTotal * parseFloat(discountPct || 0)) / 100 : 0;
  const afterDisc = groupBaseTotal - discAmt;
  const cgst_amt = (afterDisc * cgst_pct) / 100;
  const sgst_amt = (afterDisc * sgst_pct) / 100;
  const igst_amt = (afterDisc * igst_pct) / 100;
  const groupGstTotal = cgst_amt + sgst_amt + igst_amt;
  const groupTotal = afterDisc + groupGstTotal;

  const fmtPct = (n) => {
    const num = parseFloat(n) || 0;
    return num % 1 === 0 ? num.toString() : parseFloat(num.toFixed(2)).toString();
  };

  const specMap = new Map();
  group.items.forEach((item) => {
    const specs = (item.techSpecs || []).flat();
    const key = JSON.stringify(specs);
    if (!specMap.has(key)) specMap.set(key, specs);
  });
  const groupedSpecs = Array.from(specMap.values()).flat(2);

  const specCellLeft = `background:${pal.primaryLight};padding:4px 6px;border:1px solid ${pal.borderColor};font-weight:600;font-size:9px;color:${pal.labelText};`;
  const specCellRight = `background:#f0f6fc;padding:4px 6px;border:1px solid ${pal.borderColor};font-size:9px;color:${pal.bodyText};`;

  const techSpecRows = groupedSpecs
    .map(
      (s, i) => `
    <tr>
      <td style="${specCellLeft}">${i + 1}</td>
      <td colspan="5" style="${specCellRight}">${s}</td>
    </tr>`,
    )
    .join("");

  const gstRows = [
    `<tr style="background:${pal.subTotalBg};">
      <td colspan="5" style="border:1px solid ${pal.borderColor};padding:3px 6px;font-size:9px;text-align:right;color:${pal.labelText};">Sub Total</td>
      <td style="border:1px solid ${pal.borderColor};padding:3px 6px;font-size:9px;text-align:right;font-weight:bold;color:${pal.labelText};">₹ ${fmt(groupBaseTotal)}</td>
    </tr>`,
    cgst_pct > 0
      ? `<tr style="background:${pal.gstBand};">
      <td colspan="5" style="border:1px solid ${pal.borderColor};padding:3px 6px;font-size:9px;text-align:right;color:#7a6000;">CGST @ <strong style="color:#c47a00;">${fmtPct(cgst_pct)}%</strong> on ₹${fmt(afterDisc)}</td>
      <td style="border:1px solid ${pal.borderColor};padding:3px 6px;font-size:9px;text-align:right;font-weight:bold;color:#9a5000;">₹ ${fmt(cgst_amt)}</td>
    </tr>`
      : "",
    sgst_pct > 0
      ? `<tr style="background:${pal.gstBand};">
      <td colspan="5" style="border:1px solid ${pal.borderColor};padding:3px 6px;font-size:9px;text-align:right;color:#7a6000;">SGST @ <strong style="color:#c47a00;">${fmtPct(sgst_pct)}%</strong> on ₹${fmt(afterDisc)}</td>
      <td style="border:1px solid ${pal.borderColor};padding:3px 6px;font-size:9px;text-align:right;font-weight:bold;color:#9a5000;">₹ ${fmt(sgst_amt)}</td>
    </tr>`
      : "",
    igst_pct > 0
      ? `<tr style="background:${pal.gstBand};">
      <td colspan="5" style="border:1px solid ${pal.borderColor};padding:3px 6px;font-size:9px;text-align:right;color:#7a6000;">IGST @ <strong style="color:#c47a00;">${fmtPct(igst_pct)}%</strong> on ₹${fmt(afterDisc)}</td>
      <td style="border:1px solid ${pal.borderColor};padding:3px 6px;font-size:9px;text-align:right;font-weight:bold;color:#9a5000;">₹ ${fmt(igst_amt)}</td>
    </tr>`
      : "",
  ]
    .filter(Boolean)
    .join("");

  const discRow =
    discountEnabled && discAmt > 0
      ? `<tr style="background:#fffbea;">
    <td colspan="5" style="border:1px solid ${pal.borderColor};padding:3px 6px;font-size:9px;text-align:right;color:#92400e;">Discount @ <strong>${fmtPct(discountPct)}%</strong></td>
    <td style="border:1px solid ${pal.borderColor};padding:3px 6px;font-size:9px;text-align:right;font-weight:bold;color:#92400e;">− ₹ ${fmt(discAmt)}</td>
  </tr>`
      : "";

  const totalCell = `border:1px solid ${pal.borderColor};padding:5px 6px;font-size:9px;font-weight:bold;text-align:right;`;

  const groupTotalRow = `
    ${discRow}
    ${gstRows}
    <tr style="background:${pal.totalRowBg};">
      <td colspan="5" style="${totalCell}">Total (incl. GST${discountEnabled && discAmt > 0 ? " & Discount" : ""})</td>
      <td style="${totalCell}">₹ ${fmt(groupTotal)}</td>
    </tr>`;

  const thStyle = `border:1px solid ${pal.borderColor};padding:5px 6px;font-size:9px;font-weight:bold;color:${pal.fromLabelColor};background:${pal.primaryLight};`;

  return `
  <div style="margin-bottom:10px;page-break-inside:avoid;font-family:Arial,sans-serif;">
    <div style="background:${pal.specHeaderBg};color:${pal.specHeaderTxt};font-size:9px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;padding:4px 10px;border:1px solid ${pal.borderColor};border-bottom:none;">PART ${label}</div>
    <table style="width:100%;border-collapse:collapse;border:1px solid ${pal.borderColor};border-top:none;table-layout:fixed;">
      <thead>
        <tr>
          <td style="${thStyle}width:5%;text-align:center;">Sr.</td>
          <th style="${thStyle}width:36%;text-align:left;">Description</th>
          <th style="${thStyle}width:12%;text-align:center;">Unit</th>
          <th style="${thStyle}width:18%;text-align:right;">Rate (₹)</th>
          <th style="${thStyle}width:14%;text-align:center;">Qty sq.km</th>
          <th style="${thStyle}width:20%;text-align:right;">Amount (₹)</th>
        </tr>
      </thead>
      <tbody>${finalProductRows}</tbody>
    </table>
    <table style="width:100%;border-collapse:collapse;border:1px solid ${pal.borderColor};border-top:none;table-layout:fixed;">
      <thead>
        <tr>
          <td style="background:${pal.specHeaderBg};color:${pal.specHeaderTxt};font-weight:bold;font-size:9px;padding:4px 6px;border:1px solid ${pal.borderColor};border-top:none;width:5%;">Sr.</td>
          <td colspan="5" style="background:${pal.specHeaderBg};color:${pal.specHeaderTxt};font-weight:bold;font-size:9px;padding:4px 6px;border:1px solid ${pal.borderColor};border-top:none;">Technical Specifications</td>
        </tr>
      </thead>
      <tbody>${techSpecRows}</tbody>
    </table>
    <table style="width:100%;border-collapse:collapse;border:1px solid ${pal.borderColor};border-top:none;table-layout:fixed;">
      <thead>
        <tr>
          <td colspan="6" style="background:${pal.specHeaderBg};color:${pal.specHeaderTxt};font-weight:bold;font-size:9px;padding:4px 6px;border:1px solid ${pal.borderColor};">GST Calculation</td>
        </tr>
      </thead>
      <tbody>${groupTotalRow}</tbody>
    </table>
    <div style="font-size:8.5px;padding:5px 8px;background:#fff7d6;border:1px solid #f2d58a;border-top:none;color:${pal.bodyText};">* Minimum order size for 50cm Archive Data is 25 sq.km with 2Km width.</div>
  </div>`;
}

const renderSpecTable = (entry) => `
  <div class="ts-entry">
    ${
      entry.image_url
        ? `<img class="ts-image" src="${entry.image_url}" alt="${entry.caption || "Technical Specification"}" />`
        : `<div class="ts-text">No Image Available</div>`
    }
  </div>`;

const A4_PX = 1123;
const FOOTER_H = 80;

export function buildPreviewHTML({
  quote_no,
  reference_no,
  reference_date,
  to_company,
  receiver_company_authorized_person = "",
  receiver_company_email = "admin@gmail.com",
  authorized_name,
  delivery,
  incoterms,
  payment,
  purchase_order,
  validity,
  items,
  extraImages = [],
  logoBase64 = null,
  from_company,
  from_company_email = "",
  from_company_authorized_person = "",
  from_company_authorized_person_designation = "",
  from_company_address = "",
  metadata = {},
  techspecimage = [],
  verified = true,
  discountEnabled = false,
  discountPct = 0,
  address_line_1 = "",
  address_line_2 = "",
  city = "",
  state = "",
  country = "",
  postal_code = "",
  date,
  enableborder = true,
  terms_and_specifications,
}) {
  const pal = getCompanyPalette(from_company);

  const fmt = (n) =>
    (typeof n === "number" ? n : parseFloat(n) || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const tsEntries = Array.isArray(techspecimage) ? techspecimage : [];
  const headerSrc = logoBase64 || getHeaderImage(from_company);
  const footerSrc = getFooterImage(from_company);
  const companyDetails = getCompanyDetails(from_company);
  const signSrc = companyDetails?.sign ?? sign1;
  const stampSrc = companyDetails?.stamp ?? stamp1;

  const sharedHeaderHTML = `<img src="${headerSrc}" style="width:100%;max-width:100%;display:block;height:auto;" alt="${from_company || "Company"}" />`;

  const quoteStrip = `<div style="background:${pal.stripBg};color:${pal.stripTxt};font-size:9px;padding:3px 10px;margin-bottom:6px;border:1px solid ${pal.primary};"><strong>Quote No:&nbsp;</strong>${quote_no || "—"}</div>`;

  const pageTop = sharedHeaderHTML + quoteStrip;

  const footerImgHTML = `
  <img 
    src="${footerSrc}" 
    style="width:100%;max-width:600px;height:150px;object-fit:contain;display:block;margin:0 auto;" 
    alt="${from_company || "Company"}" 
  />
`;

  const CompanyAddress = from_company_address || getaddress(from_company);
  const CompanyAuthPerson = from_company_authorized_person || getauthorizedPerson(from_company);
  const CompanyAuthDesig =
    from_company_authorized_person_designation || getauthorizedPersonDesignation(from_company);
  const Companymail = from_company_email || getcompanyemail(from_company);

  const addrParts = [address_line_1, address_line_2, city, state, postal_code, country].filter(
    Boolean,
  );
  const addressLine = addrParts.join(", ");

  // ── Signature block ────────────────────────────────────────────────────────
  const getSignatureBlock = (from_company, authorized_name, signSrc, stampSrc, pal) => {
    const company = (from_company || "").toUpperCase();
    const cleanName = (authorized_name || "").trim();

    const signBlock = `
      <div style="position:relative;display:inline-block;width:150px;height:75px;margin:3px 0;">
        <img src="${signSrc}" alt="Signature" style="position:absolute;top:0;left:0;width:150px;height:75px;object-fit:contain;" />
        <img src="${stampSrc}" alt="Stamp" style="position:absolute;top:-8px;left:35px;transform:translateX(-50%);width:90px;height:90px;object-fit:contain;opacity:0.88;mix-blend-mode:multiply;" />
      </div>`;

    if (company.includes("MICRONET SPACETECH DWC-LLC")) {
      return `
      <div style="display:flex;flex-direction:column;align-items:flex-start;gap:1px;">
        ${signBlock}
        ${cleanName ? `<div style="color:${pal.forNameColor};font-weight:600;font-size:9px;">${cleanName}</div>` : ""}
        <div style="color:${pal.mutedText};font-size:9px;">Authorised Signatory</div>
      </div>`;
    }

    return `
    <div style="display:flex;flex-direction:column;align-items:flex-start;gap:1px;">
      ${signBlock}
      <div style="color:${pal.mutedText};font-size:9px;">Authorised Signatory</div>
      ${cleanName ? `<div style="color:${pal.forNameColor};font-weight:600;font-size:9px;">(${cleanName})</div>` : ""}
    </div>`;
  };

  const displaySign = verified
    ? `<td style="padding:8px 14px 10px;text-align:left;vertical-align:bottom;">
        <div style="font-weight:bold;color:${pal.forNameColor};font-size:10px;margin-bottom:2px;">FOR ${from_company}</div>
        ${getSignatureBlock(from_company, authorized_name, signSrc, stampSrc, pal)}
      </td>`
    : `<td style="padding:8px 14px 10px;color:#aaa;font-style:italic;font-size:9px;vertical-align:bottom;">
        Signature will be provided after order confirmation.
      </td>`;

  const groups = groupItems(items);
  const groupHTMLs = groups.map((group, i) =>
    renderGroupedProductTable({
      group,
      groupIndex: i,
      fmt,
      metadata,
      discountEnabled,
      discountPct,
      pal,
    }),
  );

  // ── TO company block ───────────────────────────────────────────────────────
  const Tocompany = `
    <div style="font-weight:600;font-size:9px;color:${pal.bodyText};">${to_company || "—"}</div>
    ${receiver_company_authorized_person ? `<div style="font-size:8.5px;color:${pal.bodyText};margin-top:1px;">${receiver_company_authorized_person}${receiver_company_email ? `<br/><span style="color:${pal.primary};">${receiver_company_email}</span>` : ""}</div>` : ""}
    ${addressLine ? `<div style="font-size:8.5px;color:${pal.mutedText};margin-top:2px;line-height:1.4;">${addressLine}</div>` : ""}`;

  const tcRows = terms_and_specifications
    .map(
      (row, i) => `
    <tr>
      <td class="tc-no">${i + 1}</td>
      <td class="tc-text">${row.label ? `<strong>${row.label}:</strong> ` : ""}${row.text}</td>
    </tr>`,
    )
    .join("");

  const page1GroupHTML = groupHTMLs.length > 0 ? groupHTMLs[0] : "";
  const extraGroupPages = groupHTMLs
    .slice(1)
    .map((html, i) => {
      const groupIdx = i + 1;
      return `
    <div class="page page-break" id="page-group-${groupIdx + 1}" style="position:relative;min-height:${A4_PX}px;padding-bottom:${FOOTER_H + 12}px;">
      ${pageTop}
      <div style="padding:0 0 4px 0;">${html}</div>
      <div class="page-footer">${footerImgHTML}</div>
    </div>`;
    })
    .join("");

  const isLastGroupOnPage1 = groupHTMLs.length === 1;
  const signRow = `<table style="width:100%;border-collapse:collapse;border-top:1px solid ${pal.borderColor};margin-bottom:8px;"><tr>${displaySign}</tr></table>`;

  const tsPage =
    techspecimage.length > 0
      ? `
    <div class="page page-break" id="page-ts" style="position:relative;min-height:${A4_PX}px;padding-bottom:${FOOTER_H + 12}px;">
      ${pageTop}
      <h2 style="text-align:center;color:${pal.primary};font-size:14px;font-weight:800;margin:10px 0;padding-bottom:5px;border-bottom:2px solid ${pal.primary};text-transform:uppercase;letter-spacing:1px;">Technical Specification</h2>
      <div style="padding:8px 12px;">
        ${tsEntries.map(renderSpecTable).join("")}
      </div>
      <div class="page-footer">${footerImgHTML}</div>
    </div>`
      : "";

  const imagePages = extraImages.length
    ? extraImages
        .map((img, idx) => {
          const hasKml = !!(img.kml_download_url || img.kml_url || img.supportingfile);
          const downloadHref = img.kml_download_url || img.kml_url || null;
          const ext = img.attachment_type === "html" ? "html" : "kml";
          const kmlName = img.caption
            ? `${img.caption.replace(/\s+/g, "_")}.${ext}`
            : `area_${idx + 1}.${ext}`;

          // const kmlBlock =
          //   hasKml && downloadHref
          //     ? `<div style="margin:6px 0;background:#e8f7f0;border:1px solid #6fcfa4;border-radius:4px;padding:7px 10px;">
          //     <div style="font-size:9px;font-weight:bold;color:#0d6e49;margin-bottom:3px;">${img.attachment_type === "html" ? "HTML" : "KML / KMZ"} Area File: ${kmlName}</div>
          //     <div style="font-size:7.5px;color:#888;margin-top:2px;">Copy the link above in your browser to download the file</div>
          //     <a href="${downloadHref}" target="_blank" class="kml-btn" style="display:inline-block;margin-top:5px;background:#1a9e6e;color:#fff;font-size:9px;font-weight:bold;padding:3px 10px;border-radius:3px;text-decoration:none;">↓ Download ${img.attachment_type === "html" ? "HTML" : "KML"}</a>
          //   </div>`
          //     : hasKml && !downloadHref
          //       ? `<div style="margin:6px 0;background:#fff8e1;border:1px solid #ffe082;border-radius:4px;padding:6px 10px;font-size:9px;color:#888;">⚠ ${ext.toUpperCase()} file attached — submit quotation to enable download link.</div>`
          //       : "";
          const kmlBlock =
            hasKml && downloadHref
              ? `
    <div style="margin:6px 0;background:#e8f7f0;border:1px solid #6fcfa4;border-radius:4px;padding:7px 10px;">

      <div style="font-size:9px;font-weight:bold;color:#0d6e49;margin-bottom:4px;">
        ${img.attachment_type === "html" ? "HTML" : "KML / KMZ"} Area File: ${kmlName}
      </div>

      <a href="${downloadHref}"
         style="display:inline-block;background:#1a9e6e;color:#fff;font-size:9px;font-weight:bold;padding:4px 10px;border-radius:3px;text-decoration:none;">
        ↓ Download ${img.attachment_type === "html" ? "HTML" : "KML"}
      </a>

    </div>
    `
              : hasKml && !downloadHref
                ? `<div style="margin:6px 0;background:#fff8e1;border:1px solid #ffe082;border-radius:4px;padding:6px 10px;font-size:9px;color:#888;">
          ⚠ ${ext.toUpperCase()} file attached — submit quotation to enable download link.
        </div>`
                : "";

          const getAttachmentBlock = (file, label, type, imageId) => {
            if (!file?.url) return "";
            const fileName = file.url.split("/").pop()?.split("?")[0] || `file.${type}`;

            // Use dedicated download endpoint to force download instead of browser render
            const forceDownloadUrl = `${BASE_URL}/images/${imageId}/download-html/`;

            return `
<div style="margin:6px 0;background:#e8f7f0;border:1px solid #6fcfa4;border-radius:4px;padding:7px 10px;">
  <div style="font-size:9px;font-weight:bold;color:#0d6e49;margin-bottom:4px;">${label}: ${fileName}</div>
  <a href="${forceDownloadUrl}"
     target="_blank"
     style="display:inline-block;background:#1a9e6e;color:#fff;font-size:9px;font-weight:bold;padding:4px 10px;border-radius:3px;text-decoration:none;">
    ↓ Download ${type.toUpperCase()}
  </a>
</div>`;
          };

          // Call it with imageId:
          const htmlBlock = getAttachmentBlock(img.html_file, "HTML Area File", "html", img.id);

          return `
        <div class="page page-break" id="page-img-${idx + 1}" style="position:relative;min-height:${A4_PX}px;padding-bottom:${FOOTER_H + 12}px;">
          ${pageTop}
          <div style="padding:8px 0;display:flex;flex-direction:column;align-items:center;">
            <img src="${img.dataUrl}" alt="${img.caption || `Image ${idx + 1}`}" style="width:100%;height:460px;object-fit:contain;display:block;border:1px solid ${pal.borderColor};border-radius:4px;" />
          </div>
          ${img.caption ? `<div style="margin-top:5px;font-size:10px;font-weight:600;color:${pal.primary};text-align:center;padding:4px 8px;background:#f0f7ff;border:1px solid ${pal.borderColor};border-radius:3px;">${img.caption}</div>` : ""}
          ${kmlBlock}
          ${htmlBlock}
          <div class="page-footer">${footerImgHTML}</div>
        </div>`;
        })
        .join("")
    : `<div class="page page-break" id="page-img-empty" style="position:relative;min-height:${A4_PX}px;padding-bottom:${FOOTER_H + 12}px;">
        ${pageTop}
        <div style="background:${pal.specHeaderBg};color:${pal.specHeaderTxt};font-size:11px;font-weight:bold;letter-spacing:1px;text-align:center;padding:5px 18px;text-transform:uppercase;border:1px solid ${pal.borderColor};">Supporting Images / Annexure</div>
        <div style="width:100%;text-align:center;color:#aaa;font-size:12px;padding:50px 0;">No images attached to this quotation.</div>
        <div class="page-footer">${footerImgHTML}</div>
      </div>`;

  // ── RIGHT column: fixed row height so rows align with left divider ─────────
  // Each right-side row = 22px. FROM block (company+contact+address+email) ≈ 3 rows = 66px.
  // Divider appears after row 3 (Delivery). So TO: starts at row 4 (Incoterms) ✅
  const ROW_H = "22px";
  const labelTd = `font-size:8px;padding:1px 4px;font-weight:600;color:${pal.labelText};border-right:1px solid ${pal.borderColor};border-bottom:1px solid ${pal.borderColor};width:38%;height:${ROW_H};text-align:start;vertical-align:middle;`;
  const valueTd = `font-size:8px;padding:1px 4px;color:${pal.bodyText};border-bottom:1px solid ${pal.borderColor};height:${ROW_H};text-align:start;vertical-align:middle;`;
  // Incoterms row gets the highlight to visually mark the FROM/TO boundary
  const incoLabelTd = `font-size:8px;padding:2px 7px;font-weight:700;color:${pal.labelText};border-right:1px solid ${pal.borderColor};border-bottom:1px solid ${pal.borderColor};width:38%;height:${ROW_H};background:${pal.primaryLight};`;
  const incoValueTd = `font-size:8px;padding:2px 7px;font-weight:600;color:${pal.bodyText};border-bottom:1px solid ${pal.borderColor};height:${ROW_H};background:${pal.primaryLight};`;

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/>
  <style>
    * { box-sizing:border-box; margin:0; padding:0; }
    body { font-family:Arial,sans-serif; background:#e8e8e8; font-size:11px; color:${pal.bodyText}; }

    .page {
      width:794px;
      margin:10px auto;
      background:#fff;
      border:2px solid ${pal.borderColor};
      padding:10px 28px;
      position:relative;
    }

    #page-1 {
      min-height:${A4_PX}px;
      padding-bottom:${FOOTER_H + 16}px;
      display:flex;
      flex-direction:column;
    }

    .page-1-body { flex:1 1 auto; }

    #page-2 {
      min-height:${A4_PX}px;
      padding-bottom:${FOOTER_H + 12}px;
    }

    .page-footer {
      position:absolute;
      bottom:10px;
      left:28px;
      right:28px;
    }

    .p2-tc-title { background:${pal.tcHeaderBg}; color:${pal.tcHeaderTxt}; font-size:11px; font-weight:bold; letter-spacing:1px; text-align:center; padding:5px 18px; text-transform:uppercase; border:1px solid ${pal.borderColor}; }
    .p2-tc-table { width:100%; border-collapse:collapse; border:1px solid ${pal.borderColor}; }
    .p2-tc-table tr:nth-child(odd) td { background:#f5faff; }
    .p2-tc-table tr:nth-child(even) td { background:#fff; }
    .p2-tc-table tr:last-child td { border-bottom:none; }
    .tc-no { width:28px; text-align:center; font-weight:bold; font-size:9px; color:${pal.tcNoColor}; border-right:2px solid ${pal.borderColor}; border-bottom:1px solid ${pal.borderColor}; padding:4px 3px; vertical-align:top; }
    .tc-text { font-size:9.5px; line-height:1.5; color:${pal.bodyText}; padding:5px 10px; border-bottom:1px solid ${pal.borderColor}; vertical-align:top; }
    .tc-text strong { color:${pal.tcStrongColor}; }

    .ts-entry { display:flex; flex-direction:column; align-items:center; width:100%; page-break-inside:avoid; }
    .ts-image { width:700px; max-width:100%; height:450px; object-fit:contain; display:block; }
    .ts-text { width:700px; max-width:100%; height:380px; display:flex; align-items:center; justify-content:center; border:1.5px dashed #ccc; border-radius:4px; color:#aaa; font-size:11px; font-style:italic; }

    .page-break { page-break-before:always; }

    @media print {
      body { margin:0; padding:0; background:#fff; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
      .page { border:none; margin:0; width:100%; }
      a[href]::after { content:none; }
      .kml-btn { display:none !important; }
      .ts-image { width:700px !important; max-width:100% !important; height:380px !important; object-fit:contain !important; }
      .ts-entry { page-break-inside:avoid; }
    }
  </style>
  </head><body>

  <!-- ═══ PAGE 1 ═══ -->
  <div class="page" id="page-1">
    <div class="page-1-body">
      ${sharedHeaderHTML}
      ${quoteStrip}

      <!-- FROM / TO + Quote Details — pure table, no flex -->
      <table style="width:100%;border-collapse:collapse;border:1px solid ${pal.borderColor};table-layout:fixed;margin-bottom:6px;">
        <tr>

          <!-- ── LEFT: FROM then divider then TO ── -->
          <td style="width:46%;border-right:1px solid ${pal.borderColor};padding:0;vertical-align:top;">

            <!-- FROM block -->
            <div style="padding:5px 8px 4px 8px;">
              <div style="font-size:8.5px;font-weight:bold;color:${pal.fromLabelColor};margin-bottom:2px;">FROM:</div>
              <div style="font-weight:600;font-size:8.5px;color:${pal.bodyText};margin-bottom:1px;">${from_company}</div>
              ${CompanyAuthPerson ? `<div style="font-size:8px;color:${pal.mutedText};margin-bottom:1px;">Contact: ${CompanyAuthPerson}${CompanyAuthDesig ? ` (${CompanyAuthDesig})` : ""}</div>` : ""}
              ${CompanyAddress ? `<div style="font-size:8px;color:${pal.mutedText};margin-bottom:1px;">${CompanyAddress}</div>` : ""}
              ${Companymail ? `<div style="font-size:8px;color:${pal.primary};">${Companymail}</div>` : ""}
            </div>

            <!-- Divider — visually aligns with Incoterms row on the right -->
            <div style="height:1px;background:${pal.borderColor};width:100%;"></div>

            <!-- TO block -->
            <div style="padding:5px 8px 5px 8px;">
              <div style="font-size:8.5px;font-weight:bold;color:${pal.fromLabelColor};margin-bottom:2px;">TO:</div>
              <div style="font-size:8.5px;color:${pal.bodyText};">${Tocompany}</div>
            </div>

          </td>

          <!-- ── RIGHT: Quote details with fixed-height rows ── -->
          <td style="width:54%;padding:0;vertical-align:top;">
  <table style="width:100%;border-collapse:collapse;table-layout:fixed;">

    <tr>
      <td style="${labelTd}">Quote No</td>
      <td style="${valueTd}">${quote_no}</td>
    </tr>

    <tr>
      <td style="${labelTd}">Date</td>
      <td style="${valueTd}">${date}</td>
    </tr>

    <tr>
      <td style="${labelTd}">Delivery</td>
      <td style="${valueTd}">${delivery}</td>
    </tr>

    <tr>
      <td style="${labelTd}">Incoterms</td>
      <td style="${valueTd}">${incoterms}</td>
    </tr>

    <tr>
      <td style="${labelTd}">Payment</td>
      <td style="${valueTd}">${payment}</td>
    </tr>

    <tr>
      <td style="${labelTd}">Purchase Order</td>
      <td style="${valueTd}">${purchase_order}</td>
    </tr>

    <tr>
      <td style="${labelTd}">Ref No</td>
      <td style="${valueTd}">${reference_no}</td>
    </tr>

    <tr>
      <td style="${labelTd}">Reference Date</td>
      <td style="${valueTd}">${reference_date}</td>
    </tr>

    <tr>
      <td style="${labelTd}">Validity</td>
      <td style="${valueTd}">${validity}</td>
    </tr>

  </table>
</td>

        </tr>
      </table>

      <div style="margin-top:2px;">${page1GroupHTML}</div>
    </div>

    <!-- Sign row sits between body and footer — NOT inside either -->
    ${isLastGroupOnPage1 ? signRow : ""}

    <div class="page-footer">${footerImgHTML}</div>
  </div>

  <!-- ═══ Extra group pages ═══ -->
  ${extraGroupPages}

  ${
    groupHTMLs.length > 1
      ? `
  <script>
    (function() {
      var pages = document.querySelectorAll('[id^="page-group-"]');
      if (!pages.length) return;
      var last = pages[pages.length - 1];
      var footer = last.querySelector('.page-footer');
      if (!footer) return;
      var sign = document.createElement('div');
      sign.innerHTML = \`${signRow.replace(/`/g, "\\`")}\`;
      footer.insertBefore(sign.firstChild, footer.firstChild);
    })();
  </script>`
      : ""
  }

  <!-- ═══ PAGE 2: Terms & Conditions ═══ -->
  <div class="page page-break" id="page-2">
    ${pageTop}
    <div style="margin-top:8px;">
      <div class="p2-tc-title">Terms &amp; Conditions</div>
      <table class="p2-tc-table">
        <thead><tr>
          <td class="tc-no" style="background:${pal.tcHeaderBg};color:${pal.tcHeaderTxt};font-size:9px;font-weight:bold;border-bottom:2px solid ${pal.borderColor};">Sr.</td>
          <td class="tc-text" style="background:${pal.tcHeaderBg};color:${pal.tcHeaderTxt};font-size:9px;font-weight:bold;border-bottom:2px solid ${pal.borderColor};">Details</td>
        </tr></thead>
        <tbody>${tcRows}</tbody>
      </table>
    </div>
    <div class="page-footer">${footerImgHTML}</div>
  </div>

  ${tsPage}
  ${imagePages}

  </body></html>`;
}
