import fs from 'fs';
// receive args cmd
const args = process.argv.slice(2);
// bun run analytics.ts ${startTimestamp} ${endTimestamp}

const startTimestamp = args[0];
const endTimestamp = args[1];
if (!startTimestamp || !endTimestamp) {
  console.error('Please provide start and end timestamps ( bun run analytics.ts ${startTimestamp} ${endTimestamp} )');
  process.exit(1);
}
const marketData = {
  accumulatedVolume: 0,
  accumulatedWalletCount: 0,
  accumulatedTxCount: 0,
};

const data = await fetch(`http://34.146.244.79:42069/swap-history?fromTimestamp=${startTimestamp}&toTimestamp=${endTimestamp}`).then((v) =>
  v.json()
);

const marketWalletsNotDuplicated = new Set<string>();

// @ts-ignore
data.forEach((v) => {
  marketData.accumulatedVolume += v.amountInGm / 1e6;
  marketData.accumulatedTxCount += 1;
  marketWalletsNotDuplicated.add(v.txSender);
});

marketData.accumulatedWalletCount = marketWalletsNotDuplicated.size;

// Calculate daily autopilot data
const autopilotData = {
  depositVolume: 0,
  txCount: 0,
  walletCount: 0,
};

const autopilotFetchData = await fetch('http://34.146.244.79:42069/autopilot-all-deposit-withdraw-events').then((v) => v.json());
// @ts-ignore
const depositData = autopilotFetchData.depositEvents;
const referencePriceDataForPower = {
  ['0x3BaC111A6F5ED6A554616373d5c7D858d7c10d88'.toLowerCase()]: 0.04, //astr
  ['0x467b43ede72543FC0FD79c7085435A484a87e0D7'.toLowerCase()]: 2700, //nrETH
  ['0x74dFFE1e68f41ec364517f1F2951047246c5DD4e'.toLowerCase()]: 0.04, //nsASTR
  ['0x2C7f58d2AfaCae1199c7e1E00FB629CCCEA5Bbd5'.toLowerCase()]: 1, //USDC
  ['0x6A31048E5123859cf50F865d5a3050c18E77fFAe'.toLowerCase()]: 1, //USDT
  ['0xefb3Cc73a5517c9825aE260468259476e7965c5E'.toLowerCase()]: 2700, //WETH
};
const referenceDecimal = {
  ['0x3BaC111A6F5ED6A554616373d5c7D858d7c10d88'.toLowerCase()]: 18, //astr
  ['0x467b43ede72543FC0FD79c7085435A484a87e0D7'.toLowerCase()]: 18, //nrETH
  ['0x74dFFE1e68f41ec364517f1F2951047246c5DD4e'.toLowerCase()]: 18, //nsASTR
  ['0x2C7f58d2AfaCae1199c7e1E00FB629CCCEA5Bbd5'.toLowerCase()]: 6, //USDC
  ['0x6A31048E5123859cf50F865d5a3050c18E77fFAe'.toLowerCase()]: 6, //USDT
  ['0xefb3Cc73a5517c9825aE260468259476e7965c5E'.toLowerCase()]: 18, //WETH
};
const depositDatas = depositData.filter((v: any) => v.timestamp >= startTimestamp && v.timestamp < endTimestamp);
const autopilotWalletsNotDuplicated = new Set<string>();

depositDatas.forEach((v: any) => {
  autopilotData.depositVolume +=
    (Number(v.shares) * referencePriceDataForPower[v.vaultAddress.toLowerCase()]!) / 10 ** referenceDecimal[v.vaultAddress.toLowerCase()]!;
  autopilotData.txCount += 1;
  autopilotWalletsNotDuplicated.add(v.receiver);
});

autopilotData.walletCount = autopilotWalletsNotDuplicated.size;

fs.writeFileSync('analytics.json', JSON.stringify({ marketData, autopilotData }, null, 2));
