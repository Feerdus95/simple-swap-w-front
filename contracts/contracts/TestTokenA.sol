// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title TestTokenA
 * @notice Test ERC-20 Token A for SimpleSwap testing
 * @dev This is a test token with 18 decimals and public mint function
 */
contract TestTokenA is ERC20 {
    uint8 private constant _DECIMALS = 18;

    /**
     * @dev Mints initial supply to the deployer (1 million tokens)
     */
    constructor() ERC20("TestTokenA", "TTA") {
        // Mint initial supply to deployer
        uint256 initialSupply = 1_000_000 * 10**decimals();
        _mint(msg.sender, initialSupply);
    }

    /**
     * @notice Mints tokens to the specified address
     * @dev Public function for testing purposes - no access control
     * @param to The address that will receive the minted tokens
     * @param amount The amount of tokens to mint (in wei)
     */
    function mint(address to, uint256 amount) public returns (bool) {
        require(to != address(0), "ERC20: mint to the zero address");
        require(amount > 0, "Amount must be greater than zero");
        _mint(to, amount);
        return true;
    }

    /**
     * @notice Returns the number of decimals used
     * @dev Overrides the default implementation to return 18 decimals
     * @return uint8 Number of decimals (18)
     */
    function decimals() public pure override returns (uint8) {
        return _DECIMALS;
    }

    /**
     * @notice Faucet function to get free test tokens
     * @dev Mints tokens to the message sender's address
     * @param amount The amount of tokens to mint (in wei)
     */
    function faucet(uint256 amount) external returns (bool) {
        require(amount > 0, "Amount must be greater than zero");
        _mint(msg.sender, amount);
        return true;
    }
}
