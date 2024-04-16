//@ts-nocheck
import React, { useCallback, useEffect, useState } from "react";
import "./swap.css";
import { Environment, CurrentConfig } from "../config";
import { getCurrencyBalance, wrapETH } from "../libs/wallet";
import axios from "axios";
import {
  connectBrowserExtensionWallet,
  getProvider,
  getWalletAddress,
  TransactionState,
} from "../libs/providers";
import { executeRoute, generateRoute } from "../libs/routing";
import { SwapRoute } from "@uniswap/smart-order-router";

import { CgArrowsExchangeV } from "react-icons/cg";
import {
  ArrowDownOutlined,
  DownOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import Header from "./header";
import { Input, Popover, Radio, Modal, message } from "antd";
import {
  WETH,
  createRoute,
  getTokenTransferApprovalTransaction,
  submitTransactionViaMetamask,
  web3Provider,
} from "../Utils/helpers";
import { ethers } from "ethers";
import { Web3Provider } from "@ethersproject/providers";
import ABI from "../Utils/abi.json";
import Image from "../assets/cu.jpg";

const useOnBlockUpdated = (callback: (blockNumber: number) => void) => {
  useEffect(() => {
    const subscription = getProvider()?.on("block", callback);
    return () => {
      subscription?.removeAllListeners();
    };
  });
};

const Example = () => {
  const [tokenInBalance, setTokenInBalance] = useState<string>();
  const [tokenOutBalance, setTokenOutBalance] = useState<string>();
  const [txState, setTxState] = useState<TransactionState>(
    TransactionState.New
  );
  const [blockNumber, setBlockNumber] = useState<number>(0);
  const [route, setRoute] = useState<SwapRoute | null>(null);

  //////

  const [amount, setAmount] = useState("0.00");
  const [value, setValue] = useState("");
  const [gas, setGas] = useState("");
  const [tokens, setTokens] = useState([]);
  const [slippage, setSlippage] = useState(2.5);
  const [tokenOne, setTokenOne] = useState("");
  const [tokenTwo, setTokenTwo] = useState("");
  const [changeToken, setChangeToken] = useState(1);
  const [isOpen, setIsOpen] = useState(false);
  const [gasFee, setGasFee] = useState("0");

  const [routePayload, setRoutePayload] = useState<SwapRoute>();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchTokenList = async () => {
      try {
        const response = await axios.get(
          "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/tokenlist.json"
        );
        const fetchedTokenList = response.data.tokens;
        fetchedTokenList.sort((a, b) => (a.symbol > b.symbol ? 1 : -1));
        // Manually add a token at position [0]
        const newToken = {
          chainId: 1,
          address: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
          name: "Ethereum",
          symbol: "ETH",
          decimals: 18,
          logoURI:
            "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png",
        };

        const newToken2 = {
          chainId: 1,
          address: "0xa0c7e61ee4faa9fcefdc8e8fc5697d54bf8c8141",
          name: "Curiosity Anon",
          symbol: "CA",
          decimals: 18,
          logoURI: Image,
        };

        const newToken3 = {
          chainId: 1,
          address: "0x92Fbd0E76Fa70a13a1D7Eb6B053A6D3fFc20D94e",
          name: "TM",
          symbol: "Test MAtic",
          decimals: 18,
          logoURI: Image,
        };

        const newToken4 = {
          chainId: 1,
          address: "0x779877A7B0D9E8603169DdbD7836e478b4624789",
          name: "TL",
          symbol: "Test Link",
          decimals: 18,
          logoURI: Image,
        };

        const updatedTokenList = [
          newToken,
          newToken2,
          newToken3,
          newToken4,
          ...fetchedTokenList,
        ]; // Prepend the new token
        setTokens(updatedTokenList);
      } catch (error) {
        console.error("Error fetching token list:", error);
      }
    };

    fetchTokenList(); // Invoke the fetchTokenList function inside useEffect
  }, []);

  function switchTokens() {
    setTokenOne(tokenTwo);
    setTokenTwo(tokenOne);
    setValue(amount);
    setAmount(value);
  }

  function handleSlippageChange(e) {
    // console.log(e.target.value);
    setSlippage(e.target.value);
  }
  function handleGas(e) {
    // console.log(e.target.value);
    setGas(e.target.value);
  }
  useEffect(() => {
    if (tokens.length > 0) {
      setTokenOne(tokens[0]);
      setTokenTwo(tokens[1]);
    }
  }, [tokens]);

  function openModal(asset) {
    setChangeToken(asset);
    setIsOpen(true);
  }

  useEffect(() => {
    // Function to fetch token balances for tokenOne and tokenTwo
    const fetchTokenBalances = async () => {
      try {
        // Fetch token balances for tokenOne
        await handleTokenSelect(tokenOne);
        // Fetch token balances for tokenTwo
        await handleTokenSelect(tokenTwo);
      } catch (error) {
        console.error("Error fetching token balances:", error.message);
      }
    };

    fetchTokenBalances(); // Fetch token balances when component mounts
  }, []);

  const handleTokenSelect = async (token) => {
    try {
      // Check if MetaMask is available
      if (typeof window.ethereum === "undefined") {
        throw new Error("MetaMask not detected.");
      }

      // Get the user's address
      const providers = new Web3Provider(window.ethereum);
      const accounts = (await providers.listAccounts())[0];
      // console.log(accounts);

      let balance;
      if (token.symbol === "ETH") {
        const ethBalance = await web3Provider.getBalance(accounts);
        balance = Number(ethers.utils.formatEther(ethBalance)).toFixed(5);
      } else {
        // Instantiate the ERC-20 token contract
        const tokenContract = new ethers.Contract(
          token.address,
          ABI,
          web3Provider
        );

        // Get token balance
        const tokenBalance = await tokenContract.balanceOf(accounts);
        balance = Number(
          ethers.utils.formatUnits(tokenBalance, token.decimals)
        ).toFixed(5);
      }

      // Update the selected token with its balance
      if (changeToken === 1) {
        setTokenOne({ ...token, balance });
      } else {
        setTokenTwo({ ...token, balance });
      }

      // Close the modal
      setIsOpen(false);
    } catch (error) {
      console.error("Error handling token selection:", error);
    }
  };

  /////

  // Listen for new blocks and update the wallet
  useOnBlockUpdated(async (blockNumber: number) => {
    refreshBalances();
    setBlockNumber(blockNumber);
  });

  // Update wallet state given a block number
  const refreshBalances = useCallback(async () => {
    const provider = getProvider();
    const address = getWalletAddress();
    if (!address || !provider) {
      return;
    }

    setTokenInBalance(
      await getCurrencyBalance(provider, address, CurrentConfig.tokens.in)
    );
    setTokenOutBalance(
      await getCurrencyBalance(provider, address, CurrentConfig.tokens.out)
    );
  }, []);

  // Event Handlers

  const onConnectWallet = useCallback(async () => {
    if (await connectBrowserExtensionWallet()) {
      refreshBalances();
    }
  }, [refreshBalances]);

  // const onCreateRoute = useCallback(async () => {
  //   setRoute(await generateRoute());
  // }, []);

  const executeSwap = useCallback(async (route: SwapRoute | null) => {
    if (!route) {
      return;
    }
    setTxState(TransactionState.Sending);
    setTxState(await executeRoute(route));
  }, []);

  const settings = (
    <>
      <div>Slippage Tolerance</div>
      <div>
        <Radio.Group value={slippage}>
          <Radio.Button value={0.5}>0.5%</Radio.Button>
          <Radio.Button value={2.5}>2.5%</Radio.Button>
          <Radio.Button value={5}>5.0%</Radio.Button>
        </Radio.Group>
      </div>

      <div className="mt-3">
        <Input placeholder="Custom" />
      </div>

      <div className="mt-4">Miner Tip</div>
      <div className="mt-1">
        <Input placeholder="0.5 Eth" />
      </div>
    </>
  );

  const [searchQuery, setSearchQuery] = useState("");

  // Filter tokens based on the search query
  const filteredTokens = tokens.filter(
    (token) =>
      token.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      token.symbol.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleRoute = async () => {
    // console.log("===========got hrere======");
    setLoading(true);
    const createdRoute = await createRoute();
    console.log("===========Route Created=========");
    console.log(
      `Route: 0.0001 WETH to ${createdRoute.quote.toExact()} USDC using $${createdRoute.estimatedGasUsedUSD.toExact()} worth of gas`
    );
    setLoading(false);
    setAmount(createdRoute.quote.toExact());
    setGasFee("$" + createdRoute.estimatedGasUsedUSD.toExact());
    setRoutePayload(createdRoute);
    submitCreatedRoute();
  };

  const submitCreatedRoute = async () => {
    console.log("======== submitting ==========");
    const walletAddress = "0xFf0dE1ECEb20C2Bb5eb6A0F75D6F10365692B379";
    const provider = web3Provider;

    if (!walletAddress || !provider) {
      throw new Error("Cannot execute a trade without a connected wallet");
    }
    console.log("======getting token approval=======");
    const tokenApprovalTransaction =
      await getTokenTransferApprovalTransaction();

    const swapTxs = {
      data: routePayload?.methodParameters?.calldata,
      to: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45", //router address
      value: routePayload?.methodParameters?.value,
      from: "0xFf0dE1ECEb20C2Bb5eb6A0F75D6F10365692B379",
      maxFeePerGas: 100000000000000,
      maxPriorityFeePerGas: 100000000000000,
    };
    swapTxs.gasLimit = await provider.estimateGas(swapTxs);
    const res = await submitTransactionViaMetamask(swapTxs);
    console.log("==== res =====");
    console.log(res);

    console.log("======== send ========");
    // tx = await provider.sendTransaction(tokenApprovalTransaction);
    // console.log("========= tx ===========");
    // console.log(tx);

    // console.log("======approved=======");

    // // Fail if transfer approvals do not go through
    // if (tokenApproval !== TransactionState.Sent) {
    //   return TransactionState.Failed;
    // }
    // const txs = {
    //   data: route.methodParameters?.calldata,
    //   to: V3_SWAP_ROUTER_ADDRESS,
    //   value: route?.methodParameters?.value,
    //   from: walletAddress,
    //   maxFeePerGas: MAX_FEE_PER_GAS,
    //   maxPriorityFeePerGas: MAX_PRIORITY_FEE_PER_GAS,
    // };

    // const res = await sendTransaction({
    //   ...txs,
    //   gasLimit: await provider.estimateGas(txs),
    // });

    // return res;
  };
  return (
    <div className="bg-image h-screen ">
      <Header />
      <Modal
        open={isOpen}
        footer={null}
        onCancel={() => setIsOpen(false)}
        title="Select a token"
        contentBg={"#000000"}
        colorBgMask={"#000000"}
      >
        <div className="modalContent">
          <input
            type="text"
            placeholder="Search tokens"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="mt-3 mb-3 p-2 rounded-lg w-full"
          />
          {filteredTokens.map((e, i) => (
            <div
              className="tokenChoice"
              key={i}
              onClick={() => handleTokenSelect(e)} // Update selected token when clicked
            >
              <div className="inline-flex mt-3">
                <img
                  src={e.logoURI}
                  alt={e.ticker}
                  className="w-10 h-10 rounded-full mr-5"
                />
                <div className="">
                  <div className="tokenName">{e.name}</div>
                  <div className="tokenTicker">{e.symbol}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Modal>
      <div className="flex pt-20 justify-center items-center">
        <div className="card p-5 text-white">
          <div className="grid grid-cols-2">
            <p className="text-3xl font-light">Swap tokens</p>
            <div className="justify-self-end">
              <Popover
                content={settings}
                title="Settings"
                trigger="click"
                placement="bottomRight"
              >
                <SettingOutlined className="cog" />
              </Popover>
            </div>
          </div>

          <p className="text-xs pt-2 text-gray-500">
            Choose a pair of token to make a swap
          </p>
          <div className="relative">
            <div className="bg-black mt-5 p-5 grid grid-cols-2">
              <div className="inline-flex " onClick={() => openModal(1)}>
                <img
                  src={tokenOne.logoURI}
                  className="w-10 h-10 rounded-full mr-3"
                />
                <div>
                  <div className="text-sm font-bold">
                    {tokenOne.symbol}
                    <DownOutlined className="ml-2 text-sm" />
                  </div>
                  <p className="text-xs text-gray-500">
                    Balance: {tokenOne.balance}
                  </p>
                </div>
              </div>
              <div className="justify-self-end">
                <input
                  type="number"
                  name="price"
                  id="price"
                  className="w-auto text-right custom-input text-white bg-transparent placeholder:text-white focus:border-none sm:text-4xl"
                  placeholder="0.00"
                  onChange={(e) => setValue(e.target.value)}
                />
                {/* <p className="text-right text-xs text-gray-500">~$145</p> */}
              </div>
            </div>

            <div
              className="h-8 w-8 ex-icon justify-center flex items-center"
              onClick={switchTokens}
            >
              <CgArrowsExchangeV />
            </div>

            <div className="bg-black p-5 mt-0.5 grid grid-cols-2">
              <div className="inline-flex " onClick={() => openModal(2)}>
                <img
                  src={tokenTwo.logoURI}
                  className="w-10 h-10 rounded-full mr-3"
                />
                <div>
                  <div className="text-sm font-bold">
                    {tokenTwo.symbol}
                    <DownOutlined className="ml-2 text-sm" />
                  </div>
                  <p className="text-xs text-gray-500">
                    Balance: {tokenTwo.balance}
                  </p>
                </div>
              </div>
              <div className="justify-self-end">
                {loading ? (
                  <div class="loader"></div>
                ) : (
                  <input
                    type="number"
                    name="price"
                    id="price"
                    disabled
                    className="w-auto text-right custom-input text-white bg-transparent placeholder:text-white focus:border-none sm:text-4xl"
                    placeholder="0.00"
                    value={amount}
                  />
                )}

                {/* <p className="text-right text-xs text-gray-500">~$125</p> */}
              </div>
            </div>
          </div>
          <div className="mt-5 ">
            {/* <p className="text-xs text-gray-500">Receive: ~1286</p> */}
            <p className="text-right text-xs text-gray-500">
              Total fees: {gasFee}
            </p>
          </div>
          <div>
            <button
              onClick={() => {
                handleRoute();
              }}
              className="border-solid border-2 w-full swap mt-10 mb-5"
            >
              {loading ? "SUBMITTING..." : "SWAP"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Example;
