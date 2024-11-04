import { createConfig } from "@ponder/core";
import { http } from "viem";

import { PreStakingAbi } from "./abis/PreStakingAbi";
import { StakingAbi } from "./abis/StakingAbi";

export default createConfig({
  networks: {
    mainnet: { chainId: 1, transport: http(process.env.PONDER_RPC_URL_1) },
  },
  contracts: {
    PreStaking: {
      network: "mainnet",
      address: "0x3BaC111A6F5ED6A554616373d5c7D858d7c10d88",
      abi: PreStakingAbi,
      startBlock: 20975761,
    },
    Staking: {
      network: "mainnet",
      address: "0xe9B85D6A1727d4B22595bab40018bf9B7407c677",
      abi: StakingAbi,
      startBlock: 20623833,
    },
  },
});
