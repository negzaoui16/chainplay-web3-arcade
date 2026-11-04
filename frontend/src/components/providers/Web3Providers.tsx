"use client";

/**
 * ChainPlay - Web3 Context & State Providers Wrapper
 *
 * Wraps the application with:
 * - WagmiProvider (Wagmi v2 multi-chain configuration)
 * - QueryClientProvider (TanStack React Query client)
 * - RainbowKitProvider (Cyberpunk dark themed wallet modal)
 *
 * Zero `any` types. Strict TypeScript.
 */

import React, { useState } from "react";
import { WagmiProvider, type State } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { wagmiConfig } from "@/config/wagmi";

export interface Web3ProvidersProps {
  readonly children: React.ReactNode;
  readonly initialState?: State;
}

export function Web3Providers({
  children,
  initialState,
}: Web3ProvidersProps): JSX.Element {
  // Lazily instantiate QueryClient once per component tree mount
  const [queryClient] = useState<QueryClient>(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5_000,
            gcTime: 60_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  );

  return (
    <WagmiProvider config={wagmiConfig} initialState={initialState}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: "#00F0FF",
            accentColorForeground: "#07090E",
            borderRadius: "medium",
            fontStack: "system",
            overlayBlur: "small",
          })}
          modalSize="compact"
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default Web3Providers;
