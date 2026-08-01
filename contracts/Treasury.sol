// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./AccessController.sol";

contract Treasury is AccessController {
    bool public isFrozen;

    event Deposit(address indexed sender, uint256 amount);
    event Withdraw(address indexed receiver, uint256 amount);
    event TreasuryFrozen(bool status);

    modifier whenNotFrozen() {
        require(!isFrozen, "Treasury: operations are currently frozen");
        _;
    }

    receive() external payable {
        emit Deposit(msg.sender, msg.value);
    }

    function deposit() external payable {
        emit Deposit(msg.sender, msg.value);
    }

    function withdraw(address payable receiver, uint256 amount) external onlyRole(Role.Owner) whenNotFrozen {
        require(address(this).balance >= amount, "Treasury: insufficient balance");
        receiver.transfer(amount);
        emit Withdraw(receiver, amount);
    }

    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }

    function setFreeze(bool _isFrozen) external onlyRole(Role.Admin) {
        isFrozen = _isFrozen;
        emit TreasuryFrozen(_isFrozen);
    }
}
