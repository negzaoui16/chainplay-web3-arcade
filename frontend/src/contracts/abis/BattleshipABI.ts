/**
 * ChainPlay - Battleship Smart Contract ABI
 * Strictly typed with `as const` for Viem / Wagmi inference.
 */

export const BattleshipABI = [
  // Functions
  {
    type: "function",
    name: "commitBoard",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "gameId",
        type: "uint256",
      },
      {
        name: "boardHash",
        type: "bytes32",
      },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "fireShot",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "gameId",
        type: "uint256",
      },
      {
        name: "x",
        type: "uint8",
      },
      {
        name: "y",
        type: "uint8",
      },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "revealShotAndFireNext",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "gameId",
        type: "uint256",
      },
      {
        name: "prevX",
        type: "uint8",
      },
      {
        name: "prevY",
        type: "uint8",
      },
      {
        name: "isHit",
        type: "bool",
      },
      {
        name: "sunkShipId",
        type: "uint8",
      },
      {
        name: "proof",
        type: "bytes32",
      },
      {
        name: "nextX",
        type: "uint8",
      },
      {
        name: "nextY",
        type: "uint8",
      },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "verifyFinalBoard",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "gameId",
        type: "uint256",
      },
      {
        name: "flatBoard",
        type: "uint8[100]",
      },
      {
        name: "salt",
        type: "bytes32",
      },
    ],
    outputs: [
      {
        name: "valid",
        type: "bool",
      },
    ],
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
  // Events
  {
    type: "event",
    name: "BoardCommitted",
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
        name: "boardHash",
        type: "bytes32",
      },
    ],
  },
  {
    type: "event",
    name: "ShotFired",
    inputs: [
      {
        indexed: true,
        name: "gameId",
        type: "uint256",
      },
      {
        indexed: true,
        name: "attacker",
        type: "address",
      },
      {
        indexed: false,
        name: "x",
        type: "uint8",
      },
      {
        indexed: false,
        name: "y",
        type: "uint8",
      },
    ],
  },
  {
    type: "event",
    name: "ShotRevealed",
    inputs: [
      {
        indexed: true,
        name: "gameId",
        type: "uint256",
      },
      {
        indexed: true,
        name: "defender",
        type: "address",
      },
      {
        indexed: false,
        name: "x",
        type: "uint8",
      },
      {
        indexed: false,
        name: "y",
        type: "uint8",
      },
      {
        indexed: false,
        name: "isHit",
        type: "bool",
      },
      {
        indexed: false,
        name: "sunkShipId",
        type: "uint8",
      },
    ],
  },
  {
    type: "event",
    name: "BoardVerified",
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
        name: "isValid",
        type: "bool",
      },
    ],
  },
  {
    type: "event",
    name: "BattleshipWon",
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
    ],
  },
] as const;

export default BattleshipABI;
