import { ponder } from 'ponder:registry';
import { account, transferEvent } from 'ponder:schema';

ponder.on('TestToken:Transfer', async ({ event, context }) => {
  await context.db
    .insert(account)
    .values({
      id: event.args.from.concat('-').concat(event.log.address as string),
      condition: event.log.address as `0x${string}`,
      address: event.args.from,
      balance: 0n,
      isOwner: false,
    })
    .onConflictDoUpdate((row) => ({
      balance: row.balance - event.args.value,
    }));

  await context.db
    .insert(account)
    .values({
      id: event.args.to.concat('-').concat(event.log.address as string),
      condition: event.log.address as `0x${string}`,
      address: event.args.to,
      balance: event.args.value,
      isOwner: false,
    })
    .onConflictDoUpdate((row) => ({
      balance: row.balance + event.args.value,
    }));

  // add row to "transfer_event".
  await context.db.insert(transferEvent).values({
    id: event.log.id,
    amount: event.args.value,
    timestamp: Number(event.block.timestamp),
    from: event.args.from,
    to: event.args.to,
  });
});

// ponder.on('OutcomeToken:Approval', async ({ event, context }) => {
//   // upsert "allowance".
//   await context.db
//     .insert(allowance)
//     .values({
//       spender: event.args.spender,
//       owner: event.args.owner,
//       amount: event.args.value,
//     })
//     .onConflictDoUpdate({ amount: event.args.value });

//   // add row to "approval_event".
//   await context.db.insert(approvalEvent).values({
//     id: event.log.id,
//     amount: event.args.value,
//     timestamp: Number(event.block.timestamp),
//     owner: event.args.owner,
//     spender: event.args.spender,
//   });
// });
