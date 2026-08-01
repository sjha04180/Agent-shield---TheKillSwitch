// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./AccessController.sol";
import "./KillSwitch.sol";
import "./PolicyManager.sol";
import "./AgentWallet.sol";

contract TransactionExecutor is AccessController {
    KillSwitch public killSwitch;
    PolicyManager public policyManager;
    address public gatewaySigner;

    mapping(address => uint256) public nonces;

    event TransactionExecuted(address indexed agent, address indexed wallet, address indexed target, uint256 value);
    event TransactionBlocked(address indexed agent, address indexed wallet, string reason);
    event GatewaySignerChanged(address indexed oldSigner, address indexed newSigner);

    constructor(address _killSwitch, address _policyManager, address _signer) {
        killSwitch = KillSwitch(_killSwitch);
        policyManager = PolicyManager(_policyManager);
        gatewaySigner = _signer;
    }

    function execute(
        address agent,
        address payable wallet,
        address target,
        uint256 value,
        bytes calldata data,
        uint256 deadline,
        bytes calldata signature
    ) external onlyRole(Role.Operator) returns (bytes memory) {
        // 1. Verify global and wallet halts
        require(!killSwitch.isHalted(agent, wallet), "TransactionExecutor: operations are frozen");
        require(block.timestamp <= deadline, "TransactionExecutor: transaction authorization expired");

        // 2. Cryptographic signature check
        bytes32 messageHash = keccak256(abi.encodePacked(
            agent,
            wallet,
            target,
            value,
            data,
            nonces[wallet],
            deadline
        ));
        
        address recovered = recoverSigner(messageHash, signature);
        require(recovered == gatewaySigner, "TransactionExecutor: invalid policy engine signature authorization");

        // Increment nonce
        nonces[wallet]++;

        // 3. Forward execution call to the agent contract wallet
        bytes memory result = AgentWallet(wallet).execute(target, value, data);

        emit TransactionExecuted(agent, wallet, target, value);
        return result;
    }

    function changeGatewaySigner(address newSigner) external onlyRole(Role.Admin) {
        require(newSigner != address(0), "TransactionExecutor: invalid address");
        emit GatewaySignerChanged(gatewaySigner, newSigner);
        gatewaySigner = newSigner;
    }

    // Helper functions for custom signature check
    function recoverSigner(bytes32 messageHash, bytes memory signature) public pure returns (address) {
        require(signature.length == 65, "TransactionExecutor: invalid signature length");
        bytes32 r;
        bytes32 s;
        uint8 v;

        assembly {
            r := mload(add(signature, 32))
            s := mload(add(signature, 64))
            v := byte(0, mload(add(signature, 96)))
        }

        bytes32 ethSignedMessageHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash));
        return ecrecover(ethSignedMessageHash, v, r, s);
    }
}
