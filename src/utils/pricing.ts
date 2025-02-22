export function sqrtPriceX96ToTokenPrices(sqrtPriceX96: bigint): bigint[] {
  let num = Number(sqrtPriceX96 * sqrtPriceX96);
  let denom = 2 ** 192;
  //   let price1 = num.div(denom).times(exponentToBigDecimal(token0.decimals)).div(exponentToBigDecimal(token1.decimals));
  // has same decimals
  let price1 = num / denom;

  let price0 = 1 / price1;
  return [BigInt(Math.floor(price0 * 10 ** 18)) / BigInt(10 ** 12), BigInt(Math.floor(price1 * 10 ** 18)) / BigInt(10 ** 12)];
}
