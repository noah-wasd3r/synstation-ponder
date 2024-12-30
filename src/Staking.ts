import { ponder } from 'ponder:registry';
import { getPointPerSecond } from './PreStaking';
import { PreStaking, Users, UserStaking } from '../ponder.schema';

ponder.on('Staking:Staked', async ({ event, context }) => {
  // context.network

  // updateUser

  // const { User, UserStaking, PreStaking } = context.db;

  const { prevPointPerSecond, lastTimestamp: prevLastTimestamp } = await context.db
    .find(UserStaking, {
      id: event.args.user.toString().concat('-').concat(event.args.wrappedToken.toString()).concat('-').concat(context.network.name),
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

  const userStaking = await context.db
    .insert(UserStaking)
    .values({
      id: event.args.user.toString().concat('-').concat(event.args.wrappedToken.toString()).concat('-').concat(context.network.name),
      userId: event.args.user.toString(),
      lastTimestamp: event.block.timestamp,
      token: event.args.token.toString(),
      wrappedToken: event.args.wrappedToken.toString(),
      wrappedAmount: event.args.wrappedAmount,
      accumulatedPoints: BigInt(0),
      pointPerSecond: getPointPerSecond(event.args.wrappedToken.toString(), context.network.name, event.args.wrappedAmount),
    })
    .onConflictDoUpdate((current) => ({
      lastTimestamp: event.block.timestamp,
      wrappedAmount: current.wrappedAmount + event.args.wrappedAmount,
      accumulatedPoints: current.accumulatedPoints + current.pointPerSecond * BigInt(event.block.timestamp - current.lastTimestamp),
      pointPerSecond: getPointPerSecond(
        event.args.wrappedToken.toString(),
        context.network.name,
        current.wrappedAmount + event.args.wrappedAmount
      ),
    }));

  // const user = await User.upsert({
  //   id: event.args.user.toString(),
  //   create: {
  //     creationTimestamp: event.block.timestamp,
  //     lastTimestamp: event.block.timestamp,
  //     totalAccumulatedPoints: BigInt(0),
  //     totalPointPerSecond: getPointPerSecond(event.args.wrappedToken.toString(), context.network.name, event.args.wrappedAmount),
  //   },
  //   update: ({ current }) => ({
  //     lastTimestamp: event.block.timestamp,
  //     totalAccumulatedPoints: current.totalAccumulatedPoints + accumulatedPoints,
  //     totalPointPerSecond: current.totalPointPerSecond + userStaking.pointPerSecond - prevPointPerSecond,
  //   }),
  // });

  const user = await context.db
    .insert(Users)
    .values({
      id: event.args.user.toString(),
      creationTimestamp: event.block.timestamp,
      lastTimestamp: event.block.timestamp,
      totalAccumulatedPoints: BigInt(0),
      totalPointPerSecond: getPointPerSecond(event.args.wrappedToken.toString(), context.network.name, event.args.wrappedAmount),
    })
    .onConflictDoUpdate((current) => ({
      lastTimestamp: event.block.timestamp,
      totalAccumulatedPoints: current.totalAccumulatedPoints + accumulatedPoints,
      totalPointPerSecond: current.totalPointPerSecond + userStaking.pointPerSecond - prevPointPerSecond,
    }));

  await context.db.insert(PreStaking).values({
    id: event.transaction.hash.toString(),
    userId: event.args.user.toString(),
    token: event.args.wrappedToken.toString().concat('-').concat(context.network.name),
    amount: event.args.wrappedAmount,
    timestamp: event.block.timestamp,
  });
});

ponder.on('Staking:Unstaked', async ({ event, context }) => {
  // context.network

  // updateUser

  const prevUserStaking = await context.db.find(UserStaking, {
    id: event.args.user.toString().concat('-').concat(event.args.wrappedToken.toString()).concat('-').concat(context.network.name),
  });

  const prevPointPerSecond = prevUserStaking?.pointPerSecond || BigInt(0);
  const prevLastTimestamp = prevUserStaking?.lastTimestamp || event.block.timestamp;

  const accumulatedPoints = prevPointPerSecond * BigInt(event.block.timestamp - prevLastTimestamp);

  const userStaking = await context.db
    .insert(UserStaking)
    .values({
      id: event.args.user.toString().concat('-').concat(event.args.wrappedToken.toString()).concat('-').concat(context.network.name),
      userId: event.args.user.toString(),
      lastTimestamp: event.block.timestamp,
      token: event.args.token.toString(),
      wrappedToken: event.args.wrappedToken.toString(),
      wrappedAmount: BigInt(0),
      accumulatedPoints: BigInt(0),
      pointPerSecond: BigInt(0),
    })
    .onConflictDoUpdate((current) => ({
      lastTimestamp: event.block.timestamp,
      wrappedAmount: current.wrappedAmount - event.args.wrappedAmount,
      accumulatedPoints: current.accumulatedPoints + current.pointPerSecond * BigInt(event.block.timestamp - current.lastTimestamp),
      pointPerSecond: BigInt(0),
    }));
  // const userStaking = await UserStaking.upsert({
  //   id: event.args.user.toString().concat('-').concat(event.args.wrappedToken.toString()).concat('-').concat(context.network.name),
  //   create: {
  //     userId: event.args.user.toString(),
  //     lastTimestamp: event.block.timestamp,
  //     token: event.args.token.toString(),
  //     wrappedToken: event.args.wrappedToken.toString(),
  //     wrappedAmount: BigInt(0),
  //     accumulatedPoints: BigInt(0),
  //     pointPerSecond: BigInt(0),
  //   },
  //   update: ({ current }) => ({
  //     lastTimestamp: event.block.timestamp,
  //     wrappedAmount: current.wrappedAmount - event.args.wrappedAmount,
  //     accumulatedPoints: current.accumulatedPoints + current.pointPerSecond * BigInt(event.block.timestamp - current.lastTimestamp),
  //     pointPerSecond: BigInt(0),
  //   }),
  // });

  const user = await context.db
    .update(Users, {
      id: event.args.user.toString(),
    })
    .set((current) => ({
      lastTimestamp: event.block.timestamp,
      totalAccumulatedPoints: current.totalAccumulatedPoints + accumulatedPoints,
      totalPointPerSecond: current.totalPointPerSecond - prevPointPerSecond,
    }));

  // const user = await User.update({
  //   id: event.args.user.toString(),
  //   data: ({ current }) => ({
  //     lastTimestamp: event.block.timestamp,
  //     totalAccumulatedPoints: current.totalAccumulatedPoints + accumulatedPoints,
  //     totalPointPerSecond: current.totalPointPerSecond + userStaking.pointPerSecond - prevPointPerSecond,
  //   }),
  // });
});
