// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract AccessController {
    enum Role { Admin, Owner, Auditor, Operator }

    mapping(address => mapping(Role => bool)) private _roles;
    address public contractOwner;

    event RoleGranted(address indexed account, Role indexed role);
    event RoleRevoked(address indexed account, Role indexed role);

    modifier onlyOwner() {
        require(msg.sender == contractOwner, "AccessController: caller is not the owner");
        _;
    }

    modifier onlyRole(Role role) {
        require(_roles[msg.sender][role] || msg.sender == contractOwner, "AccessController: unauthorized access");
        _;
    }

    constructor() {
        contractOwner = msg.sender;
        _roles[msg.sender][Role.Admin] = true;
        _roles[msg.sender][Role.Owner] = true;
    }

    function grantRole(address account, Role role) external onlyOwner {
        _roles[account][role] = true;
        emit RoleGranted(account, role);
    }

    function revokeRole(address account, Role role) external onlyOwner {
        _roles[account][role] = false;
        emit RoleRevoked(account, role);
    }

    function hasRole(address account, Role role) external view returns (bool) {
        return _roles[account][role] || account == contractOwner;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "AccessController: invalid address");
        contractOwner = newOwner;
    }
}
