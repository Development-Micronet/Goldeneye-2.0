import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useLogout } from "./autoLogout";

const Base_Url = import.meta.env.VITE_REACT_APP_BASE_URL;

export const getAccessToken = (): string | null => {
  const savedUser = sessionStorage.getItem("user");
  if (savedUser) {
    try {
      const parsedUser = JSON.parse(savedUser);
      return parsedUser.access || null;
    } catch {
      return null;
    }
  }
  return null;
};

export const useGetData = (url: string, queryKey?: any[]) => {
  const access = getAccessToken();
  const logout = useLogout();

  const fetchData = async () => {
    if (!url) return null;
    try {
      const response = await axios.get(`${Base_Url}/${url}`, {
        headers: {
          Authorization: `Bearer ${access}`,
        },
      });
      return response.data;
    } catch (error: any) {
      if (
        error.response?.status === 401 &&
        error.response.data?.detail ===
          "Session expired or invalidated due to new login. Please log in again."
      ) {
        logout();
      }
      throw error;
    }
  };

  return useQuery({
    queryKey: queryKey || [url],
    queryFn: fetchData,
    enabled: !!url && !!access,
    retry: 2,
    refetchOnWindowFocus: false,
  });
};

export const usePostData = (url: string, mutationKey?: any, refetchQueryKey?: any) => {
  const access = getAccessToken();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationKey: mutationKey ? [mutationKey] : undefined,
    mutationFn: async (payload: any) => {
      const headers =
        url.startsWith("activate") || url.startsWith("password-reset-complete")
          ? {}
          : { Authorization: `Bearer ${access}` };
      const response = await axios.post(`${Base_Url}/${url}`, payload, {
        headers,
      });
      return response.data;
    },
    onSuccess: () => {
      if (refetchQueryKey) {
        queryClient.invalidateQueries({ queryKey: refetchQueryKey });
      }
    },
  });

  return {
    data: mutation.data,
    isLoading: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
    mutate: mutation.mutate,
    isSuccess: mutation.isSuccess,
  };
};

export const useDeleteData = (url: string, refetchQueryKey?: any) => {
  const queryClient = useQueryClient();
  const accessToken = getAccessToken();

  const mutation = useMutation({
    mutationFn: async ({ id = null, payload = null }: { id?: any; payload?: any } = {}) => {
      const requestUrl = id ? `${Base_Url}/${url}/${id}` : `${Base_Url}/${url}`;

      const config: any = {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        data: payload,
      };

      const response = await axios.delete(requestUrl, config);
      return response.data;
    },
    onSuccess: () => {
      if (refetchQueryKey) {
        queryClient.invalidateQueries({ queryKey: refetchQueryKey });
      }
    },
  });

  return {
    data: mutation.data,
    isDeleting: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
    mutateDeleteData: mutation.mutate,
    isSuccess: mutation.isSuccess,
  };
};

export const useDatawithpost = (
  url: string,
  payload: any,
  queryKey: any[],
  isValidSearch: boolean,
) => {
  const access = getAccessToken();

  const fetchData = async () => {
    const response = await axios.post(`${Base_Url}/${url}`, payload, {
      headers: {
        Authorization: `Bearer ${access}`,
      },
    });

    return response.data;
  };

  return useQuery({
    queryKey,
    queryFn: fetchData,
    enabled: !!access && isValidSearch,
    refetchOnWindowFocus: false,
  });
};

export const useDeleteUser = (url: string, refetchQueryKey?: any) => {
  const queryClient = useQueryClient();
  const accessToken = getAccessToken();

  const mutation = useMutation({
    mutationFn: async ({ userId = null, payload = null }: { userId?: any; payload?: any } = {}) => {
      const config: any = {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      };

      if (payload) {
        config.data = payload;
      }

      const requestUrl = userId ? `${Base_Url}/${url}/${userId}` : `${Base_Url}/${url}`;

      const response = await axios.delete(requestUrl, config);
      return response.data;
    },
    onSuccess: () => {
      if (refetchQueryKey) {
        queryClient.invalidateQueries({ queryKey: refetchQueryKey });
      }
    },
  });

  return {
    data: mutation.data,
    isDeleting: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
    mutate: mutation.mutate,
    isSuccess: mutation.isSuccess,
  };
};

export const useDeleteProduct = (url: string, refetchQueryKey?: any) => {
  const queryClient = useQueryClient();
  const accessToken = getAccessToken();

  const mutation = useMutation({
    mutationFn: async (payload: any) => {
      const dynamicUrl = `${Base_Url}/${url}/`;

      const response = await axios.delete(dynamicUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        data: payload,
      });

      return response.data;
    },
    onSuccess: () => {
      if (refetchQueryKey) {
        queryClient.invalidateQueries({ queryKey: refetchQueryKey });
      }
    },
  });

  return {
    data: mutation.data,
    isDeleting: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
    mutateDeleteProduct: mutation.mutate,
    isSuccess: mutation.isSuccess,
  };
};
