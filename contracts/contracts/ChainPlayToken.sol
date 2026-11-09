// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title ChainPlayToken (CPT)
 * @author ChainPlay Team
 * @notice Standard ERC-20 Gaming Token for the ChainPlay Web3 Arcade platform.
 * @dev Implements OpenZeppelin ERC20 with Burnable, Pausable, and Role-Based Access Control.
 *      Initial supply of 1,000,000 CPT is minted to the initial owner on deployment.
 */
contract ChainPlayToken is ERC20, ERC20Burnable, ERC20Pausable, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    uint256 public constant INITIAL_SUPPLY = 1_000_000 * 10 ** 18;

    /**
     * @notice Emitted when tokens are minted by an authorized minter.
     */
    event TokensMinted(address indexed to, uint256 amount, address indexed minter);

    /**
     * @notice Deploys the ChainPlayToken with 1,000,000 CPT minted to initialOwner.
     * @param initialOwner Address receiving default admin, minter, pauser roles, and initial supply.
     */
    constructor(address initialOwner) ERC20("ChainPlay Token", "CPT") {
        require(initialOwner != address(0), "ChainPlayToken: initialOwner is zero address");

        _grantRole(DEFAULT_ADMIN_ROLE, initialOwner);
        _grantRole(MINTER_ROLE, initialOwner);
        _grantRole(PAUSER_ROLE, initialOwner);

        _mint(initialOwner, INITIAL_SUPPLY);
    }

    /**
     * @notice Mints new CPT tokens to the specified recipient.
     * @dev Restricted to callers with MINTER_ROLE (e.g. TokenManager or Admin).
     * @param to Recipient address receiving the tokens.
     * @param amount Token amount to mint in wei units.
     */
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        require(to != address(0), "ChainPlayToken: cannot mint to zero address");
        require(amount > 0, "ChainPlayToken: mint amount must be greater than zero");
        _mint(to, amount);
        emit TokensMinted(to, amount, msg.sender);
    }

    /**
     * @notice Pauses all token transfers, minting, and burning.
     * @dev Restricted to callers with PAUSER_ROLE.
     */
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    /**
     * @notice Unpauses token transfers.
     * @dev Restricted to callers with PAUSER_ROLE.
     */
    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    /**
     * @dev Hook that is called before any transfer of tokens (including minting and burning).
     *      Overrides both ERC20 and ERC20Pausable for OpenZeppelin v5 compatibility.
     */
    function _update(address from, address to, uint256 value)
        internal
        override(ERC20, ERC20Pausable)
    {
        super._update(from, to, value);
    }
}
