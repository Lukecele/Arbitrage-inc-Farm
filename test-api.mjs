import https from 'node:https';

https.get('https://zap-api.kyberswap.com/bsc/api/v1/in/route?dex=DEX_PANCAKESWAPV2&pool.id=0x16b9a82891338f9bA80E2D6970FddA79D1eb0daE&tokensIn=0x55d398326f99059fF775485246999027B3197955&amountsIn=1000000000000000000', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('bsc', res.statusCode, data.substring(0, 500)));
});

https.get('https://zap-api.kyberswap.com/56/api/v1/in/route?dex=DEX_PANCAKESWAPV2&pool.id=0x16b9a82891338f9bA80E2D6970FddA79D1eb0daE&tokensIn=0x55d398326f99059fF775485246999027B3197955&amountsIn=1000000000000000000', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('56', res.statusCode, data.substring(0, 500)));
});
