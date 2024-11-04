import { ponder } from "@/generated";

ponder.on("Staking:AdminChanged", async ({ event, context }) => {
  console.log(event.args);
});

ponder.on("Staking:BeaconUpgraded", async ({ event, context }) => {
  console.log(event.args);
});

ponder.on("Staking:Upgraded", async ({ event, context }) => {
  console.log(event.args);
});

ponder.on("Staking:Initialized", async ({ event, context }) => {
  console.log(event.args);
});
