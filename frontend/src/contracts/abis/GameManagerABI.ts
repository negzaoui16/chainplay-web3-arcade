/**
 * ChainPlay - GameManager Smart Contract ABI
 * Strictly typed with `as const` for Viem / Wagmi inference.
 */

export const GameManagerABI = [
  // Functions
  {
    type: "function",
    name: "createGame",
    stateMutability: "payable",
    inputs: [
      {
        name: "gameType",
        type: "uint8",
      },
    ],
    outputs: [
      {
        name: "gameId",
        type: "uint256",
      },
    ],
  },
  {
    type: "function",
    name: "joinGame",
    stateMutability: "payable",
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
    name: "cancelWaitingGame",
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
    name: "getGameInfo",
    stateMutability: "view",
    inputs: [
      {
        name: "gameId",
        type: "uint256",
      },
    ],
    outputs: [
      {
        name: "player1",
        type: "address",
      },
      {
        name: "player2",
        type: "address",
      },
      {
        name: "gameType",
        type: "uint8",
      },
      {
        name: "wager",
        type: "uint256",
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
    name: "GameCreated",
    inputs: [
      {
        name: "gameId",
        type: "uint256",
        indexed: true,
      },
      {
        name: "creator",
        type: "address",
        indexed: true,
      },
      {
        name: "gameType",
        type: "uint8",
        indexed: false,
      },
      {
        name: "wager",
        type: "uint256",
        indexed: false,
      },
    ],
  },
  {
    type: "event",
    name: "GameJoined",
    inputs: [
      {
        name: "gameId",
        type: "uint256",
        indexed: true,
      },
      {
        name: "joiner",
        type: "address",
        indexed: true,
      },
    ],
  },
  {
    type: "event",
    name: "GameCancelled",
    inputs: [
      {
        name: "gameId",
        type: "uint256",
        indexed: true,
      },
      {
        name: "player",
        type: "address",
        indexed: true,
      },
    ],
  },
  {
    type: "event",
    name: "GameFinished",
    inputs: [
      {
        name: "gameId",
        type: "uint256",
        indexed: true,
      },
      {
        name: "winner",
        type: "address",
        indexed: true,
      },
      {
        name: "payout",
        type: "uint256",
        indexed: false,
      },
    ],
  },
] as const;

export default GameManagerABI;
