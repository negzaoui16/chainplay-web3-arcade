import { NextResponse } from "next/server";
import { createWalletClient, createPublicClient, http, parseEther, isAddress, defineChain } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { ChainPlayTokenABI } from "@/contracts/abis/ChainPlayTokenABI";
import { HEDERA_CONTRACTS } from "@/contracts/addresses";

const hederaChain = defineChain({
  id: 296,
  name: "Hedera Testnet",
  nativeCurrency: {
    name: "Hedera",
    symbol: "HBAR",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [process.env.NEXT_PUBLIC_HEDERA_TESTNET_RPC || "https://testnet.hashio.io/api"],
    },
  },
});

const OPERATOR_PRIVATE_KEY = process.env.HEDERA_OPERATOR_PRIVATE_KEY as `0x${string}`;

export async function POST(request: Request) {
  try {
    if (!OPERATOR_PRIVATE_KEY) {
      return NextResponse.json(
        { success: false, error: "Server misconfiguration: missing HEDERA_OPERATOR_PRIVATE_KEY" },
        { status: 500 }
      );
    }
    const body = await request.json();
    const { playerAddress } = body;

    if (!playerAddress || !isAddress(playerAddress)) {
      return NextResponse.json(
        { success: false, error: "Invalid player wallet address" },
        { status: 400 }
      );
    }

    const account = privateKeyToAccount(OPERATOR_PRIVATE_KEY);
    const walletClient = createWalletClient({
      account,
      chain: hederaChain,
      transport: http(
        process.env.NEXT_PUBLIC_HEDERA_TESTNET_RPC || "https://testnet.hashio.io/api"
      ),
    });

    const publicClient = createPublicClient({
      chain: hederaChain,
      transport: http(
        process.env.NEXT_PUBLIC_HEDERA_TESTNET_RPC || "https://testnet.hashio.io/api"
      ),
    });

    const amount = parseEther("500"); // 500 CPT Starter Pack

    // Transfer 500 CPT from deployer reserves to the player
    const txHash = await walletClient.writeContract({
      address: HEDERA_CONTRACTS.chainPlayToken,
      abi: ChainPlayTokenABI,
      functionName: "transfer",
      args: [playerAddress as `0x${string}`, amount],
    });

    // Wait for Hedera receipt
    await publicClient.waitForTransactionReceipt({ hash: txHash });

    return NextResponse.json({
      success: true,
      txHash,
      amount: "500 CPT",
      recipient: playerAddress,
    });
  } catch (error) {
    console.error("Faucet error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to claim faucet tokens",
      },
      { status: 500 }
    );
  }
}
