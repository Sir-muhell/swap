import { Token } from '@uniswap/sdk-core';
import { USDC, WETH } from './libs/constants';

// Sets if the example should run locally or on chain
export enum Environment {
  LOCAL,
  WALLET_EXTENSION,
  MAINNET,
}
// Inputs that configure this example to run
export interface ExampleConfig {
  env: Environment;
  rpc: {
    local: string;
    mainnet: string;
  };
  wallet: {
    address: string;
    privateKey: string;
  };
  tokens: {
    in: Token;
    amountIn: number;
    out: Token;
  };
}

// Example Configuration

export const CurrentConfig: ExampleConfig = {
  env: Environment.WALLET_EXTENSION,
  rpc: {
    local: 'http://localhost:8545',
    mainnet:
      'https://goerli.blockpi.network/v1/rpc/public',
  },
  wallet: {
    address: '0xFf0dE1ECEb20C2Bb5eb6A0F75D6F10365692B379',
    privateKey:
      '349883f277835229f2888d157a5380f2b3d70d0b71782759436b7609d5c5c203',
  },
  tokens: {
    in: WETH,
    amountIn: 0.0001,
    out: USDC,
  },
};
