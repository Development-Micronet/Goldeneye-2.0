import type { CompanyUser } from "../api/dashboard";

interface UserTableProps {
  users: CompanyUser[];
  companyName: string;
  schemaName: string;
  isLoading: boolean;
}

export function UserTable({
  users,
  companyName,
  schemaName,
  isLoading,
}: UserTableProps) {
  if (isLoading) {
    return <div>Loading Users...</div>;
  }

  return (
    <div className="flex h-[530px] flex-col rounded-xl bg-white p-5 shadow-md">
      <h2 className="mb-1 text-2xl font-bold">
        Users of {companyName}
      </h2>

      <p className="mb-5 text-green-600">
         Displays all users belonging to the selected company.
      </p>

      <div className="flex-1 overflow-auto">
        <table className="w-full min-w-[800px] border-collapse">
          <thead className="sticky top-0 bg-yellow-100">
            <tr className="bg-yellow-100">
              <th className="border border-gray-200 px-4 py-3 text-left font-semibold">
                ID
              </th>
              <th className="border border-gray-200 px-4 py-3 text-left font-semibold">
                Username
              </th>
              <th className="border border-gray-200 px-4 py-3 text-left font-semibold">
                Email
              </th>
              <th className="border border-gray-200 px-4 py-3 text-left font-semibold">
                First Name
              </th>
              <th className="border border-gray-200 px-4 py-3 text-left font-semibold">
                Last Name
              </th>
              <th className="border border-gray-200 px-4 py-3 text-left font-semibold">
                Role
              </th>
            </tr>
          </thead>

          <tbody>
            {users.map((user) => (
              <tr
                key={user.id}
                className="border border-gray-200 transition hover:bg-blue-50"
              >
                <td className="border border-gray-200 px-4 py-3">{user.id}</td>

                <td className="border border-gray-200 px-4 py-3">
                  {user.username}
                </td>

                <td className="border border-gray-200 px-4 py-3">
                  {user.email}
                </td>

                <td className="border border-gray-200 px-4 py-3">
                  {user.first_name}
                </td>

                <td className="border border-gray-200 px-4 py-3">
                  {user.last_name}
                </td>

                <td className="border border-gray-200 px-4 py-3">
                  <span
                    className={`rounded-md px-3 py-1 text-xs font-medium ${user.tenant_role === "tenant_admin"
                      ? "bg-green-100 text-green-700"
                      : "bg-blue-100 text-blue-700"
                      }`}
                  >
                    {user.tenant_role}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-8 flex items-center">
        <div className="mr-4 flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 font-bold text-white">
          2
        </div>

        <div>
         <p className="text-gray-700 font-medium">
  Company Users
</p>

<p className="text-gray-500 text-sm">
  Displays all users belonging to the selected company.
</p>
        </div>
      </div>
    </div>
  );
}