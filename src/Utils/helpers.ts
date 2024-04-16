// import { TradeType, CurrencyAmount, Percent, Token } from "@uniswap/sdk-core";
import { ethers } from "ethers";
import { AlphaRouter, SwapType } from "@uniswap/smart-order-router";
import { Percent, TradeType, CurrencyAmount, Token } from "@uniswap/sdk-core";
import JSBI from "jsbi";
import ERC20_ABI from "./abi.json";

export const web3Provider = new ethers.providers.JsonRpcProvider(
  "https://mainnet.infura.io/v3/5aaa12b0e25846ffac779abc4b3eb2a5"
);
const router = new AlphaRouter({ chainId: 1, provider: web3Provider });

function countDecimals(x: any) {
  if (Math.floor(x) === x) {
    return 0;
  }
  return x.toString().split(".")[1].length || 0;
}

export function fromReadableAmount(amount: number, decimals: number) {
  const extraDigits = Math.pow(10, countDecimals(amount));
  const adjustedAmount = amount * extraDigits;
  return JSBI.divide(
    JSBI.multiply(
      JSBI.BigInt(adjustedAmount),
      JSBI.exponentiate(JSBI.BigInt(10), JSBI.BigInt(decimals))
    ),
    JSBI.BigInt(extraDigits)
  );
}

export const USDC_TOKEN = new Token(
  1,
  "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
  6,
  "USDC",
  "USD//C"
);

// In
export const WETH = new Token(
  1,
  "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
  18,
  "WETH",
  "Wrapped Ether"
);

const token = {
  in: new Token(
    1,
    "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    18,
    "WETH",
    "Wrapped Ether"
  ),
  out: new Token(
    1,
    "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
    6,
    "USDC",
    "USD//C"
  ),
};

const options = {
  recipient: "0xFf0dE1ECEb20C2Bb5eb6A0F75D6F10365692B379",
  slippageTolerance: new Percent(50, 10_000),
  deadline: Math.floor(Date.now() / 1000 + 1800),
  type: SwapType.SWAP_ROUTER_02,
};

export const createRoute = () => {
  console.log("========got here===========");

  return router.route(
    CurrencyAmount.fromRawAmount(
      token.in,
      fromReadableAmount(0.0001, token.in.decimals).toString()
    ),
    token.out,
    TradeType.EXACT_INPUT,
    options
  );
};
export const getTokenTransferApprovalTransaction = async () => {
  const provider = web3Provider;
  const address = "0xFf0dE1ECEb20C2Bb5eb6A0F75D6F10365692B379";
  const ROUTER_ADDRESS = "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45";
  if (!provider || !address) {
    console.log("No Provider Found");
  }

  try {
    const tokenContract = new ethers.Contract(
      WETH.address,
      ERC20_ABI,
      provider
    );

    const transaction = await tokenContract.populateTransaction.approve(
      ROUTER_ADDRESS,
      fromReadableAmount(100000000000000000000, WETH.decimals).toString()
    );
    console.log("======= transaction =======");
    console.log(transaction);
    const tx = {
      ...transaction,
      from: address,
    };

    const approvalHash = await submitTransactionViaMetamask(tx);
    return approvalHash;
  } catch (e) {
    console.error(e);
  }
};
export const submitTransactionViaMetamask = async (
  tx: ethers.providers.TransactionRequest
) => {
  if (window.ethereum.request) {
    console.log("====== tx ========");
    const receipt = await window.ethereum.request({
      method: "eth_sendTransaction",
      params: [tx],
    });
    console.log(receipt);
  }

  // const browserProvider = web3Provider;

  // const receipt = await browserProvider.send("eth_sendTransaction", [tx]);

  // console.log("======= receipt =======");
  // console.log(receipt);
};
