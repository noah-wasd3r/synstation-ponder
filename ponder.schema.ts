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
  marketIndex: t.text().notNull(),
  title: t.text().notNull(),

  resolver: t.text().notNull(),
  collateralToken: t.text().notNull(),

  isResolved: t.boolean().default(false),

  //

  createdAt: t.bigint().notNull(),
  resolvedAt: t.bigint(),
}));

export const MarketRelation = relations(Market, ({ many }) => ({
  conditions: many(Condition),
}));

export const Condition = onchainTable('condition', (t) => ({
  address: t.hex().primaryKey(),
  marketIndex: t.text().notNull(),
  symbol: t.text().notNull(),
  name: t.text().notNull(),
}));

export const ConditionRelation = relations(Condition, ({ one }) => ({
  market: one(Market, {
    fields: [Condition.marketIndex],
    references: [Market.marketIndex],
  }),
}));

export const ConditionRedeemEvent = onchainTable('condition_redeem_event', (t) => ({
  id: t.text().primaryKey(), // userAddress-condition
  marketIndex: t.text().notNull(),
  conditionAddress: t.hex().notNull(),
  userAddress: t.hex().notNull(),
  conditionAmount: t.bigint().notNull(),
  collateralAmount: t.bigint().notNull(),
  timestamp: t.bigint().notNull(),
}));

export const ConditionMintedEvent = onchainTable('condition_minted_event', (t) => ({
  id: t.text().primaryKey(), // userAddress-condition
  marketIndex: t.text().notNull(),
  conditionAddress: t.hex().notNull(),
  userAddress: t.hex().notNull(),
  conditionAmount: t.bigint().notNull(),
  collateralAmount: t.bigint().notNull(),
  timestamp: t.bigint().notNull(),
}));

// TODO: userConditionPosiion(with Swapped

export const swapEvent = onchainTable('swap_event', (t) => ({
  id: t.text().primaryKey(), // txHash-chainId
  fromToken: t.hex().notNull(),
  toToken: t.hex().notNull(),
  fromAmount: t.bigint().notNull(),
  toAmount: t.bigint().notNull(),
  recipient: t.hex().notNull(),
  timestamp: t.bigint().notNull(),
}));

// export const userCondition;
