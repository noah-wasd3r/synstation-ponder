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
import { erc4626Abi } from './abis/ERC4626Abi';
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
      transport: loadBalance([
        http(process.env.PONDER_RPC_URL_1868),
        http('https://soneium.rpc.scs.startale.com?apikey=LYCPyc2hMBN8ZgCFYqGj6YyJ6VvePE4b'),
        http('https://soneium.rpc.scs.startale.com?apikey=poiRCWPmsK0kh3pi9SeqIJqy4CsABUJ4'),
      ]),
    },
  },
  contracts: {
    PreStaking: {
      abi: PreStakingAbi,
      network: {
        // astar: {
        //   address: '0xe9B85D6A1727d4B22595bab40018bf9B7407c677',
        //   startBlock: 7291207,
        // endBlock: 7873955,
        // },
        // mainnet: {
        //   address: '0x3BaC111A6F5ED6A554616373d5c7D858d7c10d88',
        //   startBlock: 20975761,
        // endBlock: 21611852,
        // },
      },
    },
    Staking: {
      network: {
        // mainnet: {
        //   address: '0xe9B85D6A1727d4B22595bab40018bf9B7407c677',
        //   startBlock: 20623833,
        // endBlock: 21611852,
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
          endBlock: 3663843,
        },
      },
    },
    NonfungiblePositionManager: {
      abi: NonfungiblePositionManagerAbi,
      network: {
        soneium: {
          address: '0xc9b9DDEe50EA1842A36e4AA02d50211586b6eE63',
          startBlock: 1812678,
          endBlock: 3663843,
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
      endBlock: 3663843,
    },
    OutcomeFactory: {
      abi: OutcomeFactoryImplAbi,
      network: {
        soneium: {
          address: '0xa546b3a3C71aD7ED2152551490049f85FE136B34',

          startBlock: 1812496,
          endBlock: 3663843,
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
          endBlock: 3663843,
        },
      },
    },

    // autopilot-erc4626 vaults
    AutopilotVault: {
      abi: erc4626Abi,
      network: {
        soneium: {
          address: [
            '0x3BaC111A6F5ED6A554616373d5c7D858d7c10d88', // ASTR
            '0x467b43ede72543FC0FD79c7085435A484a87e0D7', // nrETH
            '0x74dFFE1e68f41ec364517f1F2951047246c5DD4e', // nsASTR
            '0x2C7f58d2AfaCae1199c7e1E00FB629CCCEA5Bbd5', // USDC
            '0x6A31048E5123859cf50F865d5a3050c18E77fFAe', // USDT
            '0xefb3Cc73a5517c9825aE260468259476e7965c5E', // WETH
          ],
          startBlock: 1841580,
          endBlock: 3663843,
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
