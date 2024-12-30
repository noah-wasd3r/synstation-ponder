import { ponder } from 'ponder:registry';
import { Condition, Market } from '../ponder.schema';

ponder.on('OutcomeFactory.deployConditions()', async ({ event, context }) => {
  //   event.args;
  //    ^? [tokenData: Hex, name: string]
  //   event.trace.gasUsed;
  //          ^? bigint

  const [title, conditionNames, conditionsSymbols, resolver, collateralToken] = event.args;

  const marketIndex = event.result;

  const { OutcomeFactory } = context.contracts;

  const conditionAddresses = await context.client.readContract({
    abi: OutcomeFactory.abi,
    address: OutcomeFactory.address,
    functionName: 'getConditions',
    args: [marketIndex],
  });

  const deployedMarket = await context.db.insert(Market).values({
    id: event.transaction.hash.concat('-').concat(marketIndex.toString()),
    marketIndex: marketIndex,
    title: title,
    resolver: resolver,
    collateralToken: collateralToken,
    createdAt: event.block.timestamp,
  });

  await context.db.insert(Condition).values(
    conditionAddresses.map((address, i) => ({
      address: address,
      marketIndex: marketIndex,
      symbol: conditionsSymbols[i] as string,
      name: conditionNames[i] as string,
    }))
  );
});
