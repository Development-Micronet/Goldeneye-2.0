const ProviderTableskeleton = () => {
  return (
    <div className="flex-1 overflow-y-auto overflow-x-auto min-h-0">
      <table className="min-w-full border-collapse border border-gray-200">
        <thead>
          <tr className="bg-white select-none">
            {/* <th className="border border-gray-200 px-3 py-2.5 sm:px-4 text-left text-[10px] sm:text-xs font-bold text-gray-700">
              Sr. No.
            </th> */}
            <th className="border border-gray-200 px-3 py-2.5 sm:px-4 text-left text-[10px] sm:text-xs font-bold text-gray-700">
              Provider Name
            </th>
            <th className="border border-gray-200 px-3 py-2.5 sm:px-4 text-left text-[10px] sm:text-xs font-bold text-gray-700">
              Description
            </th>
            <th className="border border-gray-200 px-3 py-2.5 sm:px-4 text-left text-[10px] sm:text-xs font-bold text-gray-700">
              Status
            </th>
            <th className="border border-gray-200 px-3 py-2.5 sm:px-4 text-left text-[10px] sm:text-xs font-bold text-gray-700">
              Action
            </th>
          </tr>
        </thead>

        <tbody>
          {Array.from({ length: 6 }).map((_, i) => (
            <tr key={i} className="animate-pulse">
              <td className="border border-gray-200 px-3 py-4">
                <div className="h-3 bg-gray-200 rounded w-6 mx-auto"></div>
              </td>

              <td className="border border-gray-200 px-3 py-4">
                <div className="h-3 bg-gray-200 rounded w-32"></div>
              </td>

              <td className="border border-gray-200 px-3 py-4">
                <div className="h-3 bg-gray-200 rounded w-48"></div>
              </td>

              <td className="border border-gray-200 px-3 py-4">
                <div className="h-3 bg-gray-200 rounded w-20"></div>
              </td>

              <td className="border border-gray-200 px-3 py-4">
                <div className="flex gap-2">
                  <div className="h-6 w-6 bg-gray-200 rounded"></div>
                  <div className="h-6 w-6 bg-gray-200 rounded"></div>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ProviderTableskeleton;
