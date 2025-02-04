import { ponder } from 'ponder:registry';
import { PreStaking, UserPreStaking, Users } from '../ponder.schema';

export function getPointPerSecond(token: string, network: string, amount: bigint): bigint {
  if (network === 'mainnet') {
    switch (token.toLowerCase()) {
      case '0xCd5fE23C85820F7B72D0926FC9b05b43E359b7ee'.toLowerCase(): // weETH
        return (BigInt(3100 * 10 ** 8) * amount) / BigInt(86400);
      case '0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0': // wstETH
        return (BigInt(3100 * 10 ** 8) * amount) / BigInt(86400);
      case '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'.toLowerCase(): // USDC
        return (BigInt(1 * 10 ** 8) * amount * BigInt(10 ** 12)) / BigInt(86400);
      case '0xdAC17F958D2ee523a2206206994597C13D831ec7'.toLowerCase(): // USDT
        return (BigInt(1 * 10 ** 8) * amount * BigInt(10 ** 12)) / BigInt(86400);
      case '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599'.toLowerCase(): // WBTC
        return (BigInt(70000 * 10 ** 8) * amount * BigInt(10 ** 10)) / BigInt(86400);
      default:
        return BigInt(0);
    }
  }

  if (network === 'astar') {
    switch (token.toLowerCase()) {
      case '0xAeaaf0e2c81Af264101B9129C00F4440cCF0F720'.toLowerCase(): // WASTR
        return (BigInt(0.05 * 10 ** 8) * amount) / BigInt(86400);
      case '0xE511ED88575C57767BAfb72BfD10775413E3F2b0'.toLowerCase(): // nASTR
        return (BigInt(0.05 * 10 ** 8) * amount) / BigInt(86400);
      case '0xC7E92Cf2c4f5bA60E926D3dB25ad9aBfA063aBd9'.toLowerCase(): // aASTR
        return (BigInt(0.05 * 10 ** 8) * amount) / BigInt(86400);
      default:
        return BigInt(0);
    }
  }

  return BigInt(0);
}

ponder.on('PreStaking:Deposit', async ({ event, context }) => {
  // context.network

  // updateUser

  const { prevPointPerSecond, lastTimestamp: prevLastTimestamp } = await context.db
    .find(UserPreStaking, {
      id: event.args.to.toString().concat('-').concat(event.args.token.toString()).concat('-').concat(context.network.name),
    })
    .then((res) =>
      res
        ? { prevPointPerSecond: res.pointPerSecond, lastTimestamp: res.lastTimestamp }
        : {
            prevPointPerSecond: BigInt(0),
            lastTimestamp: event.block.timestamp,
          }
    );

  const accumulatedPoints = prevPointPerSecond * BigInt(event.block.timestamp - prevLastTimestamp);

  // const userPreStaking = await UserPreStaking.upsert({
  //   id: event.args.to.toString().concat('-').concat(event.args.token.toString()).concat('-').concat(context.network.name),
  //   create: {
  //     userId: event.args.to.toString(),
  //     lastTimestamp: event.block.timestamp,
  //     token: event.args.token.toString(),
  //     amount: event.args.amount,
  //     accumulatedPoints: BigInt(0),
  //     pointPerSecond: getPointPerSecond(event.args.token.toString(), context.network.name, event.args.amount),
  //   },
  //   update: ({ current }) => ({
  //     lastTimestamp: event.block.timestamp,
  //     amount: current.amount + event.args.amount,
  //     accumulatedPoints: current.accumulatedPoints + current.pointPerSecond * BigInt(event.block.timestamp - current.lastTimestamp),
  //     pointPerSecond: getPointPerSecond(event.args.token.toString(), context.network.name, current.amount + event.args.amount),
  //   }),
  // });

  const userPreStaking = await context.db
    .insert(UserPreStaking)
    .values({
      id: event.args.to.toString().concat('-').concat(event.args.token.toString()).concat('-').concat(context.network.name),
      userId: event.args.to.toString(),
      lastTimestamp: event.block.timestamp,
      token: event.args.token.toString(),
      amount: event.args.amount,
      accumulatedPoints: BigInt(0),
      pointPerSecond: getPointPerSecond(event.args.token.toString(), context.network.name, event.args.amount),
    })
    .onConflictDoUpdate((current) => ({
      lastTimestamp: event.block.timestamp,
      amount: current.amount + event.args.amount,
      accumulatedPoints: current.accumulatedPoints + current.pointPerSecond * BigInt(event.block.timestamp - current.lastTimestamp),
      pointPerSecond: getPointPerSecond(event.args.token.toString(), context.network.name, current.amount + event.args.amount),
    }));

  const user = await context.db
    .insert(Users)
    .values({
      id: event.args.to.toString(),
      creationTimestamp: event.block.timestamp,
      preStakingLastTimestamp: event.block.timestamp,
      preStakingAccumulatedPoints: BigInt(0),
      preStakingPointPerSecond: getPointPerSecond(event.args.token.toString(), context.network.name, event.args.amount),
    })
    .onConflictDoUpdate((current) => ({
      lastTimestamp: event.block.timestamp,
      preStakingAccumulatedPoints: current.preStakingAccumulatedPoints + accumulatedPoints,
      preStakingPointPerSecond: current.preStakingPointPerSecond + userPreStaking.pointPerSecond - prevPointPerSecond,
    }));

  await context.db.insert(PreStaking).values({
    id: event.transaction.hash.toString().concat('-').concat(event.args.to.toString()),
    userId: event.args.to.toString(),
    token: event.args.token.toString().concat('-').concat(context.network.name),
    amount: event.args.amount,
    timestamp: event.block.timestamp,
  });
});

ponder.on('PreStaking:Withdraw', async ({ event, context }) => {
  // context.network

  // updateUser

  const { prevPointPerSecond, lastTimestamp: prevLastTimestamp } = await context.db
    .find(UserPreStaking, {
      id: event.args.to.toString().concat('-').concat(event.args.token.toString()).concat('-').concat(context.network.name),
    })
    .then((res) =>
      res
        ? { prevPointPerSecond: res.pointPerSecond, lastTimestamp: res.lastTimestamp }
        : {
            prevPointPerSecond: BigInt(0),
            lastTimestamp: event.block.timestamp,
          }
    );

  const accumulatedPoints = prevPointPerSecond * BigInt(event.block.timestamp - prevLastTimestamp);

  const userPreStaking = await context.db
    .update(UserPreStaking, {
      id: event.args.to.toString().concat('-').concat(event.args.token.toString()).concat('-').concat(context.network.name),
    })
    .set((current) => ({
      lastTimestamp: event.block.timestamp,
      amount: current.amount - event.args.amount,
      accumulatedPoints: current.accumulatedPoints + current.pointPerSecond * BigInt(event.block.timestamp - current.lastTimestamp),
      pointPerSecond: getPointPerSecond(event.args.token.toString(), context.network.name, current.amount - event.args.amount),
    }));

  const user = await context.db
    .update(Users, {
      id: event.args.to.toString(),
    })
    .set((current) => ({
      preStakingLastTimestamp: event.block.timestamp,
      preStakingAccumulatedPoints: current.preStakingAccumulatedPoints + accumulatedPoints,
      preStakingPointPerSecond: current.preStakingPointPerSecond + userPreStaking.pointPerSecond - prevPointPerSecond,
    }));

  // const user = await User.update({
  //   id: event.args.to.toString(),

  //   data: ({ current }) => ({
  //     lastTimestamp: event.block.timestamp,
  //     totalAccumulatedPoints: current.totalAccumulatedPoints + accumulatedPoints,
  //     totalPointPerSecond: current.totalPointPerSecond + userPreStaking.pointPerSecond - prevPointPerSecond,
  //   }),
  // });
});
