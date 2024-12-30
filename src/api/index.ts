import { ponder } from 'ponder:registry';
import { Condition, Market, UserPreStaking } from '../../ponder.schema';
import { graphql, replaceBigInts } from 'ponder';
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

ponder.get('/userPreStaking', async (c) => {
  const data = await c.db.select().from(UserPreStaking);

  const result = replaceBigInts(data, (v) => Number(v));
  return c.json(result);
});
