import { ponder } from 'ponder:registry';
import schema from 'ponder:schema';

ponder.on('AutopilotVault:Transfer', async ({ event, context }) => {
  const { args } = event;
  const { from, to, amount } = args; // amount is shares

  const vaultAddress = event.log.address;

  // Create an Account for the sender, or update the balance if it already exists.
  await context.db
    .insert(schema.AutopilotVault)
    .values({
      id: vaultAddress + '-' + event.args.from,
      user: event.args.from,
      vaultAddress,
      balance: 0n,
      lastUpdatedTimestamp: event.block.timestamp,
    })
    .onConflictDoUpdate((row) => ({
      balance: row.balance - event.args.amount,
      lastUpdatedTimestamp: event.block.timestamp,
    }));

  // Create an Account for the recipient, or update the balance if it already exists.
  await context.db
    .insert(schema.AutopilotVault)
    .values({
      id: vaultAddress + '-' + event.args.to,
      user: event.args.to,
      vaultAddress,
      balance: event.args.amount,
      lastUpdatedTimestamp: event.block.timestamp,
    })
    .onConflictDoUpdate((row) => ({
      balance: row.balance + event.args.amount,
      lastUpdatedTimestamp: event.block.timestamp,
    }));
});

ponder.on('AutopilotVault:Deposit', async ({ event, context }) => {
  const { args } = event;

  const vaultAddress = event.log.address;

  await context.db.insert(schema.AutopilotVaultDepositEvent).values({
    id: event.log.id,
    vaultAddress,
    sender: event.args.caller,
    receiver: event.args.owner,
    assets: event.args.assets,
    shares: event.args.shares,
    timestamp: event.block.timestamp,
  });
});

ponder.on('AutopilotVault:Withdraw', async ({ event, context }) => {
  const { args } = event;

  const vaultAddress = event.log.address;

  await context.db.insert(schema.AutopilotVaultWithdrawEvent).values({
    id: event.log.id,
    vaultAddress,
    sender: event.args.caller,
    receiver: event.args.receiver,
    owner: event.args.owner,
    assets: event.args.assets,
    shares: event.args.shares,
    timestamp: event.block.timestamp,
  });
});
