// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract AgentWallet {
    address public walletOwner;
    address public transactionExecutor;

    event FundsReceived(address indexed sender, uint256 amount);
    event ExecutionCompleted(address indexed target, uint256 value, bytes data);

    modifier onlyExecutor() {
        require(msg.sender == transactionExecutor, "AgentWallet: caller is not the TransactionExecutor");
        _;
    }

    modifier onlyOwner() {
        require(msg.sender == walletOwner, "AgentWallet: caller is not the wallet owner");
        _;
    }

    constructor(address _owner, address _executor) {
        walletOwner = _owner;
        transactionExecutor = _executor;
    }

    receive() external payable {
        emit FundsReceived(msg.sender, msg.value);
    }

    function execute(
        address target,
        uint256 value,
        bytes calldata data
    ) external onlyExecutor returns (bytes memory) {
        (bool success, bytes memory result) = target.call{value: value}(data);
        require(success, "AgentWallet: transaction call execution reverted");
        emit ExecutionCompleted(target, value, data);
        return result;
    }

    function changeExecutor(address newExecutor) external onlyOwner {
        transactionExecutor = newExecutor;
    }

    function recoveryWithdraw() external onlyOwner {
        payable(walletOwner).transfer(address(this).balance);
    }
}
