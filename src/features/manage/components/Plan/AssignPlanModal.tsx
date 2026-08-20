import { useState } from "react";

import { X } from "lucide-react";
import { toast } from "react-toastify";

import { useCustomers } from "../../hooks/useCustomers";
import {
  useAssignPlanMutation,
  useUnassignPlanMutation,
} from "../../hooks/usePlans";

import type { Plan } from "../../api/plans";
import { useAuthStore } from "../../../../store/useAuthStore";

type Props = {
  open: boolean;
  mode: "assign" | "unassign";
  plan: Plan | null;
  onClose: () => void;
};

export const AssignPlanModal = ({
  open,
  mode,
  plan,
  onClose,
}: Props) => {
  const [schemaName, setSchemaName] = useState("");

  // Get logged-in user's role
  const roleName = useAuthStore(
    (state) => state.user?.roleName
  );

  // Handles: superadmin, SuperAdmin, Super Admin, etc.
  const isSuperAdmin =
    roleName?.toLowerCase().replace(/\s+/g, "") === "superadmin";

  // ONLY ONE useCustomers()
  const {
    data: customers = [],
    isLoading: loadingCustomers,
  } = useCustomers(isSuperAdmin && open);

  const assignMutation = useAssignPlanMutation();
  const unassignMutation = useUnassignPlanMutation();

  if (!open || !plan) return null;

  const isAssign = mode === "assign";
  const mutation = isAssign
    ? assignMutation
    : unassignMutation;

  const handleSubmit = () => {
    if (!schemaName) {
      toast.error("Please select a company");
      return;
    }

    const toastId = toast.loading(
      isAssign
        ? "Assigning plan..."
        : "Unassigning plan..."
    );

    mutation.mutate(
      {
        planId: plan.id,
        schemaName,
      },
      {
        onSuccess: () => {
          toast.update(toastId, {
            render: `Plan ${
              isAssign ? "assigned" : "unassigned"
            } successfully!`,
            type: "success",
            isLoading: false,
            autoClose: 3000,
          });

          setSchemaName("");
          onClose();
        },

        onError: (err: any) => {
          toast.update(toastId, {
            render: `Failed: ${
              err.message || "Unknown error"
            }`,
            type: "error",
            isLoading: false,
            autoClose: 3000,
          });
        },
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-sm rounded-lg bg-white p-5 shadow-xl">

        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-800">
            {isAssign ? "Assign" : "Unassign"} Plan — {plan.name}
          </h3>

          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <label className="mb-1 block text-xs font-semibold text-gray-600">
          Company
        </label>

        <select
          value={schemaName}
          onChange={(e) => setSchemaName(e.target.value)}
          disabled={loadingCustomers}
          className="mb-4 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">
            {loadingCustomers
              ? "Loading companies..."
              : "Select company..."}
          </option>

          {customers.map((c) => (
            <option
              key={c.id}
              value={c.schema_name}
            >
              {c.name} ({c.schema_name})
            </option>
          ))}
        </select>

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-md px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100"
          >
            Cancel
          </button>

          <button
            onClick={handleSubmit}
            disabled={mutation.isPending}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold text-white ${
              isAssign
                ? "bg-blue-600 hover:bg-blue-700"
                : "bg-red-600 hover:bg-red-700"
            } disabled:opacity-50`}
          >
            {mutation.isPending
              ? "Processing..."
              : isAssign
                ? "Assign"
                : "Unassign"}
          </button>
        </div>

      </div>
    </div>
  );
};