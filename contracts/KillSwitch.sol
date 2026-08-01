// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./AccessController.sol";

contract KillSwitch is AccessController {
    bool public isOrgFrozen;
    
    mapping(address => bool) public frozenAgents;
    mapping(address => bool) public frozenWallets;

    event OrgFrozenStatusChanged(bool indexed status, string reason);
    event AgentFrozenStatusChanged(address indexed agent, bool indexed status, string reason);
    event WalletFrozenStatusChanged(address indexed wallet, bool indexed status, string reason);

    function setOrgFreeze(bool status, string calldata reason) external onlyRole(Role.Admin) {
        isOrgFrozen = status;
        emit OrgFrozenStatusChanged(status, reason);
    }

    function setAgentFreeze(address agent, bool status, string calldata reason) external onlyRole(Role.Owner) {
        frozenAgents[agent] = status;
        emit AgentFrozenStatusChanged(agent, status, reason);
    }

    function setWalletFreeze(address wallet, bool status, string calldata reason) external onlyRole(Role.Owner) {
        frozenWallets[wallet] = status;
        emit WalletFrozenStatusChanged(wallet, status, reason);
    }

    function isHalted(address agent, address wallet) external view returns (bool) {
        return isOrgFrozen || frozenAgents[agent] || frozenWallets[wallet];
    }
}
