import React from "react";
import { buildGroupKey } from "../../reusablecomponents/Productentry/ProductEntry";

interface GSTSummaryPanelProps {
  quotationItem: any[];
  fmt: (val: number) => string;
}

export function GSTSummaryPanel({ quotationItem = [], fmt }: GSTSummaryPanelProps) {
  const groups: Record<string, { rep: any; items: any[] }> = {};
  quotationItem.forEach((item) => {
    const key = buildGroupKey(item);
    if (!groups[key]) groups[key] = { rep: item, items: [] };
    groups[key].items.push(item);
  });

  const rows = Object.values(groups).map((group) => {
    const rep = group.rep;
    const base = group.items.reduce((s, it) => s + (parseFloat(it.amount) || 0), 0);
    const cgst_pct = parseFloat(rep.cgst_pct) || 0;
    const sgst_pct = parseFloat(rep.sgst_pct) || 0;
    const igst_pct = parseFloat(rep.igst_pct) || 0;
    const cgst_amt = (base * cgst_pct) / 100;
    const sgst_amt = (base * sgst_pct) / 100;
    const igst_amt = (base * igst_pct) / 100;
    const total = base + cgst_amt + sgst_amt + igst_amt;
    return {
      base,
      cgst_pct,
      sgst_pct,
      igst_pct,
      cgst_amt,
      sgst_amt,
      igst_amt,
      total,
      label: rep.item?.split(" ")[0] || "Group",
    };
  });

  const grandBase = rows.reduce((s, r) => s + r.base, 0);
  const grandCGST = rows.reduce((s, r) => s + r.cgst_amt, 0);
  const grandSGST = rows.reduce((s, r) => s + r.sgst_amt, 0);
  const grandIGST = rows.reduce((s, r) => s + r.igst_amt, 0);
  const grandTotal = rows.reduce((s, r) => s + r.total, 0);

  if (!quotationItem.length) return null;

  return (
    <div className="border-light-300 mt-2 rounded-lg border bg-white px-3 py-2">
      <span className="text-primary-600 mb-1.5 block text-[9px] font-black tracking-widest uppercase">
        GST Breakdown
      </span>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[9px]">
          <thead>
            <tr className="bg-primary-50">
              <th className="border-primary-100 text-primary-700 border px-2 py-1 text-left font-bold">
                Group
              </th>
              <th className="border-primary-100 text-primary-700 border px-2 py-1 text-right font-bold">
                Base (₹)
              </th>
              {rows.some((r) => r.cgst_pct > 0) && (
                <th className="border-primary-100 text-primary-700 border px-2 py-1 text-right font-bold">
                  CGST %
                </th>
              )}
              {rows.some((r) => r.cgst_pct > 0) && (
                <th className="border-primary-100 text-primary-700 border px-2 py-1 text-right font-bold">
                  CGST (₹)
                </th>
              )}
              {rows.some((r) => r.sgst_pct > 0) && (
                <th className="border-primary-100 text-primary-700 border px-2 py-1 text-right font-bold">
                  SGST %
                </th>
              )}
              {rows.some((r) => r.sgst_pct > 0) && (
                <th className="border-primary-100 text-primary-700 border px-2 py-1 text-right font-bold">
                  SGST (₹)
                </th>
              )}
              {rows.some((r) => r.igst_pct > 0) && (
                <th className="border-primary-100 text-primary-700 border px-2 py-1 text-right font-bold">
                  IGST %
                </th>
              )}
              {rows.some((r) => r.igst_pct > 0) && (
                <th className="border-primary-100 text-primary-700 border px-2 py-1 text-right font-bold">
                  IGST (₹)
                </th>
              )}
              <th className="border-primary-100 text-primary-700 border px-2 py-1 text-right font-bold">
                Total (₹)
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-primary-50/40"}>
                <td className="border-primary-100 text-primary-800 border px-2 py-1 font-semibold">
                  {r.label}
                </td>
                <td className="border-primary-100 border px-2 py-1 text-right">{fmt(r.base)}</td>
                {rows.some((rr) => rr.cgst_pct > 0) && (
                  <td className="border-primary-100 border px-2 py-1 text-right font-bold text-amber-600">
                    {r.cgst_pct}%
                  </td>
                )}
                {rows.some((rr) => rr.cgst_pct > 0) && (
                  <td className="border-primary-100 border px-2 py-1 text-right text-amber-700">
                    {fmt(r.cgst_amt)}
                  </td>
                )}
                {rows.some((rr) => rr.sgst_pct > 0) && (
                  <td className="border-primary-100 border px-2 py-1 text-right font-bold text-green-600">
                    {r.sgst_pct}%
                  </td>
                )}
                {rows.some((rr) => rr.sgst_pct > 0) && (
                  <td className="border-primary-100 border px-2 py-1 text-right text-green-700">
                    {fmt(r.sgst_amt)}
                  </td>
                )}
                {rows.some((rr) => rr.igst_pct > 0) && (
                  <td className="border-primary-100 border px-2 py-1 text-right font-bold text-purple-600">
                    {r.igst_pct}%
                  </td>
                )}
                {rows.some((rr) => rr.igst_pct > 0) && (
                  <td className="border-primary-100 border px-2 py-1 text-right text-purple-700">
                    {fmt(r.igst_amt)}
                  </td>
                )}
                <td className="border-primary-100 text-primary-700 border px-2 py-1 text-right font-bold">
                  {fmt(r.total)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-primary-700 text-white">
              <td className="border-primary-600 border px-2 py-1 font-bold">Grand Total</td>
              <td className="border-primary-600 border px-2 py-1 text-right font-bold">
                {fmt(grandBase)}
              </td>
              {rows.some((r) => r.cgst_pct > 0) && (
                <td className="border-primary-600 border px-2 py-1 text-right">—</td>
              )}
              {rows.some((r) => r.cgst_pct > 0) && (
                <td className="border-primary-600 border px-2 py-1 text-right font-bold text-yellow-300">
                  {fmt(grandCGST)}
                </td>
              )}
              {rows.some((r) => r.sgst_pct > 0) && (
                <td className="border-primary-600 border px-2 py-1 text-right">—</td>
              )}
              {rows.some((r) => r.sgst_pct > 0) && (
                <td className="border-primary-600 border px-2 py-1 text-right font-bold text-yellow-300">
                  {fmt(grandSGST)}
                </td>
              )}
              {rows.some((r) => r.igst_pct > 0) && (
                <td className="border-primary-600 border px-2 py-1 text-right">—</td>
              )}
              {rows.some((r) => r.igst_pct > 0) && (
                <td className="border-primary-600 border px-2 py-1 text-right font-bold text-yellow-300">
                  {fmt(grandIGST)}
                </td>
              )}
              <td className="border-primary-600 border px-2 py-1 text-right font-bold text-yellow-300">
                {fmt(grandTotal)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
