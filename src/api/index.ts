import { ponder } from 'ponder:registry';
import { Condition, conditionRedeemEvent, Market, UserPreStaking } from '../../ponder.schema';
import { and, desc, eq, graphql, gte, inArray, index, lte, or, replaceBigInts, sql, union } from 'ponder';
import { checksumAddress, numberToHex } from 'viem';
import {
  account,
  AutopilotVault,
  AutopilotVaultDepositEvent,
  AutopilotVaultWithdrawEvent,
  OutcomeSwapEvent,
  pool,
  poolPrice,
  position,
  Users,
} from 'ponder:schema';

ponder.use('/', graphql());

ponder.get('/user-pre-staking', async (c) => {
  const data = await c.db.select().from(UserPreStaking);

  const result = replaceBigInts(data, (v) => Number(v));
  return c.json(result);
});

ponder.get('/test', async (c) => {
  const data = await c.db.select().from(OutcomeSwapEvent).orderBy(desc(OutcomeSwapEvent.timestamp));
  const result = replaceBigInts(data, (v) => Number(v));
  return c.json(result);
});

ponder.get('/swap-history', async (c) => {
  const { fromTimestamp, toTimestamp, user } = c.req.query();

  const condition = and(
    // @ts-ignore
    fromTimestamp ? gte(OutcomeSwapEvent.timestamp, fromTimestamp) : undefined,
    // @ts-ignore
    toTimestamp ? lte(OutcomeSwapEvent.timestamp, toTimestamp) : undefined,
    // @ts-ignore
    user ? eq(OutcomeSwapEvent.txSender, user.toLowerCase() as `0x${string}`) : undefined
  );
  const data = await c.db.select().from(OutcomeSwapEvent).where(condition);
  const result = replaceBigInts(data, (v) => Number(v));
  return c.json(result);
});

ponder.get('/redeem-history', async (c) => {
  let { user } = c.req.query();
  if (!user) {
    return c.json({ error: 'user is required' }, 400);
  }
  user = user.toLowerCase();

  const redeemQuery = await c.db.query.conditionRedeemEvent.findMany({
    where: (conditionRedeemEvent, { eq }) => eq(conditionRedeemEvent.userAddress, user as `0x${string}`),
    with: {
      condition: {
        with: {
          market: true,
        },
      },
    },
  });
  const onlyPositiveRedeem = redeemQuery.filter((v) => v.conditionAmount > 0n);

  const result = replaceBigInts([...onlyPositiveRedeem], (v) => Number(v));

  return c.json(result);
});

ponder.get('/pools', async (c) => {
  const data = await c.db.select().from(pool);
  const result = replaceBigInts(data, (v) => Number(v));
  return c.json(result);
});

ponder.get('/conditions', async (c) => {
  const { marketIndex } = c.req.query();
  const account = await c.db.query.Condition.findMany({
    where: (condition, { eq }) => (marketIndex ? eq(condition.marketIndex, marketIndex) : undefined),
    with: {
      market: true,
    },
  });

  const result = replaceBigInts(account, (v) => Number(v));
  return c.json(result);
});

ponder.get('/positions', async (c) => {
  const data = await c.db.select().from(position);
  const result = replaceBigInts(data, (v) => Number(v));
  return c.json(result);
});

ponder.get('/markets', async (c) => {
  const { page, pageSize, marketIndex } = c.req.query();

  let markets;

  const options = {
    columns: {
      id: true,
      marketIndex: true,
      collateralToken: true,
      isResolved: true,
      createdAt: true,
      resolvedAt: true,
      title: true,
    },
    with: {
      conditions: {
        columns: {
          address: true,
          symbol: true,
        },
      },
      pools: {
        columns: {
          id: true,
          createdAtTimestamp: true,
          token0: true,
          token1: true,
          feeTier: true,
          token0Price: true,
          token1Price: true,
          volumeToken0: true,
          volumeToken1: true,
          txCount: true,
          totalValueLockedToken0: true,
          totalValueLockedToken1: true,
          liquidityProviderCount: true,
          conditionPrice: true,
        },
        with: {
          positions: {
            columns: {
              id: true,
              owner: true,
              liquidity: true,
            },
          },
        },
      },
    },
  };
  if (!marketIndex) {
    markets = await c.db.query.Market.findMany({
      orderBy: (market, { desc }) => [desc(market.createdAt)],
      limit: Number(pageSize),
      offset: (Number(page) - 1) * Number(pageSize),
      ...options,
    });
  } else {
    markets = await c.db.query.Market.findMany({
      where: (market, { eq }) => eq(market.marketIndex, marketIndex),
      ...options,
    });
  }

  // find matching pool and condition token, add conditionPrice

  markets = markets.map((market) => {
    let marketVolumeInGM = 0n;
    let marketTotalValueLockedInGM = 0n;

    // @ts-ignore
    const feeTier = market.pools?.[0]?.feeTier ?? 10000;

    const newConditionsArray = market.conditions.map((condition: any) => {
      const pool = market.pools.find((pool: any) => pool.token0 === condition.address || pool.token1 === condition.address) as any;

      const isConditionToken0 = pool?.token0 === condition.address;
      const isConditionToken1 = pool?.token1 === condition.address;
      if (isConditionToken0) {
        // @ts-ignore
        marketVolumeInGM += ((pool?.volumeToken0 ?? 0n) * pool.conditionPrice) / 10n ** 6n;
        // @ts-ignore
        marketTotalValueLockedInGM += ((pool?.totalValueLockedToken0 ?? 0n) * pool.conditionPrice) / 10n ** 6n;
        marketVolumeInGM += pool?.volumeToken1 ?? 0n;
        marketTotalValueLockedInGM += pool?.totalValueLockedToken1 ?? 0n;
      }
      if (isConditionToken1) {
        // @ts-ignore
        marketVolumeInGM += ((pool?.volumeToken1 ?? 0n) * pool.conditionPrice) / 10n ** 6n;
        // @ts-ignore
        marketTotalValueLockedInGM += ((pool?.totalValueLockedToken1 ?? 0n) * pool.conditionPrice) / 10n ** 6n;
        marketVolumeInGM += pool?.volumeToken0 ?? 0n;
        marketTotalValueLockedInGM += pool?.totalValueLockedToken0 ?? 0n;
      }

      if (pool) {
        return { ...condition, conditionPrice: pool.conditionPrice };
      }
      return condition;
    });

    return {
      ...market,
      conditions: newConditionsArray,
      totalVolume: marketVolumeInGM,
      totalValueLocked: marketTotalValueLockedInGM,
      feeTier,
    };
  });

  const result = replaceBigInts(markets, (v) => Number(v));
  return c.json(result);
});

ponder.get('/chart/price', async (c) => {
  const { poolAddresses, timeRange } = c.req.query();
  // timeRange: 1h, 6h, 1d, 1w , 1m , all
  // buckets: 1m, 5m, 15m, 1h, 4h, 1d
  const poolAddressesArr = poolAddresses?.split(',') ?? [];

  let data: any[] = [];
  switch (timeRange) {
    case '1h':
      data = await c.db.query.oneMinuteBuckets.findMany({
        where: (oneMinuteBuckets, { inArray, and, gte, lte }) =>
          and(
            // @ts-ignore
            inArray(oneMinuteBuckets.pool, poolAddressesArr)
          ),
        limit: 100,
      });
    case '6h':
      data = await c.db.query.fiveMinuteBuckets.findMany({
        where: (fiveMinuteBuckets, { inArray, and, gte, lte }) =>
          and(
            // @ts-ignore
            inArray(fiveMinuteBuckets.pool, poolAddressesArr)
          ),
        limit: 100,
      });
    case '1d':
      data = await c.db.query.fifteenMinuteBuckets.findMany({
        where: (fifteenMinuteBuckets, { inArray, and, gte, lte }) =>
          and(
            // @ts-ignore
            inArray(fifteenMinuteBuckets.pool, poolAddressesArr)
          ),
        limit: 100,
      });
    case '1w':
      data = await c.db.query.hourBuckets.findMany({
        where: (hourBuckets, { inArray, and, gte, lte }) =>
          and(
            // @ts-ignore
            inArray(hourBuckets.pool, poolAddressesArr)
          ),
        limit: 100,
      });
    case '1m':
      data = await c.db.query.fourHourBuckets.findMany({
        where: (fourHourBuckets, { inArray, and, gte, lte }) =>
          and(
            // @ts-ignore
            inArray(fourHourBuckets.pool, poolAddressesArr)
          ),
        limit: 100,
      });
    case 'all':
      data = await c.db.query.dayBuckets.findMany({
        where: (dayBuckets, { inArray, and, gte, lte }) =>
          and(
            // @ts-ignore
            inArray(dayBuckets.pool, poolAddressesArr)
          ),
        limit: 100,
      });
      break;
  }

  // const timestampedData = data.filter((d) => Number(d.timestamp) >= startTimestampInNumber && Number(d.timestamp) <= endTimestampInNumber);
  const dataObject: { [key: string]: any[] } = {};

  // create object with poolAddress as key and data as value
  data.forEach((data) => {
    if (!dataObject[data.pool]) {
      dataObject[data.pool] = [];
    }

    // @ts-ignore
    dataObject[data.pool].push(data);
  });

  const result = replaceBigInts(dataObject, (v) => Number(v));

  return c.json(result);
});

//

ponder.get('/point', async (c) => {
  let { user } = c.req.query();
  if (!user) {
    return c.json({ error: 'user is required' }, 400);
  }
  user = checksumAddress(user as `0x${string}`);

  const data = await c.db.select().from(Users).where(eq(Users.id, user));

  const userData = data[0];

  if (!userData) {
    return c.json({ error: 'user not found' }, 400);
  }

  // handle preStaking (endTimestamp)
  // preStakingPoint = preStakingPointPerSecond * (endTimestamp - preStakingLastTimestamp) + preStakingAccumulatedPoints
  const preStakingEndTimestamp = 1736747999n; // 1/13/2025 11:59:59 PM UTC
  const preStakingPoint =
    userData.preStakingPointPerSecond * (preStakingEndTimestamp - userData.preStakingLastTimestamp) + userData.preStakingAccumulatedPoints;

  // handle portal (endTimestamp)
  // portalPoint = portalPointPerSecond * (endTimestamp - portalLastTimestamp) + portalAccumulatedPoints
  // const portalPoint = userData.portalPointPerSecond * (endTimestamp - userData.portalLastTimestamp) + userData.portalAccumulatedPoints;

  const result = {
    preStakingPoint,
    // portalPoint,
  };

  const response = replaceBigInts(result, (v) => Number(v));

  return c.json(response);
});

ponder.get('/autopilot-all-deposit-withdraw-events', async (c) => {
  const depositData = await c.db.select().from(AutopilotVaultDepositEvent);

  await c.db.query.Market.findMany({
    limit: Number(pageSize),
    offset: (Number(page) - 1) * Number(pageSize),
  });
  const withdrawData = await c.db.select().from(AutopilotVaultWithdrawEvent);

  const data = {
    depositEvents: depositData,
    withdrawEvents: withdrawData,
  };

  const result = replaceBigInts(data, (v) => Number(v));

  return c.json(result);
});

ponder.get('/galxe-astar-more-than-100-timestamp-1739923200', async (c) => {
  const { address } = c.req.query();
  const startTimestamp = 1739919600n; // Tue Feb 18 2025 23:00:00 GMT+0000
  // const startTimestamp = 1739417002n;

  const fromToken = '0x2cae934a1e84f693fbb78ca5ed3b0a6893259441'; // astar
  if (!address) {
    return c.json({ error: 'address is required' }, 400);
  }
  const data = await c.db
    .select()
    .from(OutcomeSwapEvent)
    // @ts-ignore
    .where(
      and(
        gte(OutcomeSwapEvent.timestamp, startTimestamp),
        eq(OutcomeSwapEvent.txSender, address.toLowerCase() as `0x${string}`),
        eq(OutcomeSwapEvent.fromToken, fromToken)
      )
    )
    .limit(100);

  const totalAmountFromToken = data.reduce((acc, curr) => acc + Number(curr.amountIn), 0);

  const result = totalAmountFromToken >= 100e18 ? 1 : 0;

  return c.json(result);
});
ponder.get('/galxe-astar-more-than-100-timestamp-1739919600', async (c) => {
  const { address } = c.req.query();
  const startTimestamp = 1739919600n; // Tue Feb 18 2025 23:00:00 GMT+0000
  // const startTimestamp = 1739417002n;

  const fromToken = '0x2cae934a1e84f693fbb78ca5ed3b0a6893259441'; // astar
  if (!address) {
    return c.json({ error: 'address is required' }, 400);
  }
  const data = await c.db
    .select()
    .from(OutcomeSwapEvent)
    // @ts-ignore
    .where(
      and(
        gte(OutcomeSwapEvent.timestamp, startTimestamp),
        eq(OutcomeSwapEvent.txSender, address.toLowerCase() as `0x${string}`),
        eq(OutcomeSwapEvent.fromToken, fromToken)
      )
    )
    .limit(100);

  const totalAmountFromToken = data.reduce((acc, curr) => acc + Number(curr.amountIn), 0);

  const result = totalAmountFromToken >= 100e18 ? 1 : 0;

  return c.json(result);
});

ponder.get('/galxe-usdc-more-than-10-timestamp-1739750400', async (c) => {
  const { address } = c.req.query();
  const startTimestamp = 1739750400n; // 2/17/2025 00:00:00 UTC

  const fromToken = '0xba9986d2381edf1da03b0b9c1f8b00dc4aacc369'; // USDC
  if (!address) {
    return c.json({ error: 'address is required' }, 400);
  }
  const data = await c.db
    .select()
    .from(OutcomeSwapEvent)
    // @ts-ignore
    .where(
      and(
        gte(OutcomeSwapEvent.timestamp, startTimestamp),
        eq(OutcomeSwapEvent.txSender, address.toLowerCase() as `0x${string}`),
        eq(OutcomeSwapEvent.fromToken, fromToken)
      )
    )
    .limit(100);

  const totalAmountFromToken = data.reduce((acc, curr) => acc + Number(curr.amountIn), 0);

  const result = totalAmountFromToken >= 10e6 ? 1 : 0;

  return c.json(result);
});

/// analytics

ponder.get('/analytics', async (c) => {
  const { startTimestamp, endTimestamp } = c.req.query();

  const condition = and(
    startTimestamp ? gte(OutcomeSwapEvent.timestamp, startTimestamp) : undefined,
    endTimestamp ? lte(OutcomeSwapEvent.timestamp, endTimestamp) : undefined
  );

  const data = await c.db.select().from(OutcomeSwapEvent).where(condition);

  let marketAccumulatedVolume = 0n;
  const marketNewWallets = new Set<string>();
  let marketAccumulatedWalletCount = 0n;
  let marketAccumulatedTxCount = 0n;

  data.forEach((v) => {
    marketAccumulatedVolume += v.amountInGm;
    marketAccumulatedTxCount += 1n;
    marketNewWallets.add(v.txSender);
  });

  marketAccumulatedWalletCount = BigInt(marketNewWallets.size);

  const marketData = {
    accumulatedVolume: marketAccumulatedVolume / 10n ** 6n,
    accumulatedWalletCount: marketAccumulatedWalletCount,
    accumulatedTxCount: marketAccumulatedTxCount,
  };

  const result = replaceBigInts(marketData, (v) => Number(v));

  return c.json(result);
});

ponder.get('/analytics/all', async (c) => {
  const jan = 1735657200n;
  const feb = 1738335600n;
  const last7days = BigInt(Math.floor(Date.now() / 1000) - 7 * 24 * 60 * 60);

  const data = await c.db.select().from(OutcomeSwapEvent);

  let marketAccumulatedVolume = 0n;
  const marketNewWallets = new Set<string>();
  let marketAccumulatedWalletCount = 0n;
  let marketAccumulatedTxCount = 0n;

  data.forEach((v) => {
    marketAccumulatedVolume += v.amountInGm;
    marketAccumulatedTxCount += 1n;
    marketNewWallets.add(v.txSender);
  });

  marketAccumulatedWalletCount = BigInt(marketNewWallets.size);

  const janData = data.filter((v) => v.timestamp >= jan && v.timestamp <= feb);
  const febData = data.filter((v) => v.timestamp > feb);

  let janAccumulatedVolume = 0n;
  let janNewWallets = new Set<string>();
  let janAccumulatedWalletCount = 0n;
  let janAccumulatedTxCount = 0n;

  janData.forEach((v) => {
    janAccumulatedVolume += v.amountInGm;
    janAccumulatedTxCount += 1n;
    janNewWallets.add(v.txSender);
  });

  janAccumulatedWalletCount = BigInt(janNewWallets.size);

  let febAccumulatedVolume = 0n;
  let febNewWallets = new Set<string>();
  let febAccumulatedWalletCount = 0n;
  let febAccumulatedTxCount = 0n;

  febData.forEach((v) => {
    febAccumulatedVolume += v.amountInGm;
    febAccumulatedTxCount += 1n;
    febNewWallets.add(v.txSender);
  });

  febAccumulatedWalletCount = BigInt(febNewWallets.size);

  const last7daysData = data.filter((v) => v.timestamp >= last7days);

  let last7daysAccumulatedVolume = 0n;
  let last7daysAccumulatedWalletCount = 0n;
  let last7daysAccumulatedTxCount = 0n;
  let last7daysNewWallets = new Set<string>();
  last7daysData.forEach((v) => {
    last7daysAccumulatedVolume += v.amountInGm;
    last7daysAccumulatedTxCount += 1n;
    last7daysNewWallets.add(v.txSender);
  });

  last7daysAccumulatedWalletCount = BigInt(last7daysNewWallets.size);

  // const result = replaceBigInts(marketData, (v) => Number(v));

  const referencePriceDataForPower = {
    ['0x3BaC111A6F5ED6A554616373d5c7D858d7c10d88'.toLowerCase()]: 0.04, //astr
    ['0x467b43ede72543FC0FD79c7085435A484a87e0D7'.toLowerCase()]: 2700, //nrETH
    ['0x74dFFE1e68f41ec364517f1F2951047246c5DD4e'.toLowerCase()]: 0.04, //nsASTR
    ['0x2C7f58d2AfaCae1199c7e1E00FB629CCCEA5Bbd5'.toLowerCase()]: 1, //USDC
    ['0x6A31048E5123859cf50F865d5a3050c18E77fFAe'.toLowerCase()]: 1, //USDT
    ['0xefb3Cc73a5517c9825aE260468259476e7965c5E'.toLowerCase()]: 2700, //WETH
  };
  const referenceDecimal = {
    ['0x3BaC111A6F5ED6A554616373d5c7D858d7c10d88'.toLowerCase()]: 18, //astr
    ['0x467b43ede72543FC0FD79c7085435A484a87e0D7'.toLowerCase()]: 18, //nrETH
    ['0x74dFFE1e68f41ec364517f1F2951047246c5DD4e'.toLowerCase()]: 18, //nsASTR
    ['0x2C7f58d2AfaCae1199c7e1E00FB629CCCEA5Bbd5'.toLowerCase()]: 6, //USDC
    ['0x6A31048E5123859cf50F865d5a3050c18E77fFAe'.toLowerCase()]: 6, //USDT
    ['0xefb3Cc73a5517c9825aE260468259476e7965c5E'.toLowerCase()]: 18, //WETH
  };

  const depositData = await c.db.select().from(AutopilotVaultDepositEvent);

  let autopilotTotalDepositVolume = 0;
  let autopilotNewWallets = new Set<string>();
  let autopilotTotalTxCount = 0n;

  depositData.forEach((v) => {
    autopilotTotalDepositVolume +=
      (Number(v.shares) * referencePriceDataForPower[v.vaultAddress.toLowerCase()]!) /
      10 ** referenceDecimal[v.vaultAddress.toLowerCase()]!;
    autopilotTotalTxCount += 1n;
    autopilotNewWallets.add(v.receiver);
  });

  const autopilotTotalWalletCount = BigInt(autopilotNewWallets.size);

  let autopilotJanDepositVolume = 0;
  let autopilotJanNewWallets = new Set<string>();
  let autopilotJanTxCount = 0n;

  const janDepositData = depositData.filter((v) => v.timestamp >= jan && v.timestamp <= feb);

  janDepositData.forEach((v) => {
    autopilotJanDepositVolume +=
      (Number(v.shares) * referencePriceDataForPower[v.vaultAddress.toLowerCase()]!) /
      10 ** referenceDecimal[v.vaultAddress.toLowerCase()]!;
    autopilotJanTxCount += 1n;
    autopilotJanNewWallets.add(v.receiver);
  });

  const autopilotJanWalletCount = BigInt(autopilotJanNewWallets.size);

  let autopilotFebDepositVolume = 0;
  let autopilotFebNewWallets = new Set<string>();
  let autopilotFebTxCount = 0n;

  const febDepositData = depositData.filter((v) => v.timestamp > feb);

  febDepositData.forEach((v) => {
    autopilotFebDepositVolume +=
      (Number(v.shares) * referencePriceDataForPower[v.vaultAddress.toLowerCase()]!) /
      10 ** referenceDecimal[v.vaultAddress.toLowerCase()]!;
    autopilotFebTxCount += 1n;
    autopilotFebNewWallets.add(v.receiver);
  });

  const autopilotFebWalletCount = BigInt(autopilotFebNewWallets.size);

  let autopilotLast7daysDepositVolume = 0;
  let autopilotLast7daysNewWallets = new Set<string>();
  let autopilotLast7daysTxCount = 0n;

  const last7daysDepositData = depositData.filter((v) => v.timestamp >= last7days);

  last7daysDepositData.forEach((v) => {
    autopilotLast7daysDepositVolume +=
      (Number(v.shares) * referencePriceDataForPower[v.vaultAddress.toLowerCase()]!) /
      10 ** referenceDecimal[v.vaultAddress.toLowerCase()]!;
    autopilotLast7daysTxCount += 1n;
    autopilotLast7daysNewWallets.add(v.receiver);
  });

  const autopilotLast7daysWalletCount = BigInt(autopilotLast7daysNewWallets.size);

  // Add daily timestamps calculation
  const getDayTimestamp = (daysAgo: number) => BigInt(Math.floor(Date.now() / 1000) - daysAgo * 24 * 60 * 60);

  const dailyTimestamps = Array.from({ length: 7 }, (_, i) => ({
    start: getDayTimestamp(i + 1),
    end: getDayTimestamp(i),
    day: `day${i + 1}`,
  }));

  // Calculate daily market data
  const marketDailyData: Record<
    string,
    {
      accumulatedVolume: bigint;
      accumulatedWalletCount: bigint;
      accumulatedTxCount: bigint;
    }
  > = {};

  dailyTimestamps.forEach(({ start, end, day }) => {
    const dailyData = data.filter((v) => v.timestamp >= start && v.timestamp < end);
    const dailyWallets = new Set<string>();

    let dailyVolume = 0n;
    let dailyTxCount = 0n;

    dailyData.forEach((v) => {
      dailyVolume += v.amountInGm;
      dailyTxCount += 1n;
      dailyWallets.add(v.txSender);
    });

    marketDailyData[day] = {
      accumulatedVolume: dailyVolume / 10n ** 6n,
      accumulatedWalletCount: BigInt(dailyWallets.size),
      accumulatedTxCount: dailyTxCount,
    };
  });

  // Calculate daily autopilot data
  const autopilotDailyData: Record<
    string,
    {
      depositVolume: number;
      txCount: bigint;
      walletCount: bigint;
    }
  > = {};

  dailyTimestamps.forEach(({ start, end, day }) => {
    const dailyDepositData = depositData.filter((v) => v.timestamp >= start && v.timestamp < end);
    const dailyWallets = new Set<string>();

    let dailyVolume = 0;
    let dailyTxCount = 0n;

    dailyDepositData.forEach((v) => {
      dailyVolume +=
        (Number(v.shares) * referencePriceDataForPower[v.vaultAddress.toLowerCase()]!) /
        10 ** referenceDecimal[v.vaultAddress.toLowerCase()]!;
      dailyTxCount += 1n;
      dailyWallets.add(v.receiver);
    });

    autopilotDailyData[day] = {
      depositVolume: dailyVolume,
      txCount: dailyTxCount,
      walletCount: BigInt(dailyWallets.size),
    };
  });

  // Update result objects with daily data
  const marketData = {
    jan: {
      accumulatedVolume: janAccumulatedVolume / 10n ** 6n,
      accumulatedWalletCount: janAccumulatedWalletCount,
      accumulatedTxCount: janAccumulatedTxCount,
    },
    feb: {
      accumulatedVolume: febAccumulatedVolume / 10n ** 6n,
      accumulatedWalletCount: febAccumulatedWalletCount,
      accumulatedTxCount: febAccumulatedTxCount,
    },
    last7days: {
      accumulatedVolume: last7daysAccumulatedVolume / 10n ** 6n,
      accumulatedWalletCount: last7daysAccumulatedWalletCount,
      accumulatedTxCount: last7daysAccumulatedTxCount,
    },
    total: {
      accumulatedVolume: marketAccumulatedVolume / 10n ** 6n,
      accumulatedWalletCount: marketAccumulatedWalletCount,
      accumulatedTxCount: marketAccumulatedTxCount,
    },
    daily: marketDailyData,
  };

  const autopilotData = {
    total: {
      depositVolume: autopilotTotalDepositVolume,
      txCount: autopilotTotalTxCount,
      walletCount: autopilotTotalWalletCount,
    },
    jan: {
      depositVolume: autopilotJanDepositVolume,
      txCount: autopilotJanTxCount,
      walletCount: autopilotJanWalletCount,
    },
    feb: {
      depositVolume: autopilotFebDepositVolume,
      txCount: autopilotFebTxCount,
      walletCount: autopilotFebWalletCount,
    },
    last7days: {
      depositVolume: autopilotLast7daysDepositVolume,
      txCount: autopilotLast7daysTxCount,
      walletCount: autopilotLast7daysWalletCount,
    },
    daily: autopilotDailyData,
  };

  const result = {
    autopilot: autopilotData,
    market: marketData,
  };
  return c.json(replaceBigInts(result, (v) => Number(v)));
});
