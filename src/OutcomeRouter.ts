import { ponder } from 'ponder:registry';
import { Condition, Market, swapEvent } from '../ponder.schema';
import { erc20Abi } from 'viem';

ponder.on('OutcomeRouter:Swapped', async ({ event, context }) => {
  const { from, to, amountIn, amountOut } = event.args;
  await context.db.insert(swapEvent).values({
    id: event.transaction.hash.concat('-').concat(context.network.chainId.toString()),
    fromToken: from,
    toToken: to,
    fromAmount: amountIn,
    toAmount: amountOut,

    recipient: event.transaction.from,
    timestamp: event.block.timestamp,
  });
});
