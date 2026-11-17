import React from "react";
import { AddUserModal } from "./AddUserModal";
import type { Company, CompanyUser } from "../api/dashboard";

interface EditUserModalProps {
  open: boolean;
  onClose: () => void;
  user: CompanyUser | null;
  selectedCompany?: Company | null;
  onSuccess?: () => void;
}

export const EditUserModal: React.FC<EditUserModalProps> = ({
  open,
  onClose,
  user,
  selectedCompany = null,
  onSuccess,
}) => {
  return (
    <AddUserModal
      open={open}
      onClose={onClose}
      mode="edit"
      userToEdit={user}
      selectedCompany={selectedCompany}
      defaultOrganization={user?.organization_name || user?.schema_name || ""}
      onSuccess={onSuccess}
    />
  );
};
