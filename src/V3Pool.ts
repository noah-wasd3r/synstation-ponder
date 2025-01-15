/*
// This function will run whenever a new child contract is created.
ponder.on("SudoswapFactory:NewPair", async ({ event }) => {
  // Address of the child contract that was created.
  event.args.poolAddress;
  //        ^? string
});
 
ponder.on("SudoswapPool:Transfer", async ({ event }) => {
  // Address of the child contract that emitted the event.
  event.log.address;
  //        ^? string
});
*/
