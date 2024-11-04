import { createSchema } from '@ponder/core';

export default createSchema((p) => ({
  Example: p.createTable({
    id: p.string(),
    name: p.string().optional(),
  }),
  User: p.createTable({
    id: p.string(),
    creationTimestamp: p.bigint(),
    lastTimestamp: p.bigint(),
    totalAccumulatedPoints: p.bigint(),
    totalPointPerSecond: p.bigint(),
  }),
  UserStaking: p.createTable({
    id: p.string(),
    userId: p.string().references('User.id'),
    lastTimestamp: p.bigint(),
    token: p.string(),
    wrappedToken: p.string(),
    wrappedAmount: p.bigint(),
    accumulatedPoints: p.bigint(),

    pointPerSecond: p.bigint(),
  }),
  Staking: p.createTable({
    id: p.string(), // hash
    userId: p.string().references('User.id'),
    token: p.string(),
    amount: p.bigint(),
    wrappedToken: p.string(),
    wrappedAmount: p.bigint(),
    timestamp: p.bigint(),
    userStaging: p.string().references('UserStaking.id'),
  }),

  UserPreStaking: p.createTable({
    id: p.string(),
    userId: p.string().references('User.id'),
    lastTimestamp: p.bigint(),
    token: p.string(),
    amount: p.bigint(),

    accumulatedPoints: p.bigint(),
    pointPerSecond: p.bigint(),
  }),
  PreStaking: p.createTable({
    id: p.string(), // hash
    userId: p.string().references('User.id'),
    token: p.string(),
    amount: p.bigint(),
    timestamp: p.bigint(),
  }),
}));
