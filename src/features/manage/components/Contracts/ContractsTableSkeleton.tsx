// ContractsTableSkeleton.tsx

const rows = Array.from({ length: 5 });

export default function ContractsTableSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr className="border-b">
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
              Sr. No
            </th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
              Contract Id
            </th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
              Contract Name
            </th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
              Email
            </th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
              Status
            </th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
              Contract Type
            </th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
              Expires At
            </th>
            <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">
              Action
            </th>
          </tr>
        </thead>

        <tbody>
          {rows.map((_, index) => (
            <tr key={index} className="border-b last:border-b-0">
              {/* Sr No */}
              <td className="px-4 py-4">
                <div className="h-4 w-6 animate-pulse rounded bg-gray-200" />
              </td>

              {/* Contract Id */}
              <td className="px-4 py-4">
                <div className="h-4 w-48 animate-pulse rounded bg-gray-200" />
              </td>

              {/* Contract Name */}
              <td className="px-4 py-4">
                <div className="h-4 w-60 animate-pulse rounded bg-gray-200" />
              </td>

              {/* Email */}
              <td className="px-4 py-4">
                <div className="h-4 w-64 animate-pulse rounded bg-gray-200" />
              </td>

              {/* Status */}
              <td className="px-4 py-4">
                <div className="h-7 w-20 animate-pulse rounded-full bg-gray-200" />
              </td>

              {/* Contract Type */}
              <td className="px-4 py-4">
                <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
              </td>

              {/* Expires At */}
              <td className="px-4 py-4">
                <div className="h-4 w-40 animate-pulse rounded bg-gray-200" />
              </td>

              {/* Actions */}
              <td className="px-4 py-4">
                <div className="flex justify-center gap-4">
                  <div className="h-5 w-5 animate-pulse rounded bg-gray-200" />
                  <div className="h-5 w-5 animate-pulse rounded bg-gray-200" />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}