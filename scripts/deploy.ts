import hre from "hardhat";
const { ethers } = hre;

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer?.address);

  // 1. Deploy AccessController
  const AccessController = await ethers.getContractFactory("AccessController");
  const accessController = await AccessController.deploy();
  await accessController.waitForDeployment();
  console.log("AccessController deployed to:", await accessController.getAddress());

  // 2. Deploy KillSwitch
  const KillSwitch = await ethers.getContractFactory("KillSwitch");
  const killSwitch = await KillSwitch.deploy();
  await killSwitch.waitForDeployment();
  console.log("KillSwitch deployed to:", await killSwitch.getAddress());

  // 3. Deploy PolicyManager
  const PolicyManager = await ethers.getContractFactory("PolicyManager");
  const policyManager = await PolicyManager.deploy();
  await policyManager.waitForDeployment();
  console.log("PolicyManager deployed to:", await policyManager.getAddress());

  // 4. Deploy TransactionExecutor (passing deployer as default gateway signer)
  const signerAddress = deployer?.address || ethers.ZeroAddress;
  const TransactionExecutor = await ethers.getContractFactory("TransactionExecutor");
  const executor = await TransactionExecutor.deploy(
    await killSwitch.getAddress(),
    await policyManager.getAddress(),
    signerAddress
  );
  await executor.waitForDeployment();
  console.log("TransactionExecutor deployed to:", await executor.getAddress());

  // 5. Deploy Treasury
  const Treasury = await ethers.getContractFactory("Treasury");
  const treasury = await Treasury.deploy();
  await treasury.waitForDeployment();
  console.log("Treasury deployed to:", await treasury.getAddress());

  console.log("All smart contracts successfully deployed.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
