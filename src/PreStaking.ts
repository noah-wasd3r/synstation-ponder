import { ponder } from '@/generated';

export function getPointPerSecond(token: string, network: string, amount: bigint): bigint {
  if (network === 'mainnet') {
    switch (token.toLowerCase()) {
      case '0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0': // wstETH
        return (BigInt(10) * (BigInt(3100 * 10 ** 8) * amount)) / BigInt(86400);
      case '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'.toLowerCase(): // USDC
        return (BigInt(10) * (BigInt(1 * 10 ** 8) * amount * BigInt(10 ** 12))) / BigInt(86400);
      case '0xdAC17F958D2ee523a2206206994597C13D831ec7'.toLowerCase(): // USDT
        return (BigInt(10) * (BigInt(1 * 10 ** 8) * amount * BigInt(10 ** 12))) / BigInt(86400);
      case '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599'.toLowerCase(): // WBTC
        return (BigInt(10) * (BigInt(70000 * 10 ** 8) * amount * BigInt(10 ** 10))) / BigInt(86400);
      default:
        return BigInt(10) * BigInt(0);
    }
  }

  if (network === 'astar') {
    switch (token.toLowerCase()) {
      case '0xAeaaf0e2c81Af264101B9129C00F4440cCF0F720'.toLowerCase(): // WASTR
        return (BigInt(10) * (BigInt(0.05 * 10 ** 8) * amount)) / BigInt(86400);

      default:
        return BigInt(10) * BigInt(0);
    }
  }

  return BigInt(10) * BigInt(0);
}

ponder.on('PreStaking:Deposit', async ({ event, context }) => {
  // context.network

  // updateUser

  const { User, UserPreStaking, PreStaking } = context.db;

  const { prevPointPerSecond, lastTimestamp: prevLastTimestamp } = await UserPreStaking.findUnique({
    id: event.args.to.toString().concat('-').concat(event.args.token.toString()).concat('-').concat(context.network.name),
  }).then((res) =>
    res
      ? { prevPointPerSecond: res.pointPerSecond, lastTimestamp: res.lastTimestamp }
      : {
          prevPointPerSecond: BigInt(0),
          lastTimestamp: event.block.timestamp,
        }
  );

  const accumulatedPoints = prevPointPerSecond * BigInt(event.block.timestamp - prevLastTimestamp);

  const userPreStaking = await UserPreStaking.upsert({
    id: event.args.to.toString().concat('-').concat(event.args.token.toString()).concat('-').concat(context.network.name),
    create: {
      userId: event.args.to.toString(),
      lastTimestamp: event.block.timestamp,
      token: event.args.token.toString(),
      amount: event.args.amount,
      accumulatedPoints: BigInt(0),
      pointPerSecond: getPointPerSecond(event.args.token.toString(), context.network.name, event.args.amount),
    },
    update: ({ current }) => ({
      lastTimestamp: event.block.timestamp,
      amount: current.amount + event.args.amount,
      accumulatedPoints: current.accumulatedPoints + current.pointPerSecond * BigInt(event.block.timestamp - current.lastTimestamp),
      pointPerSecond: getPointPerSecond(event.args.token.toString(), context.network.name, current.amount + event.args.amount),
    }),
  });

  const user = await User.upsert({
    id: event.args.to.toString(),
    create: {
      creationTimestamp: event.block.timestamp,
      lastTimestamp: event.block.timestamp,
      totalAccumulatedPoints: BigInt(0),
      totalPointPerSecond: getPointPerSecond(event.args.token.toString(), context.network.name, event.args.amount),
    },
    update: ({ current }) => ({
      lastTimestamp: event.block.timestamp,
      totalAccumulatedPoints: current.totalAccumulatedPoints + accumulatedPoints,
      totalPointPerSecond: current.totalPointPerSecond + userPreStaking.pointPerSecond - prevPointPerSecond,
    }),
  });

  await PreStaking.create({
    id: event.transaction.hash.toString().concat('-').concat(event.args.to.toString()),
    data: {
      userId: event.args.to.toString(),
      token: event.args.token.toString().concat('-').concat(context.network.name),
      amount: event.args.amount,
      timestamp: event.block.timestamp,
    },
  });
});

ponder.on('PreStaking:Withdraw', async ({ event, context }) => {
  // context.network

  // updateUser

  const { User, UserPreStaking } = context.db;

  const { prevPointPerSecond, lastTimestamp: prevLastTimestamp } = await UserPreStaking.findUnique({
    id: event.args.to.toString().concat('-').concat(event.args.token.toString()).concat('-').concat(context.network.name),
  }).then((res) =>
    res
      ? { prevPointPerSecond: res.pointPerSecond, lastTimestamp: res.lastTimestamp }
      : {
          prevPointPerSecond: BigInt(0),
          lastTimestamp: event.block.timestamp,
        }
  );

  const accumulatedPoints = prevPointPerSecond * BigInt(event.block.timestamp - prevLastTimestamp);

  const userPreStaking = await UserPreStaking.update({
    id: event.args.to.toString().concat('-').concat(event.args.token.toString()).concat('-').concat(context.network.name),

    data: ({ current }) => ({
      lastTimestamp: event.block.timestamp,
      amount: current.amount - event.args.amount,
      accumulatedPoints: current.accumulatedPoints + current.pointPerSecond * BigInt(event.block.timestamp - current.lastTimestamp),
      pointPerSecond: getPointPerSecond(event.args.token.toString(), context.network.name, current.amount - event.args.amount),
    }),
  });

  const user = await User.update({
    id: event.args.to.toString(),

    data: ({ current }) => ({
      lastTimestamp: event.block.timestamp,
      totalAccumulatedPoints: current.totalAccumulatedPoints + accumulatedPoints,
      totalPointPerSecond: current.totalPointPerSecond + userPreStaking.pointPerSecond - prevPointPerSecond,
    }),
  });
});
