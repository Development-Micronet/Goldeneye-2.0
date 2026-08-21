import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getListOfProviders, deleteProvider, type ProvidersResponse } from "../../api/provider";
import { useState } from "react";
import ProviderSkeleton from "./ProviderTableskeleton";
import ProviderViewAndEdit from "./ProviderViewAndEdit";
import Swal from "sweetalert2";
import { useAuthStore } from "../../../../store/useAuthStore";
import { decryptAESGCM } from "../../../../utils/dataDecrypt";
import ProviderAccordion from "./ProviderAccordion";
import { logger } from "../../../../utils/logger";
import ErrorBoundary from "../../../../components/common/ErrorBoundary";

const ProviderMain = () => {
  const queryClient = useQueryClient();
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);
  const { accessToken } = useAuthStore();
  const token = accessToken?.replace("Bearer ", "").trim() || "";

  const { data, isLoading, isError } = useQuery({
    queryKey: ["providers"],
    queryFn: async () => {
      //encrypted
      const res = await getListOfProviders();
      // logger.log("Encrypted response:", res);
      if (!res?.data) return [];

      if (!token) throw new Error("Missing token");

      const encryptedData = res.data as unknown as string;

      //decrypt
      const decrypted = await decryptAESGCM(encryptedData, token);

      return decrypted.data as ProvidersResponse["data"];
    },
  });

  const providers = Array.isArray(data) ? data : [];
  logger.log("Decrypted providers:", providers);
  const deleteMutation = useMutation({
    mutationFn: deleteProvider,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["providers"],
      });
    },

    onError: (error) => {
      logger.error("Delete failed:", error);
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

  // if (isLoading) return <ProviderMainskeleton />;
  if (isLoading) return <ProviderSkeleton />;
  if (isError) return <div>Error loading providers.</div>;

  return (
    <>
      <div className="min-h-0 flex-1 overflow-x-auto overflow-y-auto">
        <ErrorBoundary componentName="ProviderAccordion">
          <ProviderAccordion
            providers={providers}
            deleteMutation={deleteMutation}
            handleDelete={handleDelete}
            setSelectedProviderId={setSelectedProviderId}
          />
        </ErrorBoundary>
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

export default ProviderMain;
