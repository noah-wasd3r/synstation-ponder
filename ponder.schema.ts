import { onchainTable, relations } from 'ponder';

export const account = onchainTable('account', (t) => ({
  address: t.hex().primaryKey(),
  balance: t.bigint().notNull(),
}));

export const Users = onchainTable('user', (t) => ({
  id: t.text().primaryKey(),
  creationTimestamp: t.bigint(),
  lastTimestamp: t.bigint(),
  totalAccumulatedPoints: t.bigint().notNull(),
  totalPointPerSecond: t.bigint().notNull(),
}));

export const UserStaking = onchainTable('user_staking', (t) => ({
  id: t.text().primaryKey(),
  userId: t.text(),
  lastTimestamp: t.bigint().notNull(),
  token: t.text().notNull(),
  wrappedToken: t.text().notNull(),
  wrappedAmount: t.bigint().notNull(),
  accumulatedPoints: t.bigint().notNull(),

  pointPerSecond: t.bigint().notNull(),
}));

export const Staking = onchainTable('staking', (t) => ({
  id: t.text().primaryKey(),
  userId: t.text(),
  token: t.text(),
  amount: t.bigint(),
  wrappedToken: t.text(),
  wrappedAmount: t.bigint(),
  timestamp: t.bigint(),
  userStaging: t.text(),
}));

export const UserPreStaking = onchainTable('user_pre_staking', (t) => ({
  id: t.text().primaryKey(),
  userId: t.text(),
  lastTimestamp: t.bigint().notNull(),
  token: t.text().notNull(),
  amount: t.bigint().notNull(),

  accumulatedPoints: t.bigint().notNull(),
  pointPerSecond: t.bigint().notNull(),
}));

export const PreStaking = onchainTable('pre_staking', (t) => ({
  id: t.text().primaryKey(),
  userId: t.text(),
  token: t.text(),
  amount: t.bigint(),
  timestamp: t.bigint(),
}));

export const Market = onchainTable('market', (t) => ({
  id: t.text().primaryKey(),
  marketIndex: t.bigint().notNull(),
  title: t.text().notNull(),

  resolver: t.text(),
  collateralToken: t.text(),

  isResolved: t.boolean().default(false),

  //

  createdAt: t.bigint(),
}));

export const MarketRelation = relations(Market, ({ many }) => ({
  conditions: many(Condition),
}));

export const Condition = onchainTable('condition', (t) => ({
  address: t.hex().primaryKey(),
  marketIndex: t.bigint().notNull(),
  symbol: t.text().notNull(),
  name: t.text().notNull(),
}));

export const ConditionRelation = relations(Condition, ({ one }) => ({
  market: one(Market, {
    fields: [Condition.marketIndex],
    references: [Market.marketIndex],
  }),
}));
