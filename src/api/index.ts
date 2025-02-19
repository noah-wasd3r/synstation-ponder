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
  userConditionPosition,
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

ponder.get('/autopilot-all-deposit-withdraw-events', async (c) => {
  const depositData = await c.db.select().from(AutopilotVaultDepositEvent);
  const withdrawData = await c.db.select().from(AutopilotVaultWithdrawEvent);

  const data = {
    depositEvents: depositData,
    withdrawEvents: withdrawData,
  };

  const result = replaceBigInts(data, (v) => Number(v));

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
    );

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
    );

  const totalAmountFromToken = data.reduce((acc, curr) => acc + Number(curr.amountIn), 0);

  const result = totalAmountFromToken >= 10e6 ? 1 : 0;

  return c.json(result);
});
