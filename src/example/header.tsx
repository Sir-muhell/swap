//@ts-nocheck

import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { Web3Provider } from "@ethersproject/providers";

const Header = () => {
  const [address, setAddress] = useState(
    localStorage.getItem("address") || "CONNECT"
  );

  useEffect(() => {
    const storedAddress = localStorage.getItem("address");
    if (storedAddress) {
      setAddress(storedAddress);
    }
  }, []); // Empty dependency array to ensure the effect runs only once on component mount

  async function connectWallet() {
    try {
      if (typeof window.ethereum !== "undefined") {
        const provider = new Web3Provider(window.ethereum);
        await window.ethereum.request({ method: "eth_requestAccounts" });
        const accounts = await provider.listAccounts();

        setAddress(accounts[0]);
        localStorage.setItem("address", accounts[0]);
      } else {
        alert("Please install MetaMask to use this dApp.");
      }
    } catch (error) {
      console.error("Error connecting to wallet:", error.message);
    }
  }

  return (
    <div className="h-20 align-middle lg:p-20 lg:pt-10 p-10 text-white grid grid-cols-2">
      <p className=" mt-2">CURIOSITY DEX</p>
      <div className="justify-self-end">
        <button
          className="border-solid border-2 connect-btn"
          onClick={connectWallet}
        >
          {address}
        </button>
      </div>
    </div>
  );
};

export default Header;
