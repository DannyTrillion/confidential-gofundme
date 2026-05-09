import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;
  const chainId = Number(await hre.getChainId());

  const token = await deploy("ConfidentialUSDC", {
    from: deployer,
    args: [],
    log: true,
  });

  const factory = await deploy("CampaignFactory", {
    from: deployer,
    args: [token.address],
    log: true,
  });

  const tokenArtifact = await hre.artifacts.readArtifact("ConfidentialUSDC");
  const factoryArtifact = await hre.artifacts.readArtifact("CampaignFactory");
  const campaignArtifact = await hre.artifacts.readArtifact("Campaign");

  const out = join(__dirname, "..", "..", "..", "apps", "web", "src", "contracts");
  if (!existsSync(out)) mkdirSync(out, { recursive: true });
  writeFileSync(
    join(out, "deployments.json"),
    JSON.stringify(
      {
        chainId,
        token: token.address,
        factory: factory.address,
        // cUSDC follows USDC's 6-decimal convention. 1 USD = 1_000_000 base units.
        tokenDecimals: 6,
        abis: {
          ConfidentialUSDC: tokenArtifact.abi,
          CampaignFactory: factoryArtifact.abi,
          Campaign: campaignArtifact.abi,
        },
      },
      null,
      2,
    ),
  );
  console.log(`Wrote deployments.json -> ${out}`);
};

func.tags = ["Stack"];
export default func;
