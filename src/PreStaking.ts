import { ponder } from "@/generated";

ponder.on("PreStaking:AdminChanged", async ({ event, context }) => {
  console.log(event.args);
});

ponder.on("PreStaking:BeaconUpgraded", async ({ event, context }) => {
  console.log(event.args);
});

ponder.on("PreStaking:Upgraded", async ({ event, context }) => {
  console.log(event.args);
});

ponder.on("PreStaking:AddNewPool", async ({ event, context }) => {
  console.log(event.args);
});
