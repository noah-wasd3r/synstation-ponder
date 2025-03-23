import { index, onchainTable, primaryKey, relations } from 'ponder';

export const Users = onchainTable('user', (t) => ({
  id: t.text().primaryKey(),
  creationTimestamp: t.bigint(),
  // pre-staking
  preStakingAccumulatedPoints: t.bigint().notNull().default(0n),
  preStakingPointPerSecond: t.bigint().notNull(),
  preStakingLastTimestamp: t.bigint().notNull(),
  // portal
  portalAccumulatedPoints: t.bigint().notNull().default(0n),
  portalPointPerSecond: t.bigint().default(0n),

  //
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

export const conditionRedeemEvent = onchainTable(
  'condition_redeem_event',
  (t) => ({
    id: t.text().primaryKey(), // userAddress-condition
    marketIndex: t.text().notNull(),
    conditionAddress: t.hex().notNull(),
    userAddress: t.hex().notNull(),
    conditionAmount: t.bigint().notNull(),
    collateralAmount: t.bigint().notNull(),
    timestamp: t.bigint().notNull(),
  }),
  (table) => ({
    userIdx: index().on(table.userAddress),
  })
);

// export const userCondition;

// OutcomeToken

export const account = onchainTable('account', (t) => ({
  id: t.text().primaryKey(), // user-condition
  address: t.hex().notNull(),
  condition: t.hex().notNull(),
  balance: t.bigint().notNull(),
  isOwner: t.boolean().notNull(),
}));

export const allowance = onchainTable(
  'allowance',
  (t) => ({
    owner: t.hex(),
    spender: t.hex(),
    amount: t.bigint().notNull(),
  }),
  (table) => ({
    pk: primaryKey({ columns: [table.owner, table.spender] }),
  })
);

export const transferEvent = onchainTable(
  'transfer_event',
  (t) => ({
    id: t.text().primaryKey(),
    amount: t.bigint().notNull(),
    timestamp: t.integer().notNull(),
    from: t.hex().notNull(),
    to: t.hex().notNull(),
  }),
  (table) => ({
    fromIdx: index('from_index').on(table.from),
  })
);

export const transferEventRelations = relations(transferEvent, ({ one }) => ({
  fromAccount: one(account, {
    fields: [transferEvent.from],
    references: [account.address],
  }),
}));

export const approvalEvent = onchainTable('approval_event', (t) => ({
  id: t.text().primaryKey(),
  amount: t.bigint().notNull(),
  timestamp: t.integer().notNull(),
  owner: t.hex().notNull(),
  spender: t.hex().notNull(),
}));

// For V3 Pool

export const factory = onchainTable('factory', (t) => ({
  id: t.text().primaryKey(), // factoryAddress
  poolCount: t.bigint().notNull().default(0n),
  txCount: t.bigint().notNull().default(0n),
  owner: t.hex().notNull(), // factory current owner
}));

/*
# stores for USD calculations
type Bundle @entity {
  id: ID!
  # price of ETH in usd
  ethPriceUSD: BigDecimal!
}
*/

export const bundle = onchainTable('bundle', (t) => ({
  id: t.text().primaryKey(),
  ethPriceUSD: t.bigint().notNull(),
}));

export const token = onchainTable('token', (t) => ({
  id: t.text().primaryKey(),
  symbol: t.text().notNull(),
  name: t.text().notNull(),
  decimals: t.bigint().notNull(),
  totalSupply: t.bigint().notNull(),
  volume: t.bigint().notNull(),
  txCount: t.bigint().notNull(),
  poolCount: t.bigint().notNull(),
  totalValueLocked: t.bigint().notNull(),
}));

export const pool = onchainTable(
  'pool',
  (t) => ({
    id: t.text().primaryKey(), // poolAddress
    createdAtTimestamp: t.bigint().notNull(),
    createdAtBlockNumber: t.bigint().notNull(),
    token0: t.hex().notNull(),
    token1: t.hex().notNull(),
    feeTier: t.integer().notNull(),
    liquidity: t.bigint().notNull(),
    sqrtPrice: t.bigint().notNull(),
    feeGrowthGlobal0X128: t.bigint().notNull(),
    feeGrowthGlobal1X128: t.bigint().notNull(),
    token0Price: t.bigint().notNull(),
    token1Price: t.bigint().notNull(),
    tick: t.bigint().notNull(),
    observationIndex: t.bigint().notNull(),
    volumeToken0: t.bigint().notNull(),
    volumeToken1: t.bigint().notNull(),
    txCount: t.bigint().notNull(),
    collectedFeesToken0: t.bigint().notNull(),
    collectedFeesToken1: t.bigint().notNull(),
    totalValueLockedToken0: t.bigint().notNull(),
    totalValueLockedToken1: t.bigint().notNull(),
    liquidityProviderCount: t.bigint().notNull(),
    // for prediction
    conditionPrice: t.bigint().notNull(),
    marketIndex: t.text().notNull(),
  }),
  (table) => ({
    marketIndexIdx: index('pool_market_index_idx').on(table.marketIndex),
  })
);

export const position = onchainTable('position', (t) => ({
  id: t.text().primaryKey(),
  owner: t.hex().notNull(),
  pool: t.text().notNull(),
  token0: t.hex().notNull(),
  token1: t.hex().notNull(),
  tickLower: t.bigint().notNull(),
  tickUpper: t.bigint().notNull(),
  liquidity: t.bigint().notNull(),
  depositedToken0: t.bigint().notNull(),
  depositedToken1: t.bigint().notNull(),
  withdrawnToken0: t.bigint().notNull(),
  withdrawnToken1: t.bigint().notNull(),
  collectedFeesToken0: t.bigint().notNull(),
  collectedFeesToken1: t.bigint().notNull(),
  feeGrowthInside0LastX128: t.bigint().notNull(),
  feeGrowthInside1LastX128: t.bigint().notNull(),
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

  disitributions: t.bigint().array(),
}));

export const OutcomeSwapEvent = onchainTable('outcome_swap_event', (t) => ({
  id: t.text().primaryKey(),
  timestamp: t.bigint().notNull(),
  fromToken: t.hex().notNull(),
  toToken: t.hex().notNull(),
  txSender: t.hex().notNull(),
  amountIn: t.bigint().notNull(),
  amountInGm: t.bigint().notNull(),
  amountOut: t.bigint().notNull(),
}));

export const Condition = onchainTable(
  'condition',
  (t) => ({
    address: t.hex().primaryKey(),
    marketIndex: t.text().notNull(),
    symbol: t.text().notNull(),
    name: t.text().notNull(),
  }),
  (table) => ({
    marketIndexIdx: index('condition_market_index_idx').on(table.marketIndex),
  })
);

export const MarketRelation = relations(Market, ({ many }) => ({
  conditions: many(Condition),
  pools: many(pool),
}));

export const ConditionRelation = relations(Condition, ({ one }) => ({
  market: one(Market, {
    fields: [Condition.marketIndex],
    references: [Market.marketIndex],
  }),
}));
export const PositionRelation = relations(position, ({ one }) => ({
  pool: one(pool, {
    fields: [position.pool],
    references: [pool.id],
  }),
}));
export const PoolRelation = relations(pool, ({ one, many }) => ({
  market: one(Market, {
    fields: [pool.marketIndex],
    references: [Market.marketIndex],
  }),
  positions: many(position),
}));

export const RedeemEventRelation = relations(conditionRedeemEvent, ({ one }) => ({
  condition: one(Condition, {
    fields: [conditionRedeemEvent.conditionAddress],
    references: [Condition.address],
  }),
}));

// for chart

export const poolPrice = onchainTable('pool_price', (t) => ({
  id: t.text().primaryKey(), // poolAddress-timestamp
  pool: t.hex().notNull(), // reference pool
  price: t.bigint().notNull(),
  timestamp: t.bigint().notNull(),
}));

export const PoolPriceRelation = relations(poolPrice, ({ one }) => ({
  pool: one(pool, {
    fields: [poolPrice.pool],
    references: [pool.id],
  }),
}));

// for chart -end

//

// autopilot vault

export const AutopilotVault = onchainTable('autopilot_vault', (t) => ({
  id: t.text().primaryKey(), // vaultAddress-user
  user: t.hex().notNull(),
  vaultAddress: t.hex().notNull(),
  balance: t.bigint().notNull(),
  lastUpdatedTimestamp: t.bigint().notNull(),
}));
export const AutopilotVaultDepositEvent = onchainTable('autopilot_vault_deposit_event', (t) => ({
  id: t.text().primaryKey(),
  vaultAddress: t.hex().notNull(),
  sender: t.hex().notNull(),
  receiver: t.hex().notNull(),
  assets: t.bigint().notNull(),
  shares: t.bigint().notNull(),
  timestamp: t.bigint().notNull(),
}));

export const AutopilotVaultWithdrawEvent = onchainTable('autopilot_vault_withdraw_event', (t) => ({
  id: t.text().primaryKey(),
  vaultAddress: t.hex().notNull(),
  sender: t.hex().notNull(),
  receiver: t.hex().notNull(),
  owner: t.hex().notNull(),
  assets: t.bigint().notNull(),
  shares: t.bigint().notNull(),
  timestamp: t.bigint().notNull(),
}));

export const AutopilotVaultRelation = relations(AutopilotVault, ({ many }) => ({
  depositEvents: many(AutopilotVaultDepositEvent),
  withdrawEvents: many(AutopilotVaultWithdrawEvent),
}));

export const AutopilotVaultDepositEventRelation = relations(AutopilotVaultDepositEvent, ({ one }) => ({
  vault: one(AutopilotVault, {
    fields: [AutopilotVaultDepositEvent.vaultAddress],
    references: [AutopilotVault.vaultAddress],
  }),
}));

export const AutopilotVaultWithdrawEventRelation = relations(AutopilotVaultWithdrawEvent, ({ one }) => ({
  vault: one(AutopilotVault, {
    fields: [AutopilotVaultWithdrawEvent.vaultAddress],
    references: [AutopilotVault.vaultAddress],
  }),
}));
