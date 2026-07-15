import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getListOfProviders,
  deleteProvider,
  type ProvidersResponse,
} from "../../api/provider";
import { useState } from "react";
import { Trash2, Loader2 } from "lucide-react";
import ProviderTableskeleton from "./ProviderTableskeleton";
import ProviderViewAndEdit from "./ProviderViewAndEdit";
import { Eye } from "lucide-react";
import Swal from "sweetalert2";
import { useAuthStore } from "../../../../store/useAuthStore";
import { decryptAESGCM } from "../../../../utils/dataDecrypt";
import ProviderAccordion from "./ProviderAccordion";

const ProviderTable = () => {
  const queryClient = useQueryClient();
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(
    null,
  );
  const { accessToken } = useAuthStore();
  const token = accessToken?.replace("Bearer ", "").trim() || "";

  const { data, isLoading, isError } = useQuery({
    queryKey: ["providers"],
    queryFn: async () => {
      //encrypted
      const res = await getListOfProviders();
      // console.log("Encrypted response:", res);
      if (!res?.data) return [];

      if (!token) throw new Error("Missing token");

      const encryptedData = res.data as unknown as string;

      //decrypt
      const decrypted = await decryptAESGCM(encryptedData, token);

      return decrypted.data as ProvidersResponse["data"];
    },
  });

  const providers = data ?? [];// always array
  console.log("Decrypted providers:", providers);
  const deleteMutation = useMutation({
    mutationFn: deleteProvider,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["providers"],
      });
    },

    onError: (error) => {
      console.error("Delete failed:", error);
    },
  });

  const handleDelete = async (providerId: string) => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "This provider will be permanently deleted.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, delete it",
      cancelButtonText: "Cancel",
      reverseButtons: true,
    });

    if (!result.isConfirmed) return;

    deleteMutation.mutate(providerId, {
      onSuccess: () => {
        Swal.fire({
          title: "Deleted!",
          text: "Provider has been deleted successfully.",
          icon: "success",
          timer: 1500,
          showConfirmButton: false,
        });
      },
      onError: () => {
        Swal.fire({
          title: "Error",
          text: "Failed to delete provider.",
          icon: "error",
        });
      },
    });
  };

  if (isLoading) return <ProviderTableskeleton />;
  if (isError) return <div>Error loading providers.</div>;

  return (
    <>
      <div className="flex-1 overflow-y-auto overflow-x-auto min-h-0">
        <ProviderAccordion
    providers={providers}
    deleteMutation={deleteMutation}
    handleDelete={handleDelete}
    setSelectedProviderId={setSelectedProviderId}
/>
      </div>
      {selectedProviderId && (
        <ProviderViewAndEdit
  providerid={selectedProviderId}
  onBack={() => setSelectedProviderId("")}
  startInEditMode={true}
/>
      )}
    </>
  );
};

export default ProviderTable;
