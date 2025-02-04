import { factory, pool, Condition, SwapEvent, poolPrice, position } from 'ponder:schema';

import { ponder } from 'ponder:registry';
import { sqrtPriceX96ToTokenPrices } from './utils/pricing';
import { GM } from './constants/addresses';
import { checksumAddress, zeroAddress } from 'viem';
import { NonfungiblePositionManagerAbi } from '../abis/NonfungiblePositionManagerAbi';

ponder.on('NonfungiblePositionManager:Transfer', async ({ event, context }) => {
  const tokenId = event.args.tokenId;
  let loadedPosition = await context.db.find(position, {
    id: tokenId.toString(),
  });

  if (!loadedPosition) {
    const positionCall = await context.client.readContract({
      address: event.log.address,
      abi: NonfungiblePositionManagerAbi,
      functionName: 'positions',
      args: [tokenId],
    });

    const poolAddress = await context.client.readContract({
      address: context.contracts.V3Factory.address,
      abi: context.contracts.V3Factory.abi,
      functionName: 'getPool',
      args: [positionCall[2], positionCall[3], positionCall[4]],
    });

    loadedPosition = await context.db.insert(position).values({
      id: tokenId.toString(),
      owner: event.args.to,
      pool: checksumAddress(poolAddress),
      token0: positionCall[2],
      token1: positionCall[3],
      tickLower: BigInt(positionCall[5]),
      tickUpper: BigInt(positionCall[6]),
      liquidity: BigInt(positionCall[7]),
      depositedToken0: BigInt(0),
      depositedToken1: BigInt(0),
      withdrawnToken0: BigInt(0),
      withdrawnToken1: BigInt(0),
      collectedFeesToken0: BigInt(0),
      collectedFeesToken1: BigInt(0),
      feeGrowthInside0LastX128: BigInt(positionCall[8]),
      feeGrowthInside1LastX128: BigInt(positionCall[9]),
    });
  }

  //  handle transfer
  await context.db
    .update(position, {
      id: tokenId.toString(),
    })
    .set({
      owner: event.args.to,
    });
});
