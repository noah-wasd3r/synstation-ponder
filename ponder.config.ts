import { createConfig, loadBalance, mergeAbis } from 'ponder';
import { http, createPublicClient } from 'viem';

import { weth9Abi } from './abis/weth9Abi';
import { PreStakingAbi } from './abis/PreStakingAbi';
import { StakingAbi } from './abis/StakingAbi';
import { OutcomeFactoryImplAbi } from './abis/OutcomeFactoryImplAbi';
import { OutcomeFactoryProxyAbi } from './abis/OutcomeFactoryProxyAbi';
import { OutcomeRouterAbi } from './abis/OutcomeRouterAbi';
export default createConfig({
  networks: {
    mainnet: {
      chainId: 1,
      transport: loadBalance([
        http('https://eth.llamarpc.com'),
        http('https://singapore.rpc.blxrbdn.com'),
        http('https://api.securerpc.com/v1'),
        http('https://gateway.tenderly.co/public/mainnet'),
      ]),
    },
    astar: { chainId: 592, transport: http(process.env.PONDER_RPC_URL_592) },
    minato: {
      chainId: 1946,
      transport: http(process.env.PONDER_RPC_URL_1946),
    },
  },
  contracts: {
    PreStaking: {
      abi: PreStakingAbi,
      network: {
        astar: {
          address: '0xe9B85D6A1727d4B22595bab40018bf9B7407c677',
          startBlock: 7291207,
        },
        mainnet: {
          address: '0x3BaC111A6F5ED6A554616373d5c7D858d7c10d88',
          startBlock: 20975761,
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

    OutcomeFactory: {
      abi: mergeAbis([OutcomeFactoryImplAbi, OutcomeFactoryProxyAbi]),
      // includeCallTraces: true,
      network: {
        minato: {
          address: '0xE97A28a44e13A4BD74b64d5aB31423bb840E9986',
          startBlock: 5437872,
        },
      },
    },
    OutcomeRouter: {
      abi: OutcomeRouterAbi,
      network: {
        minato: {
          address: '0x92224F3D739Ea6f25920693531E09BA97b54E2d2',
          startBlock: 5645792,
        },
      },
    },
  },
});
