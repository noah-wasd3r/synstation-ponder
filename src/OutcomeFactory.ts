import { ponder } from 'ponder:registry';
import { Condition, Market } from 'ponder:schema';
import { erc20Abi } from 'viem';
import { OutcomeFactoryImplAbi } from '../abis/OutcomeFactoryImplAbi';

ponder.on('OutcomeFactory:ConditionDeployed', async ({ event, context }) => {
  const symbol = await context.client.readContract({
    address: event.args.condition,
    abi: erc20Abi,
    functionName: 'symbol',
  });

  await context.db.insert(Condition).values({
    address: event.args.condition.toLowerCase() as `0x${string}`,
    marketIndex: event.args.idx.toString(),
    symbol,
    name: symbol,
  });

  const loadedMarket = await context.db.find(Market, {
    id: event.args.idx.toString(),
  });

  if (!loadedMarket) {
    const data = await context.client.readContract({
      address: event.log.address,
      abi: OutcomeFactoryImplAbi,
      functionName: 'getMarketData',
      args: [event.args.idx],
    });

    const title = data[6] as string;

    await context.db.insert(Market).values({
      id: event.args.idx.toString(),
      marketIndex: event.args.idx.toString(),
      title: title,
      resolver: event.args.resolver,
      collateralToken: event.args.collateralToken,
      createdAt: event.block.timestamp,
    });
  }
});

ponder.on('OutcomeFactory:ConditionsResolved', async ({ event, context }) => {
  const loadedMarket = await context.db
    .update(Market, {
      id: event.args.idx.toString(),
    })
    .set({
      isResolved: true,
      resolvedAt: event.block.timestamp,
    });
});
