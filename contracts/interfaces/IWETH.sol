// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IWETH is IERC20 {
    receive() external payable;

    function deposit() external payable;

    function withdraw(uint wad) external;
}
