import { factory, pool, Condition, poolPrice, hourBuckets, fourHourBuckets, dayBuckets } from 'ponder:schema';

import { ponder } from 'ponder:registry';
import { sqrtPriceX96ToTokenPrices } from './utils/pricing';
import { GM } from './constants/addresses';
import { zeroAddress } from 'viem';
import { oneMinuteBuckets } from 'ponder:schema';
import { fiveMinuteBuckets } from 'ponder:schema';
import { fifteenMinuteBuckets } from 'ponder:schema';
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

  // TODO: find marketIndex from token0 or token1 that is not a GM which means it is condition token
  // 1. find condition Token
  const conditionTokenAddress =
    event.args.token0.toLowerCase() === GM[context.network.chainId].toLowerCase()
      ? event.args.token1.toLowerCase()
      : event.args.token0.toLowerCase();
  // 2. find marketIndex from condition Token (from outcomeFRC20Factory ponder.)
  const conditionToken = await context.db.find(Condition, {
    address: conditionTokenAddress as `0x${string}`,
  });

  if (!conditionToken) {
    throw new Error('Condition token not found');
  }

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
    marketIndex: conditionToken?.marketIndex ?? '',
  });
});

ponder.on('V3Pool:Initialize', async ({ event, context }) => {
  const loadedPool = await context.db.find(pool, {
    id: event.log.address,
  });

  if (!loadedPool) {
    throw new Error('Pool not found');
  }

  const prices = sqrtPriceX96ToTokenPrices(event.args.sqrtPriceX96);

  let conditionPrice = GM[context.network.chainId] === loadedPool.token0 ? prices[0] : prices[1];
  if (conditionPrice && conditionPrice > 1000001n) {
    conditionPrice = 1000000n;
  }
  await context.db
    .update(pool, {
      id: event.log.address,
    })
    .set((current) => ({
      tick: BigInt(event.args.tick),
      sqrtPrice: event.args.sqrtPriceX96,
      conditionPrice: conditionPrice,
    }));

  // for chart
  await context.db
    .insert(poolPrice)
    .values({
      id: event.log.address + '-' + event.block.timestamp.toString(),
      pool: event.log.address,
      price: conditionPrice ?? 0n,
      timestamp: event.block.timestamp,
    })
    .onConflictDoUpdate(() => ({ price: conditionPrice ?? 0n }));
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

  let conditionPrice = GM[context.network.chainId] === loadedPool.token0 ? prices[0] : prices[1];
  if (conditionPrice && conditionPrice > 1000001n) {
    conditionPrice = 1000000n;
  }
  const updatedPool = await context.db
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

  // for chart
  // await context.db
  //   .insert(poolPrice)
  //   .values({
  //     id: event.log.address + '-' + event.block.timestamp.toString(),
  //     pool: event.log.address,
  //     price: conditionPrice ?? 0n,
  //     timestamp: event.block.timestamp,
  //   })
  //   .onConflictDoUpdate(() => ({
  //     price: conditionPrice ?? 0n,
  //   }));
  const oneMinuteId = Math.floor(Number(event.block.timestamp) / 60) * 60;
  const fiveMinuteId = Math.floor(Number(event.block.timestamp) / 300) * 300;
  const fifteenMinuteId = Math.floor(Number(event.block.timestamp) / 900) * 900;
  const hourId = Math.floor(Number(event.block.timestamp) / 3600) * 3600;
  const fourHourId = Math.floor(Number(event.block.timestamp) / 14400) * 14400;
  const dayId = Math.floor(Number(event.block.timestamp) / 86400) * 86400;

  await context.db
    .insert(oneMinuteBuckets)
    .values({
      id: event.log.address + '-' + oneMinuteId.toString(),
      pool: event.log.address,
      timeId: oneMinuteId,
      open: Number(conditionPrice ?? 0n),
      close: Number(conditionPrice ?? 0n),
      low: Number(conditionPrice ?? 0n),
      high: Number(conditionPrice ?? 0n),
      average: Number(conditionPrice ?? 0n),
      count: 1,
    })
    .onConflictDoUpdate((row) => ({
      close: Number(conditionPrice ?? 0n),
      low: Math.min(row.low, Number(conditionPrice ?? 0n)),
      high: Math.max(row.high, Number(conditionPrice ?? 0n)),
      average: (row.average * row.count + Number(conditionPrice ?? 0n)) / (row.count + 1),
      count: row.count + 1,
    }));
  await context.db
    .insert(fiveMinuteBuckets)
    .values({
      id: event.log.address + '-' + fiveMinuteId.toString(),
      pool: event.log.address,
      timeId: fiveMinuteId,
      open: Number(conditionPrice ?? 0n),
      close: Number(conditionPrice ?? 0n),
      low: Number(conditionPrice ?? 0n),
      high: Number(conditionPrice ?? 0n),
      average: Number(conditionPrice ?? 0n),
      count: 1,
    })
    .onConflictDoUpdate((row) => ({
      close: Number(conditionPrice ?? 0n),
      low: Math.min(row.low, Number(conditionPrice ?? 0n)),
      high: Math.max(row.high, Number(conditionPrice ?? 0n)),
      average: (row.average * row.count + Number(conditionPrice ?? 0n)) / (row.count + 1),
      count: row.count + 1,
    }));
  await context.db
    .insert(fifteenMinuteBuckets)
    .values({
      id: event.log.address + '-' + fifteenMinuteId.toString(),
      pool: event.log.address,
      timeId: fifteenMinuteId,
      open: Number(conditionPrice ?? 0n),
      close: Number(conditionPrice ?? 0n),
      low: Number(conditionPrice ?? 0n),
      high: Number(conditionPrice ?? 0n),
      average: Number(conditionPrice ?? 0n),
      count: 1,
    })
    .onConflictDoUpdate((row) => ({
      close: Number(conditionPrice ?? 0n),
      low: Math.min(row.low, Number(conditionPrice ?? 0n)),
      high: Math.max(row.high, Number(conditionPrice ?? 0n)),
      average: (row.average * row.count + Number(conditionPrice ?? 0n)) / (row.count + 1),
      count: row.count + 1,
    }));
  await context.db
    .insert(hourBuckets)
    .values({
      id: event.log.address + '-' + hourId.toString(),
      pool: event.log.address,
      timeId: hourId,
      open: Number(conditionPrice ?? 0n),
      close: Number(conditionPrice ?? 0n),
      low: Number(conditionPrice ?? 0n),
      high: Number(conditionPrice ?? 0n),
      average: Number(conditionPrice ?? 0n),
      count: 1,
    })
    .onConflictDoUpdate((row) => ({
      close: Number(conditionPrice ?? 0n),
      low: Math.min(row.low, Number(conditionPrice ?? 0n)),
      high: Math.max(row.high, Number(conditionPrice ?? 0n)),
      average: (row.average * row.count + Number(conditionPrice ?? 0n)) / (row.count + 1),
      count: row.count + 1,
    }));

  await context.db
    .insert(fourHourBuckets)
    .values({
      id: event.log.address + '-' + fourHourId.toString(),
      pool: event.log.address,
      timeId: fourHourId,
      open: Number(conditionPrice ?? 0n),
      close: Number(conditionPrice ?? 0n),
      low: Number(conditionPrice ?? 0n),
      high: Number(conditionPrice ?? 0n),
      average: Number(conditionPrice ?? 0n),
      count: 1,
    })
    .onConflictDoUpdate((row) => ({
      close: Number(conditionPrice ?? 0n),
      low: Math.min(row.low, Number(conditionPrice ?? 0n)),
      high: Math.max(row.high, Number(conditionPrice ?? 0n)),
      average: (row.average * row.count + Number(conditionPrice ?? 0n)) / (row.count + 1),
      count: row.count + 1,
    }));
  await context.db
    .insert(dayBuckets)
    .values({
      id: event.log.address + '-' + dayId.toString(),
      pool: event.log.address,
      timeId: dayId,
      open: Number(conditionPrice ?? 0n),
      close: Number(conditionPrice ?? 0n),
      low: Number(conditionPrice ?? 0n),
      high: Number(conditionPrice ?? 0n),
      average: Number(conditionPrice ?? 0n),
      count: 1,
    })
    .onConflictDoUpdate((row) => ({
      close: Number(conditionPrice ?? 0n),
      low: Math.min(row.low, Number(conditionPrice ?? 0n)),
      high: Math.max(row.high, Number(conditionPrice ?? 0n)),
      average: (row.average * row.count + Number(conditionPrice ?? 0n)) / (row.count + 1),
      count: row.count + 1,
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
