/**
 * ChainPlay - Hedera CPT & TokenManager Hook
 *
 * Direct integration with ChainPlayToken (CPT) and TokenManager deployed on Hedera Testnet:
 * - CPT Token: 0x2D0E84d043Ae598F528FE39229e3DC0F8845A98a
 * - TokenManager: 0x6D22E4bCF8ab77E13FEB5F59E2C7C404aDe610A9
 *
 * Provides:
 * - User CPT balance & formatted balance
 * - TokenManager vault balance
 * - claimRewardWithVoucher (EIP-712 reward redemption)
 * - isGameRewarded anti-replay query
 */

import { useCallback, useEffect, useState } from "react";
import { formatEther, parseEther, createWalletClient, custom } from "viem";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import { ChainPlayTokenABI } from "@/contracts/abis/ChainPlayTokenABI";
import { TokenManagerABI } from "@/contracts/abis/TokenManagerABI";
import { HEDERA_CONTRACTS } from "@/contracts/addresses";
import { hederaTestnetChain } from "@/config/wagmi";

export interface RewardVoucher {
  gameId: `0x${string}`;
  gameType: number;
  player: `0x${string}`;
  winAmount: bigint;
  participationAmount: bigint;
  nonce: bigint;
  deadline: bigint;
}

export interface UseHederaTokenManagerReturn {
  cptBalance: bigint;
  formattedCptBalance: string;
  vaultBalance: bigint;
  formattedVaultBalance: string;
  isLoading: boolean;
  error: Error | null;
  refreshBalances: () => Promise<void>;
  claimRewardWithVoucher: (
    voucher: RewardVoucher,
    signature: `0x${string}`
  ) => Promise<{ success: boolean; txHash?: `0x${string}`; error?: string }>;
  stakeCptForGame: (
    amount?: bigint
  ) => Promise<{ success: boolean; txHash?: `0x${string}`; error?: string }>;
  checkIsGameRewarded: (gameId: `0x${string}`) => Promise<boolean>;
}

export function useHederaTokenManager(): UseHederaTokenManagerReturn {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const [cptBalance, setCptBalance] = useState<bigint>(0n);
  const [vaultBalance, setVaultBalance] = useState<bigint>(0n);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const refreshBalances = useCallback(async () => {
    if (!publicClient) return;

    try {
      setIsLoading(true);
      setError(null);

      // 1. Fetch vault balance
      const vaultBal = (await publicClient.readContract({
        address: HEDERA_CONTRACTS.tokenManager,
        abi: TokenManagerABI,
        functionName: "vaultBalance",
      })) as bigint;
      setVaultBalance(vaultBal);

      // 2. Resolve active address (from Wagmi or window.ethereum fallback)
      let effectiveUser = address;
      if (!effectiveUser && typeof window !== "undefined") {
        const eth = (window as unknown as { ethereum?: { selectedAddress?: string } }).ethereum;
        if (eth?.selectedAddress) {
          effectiveUser = eth.selectedAddress as `0x${string}`;
        }
      }

      // 3. Fetch user balance if connected
      if (effectiveUser) {
        const userBal = (await publicClient.readContract({
          address: HEDERA_CONTRACTS.chainPlayToken,
          abi: ChainPlayTokenABI,
          functionName: "balanceOf",
          args: [effectiveUser],
        })) as bigint;
        setCptBalance(userBal);
      }
    } catch (err: unknown) {
      console.warn("Failed to fetch Hedera token balances:", err);
      if (err instanceof Error) {
        setError(err);
      }
    } finally {
      setIsLoading(false);
    }
  }, [publicClient, address]);

  useEffect(() => {
    refreshBalances();

    const handleBalanceEvent = () => {
      void refreshBalances();
    };

    if (typeof window !== "undefined") {
      window.addEventListener("cpt-balance-updated", handleBalanceEvent);
    }

    // Periodic background sync every 4 seconds to guarantee parity with MetaMask
    const pollInterval = setInterval(() => {
      void refreshBalances();
    }, 4000);

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("cpt-balance-updated", handleBalanceEvent);
      }
      clearInterval(pollInterval);
    };
  }, [refreshBalances]);

  const claimRewardWithVoucher = useCallback(
    async (
      voucher: RewardVoucher,
      signature: `0x${string}`
    ): Promise<{ success: boolean; txHash?: `0x${string}`; error?: string }> => {
      try {
        setIsLoading(true);
        let txHash: `0x${string}` | undefined;

        // Strategy A: If Wagmi is connected and matches voucher player, try writeContractAsync
        if (isConnected && address && address.toLowerCase() === voucher.player.toLowerCase()) {
          try {
            txHash = await writeContractAsync({
              address: HEDERA_CONTRACTS.tokenManager,
              abi: TokenManagerABI,
              functionName: "claimRewardWithVoucher",
              args: [voucher, signature],
            });
          } catch (wagmiErr: unknown) {
            const msg = wagmiErr instanceof Error ? wagmiErr.message : String(wagmiErr);
            // If user explicitly denied/rejected in MetaMask, stop immediately
            if (msg.includes("User rejected") || msg.includes("User denied") || msg.includes("4001")) {
              throw wagmiErr;
            }
            console.warn("Wagmi submission failed, falling back to window.ethereum:", msg);
          }
        }

        // Strategy B: Direct MetaMask (window.ethereum) execution
        // Works 100% reliably even after page refresh or hard reload!
        if (!txHash && typeof window !== "undefined") {
          const ethereum = (window as unknown as {
            ethereum?: {
              request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
            };
          }).ethereum;

          if (!ethereum) {
            throw new Error("MetaMask is not installed or detected in your browser.");
          }

          // Ensure Hedera Testnet network (0x128 = 296)
          try {
            await ethereum.request({
              method: "wallet_switchEthereumChain",
              params: [{ chainId: "0x128" }],
            });
          } catch (switchErr: unknown) {
            const sErr = switchErr as { code?: number };
            if (sErr?.code === 4902) {
              await ethereum.request({
                method: "wallet_addEthereumChain",
                params: [
                  {
                    chainId: "0x128",
                    chainName: "Hedera Testnet",
                    nativeCurrency: { name: "Hedera", symbol: "HBAR", decimals: 18 },
                    rpcUrls: ["https://testnet.hashio.io/api"],
                    blockExplorerUrls: ["https://hashscan.io/testnet"],
                  },
                ],
              });
            }
          }

          // Prompt MetaMask account authorization if needed
          const accounts = (await ethereum.request({
            method: "eth_requestAccounts",
          })) as string[];

          const activeAccount = (accounts[0] as `0x${string}`) || voucher.player;

          const walletClient = createWalletClient({
            chain: hederaTestnetChain,
            transport: custom(ethereum),
          });

          txHash = await walletClient.writeContract({
            address: HEDERA_CONTRACTS.tokenManager,
            abi: TokenManagerABI,
            functionName: "claimRewardWithVoucher",
            args: [voucher, signature],
            account: activeAccount,
          });
        }

        if (!txHash) {
          throw new Error("Unable to execute transaction on Hedera Testnet.");
        }

        // Wait for block consensus on Hedera Testnet
        if (publicClient) {
          try {
            await publicClient.waitForTransactionReceipt({ hash: txHash });
          } catch {
            await new Promise((res) => setTimeout(res, 1500));
          }
        } else {
          await new Promise((res) => setTimeout(res, 1500));
        }

        await refreshBalances();
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("cpt-balance-updated"));
        }
        return { success: true, txHash };
      } catch (err: unknown) {
        const errorMsg =
          err instanceof Error ? err.message : "Failed to claim reward with voucher";
        return { success: false, error: errorMsg };
      } finally {
        setIsLoading(false);
      }
    },
    [isConnected, writeContractAsync, refreshBalances, publicClient]
  );

  const checkIsGameRewarded = useCallback(
    async (gameId: `0x${string}`): Promise<boolean> => {
      if (!publicClient) return false;
      try {
        return (await publicClient.readContract({
          address: HEDERA_CONTRACTS.tokenManager,
          abi: TokenManagerABI,
          functionName: "isGameRewarded",
          args: [gameId],
        })) as boolean;
      } catch {
        return false;
      }
    },
    [publicClient]
  );

  const stakeCptForGame = useCallback(
    async (
      amount: bigint = parseEther("60")
    ): Promise<{ success: boolean; txHash?: `0x${string}`; error?: string }> => {
      try {
        setIsLoading(true);
        let txHash: `0x${string}` | undefined;

        // Ensure MetaMask is available
        if (typeof window !== "undefined") {
          const ethereum = (window as unknown as {
            ethereum?: {
              request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
            };
          }).ethereum;

          if (!ethereum) {
            throw new Error("MetaMask is not installed or detected in your browser.");
          }

          // Ensure Hedera Testnet network (0x128 = 296)
          try {
            await ethereum.request({
              method: "wallet_switchEthereumChain",
              params: [{ chainId: "0x128" }],
            });
          } catch (switchErr: unknown) {
            const sErr = switchErr as { code?: number };
            if (sErr?.code === 4902) {
              await ethereum.request({
                method: "wallet_addEthereumChain",
                params: [
                  {
                    chainId: "0x128",
                    chainName: "Hedera Testnet",
                    nativeCurrency: { name: "Hedera", symbol: "HBAR", decimals: 18 },
                    rpcUrls: ["https://testnet.hashio.io/api"],
                    blockExplorerUrls: ["https://hashscan.io/testnet"],
                  },
                ],
              });
            }
          }

          const accounts = (await ethereum.request({
            method: "eth_requestAccounts",
          })) as string[];

          const activeAccount = accounts[0] as `0x${string}`;
          if (!activeAccount) {
            throw new Error("Please connect and unlock your MetaMask account.");
          }

          const walletClient = createWalletClient({
            chain: hederaTestnetChain,
            transport: custom(ethereum),
          });

          txHash = await walletClient.writeContract({
            address: HEDERA_CONTRACTS.chainPlayToken,
            abi: ChainPlayTokenABI,
            functionName: "transfer",
            args: [HEDERA_CONTRACTS.tokenManager, amount],
            account: activeAccount,
          });
        }

        if (!txHash) {
          throw new Error("Unable to execute staking transaction on Hedera Testnet.");
        }

        // Wait for block consensus on Hedera Testnet so balanceOf reflects the deduction
        if (publicClient) {
          try {
            await publicClient.waitForTransactionReceipt({ hash: txHash });
          } catch {
            await new Promise((res) => setTimeout(res, 1500));
          }
        } else {
          await new Promise((res) => setTimeout(res, 1500));
        }

        await refreshBalances();
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("cpt-balance-updated"));
        }
        return { success: true, txHash };
      } catch (err: unknown) {
        const errorMsg =
          err instanceof Error ? err.message : "Failed to stake CPT for match.";
        return { success: false, error: errorMsg };
      } finally {
        setIsLoading(false);
      }
    },
    [refreshBalances, publicClient]
  );

  return {
    cptBalance,
    formattedCptBalance: formatEther(cptBalance),
    vaultBalance,
    formattedVaultBalance: formatEther(vaultBalance),
    isLoading,
    error,
    refreshBalances,
    claimRewardWithVoucher,
    stakeCptForGame,
    checkIsGameRewarded,
  };
}
