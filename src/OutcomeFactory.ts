import { ponder } from 'ponder:registry';
import { Condition, Market, OutcomeSwapEvent, userConditionPosition } from 'ponder:schema';
import { erc20Abi } from 'viem';
import { OutcomeFactoryImplAbi } from '../abis/OutcomeFactoryImplAbi';
import { GM } from './constants/addresses';

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

ponder.on('OutcomeRouter:Swapped', async ({ event, context }) => {
  const isBuy = event.args.from.toLowerCase() === GM[context.network.chainId].toLowerCase();
  const conditionToken = isBuy ? event.args.to : event.args.from;
  const loadedUserConditionPosition = await context.db.find(userConditionPosition, {
    id: event.transaction.from + '-' + conditionToken,
  });

  const conditionPrice = isBuy
    ? event.args.amountOut !== 0n
      ? (event.args.amountIn * 10n ** 6n) / event.args.amountOut
      : 0n
    : event.args.amountIn !== 0n
    ? (event.args.amountOut * 10n ** 6n) / event.args.amountIn
    : 0n;

  const conditionAmount = isBuy ? event.args.amountOut : event.args.amountIn;

  if (!loadedUserConditionPosition) {
    await context.db.insert(userConditionPosition).values({
      id: event.transaction.from + '-' + conditionToken,
      user: event.transaction.from,
      condition: conditionToken,
      updatedAt: event.block.timestamp,
      purchaseRate: conditionPrice,
      accumulatedAmount: conditionAmount,
      closedAt: 0n,
    });
  } else if (isBuy) {
    await context.db
      .update(userConditionPosition, {
        id: event.transaction.from + '-' + conditionToken,
      })
      .set((current) => ({
        updatedAt: event.block.timestamp,
        purchaseRate:
          (current.purchaseRate * current.accumulatedAmount) / (current.accumulatedAmount + conditionAmount) +
          (conditionPrice * conditionAmount) / (current.accumulatedAmount + conditionAmount),
        accumulatedAmount: current.accumulatedAmount + conditionAmount,
      }));
  } else {
    await context.db
      .update(userConditionPosition, {
        id: event.transaction.from + '-' + conditionToken,
      })
      .set((current) => ({
        updatedAt: event.block.timestamp,
        purchaseRate: current.purchaseRate,
        accumulatedAmount: current.accumulatedAmount > conditionAmount ? current.accumulatedAmount - conditionAmount : 0n,
      }));
  }

  await context.db.insert(OutcomeSwapEvent).values({
    id: event.transaction.hash + '#' + event.log.logIndex.toString(),
    timestamp: event.block.timestamp,
    fromToken: event.args.from,
    toToken: event.args.to,
    txSender: event.transaction.from,
    amountIn: event.args.amountIn,
    amountOut: event.args.amountOut,
  });
});
