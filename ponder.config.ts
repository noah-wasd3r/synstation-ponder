import { createConfig, factory, loadBalance, mergeAbis } from 'ponder';
import { http, createPublicClient, parseAbiItem, erc20Abi } from 'viem';

import { weth9Abi } from './abis/weth9Abi';
import { PreStakingAbi } from './abis/PreStakingAbi';
import { StakingAbi } from './abis/StakingAbi';

import { OutcomeFactoryImplAbi } from './abis/OutcomeFactoryImplAbi';
import { OutcomeFactoryProxyAbi } from './abis/OutcomeFactoryProxyAbi';
import { OutcomeRouterAbi } from './abis/OutcomeRouterAbi';
import { PancakeV3FactoryAbi } from './abis/PancakeV3FactoryAbi';
import { NonfungiblePositionManagerAbi } from './abis/NonfungiblePositionManagerAbi';
import { PancakeV3PoolAbi } from './abis/PancakeV3PoolAbi';
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
    soneium: {
      chainId: 1868,
      transport: http(process.env.PONDER_RPC_URL_1868),
    },
  },
  contracts: {
    PreStaking: {
      abi: PreStakingAbi,
      network: {
        // astar: {
        //   address: '0xe9B85D6A1727d4B22595bab40018bf9B7407c677',
        //   startBlock: 7291207,
        //   endBlock: 7873955,
        // },
        // mainnet: {
        //   address: '0x3BaC111A6F5ED6A554616373d5c7D858d7c10d88',
        //   startBlock: 20975761,
        //   endBlock: 21611852,
        // },
      },
    },
    Staking: {
      network: {
        // mainnet: {
        //   address: '0xe9B85D6A1727d4B22595bab40018bf9B7407c677',
        //   startBlock: 20623833,
        //   endBlock: 21611852,
        // },
      },
      abi: StakingAbi,
    },

    V3Factory: {
      abi: PancakeV3FactoryAbi,
      network: {
        soneium: {
          address: '0x81B4029bfCb5302317fe5d35D54544EA3328e30f',
          startBlock: 1812231,
        },
      },
    },
    NonfungiblePositionManager: {
      abi: NonfungiblePositionManagerAbi,
      network: {
        soneium: {
          address: '0xc9b9DDEe50EA1842A36e4AA02d50211586b6eE63',
          startBlock: 1812678,
        },
      },
    },
    V3Pool: {
      abi: PancakeV3PoolAbi,
      network: 'soneium',
      address: factory({
        // The address of the factory contract that creates instances of this child contract.
        address: '0x81B4029bfCb5302317fe5d35D54544EA3328e30f',
        // The event emitted by the factory that announces a new instance of this child contract.
        event: parseAbiItem(
          'event PoolCreated(address indexed token0,address indexed token1,uint24 indexed fee,int24 tickSpacing,address pool)'
        ),
        // The name of the parameter that contains the address of the new child contract.
        parameter: 'pool',
      }),
      startBlock: 1812231,
    },
    OutcomeFactory: {
      abi: OutcomeFactoryImplAbi,
      network: {
        soneium: {
          address: '0xa546b3a3C71aD7ED2152551490049f85FE136B34',

          startBlock: 1812496,
        },
      },
    },
    // TODO: include call trace 해서, 이전에 swap event 없던 애들은 calltrace arg로 처리해야할듯?
    OutcomeRouter: {
      abi: OutcomeRouterAbi,
      network: {
        soneium: {
          address: '0x1ccAA0C6448CCd836A09f62B1C0b2Df76f910424',
          startBlock: 1849376,
        },
      },
    },
  },
  //   OutcomeToken: {
  //     abi: erc20Abi,
  //     network: {
  //       minato: {
  //         address: factory({
  //           address: '0xE97A28a44e13A4BD74b64d5aB31423bb840E9986',
  //           event: parseAbiItem(
  //             'event ConditionDeployed(uint256 indexed idx, address condition, address resolver, address collateralToken)'
  //           ),
  //           parameter: 'condition',
  //         }),
  //         startBlock: 5437872,
  //       },
  //     },
  //   },
  //   TestToken: {
  //     abi: erc20Abi,
  //     network: {
  //       minato: {
  //         address: '0x54cffBa35CC7ebE2c852E9242B8F0bC71bDC5D18',
  //         startBlock: 5656586,
  //       },
  //     },
  //   },
  // },
});
