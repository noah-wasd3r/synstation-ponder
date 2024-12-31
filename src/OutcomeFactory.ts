import { ponder } from 'ponder:registry';
import { Condition, ConditionRedeemEvent, Market } from '../ponder.schema';
import { erc20Abi } from 'viem';

ponder.on('OutcomeFactory:ConditionDeployed', async ({ event, context }) => {
  //   event.args;
  //    ^? [tokenData: Hex, name: string]
  //   event.trace.gasUsed;
  //          ^? bigint

  const { idx: marketIndex, conditions, resolver, collateralToken } = event.args;

  // const [title, conditionNames, conditionsSymbols, resolver, collateralToken] = event.args;

  const { OutcomeFactory } = context.contracts;

  const [idx, length, resolvert, collateralT, resolved, conditionAddressest, title] = await context.client.readContract({
    abi: OutcomeFactory.abi,
    address: OutcomeFactory.address,
    functionName: 'getMarketData',
    args: [marketIndex],
  });

  const deployedMarket = await context.db
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

  let conditionsSymbols = [];
  for (let i = 0; i < conditions.length; i++) {
    const symbol = await context.client.readContract({
      abi: erc20Abi,
      address: conditions[i],
      functionName: 'symbol',
      args: [],
    });

    conditionsSymbols.push(symbol);
  }

  await context.db.insert(Condition).values(
    conditions.map((address, i) => ({
      address: address,
      marketIndex: marketIndex.toString(),
      symbol: conditionsSymbols[i] as string,
      name: conditionsSymbols[i] as string,
    }))
  );
});

ponder.on('OutcomeFactory:ConditionsResolved', async ({ event, context }) => {
  const { idx: resolvedMarketIndex, distributionHint } = event.args;

  await context.db
    .update(Market, {
      id: context.network.name.concat('-').concat(resolvedMarketIndex.toString()),
    })
    .set((row) => ({ isResolved: true, resolvedAt: event.block.timestamp }));
});

ponder.on('OutcomeFactory:ConditionsRedeemed', async ({ event, context }) => {
  const { idx, user, condition, conditionAmount, collateralAmount } = event.args;

  await context.db.insert(ConditionRedeemEvent).values({
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
