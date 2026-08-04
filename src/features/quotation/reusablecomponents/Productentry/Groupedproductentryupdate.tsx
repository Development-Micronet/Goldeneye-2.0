import { FiTrash2, FiPlus, FiChevronDown, FiChevronUp } from "react-icons/fi";
import { useState } from "react";
import {
  formatDateRange,
  formatRangeDisplay,
} from "../../assets/preview/Preview";
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

function recalcItem(
  item,
  cgst_pct,
  sgst_pct,
  igst_pct,
  discountPct = 0,
  discountEnabled = false,
) {
  const area = parseFloat(item.area ?? item.qty) || 0;
  const price = parseFloat(item.price) || 0;
  const amount = area * price;
  const discAmt = discountEnabled
    ? (amount * parseFloat(discountPct || 0)) / 100
    : 0;
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
    const parsed = Array.isArray(cloudVal)
      ? cloudVal
      : String(cloudVal).split("-").map(Number);
    const max = parseFloat(parsed[parsed.length - 1]);
    return isNaN(max) ? String(cloudVal) : `≤ ${max}%`;
  })();

  const angleDisplay = (() => {
    if (!angleVal) return "—";
    const parsed = Array.isArray(angleVal)
      ? angleVal
      : String(angleVal).split("-").map(Number);
    const max = parseFloat(parsed[parsed.length - 1]);
    return isNaN(max) ? String(angleVal) : `≤ ${max}°`;
  })();

  const dateDisplay = formatDateRange(rep.date);

  // ── Totals ────────────────────────────────────────────────────────────────
  const baseTotal = groupIndices.reduce(
    (sum, idx) => sum + (parseFloat(description[idx]?.amount) || 0),
    0,
  );
  const discTotal = discountEnabled
    ? (baseTotal * parseFloat(discountPct || 0)) / 100
    : 0;
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
    <div className="rounded-lg border border-light-300 overflow-hidden text-[11px] shadow-sm">
      {/* ── Group header ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between bg-primary-700 px-3 py-1.5">
        <div className="flex items-center gap-2">
          <span className="font-bold text-white text-[11px]">
            Group {groupNumber}
            <span className="ml-1.5 text-[9px] font-normal opacity-70">
              {groupIndices.length} item{groupIndices.length !== 1 ? "s" : ""}
            </span>
          </span>
          {cloudVal && (
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/20 border border-blue-300/40 px-2 py-0.5 text-[9px] font-semibold text-blue-100">
              ☁ Cloud {cloudDisplay}
            </span>
          )}
          {angleVal && (
            <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/20 border border-purple-300/40 px-2 py-0.5 text-[9px] font-semibold text-purple-100">
              ⊿ Angle {angleDisplay}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={addItemToGroup}
          className="flex items-center gap-1 rounded bg-primary-600 hover:bg-primary-500 px-2 py-0.5 text-[10px] font-bold text-white transition-colors"
        >
          <FiPlus className="h-3 w-3" /> Add Item
        </button>
      </div>

      <div className="bg-white px-2.5 py-2 space-y-2">
        {/* ── Shared metadata ───────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 rounded bg-primary-50 border border-primary-100 px-2.5 py-2">
          <div className="flex flex-col gap-0.5">
            <label className="text-[9px] font-bold uppercase tracking-widest text-primary-400 leading-none">
              Task Type
            </label>
            <div className="flex gap-3 pt-0.5">
              {Archivalortasking.map((t) => (
                <label
                  key={t.value}
                  className="flex items-center gap-1 cursor-pointer text-[10px]"
                >
                  <input
                    type="radio"
                    name={`task_type_group_update_${groupNumber}`}
                    value={t.value}
                    checked={
                      (rep.task_type || "archival").toLowerCase() === t.value
                    }
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      handleSharedField("task_type", e.target.value)
                    }
                    className="h-3 w-3 accent-primary-600"
                  />
                  {t.label}
                </label>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-0.5">
            <label className="text-[9px] font-bold uppercase tracking-widest text-primary-400 leading-none">
              Cloud Cover
            </label>
            <span className="text-[11px] text-gray-700 font-medium py-0.5 flex items-center gap-1">
              <span className="text-blue-500">☁</span>
              {cloudDisplay}
            </span>
          </div>

          <div className="flex flex-col gap-0.5">
            <label className="text-[9px] font-bold uppercase tracking-widest text-primary-400 leading-none">
              Incidence Angle
            </label>
            <span className="text-[11px] text-gray-700 font-medium py-0.5 flex items-center gap-1">
              <span className="text-purple-500">⊿</span>
              {angleDisplay}
            </span>
          </div>

          <div className="flex flex-col gap-0.5">
            <label className="text-[9px] font-bold uppercase tracking-widest text-primary-400 leading-none">
              {rep.task_type?.toLowerCase() === "tasking"
                ? "Tasking Date"
                : "Acq. Date"}
            </label>
            {rep.task_type?.toLowerCase() === "tasking" ? (
              <input
                type="date"
                className={cls}
                value={rep.date || ""}
                min={new Date().toISOString().split("T")[0]}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleSharedField("date", e.target.value)}
              />
            ) : (
              <span className="text-[11px] text-gray-700 font-medium py-0.5">
                {dateDisplay || "—"}
              </span>
            )}
          </div>
        </div>

        {/* ── Items table ───────────────────────────────────────────────── */}
        <div className="rounded border border-light-200 overflow-hidden">
          {/* Header */}
          <div className="hidden sm:grid sm:grid-cols-12 gap-1 bg-light-100 border-b border-light-200 px-2.5 py-1.5">
            <span className="col-span-4 text-[9px] font-bold uppercase tracking-widest text-primary-400">
              # Item Description
            </span>
            <span className="col-span-1 text-[9px] font-bold uppercase tracking-widest text-primary-400">
              Unit
            </span>
            <span className="col-span-2 text-[9px] font-bold uppercase tracking-widest text-primary-400">
              Area {isArchival ? `(min ${minArchivalArea})` : "(Sqkm)"}
            </span>
            <span className="col-span-2 text-[9px] font-bold uppercase tracking-widest text-primary-400">
              Price/Sqkm (₹)
            </span>
            <span className="col-span-2 text-[9px] font-bold uppercase tracking-widest text-primary-400">
              Amount (₹)
            </span>
            <span className="col-span-1 text-[9px] font-bold uppercase tracking-widest text-primary-400 text-right">
              Del
            </span>
          </div>

          {groupIndices.map((idx, rowNum) => {
            const item = description[idx];
            if (!item) return null;

            const spectralOpts = getSpectralProcessing(item.item);
            const hasGeo =
              GeometricProcessing && GeometricProcessing.length > 0;
            const rawArea = parseFloat(item.area ?? item.qty ?? 0);
            const areaWarn =
              isArchival && rawArea > 0 && rawArea < minArchivalArea;
            const areaDisplay = areaWarn ? minArchivalArea : rawArea;
            const isSpecOpen = !!openSpecs[idx];

            // ✅ FIX: sub-row always renders — Tech Spec button is unconditional.
            // Previously the entire sub-row was gated on (hasGeo || spectralOpts),
            // so items without Geo/Spectral options never showed the Tech Spec button.
            // const showSubRow = hasGeo || spectralOpts || true; // always true now

            return (
              <div
                key={idx}
                className={`border-b border-light-100 last:border-b-0 ${rowNum % 2 === 0 ? "bg-white" : "bg-light-50/60"}`}
              >
                {/* Main row */}
                <div className="grid grid-cols-2 sm:grid-cols-12 gap-1.5 sm:gap-1 px-2.5 py-2 items-center">
                  <div className="col-span-2 sm:col-span-4 flex items-center gap-1.5">
                    <span className="flex-shrink-0 flex h-4 w-4 items-center justify-center rounded-full bg-primary-600 text-[8px] font-bold text-white">
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

                  <div className="col-span-1 sm:col-span-2 space-y-1">
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
                      <div className="text-[8px] text-amber-600 font-semibold">
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
                    <span className="block rounded bg-light-100 border border-light-200 px-2 py-1 text-[11px] text-right font-semibold text-primary-800 tabular-nums">
                      ₹{" "}
                      {fmtFn(
                        areaWarn
                          ? minArchivalArea * (parseFloat(item.price) || 0)
                          : item.amount || 0,
                      )}
                    </span>
                  </div>

                  <div className="col-span-1 sm:col-span-1 flex justify-end">
                    <button
                      type="button"
                      onClick={(e: React.MouseEvent<HTMLButtonElement>) => onRemoveRow(idx)}
                      className="flex items-center justify-center rounded bg-light-100 hover:bg-red-50 hover:text-red-500 border border-light-200 hover:border-red-200 p-1.5 transition-colors"
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
                    <div className="flex items-center gap-1.5 rounded bg-blue-50 border border-blue-100 px-2 py-1">
                      <label className="text-[9px] font-bold uppercase tracking-widest text-blue-400 whitespace-nowrap">
                        Geo.
                      </label>
                      <select
                        className="rounded border border-light-300 bg-white px-1.5 py-0.5 text-[11px] focus:outline-none focus:ring-1 focus:ring-blue-400 w-32"
                        value={item.geometricprocessing || ""}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          handleItemField(
                            idx,
                            "geometricprocessing",
                            e.target.value,
                          )
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
                    <div className="flex items-center gap-1.5 rounded bg-violet-50 border border-violet-100 px-2 py-1">
                      <label className="text-[9px] font-bold uppercase tracking-widest text-violet-400 whitespace-nowrap">
                        Spectral
                      </label>
                      <select
                        className="rounded border border-light-300 bg-white px-1.5 py-0.5 text-[11px] focus:outline-none focus:ring-1 focus:ring-violet-400 w-32"
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
                  {(hasGeo || spectralOpts) && (
                    <div className="h-5 w-px bg-light-200 mx-0.5" />
                  )}

                  {/* GST fields — always shown */}
                  {[
                    { key: "cgst_pct", label: "CGST", val: cgst_pct },
                    { key: "sgst_pct", label: "SGST", val: sgst_pct },
                    { key: "igst_pct", label: "IGST", val: igst_pct },
                  ].map(({ key, label, val }) => (
                    <div
                      key={key}
                      className="flex items-center gap-1 rounded bg-primary-50 border border-primary-100 px-2 py-1"
                    >
                      <label className="text-[9px] font-bold uppercase tracking-widest text-primary-400 whitespace-nowrap">
                        {label}%
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        className="w-10 rounded border border-light-300 bg-white px-1 py-0.5 text-[11px] text-center focus:outline-none focus:ring-1 focus:ring-primary-400"
                        value={val}
                        placeholder="0"
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleGSTChange(key, e.target.value)}
                      />
                    </div>
                  ))}

                  <div className="h-5 w-px bg-light-200 mx-0.5" />

                  {/* ✅ Tech Spec toggle — ALWAYS rendered, no longer inside (hasGeo || spectralOpts) guard */}
                  <button
                    type="button"
                    onClick={(e: React.MouseEvent<HTMLButtonElement>) => toggleSpec(idx)}
                    className={`flex items-center gap-1 rounded border px-2 py-1 text-[9px] font-bold uppercase tracking-widest transition-colors ${
                      isSpecOpen
                        ? "bg-emerald-50 border-emerald-200 text-emerald-600"
                        : "bg-light-50 border-light-200 text-light-400 hover:border-emerald-200 hover:text-emerald-500"
                    }`}
                  >
                    {isSpecOpen ? (
                      <FiChevronUp className="h-3 w-3" />
                    ) : (
                      <FiChevronDown className="h-3 w-3" />
                    )}
                    Tech Spec
                    {techSpecs.length > 0 && (
                      <span className="ml-1 rounded-full bg-emerald-500 text-white text-[8px] font-bold px-1.5 py-0.5 leading-none">
                        {techSpecs.length}
                      </span>
                    )}
                  </button>
                </div>

                {/* ── Tech Spec panel ────────────────────────────────────── */}
                {isSpecOpen && (
                  <div className="mx-2 mb-2 rounded border border-emerald-100 bg-emerald-50/40 p-2 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-bold uppercase tracking-widest text-emerald-600">
                        Technical Specifications
                        {techSpecs.length > 0 && (
                          <span className="ml-1.5 text-emerald-400 font-normal normal-case">
                            ({techSpecs.length} row
                            {techSpecs.length !== 1 ? "s" : ""})
                          </span>
                        )}
                      </span>
                      <button
                        type="button"
                        onClick={addTechRow}
                        className="flex items-center gap-1 rounded bg-emerald-600 hover:bg-emerald-500 px-2 py-0.5 text-[9px] font-bold text-white"
                      >
                        <FiPlus className="h-2.5 w-2.5" /> Add Row
                      </button>
                    </div>

                    {techSpecs.length === 0 ? (
                      <div className="text-[10px] text-light-400 border border-dashed border-emerald-200 p-2 rounded bg-white text-center">
                        No specs yet — click <strong>Add Row</strong>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {techSpecs.map((row, i) => (
                          <div
                            key={i}
                            className="grid grid-cols-[1fr_24px] gap-1.5 items-center"
                          >
                            <input
                              className={cls}
                              value={row}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateTechRow(i, e.target.value)}
                              placeholder="e.g. Resolution: 0.5m"
                            />
                            <button
                              type="button"
                              onClick={(e: React.MouseEvent<HTMLButtonElement>) => removeTechRow(i)}
                              className="flex items-center justify-center text-red-400 hover:text-red-600"
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
        <div className="rounded border border-primary-100 bg-primary-50 px-2.5 py-2">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="text-[10px] text-gray-500">
              Base:{" "}
              <strong className="text-primary-800 tabular-nums">
                ₹ {fmtFn(baseTotal)}
              </strong>
            </span>
            {discountEnabled && parseFloat(discountPct) > 0 && (
              <span className="text-[10px] text-amber-600">
                Discount ({discountPct}%):{" "}
                <strong className="tabular-nums">− ₹ {fmtFn(discTotal)}</strong>
              </span>
            )}
            {cgst_pct > 0 && (
              <span className="text-[10px] text-gray-500">
                CGST ({cgst_pct}%):{" "}
                <strong className="text-primary-800 tabular-nums">
                  ₹ {fmtFn(groupCgstAmt)}
                </strong>
              </span>
            )}
            {sgst_pct > 0 && (
              <span className="text-[10px] text-gray-500">
                SGST ({sgst_pct}%):{" "}
                <strong className="text-primary-800 tabular-nums">
                  ₹ {fmtFn(groupSgstAmt)}
                </strong>
              </span>
            )}
            {igst_pct > 0 && (
              <span className="text-[10px] text-gray-500">
                IGST ({igst_pct}%):{" "}
                <strong className="text-primary-800 tabular-nums">
                  ₹ {fmtFn(groupIgstAmt)}
                </strong>
              </span>
            )}
            <span className="ml-auto font-black text-[12px] text-primary-700 tabular-nums">
              Group Total: ₹ {fmtFn(groupTotal)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GroupedProductEntryUpdate;
