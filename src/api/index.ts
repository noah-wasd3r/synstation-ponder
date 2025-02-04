import { ponder } from 'ponder:registry';
import { Condition, conditionRedeemEvent, Market, swapEvent, UserPreStaking } from '../../ponder.schema';
import { and, eq, graphql, inArray, index, or, replaceBigInts, sql, union } from 'ponder';
import { checksumAddress, numberToHex } from 'viem';
import {
  account,
  OutcomeSwapEvent,
  pool,
  poolPrice,
  position,
  SwapEvent,
  transferEvent,
  userConditionPosition,
  Users,
} from 'ponder:schema';

ponder.use('/', graphql());

ponder.get('/user-pre-staking', async (c) => {
  const data = await c.db.select().from(UserPreStaking);

  const result = replaceBigInts(data, (v) => Number(v));
  return c.json(result);
});

ponder.get('/get-purchase-rate', async (c) => {
  let { user, conditions } = c.req.query();

  if (!user) {
    return c.json({ error: 'user is required' }, 400);
  }

  if (!conditions) {
    return c.json({ error: 'conditions is required' }, 400);
  }

  user = user.toLowerCase();

  // conditions split by comma
  const conditionsArr = conditions.split(',').map((c) => c.toLowerCase());

  // get all swap events for all conditions

  const swapEvents = await c.db
    .select()
    .from(swapEvent)
    // @ts-ignore
    .where(and(eq(swapEvent.recipient, user), or(inArray(swapEvent.fromToken, conditionsArr), inArray(swapEvent.toToken, conditionsArr))));

  const conditionToRate: {
    [key: string]: {
      totalConditionAmount: number;
      totalCollateralAmount: number;
      events: {
        id: string;
        fromToken: string;
        toToken: string;
        fromAmount: bigint;
        toAmount: bigint;
        recipient: string;
        timestamp: bigint;
      }[];
      rate: number;
    };
  } = {};

  for (const conditionAddress of conditionsArr) {
    const conditionSwapEvents = swapEvents.filter((se) => se.fromToken === conditionAddress || se.toToken === conditionAddress);

    let totalConditionAmount = 0;
    let totalCollateralAmount = 0;

    conditionSwapEvents.forEach((se) => {
      // if fromToken is the condition token, then we are selling the condition token
      if (se.fromToken === conditionAddress) {
        totalConditionAmount += Number(se.fromAmount);
        totalCollateralAmount += Number(se.toAmount);
      } else if (
        // if toToken is the condition token, then we are buying the condition token
        se.toToken === conditionAddress
      ) {
        totalCollateralAmount += Number(se.toAmount);
        totalConditionAmount += Number(se.fromAmount);
      }
    });
    conditionToRate[conditionAddress] = {
      totalConditionAmount,
      totalCollateralAmount,
      rate: totalConditionAmount / totalCollateralAmount,

      events: conditionSwapEvents,
    };
  }
  return c.json(replaceBigInts(conditionToRate, (v) => Number(v)));
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
  const account = await c.db.select().from(Condition);

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

  if (!marketIndex) {
    const markets = await c.db.query.Market.findMany({
      orderBy: (market, { desc }) => [desc(market.createdAt)],
      limit: Number(pageSize),
      offset: (Number(page) - 1) * Number(pageSize),
      with: {
        conditions: true,
        pools: {
          with: {
            positions: true,
          },
        },
      },
    });

    const result = replaceBigInts(markets, (v) => Number(v));
    return c.json(result);
  } else {
    const markets = await c.db.query.Market.findMany({
      where: (market, { eq }) => eq(market.marketIndex, marketIndex),
      with: {
        conditions: true,
        pools: {
          with: {
            positions: true,
          },
        },
      },
    });

    const result = replaceBigInts(markets, (v) => Number(v));
    return c.json(result);
  }
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

ponder.get('/user-condition-position', async (c) => {
  let { user } = c.req.query();
  if (!user) {
    return c.json({ error: 'user is required' }, 400);
  }
  user = user.toLowerCase();

  // @ts-ignore
  const data = await c.db.select().from(userConditionPosition).where(eq(userConditionPosition.user, user));
  const result = replaceBigInts(data, (v) => Number(v));
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
