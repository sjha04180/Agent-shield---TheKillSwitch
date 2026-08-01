// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./AccessController.sol";

contract PolicyManager is AccessController {
    struct PolicyMeta {
        bytes32 ipfsHash;
        uint256 version;
        bool active;
        uint256 createdAt;
    }

    // policyName => PolicyMeta
    mapping(bytes32 => PolicyMeta) public policies;
    // agent => policyName
    mapping(address => bytes32) public agentPolicies;

    event PolicyRegistered(bytes32 indexed policyName, bytes32 ipfsHash, uint256 version);
    event PolicyAssignedToAgent(address indexed agent, bytes32 indexed policyName);
    event PolicyStatusChanged(bytes32 indexed policyName, bool indexed active);

    function registerPolicy(
        bytes32 policyName,
        bytes32 ipfsHash,
        uint256 version
    ) external onlyRole(Role.Admin) {
        policies[policyName] = PolicyMeta({
            ipfsHash: ipfsHash,
            version: version,
            active: true,
            createdAt: block.timestamp
        });
        emit PolicyRegistered(policyName, ipfsHash, version);
    }

    function assignPolicy(address agent, bytes32 policyName) external onlyRole(Role.Owner) {
        require(policies[policyName].active, "PolicyManager: policy is not active");
        agentPolicies[agent] = policyName;
        emit PolicyAssignedToAgent(agent, policyName);
    }

    function togglePolicy(bytes32 policyName, bool active) external onlyRole(Role.Admin) {
        policies[policyName].active = active;
        emit PolicyStatusChanged(policyName, active);
    }

    function getAgentPolicyHash(address agent) external view returns (bytes32) {
        bytes32 policyName = agentPolicies[agent];
        return policies[policyName].ipfsHash;
    }
}
