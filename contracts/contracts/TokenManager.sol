// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title TokenManager
 * @author ChainPlay Team
 * @notice Manages player reward distributions, anti-replay game accounting, and the CPT token economy.
 * @dev Implements EIP-712 typed signature verification so an authorized game operator/backend
 *      can sign verified game outcomes, and players claim their CPT reward on-chain with zero counterparty risk.
 */
contract TokenManager is EIP712, AccessControl, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    bytes32 public constant REWARD_VOUCHER_TYPEHASH = keccak256(
        "RewardVoucher(bytes32 gameId,uint8 gameType,address player,uint256 winAmount,uint256 participationAmount,uint256 nonce,uint256 deadline)"
    );

    /// @notice The ERC-20 token distributed by this manager (ChainPlayToken).
    IERC20 public immutable token;

    /// @notice Tracks whether a specific game outcome has already been claimed (Anti-Replay).
    mapping(bytes32 => bool) public isGameRewarded;

    /// @notice Total tokens claimed per player.
    mapping(address => uint256) public playerTotalClaimed;

    /// @notice Total recorded wins per player.
    mapping(address => uint256) public playerTotalWins;

    /// @notice Cumulative CPT tokens distributed across all games.
    uint256 public totalDistributed;

    /**
     * @notice Cryptographic reward voucher presented by a player to claim winnings.
     */
    struct RewardVoucher {
        bytes32 gameId;              // Unique identifier of the game match
        uint8 gameType;              // 0: TicTacToe, 1: Battleship, 2: MemoryDuel
        address player;              // Player wallet entitled to claim
        uint256 winAmount;           // CPT reward for victory (in wei units)
        uint256 participationAmount; // CPT reward for match participation (in wei units)
        uint256 nonce;               // Salt nonce preventing hash collision
        uint256 deadline;            // Timestamp after which voucher expires
    }

    // Events
    event RewardClaimed(
        bytes32 indexed gameId,
        address indexed player,
        uint8 gameType,
        uint256 winAmount,
        uint256 participationAmount,
        uint256 totalAmount
    );
    event BatchRewardsDistributed(
        uint256 indexed batchSize,
        uint256 totalDistributedAmount
    );
    event EmergencyWithdrawn(
        address indexed token,
        address indexed to,
        uint256 amount
    );

    /**
     * @notice Initializes the TokenManager contract.
     * @param _token Address of the ChainPlayToken (CPT) contract.
     * @param admin Address receiving DEFAULT_ADMIN_ROLE and PAUSER_ROLE.
     * @param operator Address receiving OPERATOR_ROLE (signs game outcome vouchers).
     */
    constructor(
        address _token,
        address admin,
        address operator
    ) EIP712("ChainPlay TokenManager", "1") {
        require(_token != address(0), "TokenManager: token is zero address");
        require(admin != address(0), "TokenManager: admin is zero address");
        require(operator != address(0), "TokenManager: operator is zero address");

        token = IERC20(_token);

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(PAUSER_ROLE, admin);
        _grantRole(OPERATOR_ROLE, operator);
    }

    /**
     * @notice Claims winnings and participation rewards using an EIP-712 voucher signed by an authorized operator.
     * @param voucher Reward details signed off-chain.
     * @param signature Cryptographic ECDSA signature from the operator.
     */
    function claimRewardWithVoucher(
        RewardVoucher calldata voucher,
        bytes calldata signature
    ) external nonReentrant whenNotPaused {
        require(block.timestamp <= voucher.deadline, "TokenManager: voucher expired");
        require(msg.sender == voucher.player, "TokenManager: claimant must be voucher player");
        require(!isGameRewarded[voucher.gameId], "TokenManager: game already rewarded");

        uint256 totalReward = voucher.winAmount + voucher.participationAmount;
        require(totalReward > 0, "TokenManager: total reward must be greater than zero");

        // Verify EIP-712 signature
        bytes32 structHash = keccak256(
            abi.encode(
                REWARD_VOUCHER_TYPEHASH,
                voucher.gameId,
                voucher.gameType,
                voucher.player,
                voucher.winAmount,
                voucher.participationAmount,
                voucher.nonce,
                voucher.deadline
            )
        );

        bytes32 digest = _hashTypedDataV4(structHash);
        address recoveredSigner = ECDSA.recover(digest, signature);

        require(
            hasRole(OPERATOR_ROLE, recoveredSigner),
            "TokenManager: invalid operator signature"
        );

        // Verify contract vault balance
        uint256 balance = token.balanceOf(address(this));
        require(balance >= totalReward, "TokenManager: insufficient vault balance");

        // Mark as rewarded immediately before transfer (Checks-Effects-Interactions)
        isGameRewarded[voucher.gameId] = true;
        totalDistributed += totalReward;
        playerTotalClaimed[voucher.player] += totalReward;

        if (voucher.winAmount > 0) {
            playerTotalWins[voucher.player] += 1;
        }

        // Safe transfer tokens to player
        token.safeTransfer(voucher.player, totalReward);

        emit RewardClaimed(
            voucher.gameId,
            voucher.player,
            voucher.gameType,
            voucher.winAmount,
            voucher.participationAmount,
            totalReward
        );
    }

    /**
     * @notice Allows operator or admin to batch-distribute rewards directly (e.g. tournament or seasonal drops).
     * @param gameIds Array of unique game IDs for anti-replay tracking.
     * @param recipients Array of recipient addresses.
     * @param amounts Array of token amounts to send.
     */
    function batchDistributeRewards(
        bytes32[] calldata gameIds,
        address[] calldata recipients,
        uint256[] calldata amounts
    ) external onlyRole(OPERATOR_ROLE) nonReentrant whenNotPaused {
        require(
            gameIds.length == recipients.length && recipients.length == amounts.length,
            "TokenManager: array length mismatch"
        );

        uint256 batchTotal = 0;
        for (uint256 i = 0; i < recipients.length; i++) {
            bytes32 gId = gameIds[i];
            address recipient = recipients[i];
            uint256 amount = amounts[i];

            require(!isGameRewarded[gId], "TokenManager: game in batch already rewarded");
            require(recipient != address(0), "TokenManager: recipient is zero address");
            require(amount > 0, "TokenManager: amount must be greater than zero");

            isGameRewarded[gId] = true;
            playerTotalClaimed[recipient] += amount;
            batchTotal += amount;

            token.safeTransfer(recipient, amount);

            emit RewardClaimed(gId, recipient, 255, amount, 0, amount);
        }

        totalDistributed += batchTotal;
        emit BatchRewardsDistributed(recipients.length, batchTotal);
    }

    /**
     * @notice Returns the CPT balance held in this contract's reward vault.
     */
    function vaultBalance() external view returns (uint256) {
        return token.balanceOf(address(this));
    }

    /**
     * @notice Returns recorded stats for a specific player.
     * @param player Address of the player.
     * @return totalClaimed Total CPT claimed by the player.
     * @return totalWins Total victory matches recorded.
     */
    function getPlayerStats(address player)
        external
        view
        returns (uint256 totalClaimed, uint256 totalWins)
    {
        return (playerTotalClaimed[player], playerTotalWins[player]);
    }

    /**
     * @notice Returns the EIP-712 domain separator used for off-chain voucher signing.
     */
    function domainSeparator() external view returns (bytes32) {
        return _domainSeparatorV4();
    }

    /**
     * @notice Pauses contract claim execution in an emergency.
     */
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    /**
     * @notice Unpauses contract claim execution.
     */
    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    /**
     * @notice Allows admin to recover accidentally sent tokens or reallocate unspent vault funds.
     * @param tokenAddress Address of the token to withdraw.
     * @param to Destination address.
     * @param amount Amount to withdraw.
     */
    function emergencyWithdraw(
        address tokenAddress,
        address to,
        uint256 amount
    ) external onlyRole(DEFAULT_ADMIN_ROLE) nonReentrant {
        require(to != address(0), "TokenManager: cannot withdraw to zero address");
        require(amount > 0, "TokenManager: amount must be greater than zero");

        IERC20(tokenAddress).safeTransfer(to, amount);
        emit EmergencyWithdrawn(tokenAddress, to, amount);
    }
}
