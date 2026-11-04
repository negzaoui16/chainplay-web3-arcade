/**
 * ChainPlay - Web3 Abstraction Layer & Contract Hooks
 *
 * Central export hub for all unified dual-mode contract hooks:
 * - useChainPlayMode: Network & mock/on-chain mode dispatcher
 * - useGameManager: Room creation, joining, cancelling, and matchmaking lifecycle
 * - useTicTacToeContract: 3x3 XO turns, bot minimax, and timeout claims
 * - useBattleshipContract: Commit-reveal naval warfare, firing, and board verification
 * - useMemoryDuelContract: 4x4 card duels, turns, and recall AI
 * - useRewardManager: Escrow claims, player XP, and rewards withdrawal
 *
 * Zero `any` types. Strict TypeScript.
 */

export * from "./useChainPlayMode";
export * from "./useGameManager";
export * from "./useTicTacToeContract";
export * from "./useBattleshipContract";
export * from "./useMemoryDuelContract";
export * from "./useRewardManager";
