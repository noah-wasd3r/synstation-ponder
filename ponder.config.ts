import { createConfig } from '@ponder/core';
import { http } from 'viem';

import { PreStakingAbi } from './abis/PreStakingAbi';
import { StakingAbi } from './abis/StakingAbi';

export default createConfig({
  networks: {
    mainnet: { chainId: 1, transport: http(process.env.PONDER_RPC_URL_1) },
    astar: { chainId: 592, transport: http(process.env.PONDER_RPC_URL_592) },
  },
  contracts: {
    PreStaking: {
      abi: PreStakingAbi,
      network: {
        mainnet: {
          address: '0x3BaC111A6F5ED6A554616373d5c7D858d7c10d88',
          startBlock: 20975761,
        },
        astar: {
          address: '0xe9B85D6A1727d4B22595bab40018bf9B7407c677',
          startBlock: 7291207,
        },
      },
    },
    Staking: {
      network: {
        mainnet: {
          address: '0xe9B85D6A1727d4B22595bab40018bf9B7407c677',
          startBlock: 20623833,
        },
      },
      abi: StakingAbi,
    },
  },
});
