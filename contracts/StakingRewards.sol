// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165.sol";

import "./RewardsDistributionRecipient.sol";
import "./interfaces/IBurnRedeemable.sol";
import "./interfaces/IBurnableToken.sol";

/**
 * @notice A staking contract based on Synthetix staking
 */
contract StakingRewards is IBurnRedeemable, ERC165, RewardsDistributionRecipient, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /* ========== STATE VARIABLES ========== */

    /**
     * @notice Token to be used for staking
     */
    IERC20 public immutable stakingToken;

    /**
     * @notice Address of the XEN token
     */
    address public immutable xenToken;

    /**
     * @notice Percentage of XEN to be burned
     */
    uint8 public constant XEN_BURN_FEE_PERCENT = 1;

    /**
     * @notice At which timestamp the current staking period ends
     */
    uint256 public periodFinish = 0;

    /**
     * @notice How many reward tokens to reward per second per staked token
     */
    uint256 public rewardRate = 0;

    /**
     * @notice Duration of the staking period
     */
    uint256 public constant rewardsDuration = 7 days;

    /**
     * @notice When were rewards input the last time
     */
    uint256 public lastUpdateTime;

    /**
     * @notice Previous reward rate
     */
    uint256 public rewardPerTokenStored;

    /**
     * @notice How many tokens have already been paid to the user
     */
    mapping(address => uint256) public userRewardPerTokenPaid;

    /**
     * @notice How much rewards the address should get
     */
    mapping(address => uint256) public rewards;

    /**
     * @notice How many tokens have been staked in total
     */
    uint256 private _totalSupply;

    /**
     * @notice How much each address has staked
     */
    mapping(address => uint256) private _balances;

    /* ========== CONSTRUCTOR ========== */

    /**
     * @dev Called when the contract is being deployed
     * @param _rewardsDistribution The address which is allowed to send rewards
     * @param _stakingToken Token to be staked in the contract
     * @param _xenToken Address of the XEN token
     */
    constructor(
        address _rewardsDistribution,
        address _stakingToken,
        address _xenToken
    ) RewardsDistributionRecipient(_rewardsDistribution) {
        stakingToken = IERC20(_stakingToken);
        xenToken = _xenToken;
    }

    /* ========== VIEWS ========== */

    /**
     * @dev See {IERC165-supportsInterface}.
     */
    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC165) returns (bool) {
        return
        interfaceId == type(IBurnRedeemable).interfaceId ||
        super.supportsInterface(interfaceId);
    }

    /**
     * @notice Total staked tokens
     */
    function totalSupply() external view returns (uint256) {
        return _totalSupply;
    }

    /**
     * @notice How many tokens an address has staked
     * @param account The address
     */
    function balanceOf(address account) external view returns (uint256) {
        return _balances[account];
    }

    /**
     * @notice Returns either latest timestamp or the staking period finish timestamp, whichever is earlier
     */
    function lastTimeRewardApplicable() public view returns (uint256) {
        return block.timestamp < periodFinish ? block.timestamp : periodFinish;
    }

    /**
     * @notice Calculates how much rewards should be given per staked token
     */
    function rewardPerToken() public view returns (uint256) {
        if (_totalSupply == 0) {
            return rewardPerTokenStored;
        }
        return
            rewardPerTokenStored +
            (((lastTimeRewardApplicable() - lastUpdateTime) *
                rewardRate *
                1e18) / _totalSupply);
    }

    /**
     * @notice How much rewards an address has accumulated so far
     * @param account The address to check
     */
    function earned(address account) public view returns (uint256) {
        return
            ((_balances[account] *
                (rewardPerToken() - userRewardPerTokenPaid[account])) / 1e18) +
            rewards[account];
    }

    /**
     * @notice Calculates how much rewards may be gained in a staking period
     */
    function getRewardForDuration() external view returns (uint256) {
        return rewardRate * rewardsDuration;
    }

    /* ========== MUTATIVE FUNCTIONS ========== */

    /**
     * @notice Adds a stake or increases an existing stake
     * @param amount How much to stake. Allowance has to be given before calling this.
     */
    function stake(
        uint256 amount
    ) external nonReentrant updateReward(msg.sender) {
        require(amount > 0, "Cannot stake 0");
        //NOTE: Decimals of staking token should be the same as XEN
        IBurnableToken(xenToken).burn(msg.sender, amount * XEN_BURN_FEE_PERCENT / 100);
        _totalSupply = _totalSupply + amount;
        _balances[msg.sender] = _balances[msg.sender] + amount;
        stakingToken.safeTransferFrom(msg.sender, address(this), amount);
        emit Staked(msg.sender, amount);
    }

    /**
     * @notice Withdraw some of your stake
     * @param amount How much to withdraw
     */
    function withdraw(
        uint256 amount
    ) public nonReentrant updateReward(msg.sender) {
        require(amount > 0, "Cannot withdraw 0");
        _totalSupply = _totalSupply - amount;
        _balances[msg.sender] = _balances[msg.sender] - amount;
        stakingToken.safeTransfer(msg.sender, amount);
        emit Withdrawn(msg.sender, amount);
    }

    /**
     * @notice Collects all accummulated rewards
     */
    function getReward() public nonReentrant updateReward(msg.sender) {
        uint256 reward = rewards[msg.sender];
        if (reward > 0) {
            rewards[msg.sender] = 0;
            stakingToken.safeTransfer(msg.sender, reward);
            emit RewardPaid(msg.sender, reward);
        }
    }

    /**
     * @notice Withdraw all of your stake and collect all rewards
     */
    function exit() external {
        withdraw(_balances[msg.sender]);
        getReward();
    }

    /**
    * @notice Recover ERC20 tokens from the contract
    */
    function onTokenBurned(address, uint256) view external {
        require(msg.sender == xenToken, "Caller must be XENCrypto");
    }

    /* ========== RESTRICTED FUNCTIONS ========== */

    /**
     * @notice Notify the contract of new rewards.
     * @param reward How much rewards has been added to the contract.
     * IMPORTANT: never notify of more rewards than has been input.
     * Notifying too high an amount will screw up the reward calculations.
     * This is luckily handled by the calling entity.
     */
    function notifyRewardAmount(
        uint256 reward
    ) external override onlyRewardsDistribution updateReward(address(0)) {
        if (block.timestamp >= periodFinish) {
            rewardRate = reward / rewardsDuration;
        } else {
            uint256 remaining = periodFinish - block.timestamp;
            uint256 leftover = remaining * rewardRate;
            rewardRate = (reward + leftover) / rewardsDuration;
        }

        // Ensure the provided reward amount is not more than the balance in the contract.
        // This keeps the reward rate in the right range, preventing overflows due to
        // very high values of rewardRate in the earned and rewardsPerToken functions;
        // Reward + leftover must be less than 2^256 / 10^18 to avoid overflow.
        uint rewardBalance = stakingToken.balanceOf(address(this)) - _totalSupply;
        require(
            rewardRate <= rewardBalance / rewardsDuration,
            "Provided reward too high"
        );

        lastUpdateTime = block.timestamp;
        periodFinish = block.timestamp + rewardsDuration;
        emit RewardAdded(reward);
    }

    /* ========== MODIFIERS ========== */

    modifier updateReward(address account) {
        rewardPerTokenStored = rewardPerToken();
        lastUpdateTime = lastTimeRewardApplicable();
        if (account != address(0)) {
            rewards[account] = earned(account);
            userRewardPerTokenPaid[account] = rewardPerTokenStored;
        }
        _;
    }

    /* ========== EVENTS ========== */

    event RewardAdded(uint256 reward);
    event Staked(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event RewardPaid(address indexed user, uint256 reward);
    event XenBurnPercentUpdated(uint16 newPercent);
}
