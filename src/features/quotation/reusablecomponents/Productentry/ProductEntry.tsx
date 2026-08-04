import { FiTrash2, FiPlus, FiChevronDown, FiChevronUp } from "react-icons/fi";
import React, { useState } from "react";
import { formatDateRange } from "../../assets/preview/Preview.js";
import { getSpectralProcessing } from "../../Shared/Product.ts";
import { useQuotationItemStore } from "../../mystore/features/useQuotationItemStore";
import { UNITS } from "../../Shared/Quotation.ts";
import { GeometricProcessing } from "../../Shared/Product.ts";

interface FProps {
  label: string;
  children: string;
}

interface GroupedProductEntryProps {
  groupIndices: number[];
  groupNumber: string | number;
  fmt: (val: number) => string;
  cgst_pct?: string | number;
  sgst_pct?: string | number;
  igst_pct?: string | number;
  discountEnabled?: boolean;
  discountPct?: string | number;
  minArchivalArea?: number;
}

const cls =
  "w-full rounded border border-light-300 bg-white px-2 py-1 text-[11px] focus:outline-none focus:ring-1 focus:ring-primary-400";

const Archivalortasking = [
  { label: "Archival", value: "archival" },
  { label: "Tasking", value: "tasking" },
];

const MIN_ARCHIVAL_AREA = 25;

export function buildGroupKey(item: any) {
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
  item: any,
  cgst_pct: any,
  sgst_pct: any,
  igst_pct: any,
  discountPct: any = 0,
  discountEnabled: boolean = false
) {
  const area = parseFloat(item.area) || 0;
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

const GroupedProductEntry: React.FC<GroupedProductEntryProps> = ({
  groupIndices,
  groupNumber,
  fmt,
  cgst_pct: propCgst,
  sgst_pct: propSgst,
  igst_pct: propIgst,
  discountEnabled = false,
  discountPct = 0,
  minArchivalArea = MIN_ARCHIVAL_AREA,
}) => {
  const quotationItems = useQuotationItemStore((s) => s.quotationItem);
  const addQuotationItem = useQuotationItemStore((s) => s.addQuotationItem);
  const updateQuotationItem = useQuotationItemStore((s) => s.updateQuotationItem);
  const removeQuotationItem = useQuotationItemStore((s) => s.removeQuotationItem);
  const addTechSpec = useQuotationItemStore((s) => s.addTechSpec);
  const updateTechSpec = useQuotationItemStore((s) => s.updateTechSpec);
  const removeTechSpec = useQuotationItemStore((s) => s.removeTechSpec);

  const [openSpecs, setOpenSpecs] = useState<Record<number, boolean>>({});

  const toggleSpec = (idx: number) =>
    setOpenSpecs((p) => ({ ...p, [idx]: !p[idx] }));

  const addtechRow = () => {
    groupIndices.forEach((idx) => {
      addTechSpec({ index: idx });
    });
  };

  const removetechRow = (specIndex: number) => {
    groupIndices.forEach((idx) => {
      removeTechSpec({
        index: idx,
        specIndex,
      });
    });
  };

  const updatetechRow = (specIndex: number, value: string) => {
    groupIndices.forEach((idx) => {
      updateTechSpec({
        index: idx,
        specIndex,
        value,
      });
    });
  };

  const rep = quotationItems[groupIndices[0]];
  if (!rep) return null;

  const cgst_pct = parseFloat(String(rep.cgst_pct ?? propCgst ?? 9));
  const sgst_pct = parseFloat(String(rep.sgst_pct ?? propSgst ?? 9));
  const igst_pct = parseFloat(String(rep.igst_pct ?? propIgst ?? 0));

  const isArchival = (rep.task_type || "archival") === "archival";
  const rawArea = parseFloat(rep.area || 0);
  const showMinWarn = isArchival && rawArea > 0 && rawArea < minArchivalArea;

  const cloudVal = rep.cloud_cover;
  const angleVal = rep.angle;

  const cloudDisplay = (() => {
    if (!cloudVal) return "—";
    const parsed = Array.isArray(cloudVal)
      ? cloudVal
      : String(cloudVal).split("-").map(Number);
    const max = parseFloat(String(parsed[parsed.length - 1]));
    return isNaN(max) ? String(cloudVal) : `≤ ${max}%`;
  })();

  const angleDisplay = (() => {
    if (!angleVal) return "—";
    const parsed = Array.isArray(angleVal)
      ? angleVal
      : String(angleVal).split("-").map(Number);
    const max = parseFloat(String(parsed[parsed.length - 1]));
    return isNaN(max) ? String(angleVal) : `≤ ${max}°`;
  })();

  const dateDisplay = formatDateRange(rep.date);

  const baseTotal = groupIndices.reduce(
    (sum, idx) => sum + (parseFloat(quotationItems[idx]?.amount) || 0),
    0
  );
  const discTotal = discountEnabled
    ? (baseTotal * parseFloat(String(discountPct || 0))) / 100
    : 0;
  const afterDisc = baseTotal - discTotal;
  const groupCgstAmt = (afterDisc * cgst_pct) / 100;
  const groupSgstAmt = (afterDisc * sgst_pct) / 100;
  const groupIgstAmt = (afterDisc * igst_pct) / 100;
  const groupTotal = afterDisc + groupCgstAmt + groupSgstAmt + groupIgstAmt;

  const dispatchRecalc = (idx: number, d: any) => {
    [
      ["amount", d.amount],
      ["cgst_amt", d.cgst_amt],
      ["sgst_amt", d.sgst_amt],
      ["igst_amt", d.igst_amt],
      ["total", d.total],
    ].forEach(([field, value]) =>
      updateQuotationItem({ index: idx, field: field as string, value })
    );
  };

  const handleGSTChange = (field: string, val: any) => {
    groupIndices.forEach((idx) => {
      const item = quotationItems[idx];
      updateQuotationItem({ index: idx, field, value: val });
      dispatchRecalc(
        idx,
        recalcItem(
          { ...item, [field]: val },
          field === "cgst_pct" ? val : item.cgst_pct,
          field === "sgst_pct" ? val : item.sgst_pct,
          field === "igst_pct" ? val : item.igst_pct,
          discountPct,
          discountEnabled
        )
      );
    });
  };

  const handleItemField = (idx: number, field: string, val: any) => {
    let finalVal = val;
    if (field === "area" && isArchival) {
      const num = parseFloat(val) || 0;
      finalVal = num > 0 ? Math.max(minArchivalArea, num) : num;
    }
    updateQuotationItem({ index: idx, field, value: finalVal });
    if (field === "area" || field === "price") {
      const item = quotationItems[idx];
      dispatchRecalc(
        idx,
        recalcItem(
          { ...item, [field]: finalVal },
          item.cgst_pct ?? cgst_pct,
          item.sgst_pct ?? sgst_pct,
          item.igst_pct ?? igst_pct,
          discountPct,
          discountEnabled
        )
      );
    }
  };

  const handleSharedField = (field: string, val: any) => {
    groupIndices.forEach((idx) =>
      updateQuotationItem({ index: idx, field, value: val })
    );
  };

  const addItemToGroup = () => {
    addQuotationItem({
      item: "",
      unit: "Sqkm",
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
    });
  };

  return (
    <div className="rounded-lg border border-light-300 overflow-hidden text-[11px] shadow-sm">
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
          {showMinWarn && (
            <span className="inline-flex items-center rounded-full bg-amber-400/20 border border-amber-300/40 px-2 py-0.5 text-[9px] font-semibold text-amber-200">
              ⚠ Min {minArchivalArea} sqkm
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
                    name={`task_type_group_${groupNumber}`}
                    value={t.value}
                    checked={(rep.task_type || "archival") === t.value}
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
              {rep.task_type === "tasking" ? "Tasking Date" : "Acq. Date"}
            </label>
            {rep.task_type === "tasking" ? (
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

        <div className="rounded border border-light-200 overflow-hidden">
          <div className="hidden sm:grid sm:grid-cols-12 gap-1 bg-light-100 border-b border-light-200 px-2.5 py-1.5 ">
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
            const item = quotationItems[idx];
            if (!item) return null;

            const spectralOpts = getSpectralProcessing(item.item);
            const hasGeo =
              GeometricProcessing && GeometricProcessing.length > 0;
            const itemArea = parseFloat(item.area || 0);
            const areadisplay =
              isArchival && itemArea > 0 && itemArea < minArchivalArea
                ? minArchivalArea
                : itemArea;
            const areaWarn =
              isArchival && itemArea > 0 && itemArea < minArchivalArea;
            const techSpecs = rep.techSpecs || [];
            const isSpecOpen = !!openSpecs[idx];

            return (
              <div
                key={idx}
                className={`border-b border-light-100 last:border-b-0 ${rowNum % 2 === 0 ? "bg-white" : "bg-light-50/60"}`}
              >
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
                    <label className="sm:hidden text-[9px] font-bold uppercase tracking-widest text-primary-400 block mb-0.5">
                      Unit
                    </label>
                    <select
                      className={cls}
                      value={item.unit || "Sqkm"}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                        handleItemField(idx, "unit", e.target.value)
                      }
                    >
                      {UNITS.map((u: string) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-1 sm:col-span-2 space-y-1">
                    <label className="sm:hidden text-[9px] font-bold uppercase tracking-widest text-primary-400 block">
                      Area {isArchival ? `(min ${minArchivalArea})` : "(Sqkm)"}
                    </label>
                    <input
                      type="number"
                      min={isArchival ? minArchivalArea : 0}
                      className={`${cls} ${areaWarn ? "border-amber-400 bg-amber-50" : ""}`}
                      value={areadisplay}
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
                    <label className="sm:hidden text-[9px] font-bold uppercase tracking-widest text-primary-400 block mb-0.5">
                      Price / Sqkm (₹)
                    </label>
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
                    <label className="sm:hidden text-[9px] font-bold uppercase tracking-widest text-primary-400 block mb-0.5">
                      Amount (₹)
                    </label>
                    <span className="block rounded bg-light-100 border border-light-200 px-2 py-1 text-[11px] text-right font-semibold text-primary-800 tabular-nums">
                      ₹{" "}
                      {fmt(
                        areaWarn
                          ? minArchivalArea * (parseFloat(item.price) || 0)
                          : item.amount || 0
                      )}
                    </span>
                  </div>

                  <div className="col-span-1 sm:col-span-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => removeQuotationItem(idx)}
                      className="flex items-center justify-center rounded bg-light-100 hover:bg-red-50 hover:text-red-500 border border-light-200 hover:border-red-200 p-1.5 transition-colors"
                      title="Remove item"
                    >
                      <FiTrash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>

                {(hasGeo || spectralOpts) && (
                  <div className="flex flex-wrap items-center gap-1.5 px-2.5 pb-2">
                    {hasGeo && (
                      <div className="flex items-center gap-1.5 rounded bg-blue-50 border border-blue-100 px-2 py-1">
                        <label className="text-[9px] font-bold uppercase tracking-widest text-blue-400 whitespace-nowrap">
                          Geo.
                        </label>
                        <select
                          className="rounded border border-light-300 bg-white px-1.5 py-0.5 text-[11px] focus:outline-none focus:ring-1 focus:ring-blue-400 w-32"
                          value={item.geometricprocessing || ""}
                          onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                            handleItemField(
                              idx,
                              "geometricprocessing",
                              e.target.value
                            )
                          }
                        >
                          <option value="" disabled>
                            Select
                          </option>
                          {GeometricProcessing.map((gp: any, i: number) => (
                            <option key={i} value={gp.Value}>
                              {gp.Label}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {spectralOpts && (
                      <div className="flex items-center gap-1.5 rounded bg-violet-50 border border-violet-100 px-2 py-1">
                        <label className="text-[9px] font-bold uppercase tracking-widest text-violet-400 whitespace-nowrap">
                          Spectral
                        </label>
                        <select
                          className="rounded border border-light-300 bg-white px-1.5 py-0.5 text-[11px] focus:outline-none focus:ring-1 focus:ring-violet-400 w-32"
                          value={item.spectralbands || ""}
                          onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                            handleItemField(
                              idx,
                              "spectralbands",
                              e.target.value
                            )
                          }
                        >
                          <option value="" disabled>
                            Select
                          </option>
                          {spectralOpts.values.map((sp: any) => (
                            <option key={sp.id} value={sp.id}>
                              {sp.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="h-5 w-px bg-light-200 mx-0.5" />

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

                    <button
                      type="button"
                      onClick={() => toggleSpec(idx)}
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
                    <div className="h-5 w-px bg-light-200 mx-0.5" />
                  </div>
                )}

                {isSpecOpen && (
                  <div className="m-2 space-y-2">
                    <div className="flex items-center m-3 justify-between">
                      <span className="text-[9px] font-bold uppercase tracking-widest text-primary-400">
                        Technical Specifications
                      </span>

                      <button
                        type="button"
                        onClick={addtechRow}
                        className="flex items-center gap-1 rounded bg-primary-50 hover:bg-primary-100 border border-primary-200 px-2 py-0.5 text-[9px] font-bold text-primary-600"
                      >
                        <FiPlus className="h-2.5 w-2.5" /> Add Row
                      </button>
                    </div>

                    {techSpecs.length === 0 ? (
                      <div className="text-[10px] text-light-400 border border-dashed p-2 rounded">
                        No specs yet — click Add Row
                      </div>
                    ) : (
                      techSpecs.map((row: string, i: number) => (
                        <div
                          key={i}
                          className="grid grid-cols-[1fr_24px] gap-2 items-center"
                        >
                          <input
                            className={cls}
                            value={row}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => updatetechRow(i, e.target.value)}
                            placeholder="e.g. Resolution: 0.5m"
                          />

                          <button
                            type="button"
                            onClick={() => removetechRow(i)}
                            className="text-red-500"
                          >
                            <FiTrash2 className="h-3 w-3" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="rounded border border-primary-100 bg-primary-50 px-2.5 py-2">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="text-[10px] text-gray-500">
              Base:{" "}
              <strong className="text-primary-800 tabular-nums">
                ₹ {fmt(baseTotal)}
              </strong>
            </span>
            {discountEnabled && parseFloat(String(discountPct)) > 0 && (
              <span className="text-[10px] text-amber-600">
                Discount ({discountPct}%):{" "}
                <strong className="tabular-nums">− ₹ {fmt(discTotal)}</strong>
              </span>
            )}
            {cgst_pct > 0 && (
              <span className="text-[10px] text-gray-500">
                CGST ({cgst_pct}%):{" "}
                <strong className="text-primary-800 tabular-nums">
                  ₹ {fmt(groupCgstAmt)}
                </strong>
              </span>
            )}
            {sgst_pct > 0 && (
              <span className="text-[10px] text-gray-500">
                SGST ({sgst_pct}%):{" "}
                <strong className="text-primary-800 tabular-nums">
                  ₹ {fmt(groupSgstAmt)}
                </strong>
              </span>
            )}
            {igst_pct > 0 && (
              <span className="text-[10px] text-gray-500">
                IGST ({igst_pct}%):{" "}
                <strong className="text-primary-800 tabular-nums">
                  ₹ {fmt(groupIgstAmt)}
                </strong>
              </span>
            )}
            <span className="ml-auto font-black text-[12px] text-primary-700 tabular-nums">
              Group Total: ₹ {fmt(groupTotal)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GroupedProductEntry;
