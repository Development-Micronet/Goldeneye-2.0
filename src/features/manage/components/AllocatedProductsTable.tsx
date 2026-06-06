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
    <div className="flex-1 overflow-y-auto overflow-x-auto min-h-0">
      <table className="min-w-full border-collapse border border-gray-200">
        <thead>
          <tr className="bg-white select-none">
            <th className="border border-gray-200 px-3 py-2.5 sm:px-4 text-left text-[10px] sm:text-xs font-bold text-gray-700 w-16">
              Sr. No.
            </th>
            <th className="border border-gray-200 px-3 py-2.5 sm:px-4 text-left text-[10px] sm:text-xs font-bold text-gray-700">
              Product Name
            </th>
            <th className="border border-gray-200 px-3 py-2.5 sm:px-4 text-left text-[10px] sm:text-xs font-bold text-gray-700">
              Assigned To
            </th>
            <th className="border border-gray-200 px-3 py-2.5 sm:px-4 text-left text-[10px] sm:text-xs font-bold text-gray-700">
              License Type
            </th>
            <th className="border border-gray-200 px-3 py-2.5 sm:px-4 text-left text-[10px] sm:text-xs font-bold text-gray-700">
              Status
            </th>
            <th className="border border-gray-200 px-3 py-2.5 sm:px-4 text-left text-[10px] sm:text-xs font-bold text-gray-700">
              Time
            </th>
            <th className="border border-gray-200 px-3 py-2.5 sm:px-4 text-left text-[10px] sm:text-xs font-bold text-gray-700 w-24">
              Action
            </th>
          </tr>
        </thead>
        <tbody className="bg-white">
          {products.map((p, index) => (
            <tr key={p.id}>
              <td className="border border-gray-200 px-3 py-3 sm:px-4 text-xs sm:text-sm text-gray-800 text-center font-medium">
                {index + 1}
              </td>
              <td className="border border-gray-200 px-3 py-3 sm:px-4 text-xs sm:text-sm text-gray-800">
                {p.productName}
              </td>
              <td className="border border-gray-200 px-3 py-3 sm:px-4 text-xs sm:text-sm text-gray-800">
                {p.user}
              </td>
              <td className="border border-gray-200 px-3 py-3 sm:px-4 text-xs sm:text-sm text-gray-800">
                {p.license}
              </td>
              <td className="border border-gray-200 px-3 py-3 sm:px-4 text-xs sm:text-sm text-gray-800">
                <div className="flex items-center select-none">
                  <span
                    className={`inline-block w-2.5 h-2.5 rounded-full mr-2 ${
                      p.status === "Active" ? "bg-[#10B981]" : "bg-[#F59E0B]"
                    }`}
                  />
                  <span>{p.status}</span>
                </div>
              </td>
              <td className="border border-gray-200 px-3 py-3 sm:px-4 text-xs sm:text-sm text-gray-800">
                {p.time}
              </td>
              <td className="border border-gray-200 px-3 py-3 sm:px-4 text-xs sm:text-sm text-gray-800">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => onEdit?.(p)}
                    className="p-1 hover:bg-gray-100 rounded text-gray-655 hover:text-primary transition-colors cursor-pointer"
                    title="Edit Product Assignment"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDelete?.(p.id)}
                    className="p-1 hover:bg-gray-100 rounded text-gray-655 hover:text-red-500 transition-colors cursor-pointer"
                    title="Delete Product Assignment"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {products.length === 0 && (
            <tr>
              <td colSpan={7} className="text-center py-8 text-sm text-gray-400">
                No allocated products found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};
