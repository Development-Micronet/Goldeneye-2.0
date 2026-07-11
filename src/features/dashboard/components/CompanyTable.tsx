import type { Company } from "../api/dashboard";

interface CompanyTableProps {
  companies: Company[];
  isLoading: boolean;
  onSelectCompany: (company: Company) => void;
}

export function CompanyTable({
  companies,
  isLoading,
  onSelectCompany,
}: CompanyTableProps) {
  if (isLoading) {
    return <div>Loading Companies...</div>;
  }

  return (
    <div className="flex h-[530px] flex-col rounded-xl bg-white p-5 shadow-md">
      <h2 className="mb-1 text-2xl font-bold">
        Company List
      </h2>

      <p className="mb-5 text-lg text-green-600">
        Select a company to view its users and details.
      </p>


      <div className="flex-1 overflow-auto">
          <table className="w-full min-w-[700px] border-collapse">
          <thead className="sticky top-0 bg-yellow-100">
            <tr className="bg-yellow-100">
              <th className="px-3 py-3 text-left font-semibold">ID</th>
              <th className="px-3 py-3 text-left font-semibold">
                Company Name
              </th>
              <th className="px-3 py-3 text-left font-semibold">
                Username
              </th>
              <th className="px-3 py-3 text-left font-semibold">
                Email
              </th>
              <th className="px-3 py-3 text-left font-semibold">
                Schema Name
              </th>
            </tr>
          </thead>

          <tbody>
            {companies.map((company) => (
              <tr
                key={company.id}
                onClick={() => onSelectCompany(company)}
                className="cursor-pointer border-t border-gray-200 transition hover:bg-blue-50"
              >
                <td className="px-3 py-4">{company.id}</td>
                <td className="px-3 py-4">{company.company_name}</td>
                <td className="px-3 py-4">{company.username}</td>
                <td className="px-3 py-4">{company.email}</td>
                <td className="px-3 py-4">{company.schema_name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-8 flex items-center">
        <div className="mr-4 flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 font-semibold text-white">
          1
        </div>

        <div>
       <p className="text-gray-700 font-medium">
  Available Companies
</p>

<p className="text-gray-500 text-sm">
  Select a company to view its users and details.
</p>
        </div>
      </div>
    </div>
  );
}