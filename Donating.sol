// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract DonationToken {
    string public name = "Donation Points";
    string public symbol = "DP";
    uint8 public decimals = 18;
    uint256 public totalSupply;

    mapping(address => uint256) public balanceOf;
    mapping(address => uint256) public totalDonated;
    address public owner;

    struct Target {
        string name;
        uint256 investedAmount;
    }

    Target[] public targets;
    mapping(uint256 => mapping(address => uint256)) public userInvestments;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event DonationReceived(address indexed donor, uint256 ethAmount, uint256 pointsMinted);
    event InvestmentMade(address indexed investor, uint256 targetId, uint256 amount);
    event InvestmentWithdrawn(address indexed investor, uint256 targetId, uint256 amount);

    constructor() {
        owner = msg.sender;
        targets.push(Target(unicode"Маркетинг и Реклама", 0));
        targets.push(Target(unicode"Разработка Ядра Протокола", 0));
        targets.push(Target(unicode"Благотворительный Фонд", 0));
    }

    function donate() public payable {
        require(msg.value >= 0.001 ether, "Min donation 0.001 ETH");

        // Курс: 0.001 ETH = 10 очков (1 ETH = 10,000 очков)
        uint256 pointsToMint = msg.value * 10000;

        totalSupply += pointsToMint;
        balanceOf[msg.sender] += pointsToMint;
        totalDonated[msg.sender] += msg.value;

        emit Transfer(address(0), msg.sender, pointsToMint);
        emit DonationReceived(msg.sender, msg.value, pointsToMint);
    }

    function investInTarget(uint256 _targetId, uint256 _amount) public {
        require(_amount > 0, "Amount must be > 0");
        require(balanceOf[msg.sender] >= _amount, "Not enough points");
        require(_targetId < targets.length, "Invalid target");

        balanceOf[msg.sender] -= _amount;
        targets[_targetId].investedAmount += _amount;
        userInvestments[_targetId][msg.sender] += _amount;

        emit InvestmentMade(msg.sender, _targetId, _amount);
    }

    function withdrawInvestment(uint256 _targetId) public {
        uint256 amount = userInvestments[_targetId][msg.sender];
        require(amount > 0, "No investment to withdraw");

        targets[_targetId].investedAmount -= amount;
        userInvestments[_targetId][msg.sender] = 0;
        balanceOf[msg.sender] += amount;

        emit InvestmentWithdrawn(msg.sender, _targetId, amount);
    }

    function getTargetsCount() public view returns (uint256) {
        return targets.length;
    }

    function withdrawETH() public {
        require(msg.sender == owner, "Only owner");
        (bool success, ) = payable(owner).call{value: address(this).balance}("");
require(success, "Transfer failed");
    }

    function getContractBalance() public view returns (uint256) {
        return address(this).balance;
    }
}
