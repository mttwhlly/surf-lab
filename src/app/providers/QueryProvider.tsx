'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => 
    new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 30 * 60 * 1000,
          gcTime: 8 * 60 * 60 * 1000,
          retry: 1,
          retryDelay: 2000,
          refetchOnWindowFocus: false,
          refetchOnReconnect: false,
          refetchInterval: false,
          refetchIntervalInBackground: false,
        },
      },
    })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && <ReactQueryDevtools />}
    </QueryClientProvider>
  );
}