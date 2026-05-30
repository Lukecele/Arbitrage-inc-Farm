import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

import { Web3OnboardProvider, init } from '@web3-onboard/react';
import injectedModule from '@web3-onboard/injected-wallets';

const injected = injectedModule();

const web3Onboard = init({
  wallets: [injected],
  chains: [
    {
      id: '0x38',
      token: 'BNB',
      label: 'BNB Smart Chain',
      rpcUrl: 'https://bsc-dataseed.binance.org'
    }
  ],
  appMetadata: {
    name: 'Arbitrage Inception Farm',
    icon: '<svg></svg>',
    description: 'KyberSwap Zap-as-a-Service interface'
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Web3OnboardProvider web3Onboard={web3Onboard}>
      <App />
    </Web3OnboardProvider>
  </StrictMode>,
);
