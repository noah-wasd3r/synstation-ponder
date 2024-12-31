import { ponder } from 'ponder:registry';
import { Condition, conditionRedeemEvent, Market, swapEvent, UserPreStaking } from '../../ponder.schema';
import { and, eq, graphql, inArray, index, or, replaceBigInts, union } from 'ponder';
import { numberToHex } from 'viem';

ponder.use('/', graphql());

ponder.get('/condition', async (c) => {
  const account = await c.db.select().from(Condition);

  const result = replaceBigInts(account, (v) => Number(v));
  return c.json(result);
});
ponder.get('/market', async (c) => {
  const account = await c.db.query.Market.findMany({
    with: {
      conditions: true,
    },
  });

  const result = replaceBigInts(account, (v) => Number(v));
  return c.json(result);
});

ponder.get('/user-pre-staking', async (c) => {
  const data = await c.db.select().from(UserPreStaking);

  const result = replaceBigInts(data, (v) => Number(v));
  return c.json(result);
});

ponder.get('/swap-events', async (c) => {
  let { user } = c.req.query();
  if (!user) {
    return c.json({ error: 'user is required' }, 400);
  }
  user = user.toLowerCase();
  // @ts-ignore
  const data = await c.db.select().from(swapEvent).where(eq(swapEvent.recipient, user));

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

  // // @ts-ignore
  const swapQuery = (await c.db.select().from(swapEvent).where(eq(swapEvent.recipient, user))).map((v) => ({ ...v, type: 'swap' }));
  const redeemQuery = (await c.db.select().from(conditionRedeemEvent).where(eq(conditionRedeemEvent.userAddress, user))).map((v) => ({
    ...v,
    type: 'redeem',
  }));
  // const data = await union(swapQuery, redeemQuery);

  const result = replaceBigInts([...swapQuery, ...redeemQuery], (v) => Number(v));

  // const result = replaceBigInts(data, (v) => Number(v));
  return c.json(result);
});
