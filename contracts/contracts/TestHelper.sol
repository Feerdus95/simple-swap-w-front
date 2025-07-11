// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

import "./SimpleSwap.sol";

// This mock contract exposes internal helper functions for unit testing.
contract TestHelper is SimpleSwap {
    function testSqrt(uint256 y) external pure returns (uint256) {
        return sqrt(y);
    }
    function testGetAmountOut(uint256 a, uint256 b, uint256 c) external pure returns (uint256) {
        return getAmountOut(a, b, c);
    }
    function testSortTokens(address a, address b) external pure returns (address, address) {
        return sortTokens(a, b);
    }
}