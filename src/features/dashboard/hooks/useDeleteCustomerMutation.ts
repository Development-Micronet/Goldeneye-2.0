import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteCompany } from "../api/dashboard";

export const useDeleteCustomerMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteCompany,

    onSuccess: () => {
      console.log("Company deleted successfully");

      queryClient.invalidateQueries({
        queryKey: ["companies"],
      });
    },

    onError: (error) => {
      console.error("Company delete failed:", error);
    },
  });
};