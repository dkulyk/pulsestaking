// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// Only used to help typechain generate assets needed for deployment
contract MockERC20 is ERC20 {
    constructor() ERC20("dummyname", "dummysymbol") {}

    function freeMint(uint256 amount) public {
        _mint(msg.sender, amount);
    }
}
