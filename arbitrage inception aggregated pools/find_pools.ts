
import { ethers } from 'ethers';

const RPC = 'https://bsc-dataseed.binance.org/';
const provider = new ethers.providers.JsonRpcProvider(RPC);

const PANCAKE_FACTORY = '0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865';
const UNISWAP_FACTORY = '0xdB1d8A79f3dbC802213850BA2e993301Bc740930';

const factoryAbi = ["function getPool(address,address,uint24) view returns (address)"];

const TOKENS = {
  WBNB: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
  USDT: '0x55d398326f99059fF775485246999027B3197955',
  USDC: '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d',
  CAKE: '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82',
  BTCB: '0x7130d2A12B9BCbFAe4f2634d864A1ee1Ce3Ead9c',
  GENIUS: '0x4445555555555555555555555555555555555555', // Guessing from context
  OPG: '0x06659f89635677ed2afc8352636ad9077228812a',
  XPL: '0xbb95b404b4abefc18c8d90800000000000000000', // From search?
  ZEST: '0x3261c1bf287663C8eccCf14914a2c02Ce17E5660', // Guessing
  PUP: '0xa16f32442209c6b978431818aa535bcc9ad2863e', // From metadata! turn 3
  TST: '0x1e40450f8e21bb68490d7d91ab422888fb3d60f1', // From metadata! turn 3
  BROCCOLI: '0x4f82e73edb06d29ff62c91ec8f5ff06571bdeb29', // Guess
  ASTER: '0x3a667100753cfb7538208af98cb472f65f10da87', // From metadata
  GIGGLE: '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c' // This is WBNB... suspicious
};

async function find(name, f, t0, t1, fee) {
  const contract = new ethers.Contract(f, factoryAbi, provider);
  try {
    const pool = await contract.getPool(t0, t1, fee);
    console.log(`${name}: ${pool}`);
  } catch (e) {
    console.log(`${name}: Failed`);
  }
}

async function main() {
  await find('PAN_GENIUS_USDT', PANCAKE_FACTORY, TOKENS.GENIUS, TOKENS.USDT, 10000);
  await find('UNI_OPG_USDT', UNISWAP_FACTORY, TOKENS.OPG, TOKENS.USDT, 3000);
  await find('PAN_XPL_USDT', PANCAKE_FACTORY, '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d', TOKENS.USDT, 10000); // XPL?
}

main();
