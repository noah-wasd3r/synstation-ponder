import { index, onchainTable, primaryKey, relations } from 'ponder';

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

export const swapEvent = onchainTable(
  'swap_event',
  (t) => ({
    id: t.text().primaryKey(), // txHash-chainId
    fromToken: t.hex().notNull(),
    toToken: t.hex().notNull(),
    fromAmount: t.bigint().notNull(),
    toAmount: t.bigint().notNull(),
    recipient: t.hex().notNull(),
    timestamp: t.bigint().notNull(),
  }),
  (table) => ({
    userIdx: index().on(table.recipient),
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
  pool: t.hex().notNull(),
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
}));

export const SwapEvent = onchainTable(
  'swap_event',
  (t) => ({
    id: t.text().primaryKey(), // txHash+'#' + index in swaps tx array
    timestamp: t.bigint().notNull(),
    fromToken: t.hex().notNull(),
    toToken: t.hex().notNull(),
    txSender: t.hex().notNull(),
    pool: t.hex().notNull(),
    marketIndex: t.text().notNull(),
    amountIn: t.bigint().notNull(),
    amountOut: t.bigint().notNull(),
  }),
  (table) => ({
    txSenderIdx: index('tx_sender_idx').on(table.txSender),
    marketIndexIdx: index('market_index_idx').on(table.marketIndex),
  })
);

export const OutcomeSwapEvent = onchainTable('outcome_swap_event', (t) => ({
  id: t.text().primaryKey(),
  timestamp: t.bigint().notNull(),
  fromToken: t.hex().notNull(),
  toToken: t.hex().notNull(),
  txSender: t.hex().notNull(),
  amountIn: t.bigint().notNull(),
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

export const PoolRelation = relations(pool, ({ one }) => ({
  market: one(Market, {
    fields: [pool.marketIndex],
    references: [Market.marketIndex],
  }),
}));
