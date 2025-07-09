// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title TestTokenB
 * @notice Test ERC-20 Token B for SimpleSwap testing (like USDC)
 * @dev This is a test token with 6 decimals and public mint function
 */
contract TestTokenB is ERC20 {
    uint8 private constant _DECIMALS = 6;

    /**
     * @dev Mints initial supply to the deployer (1 million tokens)
     */
    constructor() ERC20("TestTokenB", "TTB") {
        _mint(msg.sender, 1_000_000 * 10**decimals());
    }

    /**
     * @notice Mints tokens to the specified address
     * @dev Public function for testing purposes - no access control
     * @param to The address that will receive the minted tokens
     * @param amount The amount of tokens to mint (in token's base units)
     */
    function mint(address to, uint256 amount) public {
        _mint(to, amount);
    }

    /**
     * @notice Returns the number of decimals used
     * @dev Overrides the default implementation to return 6 decimals (like USDC)
     * @return uint8 Number of decimals (6)
     */
    function decimals() public pure override returns (uint8) {
        return _DECIMALS;
    }

    /**
     * @notice Faucet function to get free test tokens
     * @dev Mints tokens to the message sender's address
     * @param amount The amount of tokens to mint (in token's base units)
     */
    function faucet(uint256 amount) external {
        _mint(msg.sender, amount);
    }
}
