import React from "react";
import { Edit2, Trash2 } from "lucide-react";

export interface AllocatedProduct {
  id: number;
  productName: string;
  user: string;
  license: string;
  status: "Active" | "Pending" | "Expired";
  time: string;
}

interface AllocatedProductsTableProps {
  products: AllocatedProduct[];
  onEdit?: (product: AllocatedProduct) => void;
  onDelete?: (id: number) => void;
}

export const AllocatedProductsTable: React.FC<AllocatedProductsTableProps> = ({
  products,
  onEdit,
  onDelete,
}) => {
  return (
    <div className="min-h-0 flex-1 overflow-x-auto overflow-y-auto">
      <table className="min-w-full border-collapse border border-gray-200">
        <thead>
          <tr className="bg-white select-none">
            <th className="w-16 border border-gray-200 px-3 py-2.5 text-left text-[10px] font-bold text-gray-700 sm:px-4 sm:text-xs">
              Sr. No.
            </th>
            <th className="border border-gray-200 px-3 py-2.5 text-left text-[10px] font-bold text-gray-700 sm:px-4 sm:text-xs">
              Product Name
            </th>
            <th className="border border-gray-200 px-3 py-2.5 text-left text-[10px] font-bold text-gray-700 sm:px-4 sm:text-xs">
              Assigned To
            </th>
            <th className="border border-gray-200 px-3 py-2.5 text-left text-[10px] font-bold text-gray-700 sm:px-4 sm:text-xs">
              License Type
            </th>
            <th className="border border-gray-200 px-3 py-2.5 text-left text-[10px] font-bold text-gray-700 sm:px-4 sm:text-xs">
              Status
            </th>
            <th className="border border-gray-200 px-3 py-2.5 text-left text-[10px] font-bold text-gray-700 sm:px-4 sm:text-xs">
              Time
            </th>
            <th className="w-24 border border-gray-200 px-3 py-2.5 text-left text-[10px] font-bold text-gray-700 sm:px-4 sm:text-xs">
              Action
            </th>
          </tr>
        </thead>
        <tbody className="bg-white">
          {products.map((p, index) => (
            <tr key={p.id}>
              <td className="border border-gray-200 px-3 py-3 text-center text-xs font-medium text-gray-800 sm:px-4 sm:text-sm">
                {index + 1}
              </td>
              <td className="border border-gray-200 px-3 py-3 text-xs text-gray-800 sm:px-4 sm:text-sm">
                {p.productName}
              </td>
              <td className="border border-gray-200 px-3 py-3 text-xs text-gray-800 sm:px-4 sm:text-sm">
                {p.user}
              </td>
              <td className="border border-gray-200 px-3 py-3 text-xs text-gray-800 sm:px-4 sm:text-sm">
                {p.license}
              </td>
              <td className="border border-gray-200 px-3 py-3 text-xs text-gray-800 sm:px-4 sm:text-sm">
                <div className="flex items-center select-none">
                  <span
                    className={`mr-2 inline-block h-2.5 w-2.5 rounded-full ${
                      p.status === "Active" ? "bg-[#10B981]" : "bg-[#F59E0B]"
                    }`}
                  />
                  <span>{p.status}</span>
                </div>
              </td>
              <td className="border border-gray-200 px-3 py-3 text-xs text-gray-800 sm:px-4 sm:text-sm">
                {p.time}
              </td>
              <td className="border border-gray-200 px-3 py-3 text-xs text-gray-800 sm:px-4 sm:text-sm">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => onEdit?.(p)}
                    className="text-gray-655 hover:text-primary cursor-pointer rounded p-1 transition-colors hover:bg-gray-100"
                    title="Edit Product Assignment"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => onDelete?.(p.id)}
                    className="text-gray-655 cursor-pointer rounded p-1 transition-colors hover:bg-gray-100 hover:text-red-500"
                    title="Delete Product Assignment"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {products.length === 0 && (
            <tr>
              <td colSpan={7} className="py-8 text-center text-sm text-gray-400">
                No allocated products found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};
