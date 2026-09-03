import React, { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

interface QueryProviderProps {
  children: React.ReactNode;
}

export const QueryProvider: React.FC<QueryProviderProps> = ({ children }) => {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Sensible defaults for a large scale app
            refetchOnWindowFocus: false, // Prevents refetching data when clicking back onto browser window
            retry: 1, // Retry once on failure
            staleTime: 5 * 60 * 1000, // 5 minutes caching/stale time
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};
