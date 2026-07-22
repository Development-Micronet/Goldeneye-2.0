const ProviderTableskeleton = () => {
  return (
    <div className="min-h-0 flex-1 overflow-x-auto overflow-y-auto">
      <table className="min-w-full border-collapse border border-gray-200">
        <thead>
          <tr className="bg-white select-none">
            {/* <th className="border border-gray-200 px-3 py-2.5 sm:px-4 text-left text-[10px] sm:text-xs font-bold text-gray-700">
              Sr. No.
            </th> */}
            <th className="border border-gray-200 px-3 py-2.5 sm:px-4 text-left text-[10px] sm:text-xs font-bold text-gray-700">
              Provider Name
            </th>
            <th className="border border-gray-200 px-3 py-2.5 text-left text-[10px] font-bold text-gray-700 sm:px-4 sm:text-xs">
              Description
            </th>
            <th className="border border-gray-200 px-3 py-2.5 text-left text-[10px] font-bold text-gray-700 sm:px-4 sm:text-xs">
              Status
            </th>
            <th className="border border-gray-200 px-3 py-2.5 text-left text-[10px] font-bold text-gray-700 sm:px-4 sm:text-xs">
              Action
            </th>
          </tr>
        </thead>

        <tbody>
          {Array.from({ length: 6 }).map((_, i) => (
            <tr key={i} className="animate-pulse">
              <td className="border border-gray-200 px-3 py-4">
                <div className="mx-auto h-3 w-6 rounded bg-gray-200"></div>
              </td>

              <td className="border border-gray-200 px-3 py-4">
                <div className="h-3 w-32 rounded bg-gray-200"></div>
              </td>

              <td className="border border-gray-200 px-3 py-4">
                <div className="h-3 w-48 rounded bg-gray-200"></div>
              </td>

              <td className="border border-gray-200 px-3 py-4">
                <div className="h-3 w-20 rounded bg-gray-200"></div>
              </td>

              <td className="border border-gray-200 px-3 py-4">
                <div className="flex gap-2">
                  <div className="h-6 w-6 rounded bg-gray-200"></div>
                  <div className="h-6 w-6 rounded bg-gray-200"></div>
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
