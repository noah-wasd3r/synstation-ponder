import { ponder } from 'ponder:registry';
import { Condition, conditionRedeemEvent, Market, OutcomeSwapEvent, userConditionPosition } from 'ponder:schema';
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
  const distributions = event.args.distributionHint.map((v) => v);
  const loadedMarket = await context.db
    .update(Market, {
      id: event.args.idx.toString(),
    })
    .set({
      isResolved: true,
      resolvedAt: event.block.timestamp,
      disitributions: distributions,
    });
});

ponder.on('OutcomeFactory:ConditionsRedeemed', async ({ event, context }) => {
  await context.db.insert(conditionRedeemEvent).values({
    id: event.transaction.from + '-' + event.args.idx.toString() + '-' + event.log.logIndex.toString(),
    marketIndex: event.args.idx.toString(),
    conditionAddress: event.args.condition,
    userAddress: event.transaction.from,
    conditionAmount: event.args.conditionAmount,
    collateralAmount: event.args.collateralAmount,
    timestamp: event.block.timestamp,
  });

  try {
    await context.db
      .update(userConditionPosition, {
        id: event.transaction.from + '-' + event.args.condition,
      })
      .set({
        updatedAt: event.block.timestamp,
        redeemInGm: event.args.collateralAmount,
      });
  } catch (e) {
    console.error(e);
  }
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

  const loadedCondition = await context.db.find(Condition, {
    address: conditionToken,
  });

  if (!loadedCondition) {
    throw new Error('Condition not found');
  }

  if (!loadedUserConditionPosition) {
    await context.db.insert(userConditionPosition).values({
      id: event.transaction.from + '-' + conditionToken,
      user: event.transaction.from,
      condition: conditionToken,
      createdAt: event.block.timestamp,
      updatedAt: event.block.timestamp,
      purchaseRate: conditionPrice,
      accumulatedAmount: conditionAmount,
      closedAt: 0n,
      buyInGm: (conditionAmount * conditionPrice) / 10n ** 6n,
      sellInGm: 0n,
      redeemInGm: 0n,
      marketIndex: loadedCondition.marketIndex,
    });
  }

  if (loadedUserConditionPosition) {
    const divisionZero = loadedUserConditionPosition.accumulatedAmount + conditionAmount === 0n;
    if (isBuy) {
      await context.db
        .update(userConditionPosition, {
          id: event.transaction.from + '-' + conditionToken,
        })
        .set({
          updatedAt: event.block.timestamp,
          purchaseRate: divisionZero
            ? 0n
            : (loadedUserConditionPosition.purchaseRate * loadedUserConditionPosition.accumulatedAmount) /
                (loadedUserConditionPosition.accumulatedAmount + conditionAmount) +
              conditionPrice / (loadedUserConditionPosition.accumulatedAmount + conditionAmount),
          accumulatedAmount: loadedUserConditionPosition.accumulatedAmount + conditionAmount,
          buyInGm: loadedUserConditionPosition.buyInGm + (conditionAmount * conditionPrice) / 10n ** 6n,
        });
    } else {
      await context.db
        .update(userConditionPosition, {
          id: event.transaction.from + '-' + conditionToken,
        })
        .set({
          updatedAt: event.block.timestamp,

          accumulatedAmount: loadedUserConditionPosition.accumulatedAmount - conditionAmount,
          sellInGm: loadedUserConditionPosition.sellInGm + (conditionAmount * conditionPrice) / 10n ** 6n,
        });
    }
  }

  await context.db.insert(OutcomeSwapEvent).values({
    id: event.transaction.hash + '#' + event.log.logIndex.toString(),
    timestamp: event.block.timestamp,
    fromToken: event.args.from,
    toToken: event.args.to,
    txSender: event.transaction.from,
    amountIn: event.args.amountIn,
    amountInGm: isBuy ? event.args.amountIn : event.args.amountOut,
    amountOut: event.args.amountOut,
  });

  // TODO: for point calculation
});

ponder.on('OutcomeRouter:TokenSwapped', async ({ event, context }) => {
  await context.db.insert(OutcomeSwapEvent).values({
    id: event.transaction.hash + '#' + event.log.logIndex.toString(),
    timestamp: event.block.timestamp,
    fromToken: event.args.fromToken,
    toToken: event.args.toToken,
    txSender: event.transaction.from,
    amountIn: event.args.amountIn,
    amountInGm: event.args.amountInGm,
    amountOut: event.args.amountOut,
  });
});
