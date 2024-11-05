import { ponder } from '@/generated';
import { getPointPerSecond } from './PreStaking';

ponder.on('Staking:Staked', async ({ event, context }) => {
  // context.network

  // updateUser

  const { User, UserStaking, PreStaking } = context.db;

  const { prevPointPerSecond, lastTimestamp: prevLastTimestamp } = await UserStaking.findUnique({
    id: event.args.user.toString().concat('-').concat(event.args.wrappedToken.toString()).concat('-').concat(context.network.name),
  }).then((res) =>
    res
      ? { prevPointPerSecond: res.pointPerSecond, lastTimestamp: res.lastTimestamp }
      : {
          prevPointPerSecond: BigInt(0),
          lastTimestamp: event.block.timestamp,
        }
  );

  const accumulatedPoints = prevPointPerSecond * BigInt(event.block.timestamp - prevLastTimestamp);
  const userStaking = await UserStaking.upsert({
    id: event.args.user.toString().concat('-').concat(event.args.wrappedToken.toString()).concat('-').concat(context.network.name),
    create: {
      userId: event.args.user.toString(),
      lastTimestamp: event.block.timestamp,
      token: event.args.token.toString(),
      wrappedToken: event.args.wrappedToken.toString(),
      wrappedAmount: event.args.wrappedAmount,
      accumulatedPoints: BigInt(0),
      pointPerSecond: getPointPerSecond(event.args.wrappedToken.toString(), context.network.name, event.args.wrappedAmount),
    },
    update: ({ current }) => ({
      lastTimestamp: event.block.timestamp,
      wrappedAmount: current.wrappedAmount + event.args.wrappedAmount,
      accumulatedPoints: current.accumulatedPoints + current.pointPerSecond * BigInt(event.block.timestamp - current.lastTimestamp),
      pointPerSecond: getPointPerSecond(
        event.args.wrappedToken.toString(),
        context.network.name,
        current.wrappedAmount + event.args.wrappedAmount
      ),
    }),
  });

  const user = await User.upsert({
    id: event.args.user.toString(),
    create: {
      creationTimestamp: event.block.timestamp,
      lastTimestamp: event.block.timestamp,
      totalAccumulatedPoints: BigInt(0),
      totalPointPerSecond: getPointPerSecond(event.args.wrappedToken.toString(), context.network.name, event.args.wrappedAmount),
    },
    update: ({ current }) => ({
      lastTimestamp: event.block.timestamp,
      totalAccumulatedPoints: current.totalAccumulatedPoints + accumulatedPoints,
      totalPointPerSecond: current.totalPointPerSecond + userStaking.pointPerSecond - prevPointPerSecond,
    }),
  });

  await PreStaking.create({
    id: event.transaction.hash.toString(),
    data: {
      userId: event.args.user.toString(),
      token: event.args.wrappedToken.toString().concat('-').concat(context.network.name),
      amount: event.args.wrappedAmount,
      timestamp: event.block.timestamp,
    },
  });
});
ponder.on('Staking:Unstaked', async ({ event, context }) => {
  // context.network

  // updateUser

  const { User, UserStaking } = context.db;

  const prevUserStaking = await UserStaking.findUnique({
    id: event.args.user.toString().concat('-').concat(event.args.wrappedToken.toString()).concat('-').concat(context.network.name),
  });

  const prevPointPerSecond = prevUserStaking?.pointPerSecond || BigInt(0);
  const prevLastTimestamp = prevUserStaking?.lastTimestamp || event.block.timestamp;

  const accumulatedPoints = prevPointPerSecond * BigInt(event.block.timestamp - prevLastTimestamp);
  const userStaking = await UserStaking.update({
    id: event.args.user.toString().concat('-').concat(event.args.wrappedToken.toString()).concat('-').concat(context.network.name),
    data: ({ current }) => ({
      lastTimestamp: event.block.timestamp,
      wrappedAmount: current.wrappedAmount - event.args.wrappedAmount,
      accumulatedPoints: current.accumulatedPoints + current.pointPerSecond * BigInt(event.block.timestamp - current.lastTimestamp),
      pointPerSecond: BigInt(0),
    }),
  });

  const user = await User.update({
    id: event.args.user.toString(),
    data: ({ current }) => ({
      lastTimestamp: event.block.timestamp,
      totalAccumulatedPoints: current.totalAccumulatedPoints + accumulatedPoints,
      totalPointPerSecond: current.totalPointPerSecond + userStaking.pointPerSecond - prevPointPerSecond,
    }),
  });

  // const { Staking } = context.db;

  // const staking = await Staking.upsert({
  //   id: event.transaction.hash.toString(),
  //   create: {
  //     user,
  //   },
  // });

  // if (context.network.name === 'mainnet') {
  //   console.log('mainnet');
  // } else if (context.network.name === 'astar') {
  //   console.log('astar');
  // }
});
