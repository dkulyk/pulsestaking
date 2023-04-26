// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "../interfaces/IBurnableToken.sol";

contract MockXEN is IBurnableToken {
    function burn(address user, uint256 amount) external {

    }
}
