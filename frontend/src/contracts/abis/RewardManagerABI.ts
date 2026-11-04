/**
 * ChainPlay - RewardManager Smart Contract ABI
 * Strictly typed with `as const` for Viem / Wagmi inference.
 */

export const RewardManagerABI = [
  // Functions
  {
    type: "function",
    name: "claimableRewards",
    stateMutability: "view",
    inputs: [
      {
        name: "player",
        type: "address",
      },
    ],
    outputs: [
      {
        name: "amount",
        type: "uint256",
      },
    ],
  },
  {
    type: "function",
    name: "withdrawRewards",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  // Events
  {
    type: "event",
    name: "RewardsClaimed",
    inputs: [
      {
        indexed: true,
        name: "player",
        type: "address",
      },
      {
        indexed: false,
        name: "amount",
        type: "uint256",
      },
    ],
  },
  {
    type: "event",
    name: "RewardsDeposited",
    inputs: [
      {
        indexed: true,
        name: "player",
        type: "address",
      },
      {
        indexed: false,
        name: "amount",
        type: "uint256",
      },
    ],
  },
] as const;

export default RewardManagerABI;
