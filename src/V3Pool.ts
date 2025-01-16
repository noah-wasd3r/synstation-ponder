import { factory, pool } from 'ponder:schema';

import { ponder } from 'ponder:registry';
import { sqrtPriceX96ToTokenPrices } from './utils/pricing';
import { GM } from './constants/addresses';
import { zeroAddress } from 'viem';

ponder.on('V3Factory:PoolCreated', async ({ event, context }) => {
  const loadedFactory = await context.db.find(factory, {
    id: 'factory',
  });

  if (!loadedFactory) {
    await context.db.insert(factory).values({
      id: 'factory',
      poolCount: 1n,
      txCount: 0n,
      owner: zeroAddress,
    });
  }

  // Address of the child contract that was created.
  const poolAddress = event.args.pool;
  //        ^? string

  await context.db.insert(pool).values({
    id: poolAddress,
    createdAtTimestamp: event.block.timestamp,
    createdAtBlockNumber: event.block.number,
    token0: event.args.token0,
    token1: event.args.token1,
    feeTier: event.args.fee,
    liquidity: 0n,
    sqrtPrice: 0n,
    feeGrowthGlobal0X128: 0n,
    feeGrowthGlobal1X128: 0n,
    token0Price: 0n,
    token1Price: 0n,
    tick: 0n,
    observationIndex: 0n,
    volumeToken0: 0n,
    volumeToken1: 0n,
    txCount: 0n,
    collectedFeesToken0: 0n,
    collectedFeesToken1: 0n,
    totalValueLockedToken0: 0n,
    totalValueLockedToken1: 0n,
    liquidityProviderCount: 0n,
    conditionPrice: 0n,
  });
});

ponder.on('V3Pool:Initialize', async ({ event, context }) => {
  const loadedPool = await context.db.find(pool, {
    id: event.log.address,
  });

  if (!loadedPool) {
    throw new Error('Pool not found');
  }
  await context.db
    .update(pool, {
      id: event.log.address,
    })
    .set({
      tick: BigInt(event.args.tick),
      sqrtPrice: event.args.sqrtPriceX96,
    });
});
ponder.on('V3Pool:Swap', async ({ event, context }) => {
  const loadedPool = await context.db.find(pool, {
    id: event.log.address,
  });

  if (!loadedPool) {
    throw new Error('Pool not found');
  }
  //  update factory tx count
  await context.db
    .update(factory, {
      id: 'factory',
    })
    .set((current) => ({
      txCount: current.txCount + 1n,
    }));

  let amount0 = event.args.amount0;
  let amount1 = event.args.amount1;

  let amount0Abs = event.args.amount0 > 0 ? event.args.amount0 : -1n * event.args.amount0;
  let amount1Abs = event.args.amount1 > 0 ? event.args.amount1 : -1n * event.args.amount1;

  loadedPool.volumeToken0 += amount0Abs;
  loadedPool.volumeToken1 += amount1Abs;

  const prices = sqrtPriceX96ToTokenPrices(event.args.sqrtPriceX96);

  const conditionPrice = GM[context.network.chainId] === loadedPool.token0 ? prices[0] : prices[1];

  await context.db
    .update(pool, {
      id: event.log.address,
    })
    .set((current) => ({
      // pool volume
      volumeToken0: loadedPool.volumeToken0,
      volumeToken1: loadedPool.volumeToken1,
      txCount: current.txCount + 1n,
      // Update the pool with the new active liquidity, price, and tick.
      liquidity: event.args.liquidity,
      tick: BigInt(event.args.tick),
      sqrtPrice: event.args.sqrtPriceX96,
      totalValueLockedToken0: current.totalValueLockedToken0 + amount0,
      totalValueLockedToken1: current.totalValueLockedToken1 + amount1,
      token0Price: prices[0],
      token1Price: prices[1],
      conditionPrice: conditionPrice,
    }));
});

ponder.on('V3Pool:Mint', async ({ event, context }) => {
  const loadedPool = await context.db.find(pool, {
    id: event.log.address,
  });

  if (!loadedPool) {
    throw new Error('Pool not found');
  }

  const loadedFactory = await context.db.find(factory, {
    id: 'factory',
  });

  if (!loadedFactory) {
    throw new Error('Factory not found');
  }
  // update globals
  await context.db
    .update(factory, {
      id: 'factory',
    })
    .set((current) => ({
      poolCount: current.poolCount + 1n,
    }));

  // update token0 data
  // token0.txCount = token0.txCount.plus(ONE_BI);
  // token0.totalValueLocked = token0.totalValueLocked.plus(amount0);

  // update token1 data
  // token1.txCount = token1.txCount.plus(ONE_BI);
  // token1.totalValueLocked = token1.totalValueLocked.plus(amount1);

  // pool data
  loadedPool.txCount = loadedPool.txCount + 1n;

  // Pools liquidity tracks the currently active liquidity given pools current tick.
  // We only want to update it on mint if the new position includes the current tick.
  if (loadedPool.tick !== null && BigInt(event.args.tickLower) <= loadedPool.tick && BigInt(event.args.tickUpper) > loadedPool.tick) {
    loadedPool.liquidity = loadedPool.liquidity + event.args.amount;
  }

  loadedPool.totalValueLockedToken0 = loadedPool.totalValueLockedToken0 + event.args.amount0;
  loadedPool.totalValueLockedToken1 = loadedPool.totalValueLockedToken1 + event.args.amount1;

  loadedPool.liquidityProviderCount = loadedPool.liquidityProviderCount + 1n;

  await context.db
    .update(pool, {
      id: event.log.address,
    })
    .set(loadedPool);
});
ponder.on('V3Pool:Burn', async ({ event, context }) => {
  const loadedPool = await context.db.find(pool, {
    id: event.log.address,
  });

  if (!loadedPool) {
    throw new Error('Pool not found');
  }

  const loadedFactory = await context.db.find(factory, {
    id: 'factory',
  });

  if (!loadedFactory) {
    throw new Error('Factory not found');
  }
  // update globals
  await context.db
    .update(factory, {
      id: 'factory',
    })
    .set((current) => ({
      poolCount: current.poolCount + 1n,
    }));

  // update token0 data
  // token0.txCount = token0.txCount.plus(ONE_BI);
  // token0.totalValueLocked = token0.totalValueLocked.plus(amount0);

  // update token1 data
  // token1.txCount = token1.txCount.plus(ONE_BI);
  // token1.totalValueLocked = token1.totalValueLocked.plus(amount1);

  // pool data
  loadedPool.txCount = loadedPool.txCount + 1n;

  // Pools liquidity tracks the currently active liquidity given pools current tick.
  // We only want to update it on mint if the new position includes the current tick.
  if (loadedPool.tick !== null && BigInt(event.args.tickLower) <= loadedPool.tick && BigInt(event.args.tickUpper) > loadedPool.tick) {
    loadedPool.liquidity = loadedPool.liquidity - event.args.amount;
  }

  loadedPool.totalValueLockedToken0 = loadedPool.totalValueLockedToken0 - event.args.amount0;
  loadedPool.totalValueLockedToken1 = loadedPool.totalValueLockedToken1 - event.args.amount1;

  loadedPool.liquidityProviderCount = loadedPool.liquidityProviderCount + 1n;

  await context.db
    .update(pool, {
      id: event.log.address,
    })
    .set(loadedPool);
});
