/**
 * ChainPlay - Memory Duel Smart Contract ABI
 * Strictly typed with `as const` for Viem / Wagmi inference.
 */

export const MemoryDuelABI = [
  // Functions
  {
    type: "function",
    name: "initializeDeck",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "gameId",
        type: "uint256",
      },
      {
        name: "deckCommitment",
        type: "bytes32",
      },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "flipPair",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "gameId",
        type: "uint256",
      },
      {
        name: "cardIndex1",
        type: "uint8",
      },
      {
        name: "cardIndex2",
        type: "uint8",
      },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "claimTimeoutWin",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "gameId",
        type: "uint256",
      },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "getGameState",
    stateMutability: "view",
    inputs: [
      {
        name: "gameId",
        type: "uint256",
      },
    ],
    outputs: [
      {
        name: "currentTurn",
        type: "address",
      },
      {
        name: "p1Score",
        type: "uint8",
      },
      {
        name: "p2Score",
        type: "uint8",
      },
      {
        name: "matchedPairs",
        type: "uint8",
      },
      {
        name: "status",
        type: "uint8",
      },
      {
        name: "winner",
        type: "address",
      },
    ],
  },
  // Events
  {
    type: "event",
    name: "PairFlipped",
    inputs: [
      {
        indexed: true,
        name: "gameId",
        type: "uint256",
      },
      {
        indexed: true,
        name: "player",
        type: "address",
      },
      {
        indexed: false,
        name: "cardIndex1",
        type: "uint8",
      },
      {
        indexed: false,
        name: "cardIndex2",
        type: "uint8",
      },
      {
        indexed: false,
        name: "isMatch",
        type: "bool",
      },
      {
        indexed: false,
        name: "symbolId",
        type: "uint8",
      },
    ],
  },
  {
    type: "event",
    name: "MemoryDuelWon",
    inputs: [
      {
        indexed: true,
        name: "gameId",
        type: "uint256",
      },
      {
        indexed: true,
        name: "winner",
        type: "address",
      },
      {
        indexed: false,
        name: "p1Score",
        type: "uint8",
      },
      {
        indexed: false,
        name: "p2Score",
        type: "uint8",
      },
    ],
  },
] as const;

export default MemoryDuelABI;
