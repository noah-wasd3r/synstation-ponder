import { ponder } from 'ponder:registry';
import { Condition, conditionRedeemEvent, Market, UserPreStaking } from '../../ponder.schema';
import { and, eq, graphql, inArray, index, or, replaceBigInts, sql, union } from 'ponder';
import { checksumAddress, numberToHex } from 'viem';
import { account, OutcomeSwapEvent, pool, poolPrice, position, userConditionPosition, Users } from 'ponder:schema';

ponder.use('/', graphql());

ponder.get('/user-pre-staking', async (c) => {
  const data = await c.db.select().from(UserPreStaking);

  const result = replaceBigInts(data, (v) => Number(v));
  return c.json(result);
});

ponder.get('/test', async (c) => {
  const data = await c.db.select().from(OutcomeSwapEvent);
  const result = replaceBigInts(data, (v) => Number(v));
  return c.json(result);
});

ponder.get('/user-positions', async (c) => {
  let { user, resolved } = c.req.query();

  if (!user) {
    return c.json({ error: 'user is required' }, 400);
  }

  user = user.toLowerCase() as `0x${string}`;

  let data = await c.db.query.userConditionPosition.findMany({
    // @ts-ignore
    where: (userConditionPosition, { eq }) => eq(userConditionPosition.user, user),
    with: {
      condition: {
        with: {
          market: true,
        },
      },
    },
  });

  if (resolved === 'true') {
    data = data.filter((v) => v.condition.market.isResolved);
  }

  if (resolved === 'false') {
    data = data.filter((v) => !v.condition.market.isResolved);
  }

  const result = replaceBigInts(data, (v) => Number(v));

  return c.json(result);
});

ponder.get('/history', async (c) => {
  let { user } = c.req.query();
  if (!user) {
    return c.json({ error: 'user is required' }, 400);
  }
  user = user.toLowerCase();

  // @ts-ignore
  const swapQuery = (await c.db.select().from(swapEvent).where(eq(swapEvent.recipient, user))).map((v) => ({ ...v, type: 'swap' }));
  // @ts-ignore
  const redeemQuery = (await c.db.select().from(conditionRedeemEvent).where(eq(conditionRedeemEvent.userAddress, user))).map((v) => ({
    ...v,
    type: 'redeem',
  }));
  // const data = await union(swapQuery, redeemQuery);

  const result = replaceBigInts([...swapQuery, ...redeemQuery], (v) => Number(v));

  // const result = replaceBigInts(data, (v) => Number(v));
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
  const { poolAddresses, startTimestamp, endTimestamp } = c.req.query();
  let endTimestampInNumber = Number(endTimestamp);
  if (!endTimestampInNumber) {
    endTimestampInNumber = Date.now() / 1000;
  }

  let startTimestampInNumber = Number(startTimestamp);
  if (!startTimestampInNumber) {
    startTimestampInNumber = 0;
  }

  const poolAddressesArr = poolAddresses?.split(',') ?? [];

  const data = await c.db.query.poolPrice.findMany({
    where: (poolPrice, { inArray, and, gte, lte }) =>
      and(
        // @ts-ignore
        inArray(poolPrice.pool, poolAddressesArr),
        // @ts-ignore
        and(gte(poolPrice.timestamp, startTimestampInNumber), lte(poolPrice.timestamp, endTimestampInNumber))
      ),
  });

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
