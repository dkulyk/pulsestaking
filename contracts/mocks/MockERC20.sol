// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @notice An ERC20 which allows anyone to mint any amount. To be used only for testing
 */
contract MockERC20 is ERC20 {
    constructor() ERC20("dummyname", "dummysymbol") {}

    /**
     * @notice Mint any amount to the sender
     * @param amount How many tokens to mint
     */
    function freeMint(uint256 amount) public {
        _mint(msg.sender, amount);
    }
}
