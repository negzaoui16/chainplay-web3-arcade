import { NextResponse } from "next/server";
import { privateKeyToAccount } from "viem/accounts";
import { keccak256, toHex, parseEther, isAddress } from "viem";
import { HEDERA_CONTRACTS } from "@/contracts/addresses";
import { CHAIN_IDS } from "@/config/constants";

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
    const { gameId, gameType = 0, player, outcome } = body;

    if (!player || !isAddress(player)) {
      return NextResponse.json(
        { success: false, error: "Invalid player wallet address" },
        { status: 400 }
      );
    }

    if (!gameId) {
      return NextResponse.json(
        { success: false, error: "Missing gameId" },
        { status: 400 }
      );
    }

    if (outcome !== "victory") {
      return NextResponse.json(
        { success: false, error: "Rewards are only claimable upon victory." },
        { status: 400 }
      );
    }

    // Convert gameId to bytes32 format
    const formattedGameId: `0x${string}` = gameId.startsWith("0x") && gameId.length === 66
      ? (gameId as `0x${string}`)
      : keccak256(toHex(gameId));

    // Calculate reward amount: 120 CPT on victory (60 stake returned + 60 winnings)
    const winAmount = parseEther("120");
    const participationAmount = 0n;

    const nonce = BigInt(Math.floor(Date.now() * 1000 + Math.random() * 999));
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 7200); // 2 hours

    const account = privateKeyToAccount(OPERATOR_PRIVATE_KEY);

    const domain = {
      name: "ChainPlay TokenManager",
      version: "1",
      chainId: CHAIN_IDS.HEDERA_TESTNET,
      verifyingContract: HEDERA_CONTRACTS.tokenManager,
    };

    const types = {
      RewardVoucher: [
        { name: "gameId", type: "bytes32" },
        { name: "gameType", type: "uint8" },
        { name: "player", type: "address" },
        { name: "winAmount", type: "uint256" },
        { name: "participationAmount", type: "uint256" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" },
      ],
    } as const;

    const message = {
      gameId: formattedGameId,
      gameType: Number(gameType),
      player: player as `0x${string}`,
      winAmount,
      participationAmount,
      nonce,
      deadline,
    };

    const signature = await account.signTypedData({
      domain,
      types,
      primaryType: "RewardVoucher",
      message,
    });

    return NextResponse.json({
      success: true,
      voucher: {
        gameId: formattedGameId,
        gameType: Number(gameType),
        player,
        winAmount: winAmount.toString(),
        participationAmount: participationAmount.toString(),
        nonce: nonce.toString(),
        deadline: deadline.toString(),
      },
      signature,
      operator: account.address,
    });
  } catch (error) {
    console.error("Error issuing reward voucher:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to issue voucher",
      },
      { status: 500 }
    );
  }
}
