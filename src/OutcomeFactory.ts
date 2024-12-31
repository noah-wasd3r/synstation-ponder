import { ponder } from 'ponder:registry';
import { Condition, conditionRedeemEvent, Market } from '../ponder.schema';
import { erc20Abi } from 'viem';

ponder.on('OutcomeFactory:ConditionDeployed', async ({ event, context }) => {
  //   event.args;
  //    ^? [tokenData: Hex, name: string]
  //   event.trace.gasUsed;
  //          ^? bigint

  const { idx: marketIndex, condition, resolver, collateralToken } = event.args;

  // const [title, conditionNames, conditionsSymbols, resolver, collateralToken] = event.args;

  const { OutcomeFactory } = context.contracts;

  const [idx, length, resolvert, collateralT, resolved, conditionAddressest, title] = await context.client.readContract({
    abi: OutcomeFactory.abi,
    address: OutcomeFactory.address,
    functionName: 'getMarketData',
    args: [marketIndex],
  });

  await context.db
    .insert(Market)
    .values({
      id: context.network.name.concat('-').concat(marketIndex.toString()),
      marketIndex: marketIndex.toString(),
      title: title,
      resolver: resolver,
      collateralToken: collateralToken,
      createdAt: event.block.timestamp,
    })
    .onConflictDoNothing();

  const symbol = await context.client.readContract({
    abi: erc20Abi,
    address: condition,
    functionName: 'symbol',
    args: [],
  });

  await context.db.insert(Condition).values({
    address: condition,
    marketIndex: marketIndex.toString(),
    symbol: symbol as string,
    name: symbol as string,
  });
});

ponder.on('OutcomeFactory:ConditionsResolved', async ({ event, context }) => {
  const { idx: resolvedMarketIndex, distributionHint } = event.args;

  // await context.db
  //   .update(Market, {
  //     id: context.network.name.concat('-').concat(resolvedMarketIndex.toString()),
  //   })
  //   .set((row) => ({ isResolved: true, resolvedAt: event.block.timestamp }));
});

ponder.on('OutcomeFactory:ConditionsRedeemed', async ({ event, context }) => {
  const { idx, user, condition, conditionAmount, collateralAmount } = event.args;

  await context.db.insert(conditionRedeemEvent).values({
    id: user.concat('-').concat(condition),
    marketIndex: idx.toString(),
    conditionAddress: condition,
    userAddress: user,
    conditionAmount: conditionAmount,
    collateralAmount: collateralAmount,
    timestamp: event.block.timestamp,
  });
});

ponder.on('OutcomeFactory:ConditionsMinted', async ({ event, context }) => {});
