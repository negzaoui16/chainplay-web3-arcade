/**
 * ChainPlay - TicTacToe Smart Contract ABI
 * Strictly typed with `as const` for Viem / Wagmi inference.
 */

export const TicTacToeABI = [
  // Functions
  {
    type: "function",
    name: "makeMove",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "gameId",
        type: "uint256",
      },
      {
        name: "cellIndex",
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
    name: "getBoard",
    stateMutability: "view",
    inputs: [
      {
        name: "gameId",
        type: "uint256",
      },
    ],
    outputs: [
      {
        name: "board",
        type: "uint8[9]",
      },
      {
        name: "currentTurn",
        type: "address",
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
    name: "MoveMade",
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
        name: "cellIndex",
        type: "uint8",
      },
      {
        indexed: false,
        name: "symbol",
        type: "uint8",
      },
    ],
  },
  {
    type: "event",
    name: "TicTacToeWon",
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
        name: "winningLine",
        type: "uint8[3]",
      },
    ],
  },
  {
    type: "event",
    name: "TicTacToeDraw",
    inputs: [
      {
        indexed: true,
        name: "gameId",
        type: "uint256",
      },
    ],
  },
] as const;

export default TicTacToeABI;
