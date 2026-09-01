import { FiTrash2, FiPlus, FiChevronDown, FiChevronUp } from "react-icons/fi";
import { useState } from "react";
import { formatDateRange, formatRangeDisplay } from "../../assets/preview/Preview";
import { getSpectralProcessing } from "../../Shared/Product";
import { UNITS } from "../../Shared/Quotation";
import { GeometricProcessing } from "../../Shared/Product";

interface GroupedProductEntryUpdateProps {
  description: string;
  groupIndices: string;
  groupNumber: string;
  fmt: string;
  cgst_pct: string;
  sgst_pct: string;
  igst_pct: string;
  discountEnabled: number;
  discountPct: number;
  minArchivalArea: string;
  onUpdateRow: () => void;
  onRemoveRow: () => void;
  onAddToGroup: () => void;
}

const cls =
  "w-full rounded border border-light-300 bg-white px-2 py-1 text-[11px] focus:outline-none focus:ring-1 focus:ring-primary-400";

const Archivalortasking = [
  { label: "Archival", value: "archival" },
  { label: "Tasking", value: "tasking" },
];

const MIN_ARCHIVAL_AREA = 25;

export function buildGroupKeyUpdate(item) {
  // techSpecs intentionally excluded: they don't define group identity.
  // Including them caused remount on every spec edit → openSpecs panel closed.
  return [
    item.cloud_cover ?? "",
    item.angle ?? "",
    item.date ?? "",
    item.task_type ?? "",
    item.geometricprocessing ?? "",
    item.spectralbands ?? "",
  ].join("|");
}

function recalcItem(item, cgst_pct, sgst_pct, igst_pct, discountPct = 0, discountEnabled = false) {
  const area = parseFloat(item.area ?? item.qty) || 0;
  const price = parseFloat(item.price) || 0;
  const amount = area * price;
  const discAmt = discountEnabled ? (amount * parseFloat(discountPct || 0)) / 100 : 0;
  const baseAfterDisc = amount - discAmt;
  const cgst_amt = (baseAfterDisc * (parseFloat(cgst_pct) || 0)) / 100;
  const sgst_amt = (baseAfterDisc * (parseFloat(sgst_pct) || 0)) / 100;
  const igst_amt = (baseAfterDisc * (parseFloat(igst_pct) || 0)) / 100;
  const total = baseAfterDisc + cgst_amt + sgst_amt + igst_amt;
  return { amount, discAmt, cgst_amt, sgst_amt, igst_amt, total };
}

// ─────────────────────────────────────────────────────────────────────────────
const GroupedProductEntryUpdate = ({
  description,
  groupIndices,
  groupNumber,
  fmt,
  cgst_pct: propCgst = 9,
  sgst_pct: propSgst = 9,
  igst_pct: propIgst = 0,
  discountEnabled = false,
  discountPct = 0,
  minArchivalArea = MIN_ARCHIVAL_AREA,
  onUpdateRow,
  onRemoveRow,
  onAddToGroup,
}) => {
  const [openSpecs, setOpenSpecs] = useState<any>({});
  const toggleSpec = (idx) => setOpenSpecs((p) => ({ ...p, [idx]: !p[idx] }));

  const fmtFn =
    fmt ??
    ((n) =>
      (parseFloat(n) || 0).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
      }));

  const rep = description[groupIndices[0]];
  if (!rep) return null;

  const cgst_pct = parseFloat(rep.cgst_pct ?? propCgst);
  const sgst_pct = parseFloat(rep.sgst_pct ?? propSgst);
  const igst_pct = parseFloat(rep.igst_pct ?? propIgst);

  const isArchival = (rep.task_type || "archival").toLowerCase() === "archival";

  const cloudVal = rep.cloud_cover;
  const angleVal = rep.angle;

  const cloudDisplay = (() => {
    if (!cloudVal) return "—";
    const parsed = Array.isArray(cloudVal) ? cloudVal : String(cloudVal).split("-").map(Number);
    const max = parseFloat(parsed[parsed.length - 1]);
    return isNaN(max) ? String(cloudVal) : `≤ ${max}%`;
  })();

  const angleDisplay = (() => {
    if (!angleVal) return "—";
    const parsed = Array.isArray(angleVal) ? angleVal : String(angleVal).split("-").map(Number);
    const max = parseFloat(parsed[parsed.length - 1]);
    return isNaN(max) ? String(angleVal) : `≤ ${max}°`;
  })();

  const dateDisplay = formatDateRange(rep.date);

  // ── Totals ────────────────────────────────────────────────────────────────
  const baseTotal = groupIndices.reduce(
    (sum, idx) => sum + (parseFloat(description[idx]?.amount) || 0),
    0,
  );
  const discTotal = discountEnabled ? (baseTotal * parseFloat(discountPct || 0)) / 100 : 0;
  const afterDisc = baseTotal - discTotal;
  const groupCgstAmt = (afterDisc * cgst_pct) / 100;
  const groupSgstAmt = (afterDisc * sgst_pct) / 100;
  const groupIgstAmt = (afterDisc * igst_pct) / 100;
  const groupTotal = afterDisc + groupCgstAmt + groupSgstAmt + groupIgstAmt;

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSharedField = (field, val) => {
    groupIndices.forEach((idx) => onUpdateRow(idx, field, val));
  };

  const handleGSTChange = (field, val) => {
    groupIndices.forEach((idx) => {
      const item = description[idx];
      const updated = { ...item, [field]: val };
      onUpdateRow(idx, field, val);
      const d = recalcItem(
        updated,
        field === "cgst_pct" ? val : (item.cgst_pct ?? cgst_pct),
        field === "sgst_pct" ? val : (item.sgst_pct ?? sgst_pct),
        field === "igst_pct" ? val : (item.igst_pct ?? igst_pct),
        discountPct,
        discountEnabled,
      );
      onUpdateRow(idx, "amount", d.amount);
      onUpdateRow(idx, "cgst_amt", d.cgst_amt);
      onUpdateRow(idx, "sgst_amt", d.sgst_amt);
      onUpdateRow(idx, "igst_amt", d.igst_amt);
      onUpdateRow(idx, "total", d.total);
    });
  };

  const handleItemField = (idx, field, val) => {
    const item = description[idx];
    let finalVal = val;

    if ((field === "area" || field === "qty") && isArchival) {
      const num = parseFloat(val) || 0;
      finalVal = num > 0 ? Math.max(minArchivalArea, num) : num;
    }

    let updated = { ...item, [field]: finalVal };

    if (field === "area") {
      updated.qty = finalVal;
      onUpdateRow(idx, "qty", finalVal);
    }

    if (field === "qty") {
      updated.area = finalVal;
      onUpdateRow(idx, "area", finalVal);
    }

    onUpdateRow(idx, field, finalVal);

    if (["area", "qty", "price"].includes(field)) {
      const d = recalcItem(
        updated,
        item.cgst_pct ?? cgst_pct,
        item.sgst_pct ?? sgst_pct,
        item.igst_pct ?? igst_pct,
        discountPct,
        discountEnabled,
      );

      onUpdateRow(idx, "amount", d.amount);
      onUpdateRow(idx, "total", d.total);
    }
  };

  // ── Tech spec handlers ────────────────────────────────────────────────────
  const techSpecs = rep.techSpecs || [];

  const addTechRow = () => {
    groupIndices.forEach((idx) => {
      const current = description[idx]?.techSpecs || [];
      onUpdateRow(idx, "techSpecs", [...current, ""]);
    });
  };

  const updateTechRow = (specIndex, value) => {
    groupIndices.forEach((idx) => {
      const current = [...(description[idx]?.techSpecs || [])];
      current[specIndex] = value;
      onUpdateRow(idx, "techSpecs", current);
    });
  };

  const removeTechRow = (specIndex) => {
    groupIndices.forEach((idx) => {
      const current = [...(description[idx]?.techSpecs || [])];
      current.splice(specIndex, 1);
      onUpdateRow(idx, "techSpecs", current);
    });
  };

  const addItemToGroup = () => {
    onAddToGroup({
      item: "",
      unit: "Sqkm",
      qty: isArchival ? minArchivalArea : 1,
      area: isArchival ? minArchivalArea : 1,
      price: 0,
      amount: 0,
      cloud_cover: rep.cloud_cover,
      date: rep.date,
      angle: rep.angle,
      task_type: rep.task_type,
      cgst_pct,
      sgst_pct,
      igst_pct,
      cgst_amt: 0,
      sgst_amt: 0,
      igst_amt: 0,
      total: 0,
      geometricprocessing: "",
      spectralbands: "",
      techSpecs: [],
    });
  };

  return (
    <div className="border-light-300 overflow-hidden rounded-lg border text-[11px] shadow-sm">
      {/* ── Group header ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between bg-[#2c6671] px-3.5 py-2 text-white shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold text-white tracking-wide">
            Group {groupNumber}
            <span className="ml-1.5 text-[9px] font-medium text-teal-100/90">
              ({groupIndices.length} item{groupIndices.length !== 1 ? "s" : ""})
            </span>
          </span>
          {cloudVal && (
            <span className="inline-flex items-center gap-1 rounded-full border border-white/25 bg-white/15 px-2.5 py-0.5 text-[9px] font-semibold text-white">
              ☁ Cloud {cloudDisplay}
            </span>
          )}
          {angleVal && (
            <span className="inline-flex items-center gap-1 rounded-full border border-white/25 bg-white/15 px-2.5 py-0.5 text-[9px] font-semibold text-white">
              ⊿ Angle {angleDisplay}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={addItemToGroup}
          className="flex items-center gap-1 rounded border border-white/20 bg-white/15 px-2.5 py-1 text-[10px] font-bold text-white shadow-xs transition-colors hover:bg-white/25 cursor-pointer"
        >
          <FiPlus className="h-3 w-3 stroke-[2.5]" /> Add Item
        </button>
      </div>

      <div className="space-y-2 bg-white px-2.5 py-2">
        {/* ── Shared metadata ───────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-2.5 rounded-lg border border-teal-100 bg-teal-50/40 p-2.5 sm:grid-cols-4">
          <div className="flex flex-col gap-0.5">
            <label className="text-[9px] leading-none font-bold tracking-widest text-[#2c6671] uppercase">
              Task Type
            </label>
            <div className="flex gap-3 pt-0.5">
              {Archivalortasking.map((t) => (
                <label key={t.value} className="flex cursor-pointer items-center gap-1 text-[10px] font-medium text-gray-800">
                  <input
                    type="radio"
                    name={`task_type_group_update_${groupNumber}`}
                    value={t.value}
                    checked={(rep.task_type || "archival").toLowerCase() === t.value}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      handleSharedField("task_type", e.target.value)
                    }
                    className="accent-[#2c6671] h-3 w-3"
                  />
                  {t.label}
                </label>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-0.5">
            <label className="text-[9px] leading-none font-bold tracking-widest text-[#2c6671] uppercase">
              Cloud Cover
            </label>
            <span className="flex items-center gap-1 py-0.5 text-[11px] font-semibold text-gray-800">
              <span className="text-blue-600">☁</span>
              {cloudDisplay}
            </span>
          </div>

          <div className="flex flex-col gap-0.5">
            <label className="text-[9px] leading-none font-bold tracking-widest text-[#2c6671] uppercase">
              Incidence Angle
            </label>
            <span className="flex items-center gap-1 py-0.5 text-[11px] font-semibold text-gray-800">
              <span className="text-purple-600">⊿</span>
              {angleDisplay}
            </span>
          </div>

          <div className="flex flex-col gap-0.5">
            <label className="text-[9px] leading-none font-bold tracking-widest text-[#2c6671] uppercase">
              {rep.task_type?.toLowerCase() === "tasking" ? "Tasking Date" : "Acq. Date"}
            </label>
            {rep.task_type?.toLowerCase() === "tasking" ? (
              <input
                type="date"
                className={cls}
                value={rep.date || ""}
                min={new Date().toISOString().split("T")[0]}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  handleSharedField("date", e.target.value)
                }
              />
            ) : (
              <span className="py-0.5 text-[11px] font-semibold text-gray-800">
                {dateDisplay || "—"}
              </span>
            )}
          </div>
        </div>

        {/* ── Items table ───────────────────────────────────────────────── */}
        <div className="border-light-200 overflow-hidden rounded border">
          {/* Header */}
          <div className="hidden gap-1 border-b border-gray-200 bg-gray-100/90 px-2.5 py-1.5 sm:grid sm:grid-cols-12">
            <span className="col-span-4 text-[9px] font-bold tracking-widest text-gray-700 uppercase">
              # Item Description
            </span>
            <span className="col-span-1 text-[9px] font-bold tracking-widest text-gray-700 uppercase">
              Unit
            </span>
            <span className="col-span-2 text-[9px] font-bold tracking-widest text-gray-700 uppercase">
              Area {isArchival ? `(min ${minArchivalArea})` : "(Sqkm)"}
            </span>
            <span className="col-span-2 text-[9px] font-bold tracking-widest text-gray-700 uppercase">
              Price/Sqkm (₹)
            </span>
            <span className="col-span-2 text-[9px] font-bold tracking-widest text-gray-700 uppercase">
              Amount (₹)
            </span>
            <span className="col-span-1 text-right text-[9px] font-bold tracking-widest text-gray-700 uppercase">
              Del
            </span>
          </div>

          {groupIndices.map((idx, rowNum) => {
            const item = description[idx];
            if (!item) return null;

            const spectralOpts = getSpectralProcessing(item.item);
            const hasGeo = GeometricProcessing && GeometricProcessing.length > 0;
            const rawArea = parseFloat(item.area ?? item.qty ?? 0);
            const areaWarn = isArchival && rawArea > 0 && rawArea < minArchivalArea;
            const areaDisplay = areaWarn ? minArchivalArea : rawArea;
            const isSpecOpen = !!openSpecs[idx];

            // ✅ FIX: sub-row always renders — Tech Spec button is unconditional.
            // Previously the entire sub-row was gated on (hasGeo || spectralOpts),
            // so items without Geo/Spectral options never showed the Tech Spec button.
            // const showSubRow = hasGeo || spectralOpts || true; // always true now

            return (
              <div
                key={idx}
                className={`border-light-100 border-b last:border-b-0 ${rowNum % 2 === 0 ? "bg-white" : "bg-light-50/60"}`}
              >
                {/* Main row */}
                <div className="grid grid-cols-2 items-center gap-1.5 px-2.5 py-2 sm:grid-cols-12 sm:gap-1">
                  <div className="col-span-2 flex items-center gap-1.5 sm:col-span-4">
                    <span className="bg-primary-600 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full text-[8px] font-bold text-white">
                      {rowNum + 1}
                    </span>
                    <input
                      className={cls}
                      value={item.item || ""}
                      placeholder="Product name / description"
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        handleItemField(idx, "item", e.target.value)
                      }
                    />
                  </div>

                  <div className="col-span-1 sm:col-span-1">
                    <select
                      className={cls}
                      value={item.unit || "Sqkm"}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        handleItemField(idx, "unit", e.target.value)
                      }
                    >
                      {UNITS.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-1 space-y-1 sm:col-span-2">
                    <input
                      type="number"
                      min={isArchival ? minArchivalArea : 0}
                      className={`${cls} ${areaWarn ? "border-amber-400 bg-amber-50" : ""}`}
                      value={areaDisplay}
                      placeholder={isArchival ? `Min ${minArchivalArea}` : "0"}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        handleItemField(idx, "area", e.target.value)
                      }
                    />
                    {areaWarn && (
                      <div className="text-[8px] font-semibold text-amber-600">
                        ↳ Will use {minArchivalArea} sqkm
                      </div>
                    )}
                  </div>

                  <div className="col-span-1 sm:col-span-2">
                    <input
                      type="number"
                      min="0"
                      className={cls}
                      value={item.price || 0}
                      placeholder="0.00"
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        handleItemField(idx, "price", e.target.value)
                      }
                    />
                  </div>

                  <div className="col-span-1 sm:col-span-2">
                    <span className="bg-light-100 border-light-200 text-primary-800 block rounded border px-2 py-1 text-right text-[11px] font-semibold tabular-nums">
                      ₹{" "}
                      {fmtFn(
                        areaWarn
                          ? minArchivalArea * (parseFloat(item.price) || 0)
                          : item.amount || 0,
                      )}
                    </span>
                  </div>

                  <div className="col-span-1 flex justify-end sm:col-span-1">
                    <button
                      type="button"
                      onClick={(e: React.MouseEvent<HTMLButtonElement>) => onRemoveRow(idx)}
                      className="bg-light-100 border-light-200 flex items-center justify-center rounded border p-1.5 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-500"
                    >
                      <FiTrash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>

                {/* ── Sub-row: Geo / Spectral / GST / Tech Spec ────────────
                    ✅ FIX: No longer gated on (hasGeo || spectralOpts).
                       Tech Spec button must always be accessible regardless of
                       whether this product has Geo/Spectral options.            */}
                <div className="flex flex-wrap items-center gap-1.5 px-2.5 pb-2">
                  {/* Geo — only shown when GeometricProcessing options exist */}
                  {hasGeo && (
                    <div className="flex items-center gap-1.5 rounded border border-blue-200 bg-blue-50/80 px-2 py-1">
                      <label className="text-[9px] font-bold tracking-widest whitespace-nowrap text-blue-700 uppercase">
                        Geo.
                      </label>
                      <select
                        className="border-light-300 w-32 rounded border bg-white px-1.5 py-0.5 text-[11px] font-medium text-gray-800 focus:ring-1 focus:ring-blue-400 focus:outline-none"
                        value={item.geometricprocessing || ""}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          handleItemField(idx, "geometricprocessing", e.target.value)
                        }
                      >
                        <option value="" disabled>
                          Select
                        </option>
                        {GeometricProcessing.map((gp, i) => (
                          <option key={i} value={gp.Value}>
                            {gp.Label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Spectral — only shown when this product has spectral options */}
                  {spectralOpts && (
                    <div className="flex items-center gap-1.5 rounded border border-violet-200 bg-violet-50/80 px-2 py-1">
                      <label className="text-[9px] font-bold tracking-widest whitespace-nowrap text-violet-700 uppercase">
                        Spectral
                      </label>
                      <select
                        className="border-light-300 w-32 rounded border bg-white px-1.5 py-0.5 text-[11px] font-medium text-gray-800 focus:ring-1 focus:ring-violet-400 focus:outline-none"
                        value={item.spectralbands || ""}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          handleItemField(idx, "spectralbands", e.target.value)
                        }
                      >
                        <option value="" disabled>
                          Select
                        </option>
                        {spectralOpts.values.map((sp) => (
                          <option key={sp.id} value={sp.id}>
                            {sp.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Divider — only shown when Geo or Spectral is present */}
                  {(hasGeo || spectralOpts) && <div className="bg-light-200 mx-0.5 h-5 w-px" />}

                  {/* GST fields — always shown */}
                  {[
                    { key: "cgst_pct", label: "CGST", val: cgst_pct },
                    { key: "sgst_pct", label: "SGST", val: sgst_pct },
                    { key: "igst_pct", label: "IGST", val: igst_pct },
                  ].map(({ key, label, val }) => (
                    <div
                      key={key}
                      className="border-teal-200 bg-teal-50/70 flex items-center gap-1 rounded border px-2 py-1"
                    >
                      <label className="text-[9px] font-bold tracking-widest whitespace-nowrap text-[#2c6671] uppercase">
                        {label}%
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        className="border-light-300 focus:ring-primary-400 w-10 rounded border bg-white px-1 py-0.5 text-center text-[11px] font-semibold text-gray-800 focus:ring-1 focus:outline-none"
                        value={val}
                        placeholder="0"
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          handleGSTChange(key, e.target.value)
                        }
                      />
                    </div>
                  ))}

                  <div className="bg-light-200 mx-0.5 h-5 w-px" />

                  {/* ✅ Tech Spec toggle — ALWAYS rendered, no longer inside (hasGeo || spectralOpts) guard */}
                  <button
                    type="button"
                    onClick={(e: React.MouseEvent<HTMLButtonElement>) => toggleSpec(idx)}
                    className={`flex items-center gap-1 rounded border px-2 py-1 text-[9px] font-bold tracking-widest uppercase transition-colors cursor-pointer ${
                      isSpecOpen
                        ? "border-emerald-300 bg-emerald-100 text-emerald-800"
                        : "border-gray-300 bg-gray-50 text-gray-700 hover:border-emerald-300 hover:text-emerald-700"
                    }`}
                  >
                    {isSpecOpen ? (
                      <FiChevronUp className="h-3 w-3" />
                    ) : (
                      <FiChevronDown className="h-3 w-3" />
                    )}
                    Tech Spec
                    {techSpecs.length > 0 && (
                      <span className="ml-1 rounded-full bg-emerald-600 px-1.5 py-0.5 text-[8px] leading-none font-bold text-white">
                        {techSpecs.length}
                      </span>
                    )}
                  </button>
                </div>

                {/* ── Tech Spec panel ────────────────────────────────────── */}
                {isSpecOpen && (
                  <div className="mx-2 mb-2 space-y-1.5 rounded border border-emerald-100 bg-emerald-50/40 p-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-bold tracking-widest text-emerald-800 uppercase">
                        Technical Specifications
                        {techSpecs.length > 0 && (
                          <span className="ml-1.5 font-normal text-emerald-600 normal-case">
                            ({techSpecs.length} row
                            {techSpecs.length !== 1 ? "s" : ""})
                          </span>
                        )}
                      </span>
                      <button
                        type="button"
                        onClick={addTechRow}
                        className="flex items-center gap-1 rounded bg-emerald-600 px-2 py-0.5 text-[9px] font-bold text-white hover:bg-emerald-500 cursor-pointer"
                      >
                        <FiPlus className="h-2.5 w-2.5" /> Add Row
                      </button>
                    </div>

                    {techSpecs.length === 0 ? (
                      <div className="text-gray-500 rounded border border-dashed border-emerald-200 bg-white p-2 text-center text-[10px]">
                        No specs yet — click <strong>Add Row</strong>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {techSpecs.map((row, i) => (
                          <div key={i} className="grid grid-cols-[1fr_24px] items-center gap-1.5">
                            <input
                              className={cls}
                              value={row}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                updateTechRow(i, e.target.value)
                              }
                              placeholder="e.g. Resolution: 0.5m"
                            />
                            <button
                              type="button"
                              onClick={(e: React.MouseEvent<HTMLButtonElement>) => removeTechRow(i)}
                              className="flex items-center justify-center text-red-500 hover:text-red-700 cursor-pointer"
                            >
                              <FiTrash2 className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── GST totals ────────────────────────────────────────────────── */}
        <div className="rounded-lg border border-teal-200/80 bg-teal-50/60 px-3 py-2">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="text-[10px] text-gray-600">
              Base: <strong className="font-bold text-gray-900 tabular-nums">₹ {fmtFn(baseTotal)}</strong>
            </span>
            {discountEnabled && parseFloat(discountPct) > 0 && (
              <span className="text-[10px] text-amber-700 font-medium">
                Discount ({discountPct}%):{" "}
                <strong className="font-bold tabular-nums">− ₹ {fmtFn(discTotal)}</strong>
              </span>
            )}
            {cgst_pct > 0 && (
              <span className="text-[10px] text-gray-600">
                CGST ({cgst_pct}%):{" "}
                <strong className="font-bold text-gray-900 tabular-nums">₹ {fmtFn(groupCgstAmt)}</strong>
              </span>
            )}
            {sgst_pct > 0 && (
              <span className="text-[10px] text-gray-600">
                SGST ({sgst_pct}%):{" "}
                <strong className="font-bold text-gray-900 tabular-nums">₹ {fmtFn(groupSgstAmt)}</strong>
              </span>
            )}
            {igst_pct > 0 && (
              <span className="text-[10px] text-gray-600">
                IGST ({igst_pct}%):{" "}
                <strong className="font-bold text-gray-900 tabular-nums">₹ {fmtFn(groupIgstAmt)}</strong>
              </span>
            )}
            <span className="ml-auto text-[12px] font-black text-[#2c6671] tabular-nums">
              Group Total: ₹ {fmtFn(groupTotal)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GroupedProductEntryUpdate;
