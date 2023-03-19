// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9;

/**
 * @notice WETH contract with added free minting. Only to be used for testing
 */
contract MockWETH {
    string public name = "Mock Wrapped Ether";
    string public symbol = "MWETH";
    uint8 public decimals = 18;

    event Approval(address indexed src, address indexed guy, uint wad);
    event Transfer(address indexed src, address indexed dst, uint wad);
    event Deposit(address indexed dst, uint wad);
    event Withdrawal(address indexed src, uint wad);

    mapping(address => uint) public balanceOf;
    mapping(address => mapping(address => uint)) public allowance;

    /**
     * @notice Mint any amount to the sender. Note that if the contract doesn't have enough native assets
     * you can never withdraw/redeem these into the native asset.
     * @param amount How many tokens to mint
     */
    function freeMint(uint256 amount) public {
        balanceOf[msg.sender] += amount;
    }

    /**
     * @notice Fallback for any native asset sends. Leads to deposit
     */
    receive() external payable {
        deposit();
    }

    /**
     * @notice Deposit native asset to be converted into a wrapped version
     */
    function deposit() public payable {
        balanceOf[msg.sender] += msg.value;
        emit Deposit(msg.sender, msg.value);
    }

    /**
     * @notice Withdraw tokens back to the native asset
     * @param wad How many tokens to convert to native assets
     */
    function withdraw(uint wad) public {
        require(balanceOf[msg.sender] >= wad);
        balanceOf[msg.sender] -= wad;
        payable(msg.sender).transfer(wad);
        emit Withdrawal(msg.sender, wad);
    }

    /**
     * @notice How much native assets this contract has - equal to the total supply of the wrapped token
     */
    function totalSupply() public view returns (uint) {
        return address(this).balance;
    }

    /**
     * @notice Set approval for someone else to withdraw your tokens
     * @param guy Who is given allowance
     * @param wad How many tokens is the target allowed to withdraw
     */
    function approve(address guy, uint wad) public returns (bool) {
        allowance[msg.sender][guy] = wad;
        emit Approval(msg.sender, guy, wad);
        return true;
    }

    /**
     * @notice Transfer tokens to a receiver
     * @param dst Who is the receiver/destination
     * @param wad How many tokens to transfer
     */
    function transfer(address dst, uint wad) public returns (bool) {
        return transferFrom(msg.sender, dst, wad);
    }

    /**
     * @notice Transfer tokens from an address to a receiver/destination. Requires allowance
     * @param src From which address to transfer from
     * @param dst Who is the receiver/destination
     * @param wad How many tokens to transfer from
     */
    function transferFrom(
        address src,
        address dst,
        uint wad
    ) public returns (bool) {
        require(balanceOf[src] >= wad);

        if (
            src != msg.sender && allowance[src][msg.sender] != type(uint256).max
        ) {
            require(allowance[src][msg.sender] >= wad);
            allowance[src][msg.sender] -= wad;
        }

        balanceOf[src] -= wad;
        balanceOf[dst] += wad;

        emit Transfer(src, dst, wad);

        return true;
    }
}
